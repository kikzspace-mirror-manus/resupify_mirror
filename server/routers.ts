import { COOKIE_NAME } from "@shared/const";
import axios from "axios";
// Lazy-load JSDOM and Readability to prevent slow imports during test initialization
let JSDOM: any;
let Readability: any;
async function loadJSDOMTools() {
  if (!JSDOM) {
    const jsdomModule = await import("jsdom");
    JSDOM = jsdomModule.JSDOM;
  }
  if (!Readability) {
    const readabilityModule = await import("@mozilla/readability");
    Readability = readabilityModule.Readability;
  }
}
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import { invokeLLM } from "./_core/llm";
import { callLLM } from "./llmProvider";
import { extractFromJson } from "@shared/jdJsonExtractors";
import { getRegionPack, getAvailablePacks } from "../shared/regionPacks";
import { computeSalutation, fixSalutation, buildPersonalizationBlock, stripPersonalizationFromFollowUp, buildContactEmailBlock, fixContactEmail, buildLinkedInBlock, fixLinkedInUrl } from "../shared/outreachHelpers";
import { buildToneSystemPrompt, sanitizeTone } from "../shared/toneGuardrails";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";
import { adminRouter } from "./routers/admin";
import { resolvePackContextForGeneration } from "./v2PackContext";
import { runEligibilityPrecheck } from "../shared/eligibilityPrecheck";
import { createCheckoutSession, CREDIT_PACKS, type PackId } from "./stripe";
import { evidenceRateLimit, outreachRateLimit, kitRateLimit, urlFetchRateLimit, jdExtractRateLimit, shortHash } from "./rateLimiter";
import { checkIdempotency, markStarted, markSucceeded, markFailed, markCreditsCharged } from "./idempotency";
import { MAX_LENGTHS, TOO_LONG_MSG } from "../shared/maxLengths";
import { safeNormalizeJobUrl } from "../shared/urlNormalize";
import { logAnalyticsEvent } from "./analytics";
import {
  EVT_JOB_CARD_CREATED, EVT_QUICK_MATCH_RUN, EVT_COVER_LETTER_GENERATED,
  EVT_OUTREACH_GENERATED, EVT_PAYWALL_VIEWED,
} from "../shared/analyticsEvents";

function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const dow = result.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return result;
}

// Follow-up slot definitions
const FOLLOWUP_SLOTS = [
  { title: "Follow up #1", days: 3 },
  { title: "Follow up #2", days: 7 },
  { title: "Follow up #3", days: 14 },
] as const;

// Legacy title pattern produced by the old single-task code
const LEGACY_FOLLOWUP_RE = /^Follow up after applying:/i;

/**
 * Ensures exactly 3 follow-up tasks exist for an Applied job card.
 * - Checks existing follow_up tasks for the job card by title.
 * - Treats legacy "Follow up after applying: ..." as Follow up #2 (D+7 slot).
 *   If its due date differs from the D+7 target, it is renamed and its due date corrected.
 * - Creates only the missing slots — never duplicates.
 * - appliedAt is the reference date for business-day calculations.
 */
async function ensureFollowUps(userId: number, jobCardId: number, appliedAt: Date): Promise<void> {
  const existing = await db.getTasks(userId, { jobCardId });
  const followUps = existing.filter(t => t.taskType === "follow_up");

  for (const slot of FOLLOWUP_SLOTS) {
    const targetDue = addBusinessDays(appliedAt, slot.days);

    // Check for exact title match
    const exactMatch = followUps.find(t => t.title === slot.title);
    if (exactMatch) continue; // slot already covered

    // For the D+7 slot only: check for legacy title and reuse/rename it
    if (slot.days === 7) {
      const legacy = followUps.find(t => LEGACY_FOLLOWUP_RE.test(t.title));
      if (legacy) {
        // Rename to standard title and correct due date
        await db.updateTask(legacy.id, userId, { title: slot.title, dueDate: targetDue });
        continue;
      }
    }

    // Create the missing slot
    await db.createTask({
      userId,
      jobCardId,
      title: slot.title,
      taskType: "follow_up",
      dueDate: targetDue,
    } as any);
  }

  // Stamp the card so we know follow-ups have been scheduled at least once
  await db.updateJobCard(jobCardId, userId, { followupsScheduledAt: appliedAt });
}

export const appRouter = router({
  system: systemRouter,
  admin: adminRouter,

  // ─── Stripe Checkout ──────────────────────────────────────────────
  stripe: router({
    createCheckoutSession: protectedProcedure
      .input(z.object({
        packId: z.enum(["starter", "pro", "power"]),
        origin: z.string().url(),
      }))
      .mutation(async ({ ctx, input }) => {
        const url = await createCheckoutSession({
          packId: input.packId as PackId,
          userId: ctx.user.id,
          userEmail: ctx.user.email,
          origin: input.origin,
        });
        logAnalyticsEvent(EVT_PAYWALL_VIEWED, ctx.user.id, { pack_id: input.packId });
        return { url };
      }),
    packs: publicProcedure.query(() => CREDIT_PACKS),
    // Returns true when STRIPE_SECRET_KEY starts with 'sk_test_'.
    // Safe to expose publicly — reveals no secret material, only mode.
    isTestMode: publicProcedure.query(() => {
      const key = process.env.STRIPE_SECRET_KEY ?? "";
      return { isTestMode: key.startsWith("sk_test_") };
    }),
  }),

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Profile / Onboarding ──────────────────────────────────────────
  profile: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      return db.getProfile(ctx.user.id);
    }),
    upsert: protectedProcedure.input(z.object({
      regionCode: z.string().max(MAX_LENGTHS.PROFILE_REGION_CODE).optional(),
      trackCode: z.enum(["COOP", "NEW_GRAD"]).optional(),
      school: z.string().max(MAX_LENGTHS.PROFILE_SCHOOL, { message: TOO_LONG_MSG }).optional(),
      program: z.string().max(MAX_LENGTHS.PROFILE_PROGRAM, { message: TOO_LONG_MSG }).optional(),
      graduationDate: z.string().max(MAX_LENGTHS.PROFILE_GRADUATION_DATE).optional(),
      currentlyEnrolled: z.boolean().optional(),
      onboardingComplete: z.boolean().optional(),
      phone: z.string().max(MAX_LENGTHS.PROFILE_PHONE, { message: TOO_LONG_MSG }).nullable().optional(),
      linkedinUrl: z.string().max(MAX_LENGTHS.PROFILE_LINKEDIN_URL, { message: TOO_LONG_MSG }).nullable().optional(),
    })).mutation(async ({ ctx, input }) => {
      await db.upsertProfile(ctx.user.id, input);
      return { success: true };
    }),
    skip: protectedProcedure.mutation(async ({ ctx }) => {
      await db.upsertProfile(ctx.user.id, { onboardingSkippedAt: new Date() } as any);
      return { success: true };
    }),
    updateWorkStatus: protectedProcedure.input(z.object({
      workStatus: z.enum(["citizen_pr", "temporary_resident", "unknown"]).optional(),
      workStatusDetail: z.enum(["open_work_permit", "employer_specific_permit", "student_work_authorization", "other"]).nullable().optional(),
      needsSponsorship: z.enum(["true", "false", "unknown"]).optional(),
      countryOfResidence: z.string().max(MAX_LENGTHS.PROFILE_COUNTRY, { message: TOO_LONG_MSG }).nullable().optional(),
      willingToRelocate: z.boolean().nullable().optional(),
    })).mutation(async ({ ctx, input }) => {
      await db.upsertProfile(ctx.user.id, input as any);
      return { success: true };
    }),
  }),

  // ─── Region Packs ─────────────────────────────────────────────────
  regionPacks: router({
    list: publicProcedure.query(() => getAvailablePacks()),
    get: publicProcedure.input(z.object({
      regionCode: z.string(),
      trackCode: z.string(),
    })).query(({ input }) => getRegionPack(input.regionCode, input.trackCode)),
  }),

  // ─── Credits ──────────────────────────────────────────────────────
  credits: router({
    balance: protectedProcedure.query(async ({ ctx }) => {
      return { balance: await db.getCreditsBalance(ctx.user.id) };
    }),
    ledger: protectedProcedure.query(async ({ ctx }) => {
      return db.getCreditLedger(ctx.user.id);
    }),
    purchase: protectedProcedure.input(z.object({
      amount: z.number().min(1).max(100),
    })).mutation(async ({ ctx, input }) => {
      await db.addCredits(ctx.user.id, input.amount, `Purchased ${input.amount} credits`);
      return { success: true, newBalance: await db.getCreditsBalance(ctx.user.id) };
    }),
    listReceipts: protectedProcedure.query(async ({ ctx }) => {
      return db.listPurchaseReceipts(ctx.user.id);
    }),
    getReceipt: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const receipt = await db.getPurchaseReceiptById(input.id);
        if (!receipt) throw new TRPCError({ code: "NOT_FOUND", message: "Receipt not found" });
        if (receipt.userId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "NOT_FOUND", message: "Receipt not found" });
        }
        return receipt;
      }),
  }),

  // ─── Resumes ──────────────────────────────────────────────────────
  resumes: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getResumes(ctx.user.id);
    }),
    get: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
      return db.getResumeById(input.id, ctx.user.id);
    }),
    create: protectedProcedure.input(z.object({
      title: z.string().min(1).max(MAX_LENGTHS.RESUME_TITLE, { message: TOO_LONG_MSG }),
      content: z.string().min(1).max(MAX_LENGTHS.RESUME_CONTENT, { message: TOO_LONG_MSG }),
    })).mutation(async ({ ctx, input }) => {
      const id = await db.createResume({ userId: ctx.user.id, title: input.title, content: input.content });
      return { id };
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      title: z.string().max(MAX_LENGTHS.RESUME_TITLE, { message: TOO_LONG_MSG }).optional(),
      content: z.string().max(MAX_LENGTHS.RESUME_CONTENT, { message: TOO_LONG_MSG }).optional(),
    })).mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      await db.updateResume(id, ctx.user.id, data);
      return { success: true };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      await db.deleteResume(input.id, ctx.user.id);
      return { success: true };
    }),
    upload: protectedProcedure.input(z.object({
      title: z.string().min(1).max(MAX_LENGTHS.RESUME_TITLE, { message: TOO_LONG_MSG }),
      content: z.string().min(1).max(MAX_LENGTHS.RESUME_CONTENT, { message: TOO_LONG_MSG }),
      fileName: z.string().max(255),
      fileBase64: z.string(),
      mimeType: z.string().max(100),
    })).mutation(async ({ ctx, input }) => {
      const buffer = Buffer.from(input.fileBase64, "base64");
      const fileKey = `resumes/${ctx.user.id}/${nanoid()}-${input.fileName}`;
      const { url } = await storagePut(fileKey, buffer, input.mimeType);
      const id = await db.createResume({
        userId: ctx.user.id,
        title: input.title,
        content: input.content,
        fileUrl: url,
        fileKey,
      });
      return { id, fileUrl: url };
    }),
  }),

  // ─── Job Cards ────────────────────────────────────────────────────
  jobCards: router({
    list: protectedProcedure.input(z.object({
      stage: z.string().optional(),
      season: z.string().optional(),
      priority: z.string().optional(),
    }).optional()).query(async ({ ctx, input }) => {
      return db.getJobCards(ctx.user.id, input);
    }),
    get: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
      return db.getJobCardById(input.id, ctx.user.id);
    }),
    create: protectedProcedure.input(z.object({
      title: z.string().min(1).max(MAX_LENGTHS.JOB_TITLE, { message: TOO_LONG_MSG }),
      company: z.string().max(MAX_LENGTHS.COMPANY, { message: TOO_LONG_MSG }).optional(),
      location: z.string().max(MAX_LENGTHS.LOCATION, { message: TOO_LONG_MSG }).optional(),
      url: z.string().max(MAX_LENGTHS.SOURCE_URL).optional(),
      stage: z.enum(["bookmarked", "applying", "applied", "interviewing", "offered", "rejected", "archived"]).optional(),
      priority: z.enum(["low", "medium", "high"]).optional(),
      season: z.enum(["fall", "winter", "summer", "year_round"]).optional(),
      notes: z.string().max(MAX_LENGTHS.JOB_NOTES, { message: TOO_LONG_MSG }).optional(),
      salary: z.string().max(MAX_LENGTHS.SALARY).optional(),
      jobType: z.string().max(64).optional(),
      dueDate: z.string().optional(),
      jdText: z.string().max(MAX_LENGTHS.JD_TEXT, { message: TOO_LONG_MSG }).optional(),
    })).mutation(async ({ ctx, input }) => {
      const { jdText, dueDate, ...cardData } = input;
      // Normalize URL to strip tracking params before storing
      if (cardData.url) cardData.url = safeNormalizeJobUrl(cardData.url);
      const id = await db.createJobCard({
        userId: ctx.user.id,
        ...cardData,
        dueDate: dueDate ? new Date(dueDate) : undefined,
      } as any);
      if (id && jdText) {
        await db.createJdSnapshot({ jobCardId: id, snapshotText: jdText, sourceUrl: input.url ?? null });
        // Eligibility pre-check: lightweight scan, no credits, no LLM
        try {
          const profile = await db.getProfile(ctx.user.id);
          const pack = profile?.regionCode && profile?.trackCode
            ? getRegionPack(profile.regionCode, profile.trackCode)
            : null;
          const rules = (pack?.workAuthRules ?? []).map((r) => ({
            id: r.id,
            label: r.label,
            triggerPhrases: r.triggerPhrases,
            condition: r.condition,
          }));
          const precheck = runEligibilityPrecheck(jdText, profile, rules);
          if (precheck.status !== "none") {
            await db.updateJobCard(id, ctx.user.id, {
              eligibilityPrecheckStatus: precheck.status,
              eligibilityPrecheckRulesJson: JSON.stringify(precheck.triggeredRules),
              eligibilityPrecheckUpdatedAt: new Date(),
            } as any);
          }
        } catch {
          // Pre-check failure must never block card creation
        }
      }
      logAnalyticsEvent(EVT_JOB_CARD_CREATED, ctx.user.id);
      return { id };
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      title: z.string().max(MAX_LENGTHS.JOB_TITLE, { message: TOO_LONG_MSG }).optional(),
      company: z.string().max(MAX_LENGTHS.COMPANY, { message: TOO_LONG_MSG }).optional(),
      location: z.string().max(MAX_LENGTHS.LOCATION, { message: TOO_LONG_MSG }).optional(),
      url: z.string().max(MAX_LENGTHS.SOURCE_URL).optional(),
      stage: z.enum(["bookmarked", "applying", "applied", "interviewing", "offered", "rejected", "archived"]).optional(),
      priority: z.enum(["low", "medium", "high"]).optional(),
      season: z.enum(["fall", "winter", "summer", "year_round"]).optional(),
      notes: z.string().max(MAX_LENGTHS.JOB_NOTES, { message: TOO_LONG_MSG }).optional(),
      salary: z.string().max(MAX_LENGTHS.SALARY).optional(),
      jobType: z.string().max(64).optional(),
      nextTouchAt: z.string().nullable().optional(),
      dueDate: z.string().nullable().optional(),
    })).mutation(async ({ ctx, input }) => {
      const { id, nextTouchAt, dueDate, ...rest } = input;
      const updateData: any = { ...rest };
      // Normalize URL to strip tracking params before storing
      if (updateData.url) updateData.url = safeNormalizeJobUrl(updateData.url);
      if (nextTouchAt !== undefined) updateData.nextTouchAt = nextTouchAt ? new Date(nextTouchAt) : null;
      if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;

      // Get current card to detect stage changes
      const currentCard = await db.getJobCardById(id, ctx.user.id);

      await db.updateJobCard(id, ctx.user.id, updateData);

      // Follow-up automation: setting nextTouchAt creates a follow-up task
      if (nextTouchAt && nextTouchAt !== null) {
        await db.createTask({
          userId: ctx.user.id,
          jobCardId: id,
          title: `Follow up: ${currentCard?.title ?? "Job"}`,
          taskType: "follow_up",
          dueDate: new Date(nextTouchAt),
        });
      }

      // Stage change → Applied: ensure 3 follow-up tasks exist (idempotent per-slot check)
      if (input.stage === "applied") {
        // Set appliedAt only on first transition into Applied
        const appliedAt = currentCard?.appliedAt ?? new Date();
        if (!currentCard?.appliedAt) {
          await db.updateJobCard(id, ctx.user.id, { appliedAt });
        }
        await ensureFollowUps(ctx.user.id, id, appliedAt);
      }

      return { success: true };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      await db.deleteJobCard(input.id, ctx.user.id);
      return { success: true };
    }),
  }),

  // ─── JD Snapshots ─────────────────────────────────────────────────
  jdSnapshots: router({
    list: protectedProcedure.input(z.object({ jobCardId: z.number() })).query(async ({ input }) => {
      return db.getJdSnapshots(input.jobCardId);
    }),
    latest: protectedProcedure.input(z.object({ jobCardId: z.number() })).query(async ({ input }) => {
      return db.getLatestJdSnapshot(input.jobCardId);
    }),
    create: protectedProcedure.input(z.object({
      jobCardId: z.number(),
      snapshotText: z.string().min(1).max(MAX_LENGTHS.SNAPSHOT_TEXT, { message: TOO_LONG_MSG }),
      sourceUrl: z.string().max(MAX_LENGTHS.SOURCE_URL).optional(),
    })).mutation(async ({ ctx, input }) => {
      const id = await db.createJdSnapshot({
        jobCardId: input.jobCardId,
        snapshotText: input.snapshotText,
        sourceUrl: input.sourceUrl ?? null,
      });
      // Eligibility pre-check on snapshot save
      try {
        const profile = await db.getProfile(ctx.user.id);
        const pack = profile?.regionCode && profile?.trackCode
          ? getRegionPack(profile.regionCode, profile.trackCode)
          : null;
        const rules = (pack?.workAuthRules ?? []).map((r) => ({
          id: r.id,
          label: r.label,
          triggerPhrases: r.triggerPhrases,
          condition: r.condition,
        }));
        const precheck = runEligibilityPrecheck(input.snapshotText, profile, rules);
        await db.updateJobCard(input.jobCardId, ctx.user.id, {
          eligibilityPrecheckStatus: precheck.status,
          eligibilityPrecheckRulesJson: precheck.triggeredRules.length > 0
            ? JSON.stringify(precheck.triggeredRules)
            : null,
          eligibilityPrecheckUpdatedAt: new Date(),
        } as any);
      } catch {
        // Pre-check failure must never block snapshot creation
      }
      return { id };
    }),
    // ─── Real LLM extraction (replaces stub) ──────────────────────────
    extract: protectedProcedure.use(jdExtractRateLimit).input(z.object({
      jobCardId: z.number(),
      actionId: z.string().uuid().optional(),
    })).mutation(async ({ ctx, input }) => {
      // ── Phase 10C: Idempotency guard ─────────────────────────────────
      const idem = checkIdempotency(ctx.user.id, "jdSnapshots.extract", input.actionId);
      if (idem?.status === "succeeded") return idem.result as any;
      if (idem?.status === "started") throw new Error("IDEMPOTENT_IN_PROGRESS: This extraction is already running. Please wait.");
      markStarted(ctx.user.id, "jdSnapshots.extract", input.actionId);
      // ─────────────────────────────────────────────────────────────────
      try {
      const MIN_JD_LENGTH = 200;
      const MAX_JD_LENGTH = 12000;

      const snapshot = await db.getLatestJdSnapshot(input.jobCardId);
      if (!snapshot) throw new Error("No JD snapshot found. Please paste a job description first.");

      const rawText = snapshot.snapshotText;
      if (rawText.length < MIN_JD_LENGTH) {
        throw new Error("JD too short. Paste the full job description (at least 200 characters).");
      }

      // Truncate for extraction only — stored snapshot is never modified
      const extractionText = rawText.length > MAX_JD_LENGTH
        ? rawText.substring(0, MAX_JD_LENGTH)
        : rawText;

      const llmResponse = await callLLM({
        messages: [
          {
            role: "system",
            content: [
              "You are a job description parser. Extract structured information from the job description.",
              "Return ONLY valid JSON matching the schema. Do not invent information not present in the text.",
              "For requirements, extract 10-25 distinct items. Each must be a single, specific requirement.",
              "requirement_type must be one of: skill, responsibility, tool, softskill, eligibility",
            ].join(" "),
          },
          {
            role: "user",
            content: `Extract structured fields and requirements from this job description:\n\n${extractionText}`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "jd_extraction",
            strict: true,
            schema: {
              type: "object",
              properties: {
                company_name: { type: "string", description: "Company name if present, empty string if not" },
                job_title: { type: "string", description: "Job title if present, empty string if not" },
                location: { type: "string", description: "Location if present, empty string if not" },
                job_type: { type: "string", description: "Job type (full-time, part-time, contract, internship, co-op) if present, empty string if not" },
                requirements: {
                  type: "array",
                  description: "10-25 distinct requirement statements extracted from the JD",
                  items: {
                    type: "object",
                    properties: {
                      requirement_text: { type: "string", description: "Single specific requirement or responsibility" },
                      requirement_type: {
                        type: "string",
                        enum: ["skill", "responsibility", "tool", "softskill", "eligibility"],
                        description: "Type of requirement",
                      },
                    },
                    required: ["requirement_text", "requirement_type"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["company_name", "job_title", "location", "job_type", "requirements"],
              additionalProperties: false,
            },
          },
        },
      });

      const content = llmResponse?.choices?.[0]?.message?.content;
      if (!content) throw new Error("LLM returned no content. Please try again.");

      let parsed: {
        company_name: string;
        job_title: string;
        location: string;
        job_type: string;
        requirements: Array<{ requirement_text: string; requirement_type: string }>;
      };
      try {
        parsed = typeof content === "string" ? JSON.parse(content) : content;
      } catch {
        throw new Error("Failed to parse LLM response. Please try again.");
      }

      // Update job card structured fields if they are empty
      const jobCard = await db.getJobCardById(input.jobCardId, ctx.user.id);
      if (jobCard) {
        const updates: Record<string, string> = {};
        if (!jobCard.company && parsed.company_name) updates.company = parsed.company_name;
        if (!jobCard.title || jobCard.title === "Untitled Job") {
          if (parsed.job_title) updates.title = parsed.job_title;
        }
        if (!jobCard.location && parsed.location) updates.location = parsed.location;
        if (!jobCard.jobType && parsed.job_type) updates.jobType = parsed.job_type;
        if (Object.keys(updates).length > 0) {
          await db.updateJobCard(input.jobCardId, ctx.user.id, updates);
        }
      }

      // Persist requirements (upsert — overwrites previous extraction)
      const validTypes = ["skill", "responsibility", "tool", "softskill", "eligibility"] as const;
      type ReqType = typeof validTypes[number];
      const requirements = parsed.requirements
        .filter(r => r.requirement_text?.trim() && validTypes.includes(r.requirement_type as ReqType))
        .map(r => ({
          requirementText: r.requirement_text.trim(),
          requirementType: r.requirement_type as ReqType,
        }));

      await db.upsertRequirements(input.jobCardId, snapshot.id, requirements);
      const extractResult = {
        snapshotId: snapshot.id,
        structuredFields: {
          company_name: parsed.company_name,
          job_title: parsed.job_title,
          location: parsed.location,
          job_type: parsed.job_type,
        },
        requirements,
        count: requirements.length,
      };
      markSucceeded(ctx.user.id, "jdSnapshots.extract", input.actionId, extractResult, false);
      return extractResult;
      } catch (err: any) {
        markFailed(ctx.user.id, "jdSnapshots.extract", input.actionId, String(err?.message ?? err));
        throw err;
      }
    }),
    // ─── Get persisted requirements ────────────────────────────────────
    requirements: protectedProcedure.input(z.object({
      jobCardId: z.number(),
    })).query(async ({ input }) => {
      return db.getRequirements(input.jobCardId);
    }),
    // ─── Patch 8I: Fetch JD text from a URL ─────────────────────────
    fetchFromUrl: protectedProcedure.use(urlFetchRateLimit).input(z.object({
      url: z.string().url(),
    })).mutation(async ({ input }) => {
      const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
      const TIMEOUT_MS = 15_000;
      const MIN_TEXT_LENGTH = 200;
      const BLOCKED_CONTENT_TYPES = ["application/pdf", "application/octet-stream", "image/", "video/", "audio/"];
      // Gated/blocked page detection keywords
      const GATED_KEYWORDS = [
        "enable javascript",
        "access denied",
        "captcha",
        "are you a robot",
        "verify you are human",
        "blocked",
        "sign in to view",
        "please sign in",
        "log in to view",
        "login required",
      ];
      const GATED_MESSAGE = "This site blocks automated fetch (common with LinkedIn/Indeed/Workday in some cases). Please paste the JD text instead.";
      // Guard: https-only
      const parsed = new URL(input.url);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        throw new Error("Only http(s) URLs are supported.");
      }
      let html: string;
      try {
        const response = await axios.get<string>(input.url, {
          timeout: TIMEOUT_MS,
          maxContentLength: MAX_BYTES,
          maxBodyLength: MAX_BYTES,
          responseType: "text",
          maxRedirects: 5,
          headers: {
            // Realistic Chrome-like browser headers for better board compatibility
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
            "Cache-Control": "no-cache",
            "Pragma": "no-cache",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Upgrade-Insecure-Requests": "1",
          },
          validateStatus: (status) => status < 500,
        });
        // Guard: blocked/anti-bot HTTP status codes
        if (response.status === 403 || response.status === 401 || response.status === 429) {
          throw new Error(GATED_MESSAGE);
        }
        if (response.status === 404) {
          throw new Error("Job posting not found (404). Please check the URL.");
        }
        if (response.status >= 400) {
          throw new Error(`Couldn't fetch this URL (HTTP ${response.status}). Please paste the JD instead.`);
        }
        // Guard: binary content types
        const contentType = (response.headers["content-type"] ?? "").toLowerCase();
        if (BLOCKED_CONTENT_TYPES.some((t) => contentType.includes(t))) {
          throw new Error("URL does not point to a web page. Please paste the JD instead.");
        }
        html = response.data as string;
      } catch (err: any) {
        if (axios.isAxiosError(err)) {
          if (err.code === "ECONNABORTED" || err.code === "ETIMEDOUT") {
            throw new Error("Request timed out. Please paste the JD instead.");
          }
          if (err.code === "ENOTFOUND" || err.code === "ECONNREFUSED") {
            throw new Error("Couldn't reach this URL. Please check the address and try again.");
          }
          if (err.message.includes("maxContentLength")) {
            throw new Error("Page is too large to fetch. Please paste the JD instead.");
          }
        }
        // Re-throw user-facing errors as-is
        if (err instanceof Error && !axios.isAxiosError(err)) throw err;
        throw new Error("Couldn't fetch text from this URL. Please paste the JD instead.");
      }
      // Guard: gated/blocked page by content keywords (only flag if page is suspiciously thin)
      const htmlLower = html.toLowerCase();
      const textPreview = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      if (GATED_KEYWORDS.some((kw) => htmlLower.includes(kw)) && textPreview.length < 2000) {
        throw new Error(GATED_MESSAGE);
      }
      // ── Extraction pipeline ──────────────────────────────────────────────
      let extractedText = "";
      // Layer A: Mozilla Readability (best for article-style pages)
      await loadJSDOMTools();
      try {
        const dom = new JSDOM(html, { url: input.url });
        const reader = new Readability(dom.window.document);
        const article = reader.parse();
        if (article?.textContent) {
          extractedText = article.textContent
            .replace(/\r\n/g, "\n")
            .replace(/[ \t]+/g, " ")
            .replace(/\n{3,}/g, "\n\n")
            .trim();
        }
      } catch {
        // Readability failed — fall through to fallback
      }
      // Layer B: Content-container-first fallback (board-agnostic)
      if (extractedText.length < MIN_TEXT_LENGTH) {
        try {
          await loadJSDOMTools();
          const dom = new JSDOM(html, { url: input.url });
          const doc = dom.window.document;
          // Remove noise elements
          for (const tag of ["script", "style", "noscript", "svg", "iframe", "nav", "footer", "header"]) {
            doc.querySelectorAll(tag).forEach((el: Element) => el.remove());
          }
          // Remove common ad/tracker elements
          doc.querySelectorAll('[class*="ad-"], [class*="ads-"], [id*="ad-"], [class*="cookie"], [class*="banner"]').forEach((el: Element) => el.remove());
          // Prefer known content containers (ordered by specificity)
          const CONTENT_SELECTORS = [
            "main",
            "article",
            '[role="main"]',
            ".job-description",
            ".jobDescription",
            ".job-details",
            ".posting-description",
            ".description",
            ".content",
            ".job",
            ".posting",
            "#job-description",
            "#jobDescription",
            "#job-details",
          ];
          let container: Element | null = null;
          for (const sel of CONTENT_SELECTORS) {
            const el = doc.querySelector(sel);
            if (el && (el.textContent?.trim().length ?? 0) > MIN_TEXT_LENGTH) {
              container = el;
              break;
            }
          }
          // Fall back to body if no specific container found
          const rawText = (container ?? doc.body)?.textContent ?? "";
          extractedText = rawText
            .replace(/\r\n/g, "\n")
            .replace(/[ \t]+/g, " ")
            .replace(/\n{3,}/g, "\n\n")
            .trim();
        } catch {
          throw new Error("Couldn't extract text from this page. Please paste the JD instead.");
        }
      }
      // Layer C: JSON fallback (ld+json, __NEXT_DATA__, window state blobs)
      // Only attempted when both Readability and container extraction are too short.
      if (extractedText.length < MIN_TEXT_LENGTH) {
        try {
          const jsonResult = extractFromJson(html, MIN_TEXT_LENGTH);
          if (jsonResult.text.length >= MIN_TEXT_LENGTH) {
            extractedText = jsonResult.text;
            console.log(`[jdFetch] JSON fallback used: ${jsonResult.method}`);
          }
        } catch {
          // JSON extraction failed — fall through to "too short" guard
        }
      }
      // Guard: still too short after all layers
      if (extractedText.length < MIN_TEXT_LENGTH) {
        throw new Error("Fetched text too short to be a job description. Please paste the JD manually.");
      }
      // Truncate to a reasonable max for the textarea
      const MAX_TEXT = 20_000;
      const text = extractedText.length > MAX_TEXT ? extractedText.substring(0, MAX_TEXT) : extractedText;
      return { text, fetchedAt: new Date().toISOString() };
    }),

    // Phase 9B: Auto-fill Job Title + Company from fetched JD text
    extractFields: protectedProcedure.input(z.object({
      text: z.string().max(MAX_LENGTHS.JD_TEXT, { message: TOO_LONG_MSG }),
      urlHostname: z.string().max(MAX_LENGTHS.SAVED_NOTE_URL_HOSTNAME).optional(),
    })).mutation(async ({ input }) => {
      const snippet = input.text.substring(0, 4_000); // Use first 4k chars for speed
      let llmResult: any;
      try {
        llmResult = await callLLM({
          messages: [
            {
              role: "system",
              content: "You are a structured data extractor. Extract job posting fields from the provided text. Return ONLY valid JSON matching the schema. If a field is unclear or not present, return an empty string for that field. Never invent company names.",
            },
            {
              role: "user",
              content: `Extract the job title, company name, location, and job type from this job posting text.\n\nURL hostname (hint): ${input.urlHostname ?? "unknown"}\n\nJob posting text:\n${snippet}`,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "job_fields",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  job_title: { type: "string", description: "The exact job title as posted (e.g., 'Senior Software Engineer'). Empty string if unclear." },
                  company_name: { type: "string", description: "The company name (e.g., 'Acme Corp'). Empty string if unclear or not mentioned." },
                  location: { type: "string", description: "Job location (e.g., 'Toronto, ON' or 'Remote'). Empty string if not mentioned." },
                  job_type: { type: "string", description: "Employment type (e.g., 'Full-time', 'Contract', 'Part-time'). Empty string if not mentioned." },
                },
                required: ["job_title", "company_name", "location", "job_type"],
                additionalProperties: false,
              },
            },
          },
        });
      } catch {
        // LLM failure: return empty fields (non-blocking)
        return { job_title: "", company_name: "", location: "", job_type: "" };
      }
      try {
        const content = llmResult?.choices?.[0]?.message?.content ?? "{}";
        const parsed = typeof content === "string" ? JSON.parse(content) : content;
        return {
          job_title: (parsed.job_title ?? "").trim(),
          company_name: (parsed.company_name ?? "").trim(),
          location: (parsed.location ?? "").trim(),
          job_type: (parsed.job_type ?? "").trim(),
        };
      } catch {
        return { job_title: "", company_name: "", location: "", job_type: "" };
      }
    }),
  }),
  // ─── Evidence Scan ──────────────────────────────────────────────────
  evidence: router({
    runs: protectedProcedure.input(z.object({ jobCardId: z.number() })).query(async ({ input }) => {
      return db.getEvidenceRuns(input.jobCardId);
    }),
    items: protectedProcedure.input(z.object({ evidenceRunId: z.number() })).query(async ({ input }) => {
      return db.getEvidenceItems(input.evidenceRunId);
    }),
    scoreHistory: protectedProcedure.input(z.object({
      jobCardId: z.number(),
      resumeId: z.number().optional(),
    })).query(async ({ input }) => {
      return db.getScoreHistory(input.jobCardId, input.resumeId, 20);
    }),
    // Patch 8G: aggregated active-card score trends for Dashboard widget
    activeTrends: protectedProcedure.query(async ({ ctx }) => {
      return db.getActiveScoredJobCards(ctx.user.id, 10, 10);
    }),
    allScannedJobs: protectedProcedure.query(async ({ ctx }) => {
      return db.getAllScannedJobCards(ctx.user.id);
    }),
    run: protectedProcedure.use(evidenceRateLimit).input(z.object({
      jobCardId: z.number(),
      resumeId: z.number(),
      actionId: z.string().uuid().optional(),
    })).mutation(async ({ ctx, input }) => {
      // ── Phase 10C: Idempotency guard ─────────────────────────────────
      const idem = checkIdempotency(ctx.user.id, "evidence.run", input.actionId);
      if (idem?.status === "succeeded") return idem.result as any;
      if (idem?.status === "started") throw new Error("IDEMPOTENT_IN_PROGRESS: This scan is already running. Please wait for it to complete.");
      markStarted(ctx.user.id, "evidence.run", input.actionId);
      // ── 1. Credit gate (unchanged) ───────────────────────────────────
      const balance = await db.getCreditsBalance(ctx.user.id);
      if (balance < 1) {
        throw new Error("Insufficient credits. You need 1 credit for an Evidence+ATS run.");
      }

      // ── 2. Fetch persisted requirements (6C output) ──────────────────
      const requirements = await db.getRequirements(input.jobCardId);
      if (requirements.length === 0) {
        throw new Error(
          "NO_REQUIREMENTS: Extract requirements first. Open the JD Snapshot tab and click \"Extract Requirements\"."
        );
      }

      // ── 3. Fetch resume and profile ──────────────────────────────────
      const resume = await db.getResumeById(input.resumeId, ctx.user.id);
      if (!resume) throw new Error("Resume not found.");

      const jdSnapshot = await db.getLatestJdSnapshot(input.jobCardId);
      if (!jdSnapshot) throw new Error("No JD snapshot found.");

      const profile = await db.getProfile(ctx.user.id);
      const regionCode = profile?.regionCode ?? "CA";
      const trackCode = profile?.trackCode ?? "NEW_GRAD";
      const pack = getRegionPack(regionCode, trackCode);
      // ── V2 Phase 1C-C: Resolve country pack context (flag-gated) ─────
      const v2PackCtx = await resolvePackContextForGeneration({
        userId: ctx.user.id,
        jobCardId: input.jobCardId,
        userLanguageMode: (ctx.user as any).languageMode ?? "en",
      });
      // ── 4. Create evidence run row ────────────────────────────────────
      const runId = await db.createEvidenceRun({
        jobCardId: input.jobCardId,
        userId: ctx.user.id,
        resumeId: input.resumeId,
        jdSnapshotId: jdSnapshot.id,
        regionCode,
        trackCode,
        status: "running",
      });
      if (!runId) throw new Error("Failed to create evidence run.");

      // ── 5. Spend credit (unchanged) ──────────────────────────────────
      const spent = await db.spendCredits(ctx.user.id, 1, "Evidence+ATS run", "evidence_run", runId);
      if (!spent) throw new Error("Failed to spend credit.");
      markCreditsCharged(ctx.user.id, "evidence.run", input.actionId); // Phase 10C: credit charged once

      // ── 6. Build eligibility context for the LLM prompt ─────────────
      const missingEligibilityFields = pack.eligibilityChecks
        .filter(check => check.required && check.field && !(profile as any)?.[check.field])
        .map(check => check.label);

      const eligibilityContext = pack.eligibilityChecks.map(check => {
        const profileValue = check.field && profile ? (profile as any)[check.field] : null;
        return `- ${check.label}: ${profileValue ? "Present" : "MISSING"}${!profileValue && check.required ? ` (RISK: ${check.riskMessage})` : ""}`;
      }).join("\n");

      // ── 7. Build requirements list for the LLM prompt ────────────────
      // Map from our requirementType to the EvidenceItem group_type
      const typeMap: Record<string, string> = {
        skill: "skills",
        responsibility: "responsibilities",
        tool: "tools",
        softskill: "soft_skills",
        eligibility: "eligibility",
      };
      const requirementsList = requirements.map((r, i) =>
        `${i + 1}. [${typeMap[r.requirementType] ?? r.requirementType}] ${r.requirementText}`
      ).join("\n");

      // ── 8. Single LLM call for all EvidenceItems ─────────────────────
      try {
        // Fetch personalization sources (up to 3 most recent) for this job card
      const personalizationSources = await db.getPersonalizationSources(input.jobCardId, ctx.user.id);
      const topSources = personalizationSources.slice(0, 3);
      const personalizationBlock = buildPersonalizationBlock(topSources);
      const llmResult = await callLLM({
          messages: [
            {
              role: "system",
              content: [
                ...(v2PackCtx.packPromptPrefix ? [v2PackCtx.packPromptPrefix, ``] : []),
                `You are an expert ATS resume analyzer for the ${pack.label} track.`,
                `You will receive a numbered list of job requirements and a resume.`,
                `For EACH requirement, produce one evidence item that maps the requirement to the resume.`,
                ``,
                `RULES:`,
                `- resume_proof MUST be a direct quote or snippet from the resume text, or null if nothing relevant is found.`,
                `- status: "matched" = clear proof found, "partial" = indirect/weak evidence, "missing" = no evidence.`,
                `- fix: one sentence on what the candidate should add or change.`,
                `- rewrite_a and rewrite_b: two alternative resume bullet rewrites (one sentence each).`,
                `- why_it_matters: one sentence on why this requirement matters for the role.`,
                `- needs_confirmation: true if a rewrite introduces a claim NOT supported by the resume proof.`,
                `- ${pack.copyRules.noInventedFacts ? "NEVER invent facts not in the resume." : ""}`,
                `- ${pack.copyRules.convertProjectsToExperience ? "If no direct experience, convert projects/clubs/volunteering into relevant bullets." : ""}`,
                ``,
                `USER PROFILE ELIGIBILITY:`,
                eligibilityContext,
                ``,
                `Produce exactly one item per requirement in the same order as the input list.`,
              ].join("\n"),
            },
            {
              role: "user",
              content: [
                `REQUIREMENTS (${requirements.length} items):`,
                requirementsList,
                ``,
                `RESUME:`,
                resume.content,
              ].join("\n"),
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "evidence_scan_v2",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  summary: { type: "string", description: "2-3 sentence summary of the overall match" },
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        group_type: { type: "string", enum: ["eligibility", "tools", "responsibilities", "skills", "soft_skills"] },
                        jd_requirement: { type: "string" },
                        resume_proof: { type: ["string", "null"] },
                        status: { type: "string", enum: ["matched", "partial", "missing"] },
                        fix: { type: "string" },
                        rewrite_a: { type: "string" },
                        rewrite_b: { type: "string" },
                        why_it_matters: { type: "string" },
                        needs_confirmation: { type: "boolean" },
                      },
                      required: ["group_type", "jd_requirement", "resume_proof", "status", "fix", "rewrite_a", "rewrite_b", "why_it_matters", "needs_confirmation"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["summary", "items"],
                additionalProperties: false,
              },
            },
          },
        });

        const content = llmResult.choices[0]?.message?.content;
        if (!content) throw new Error("LLM returned no content.");
        const parsed = JSON.parse(typeof content === "string" ? content : "{}");

        // ── 9. Save evidence items ───────────────────────────────────────
        const evidenceItemsData = (parsed.items || []).map((item: any, idx: number) => ({
          evidenceRunId: runId,
          groupType: item.group_type,
          jdRequirement: item.jd_requirement,
          resumeProof: item.resume_proof,
          status: item.status,
          fix: item.fix,
          rewriteA: item.rewrite_a,
          rewriteB: item.rewrite_b,
          whyItMatters: item.why_it_matters,
          needsConfirmation: item.needs_confirmation ?? false,
          sortOrder: idx,
        }));
        await db.createEvidenceItems(evidenceItemsData);

        // ── 10. Compute 4-component scores server-side ───────────────────
        const items = parsed.items as Array<{ group_type: string; status: string; resume_proof: string | null }>;
        const total = items.length || 1;
        const matchedCount = items.filter(i => i.status === "matched").length;
        const partialCount = items.filter(i => i.status === "partial").length;
        const missingCount = items.filter(i => i.status === "missing").length;

        // A) evidence_strength_score: matched=full weight, partial=half weight
        const evidenceStrengthScore = Math.round(
          ((matchedCount + partialCount * 0.5) / total) * 100
        );

        // B) keyword_coverage_score: simple token overlap between requirement texts and resume
        const resumeWords = new Set(
          resume.content.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(w => w.length > 3)
        );
        const reqWords = requirements.flatMap(r =>
          r.requirementText.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(w => w.length > 3)
        );
        const uniqueReqWords = Array.from(new Set(reqWords));
        const coveredWords = uniqueReqWords.filter(w => resumeWords.has(w)).length;
        const keywordCoverageScore = uniqueReqWords.length > 0
          ? Math.round((coveredWords / uniqueReqWords.length) * 100)
          : 50;

        // C) formatting_ats_score: simple heuristics on resume text
        const resumeText = resume.content;
        let formattingScore = 70; // baseline
        if (resumeText.includes("•") || resumeText.includes("-")) formattingScore += 5;
        if (/\d{4}/.test(resumeText)) formattingScore += 5; // has years
        if (resumeText.length > 500) formattingScore += 5;
        if (resumeText.length > 1500) formattingScore += 5;
        if (/[A-Z]{2,}/.test(resumeText)) formattingScore += 5; // section headers
        const formattingAtsScore = Math.min(100, formattingScore);

        // D) role_fit_score: start at 100, apply penalties
        let roleFitScore = 100;
        const flags: string[] = [];

        // COOP eligibility risk
        const hasEligibilityReqs = requirements.some(r => r.requirementType === "eligibility");
        if (trackCode === "COOP" && hasEligibilityReqs && missingEligibilityFields.length > 0) {
          roleFitScore -= 25;
          flags.push(`eligibility_risk: Missing profile fields: ${missingEligibilityFields.join(", ")}. This co-op posting likely requires enrollment verification.`);
        }

        // NEW_GRAD seniority mismatch
        const senioritySignals = [
          "director", "head of", "vp ", "vice president", "10+ years", "10 years", "15 years",
          "senior manager", "principal", "staff engineer",
        ];
        const resumeLower = resume.content.toLowerCase();
        const seniorityMatches = senioritySignals.filter(s => resumeLower.includes(s));
        if (trackCode === "NEW_GRAD" && seniorityMatches.length > 0) {
          roleFitScore -= 20;
          flags.push(`overqualified_risk: Resume signals high seniority (${seniorityMatches.slice(0, 2).join(", ")}). New grad roles may flag this as overqualified.`);
        }        // Work authorization rule evaluation (pack-driven)
        const workAuthorizationFlags: Array<{ ruleId: string; title: string; guidance: string; penalty: number }> = [];
        if (pack.workAuthRules && pack.workAuthRules.length > 0) {
          const jdTextLower = jdSnapshot.snapshotText.toLowerCase();
          for (const rule of pack.workAuthRules) {
            const triggered = rule.triggerPhrases.some(phrase => jdTextLower.includes(phrase.toLowerCase()));
            if (!triggered) continue;
            let conditionMet = false;
            const workStatus = profile?.workStatus ?? "unknown";
            const needsSponsorship = profile?.needsSponsorship ?? "unknown";
            const countryOfResidence = profile?.countryOfResidence ?? null;
            if (rule.condition === "work_status != citizen_pr") {
              conditionMet = workStatus !== "citizen_pr";
            } else if (rule.condition === "needs_sponsorship == true") {
              conditionMet = needsSponsorship === "true";
            } else if (rule.condition === "work_status == unknown") {
              conditionMet = workStatus === "unknown";
            } else if (rule.condition === "country_of_residence != Canada") {
              conditionMet = countryOfResidence !== null && countryOfResidence.toLowerCase() !== "canada";
            }
            if (conditionMet) {
              roleFitScore += rule.penalty; // penalty is negative
              workAuthorizationFlags.push({ ruleId: rule.id, title: rule.label, guidance: rule.message, penalty: rule.penalty });
              flags.push(`work_auth:${rule.id}: ${rule.message}`);
            }
          }
        }

        roleFitScore = Math.max(0, Math.min(100, roleFitScore));

        // ── 11. Compute overall_score using pack.scoringWeights ───────────────       // Map our 4 components to pack weight keys
        // Pack weights: eligibility, tools, responsibilities, skills, softSkills
        // We map: role_fit → eligibility weight, keyword_coverage → tools+responsibilities, evidence_strength → skills+softSkills, formatting → remaining
        // Simplified: use a weighted blend of 4 components with pack-derived weights
        const wEligibility = pack.scoringWeights.eligibility;
        const wTools = pack.scoringWeights.tools;
        const wResp = pack.scoringWeights.responsibilities;
        const wSkills = pack.scoringWeights.skills;
        const wSoft = pack.scoringWeights.softSkills;

        // evidence_strength covers skills + soft_skills + responsibilities
        const evidenceWeight = wSkills + wSoft + wResp;
        // keyword_coverage covers tools
        const keywordWeight = wTools;
        // role_fit covers eligibility
        const roleFitWeight = wEligibility;
        // formatting is the remainder (should sum to 1.0 with the above)
        const formattingWeight = Math.max(0, 1.0 - evidenceWeight - keywordWeight - roleFitWeight);

        const overallScore = Math.round(
          evidenceStrengthScore * evidenceWeight +
          keywordCoverageScore * keywordWeight +
          roleFitScore * roleFitWeight +
          formattingAtsScore * formattingWeight
        );

        // ── 12. Build breakdown JSON ─────────────────────────────────────
        const scoreBreakdown = {
          evidence_strength: {
            score: evidenceStrengthScore,
            weight: evidenceWeight,
            matched_count: matchedCount,
            partial_count: partialCount,
            missing_count: missingCount,
            explanation: `${matchedCount} matched, ${partialCount} partial, ${missingCount} missing out of ${total} requirements.`,
          },
          keyword_coverage: {
            score: keywordCoverageScore,
            weight: keywordWeight,
            explanation: `${coveredWords} of ${uniqueReqWords.length} key terms from requirements found in resume.`,
          },
          formatting_ats: {
            score: formattingAtsScore,
            weight: formattingWeight,
            explanation: "Resume structure and ATS-readability heuristics (bullet points, dates, section headers, length).",
          },
          role_fit: {
            score: roleFitScore,
            weight: roleFitWeight,
            explanation: flags.length > 0
              ? `Flags detected: ${flags.join(" | ")}${workAuthorizationFlags.length > 0 ? " | Role fit includes work authorization eligibility checks." : ""}`
              : "No eligibility or seniority issues detected.",
          },
          flags,
          workAuthorizationFlags,
          pack_label: pack.label,
          computed_at: new Date().toISOString(),
        };

        // ── 13. Persist run with scores ──────────────────────────────────
        await db.updateEvidenceRun(runId, {
          overallScore,
          summary: parsed.summary ?? "",
          scoreBreakdownJson: JSON.stringify(scoreBreakdown),
          status: "completed",
          completedAt: new Date(),
        });

        // ── 14. Auto-create review task (unchanged) ──────────────────────
        const jobCard = await db.getJobCardById(input.jobCardId, ctx.user.id);
        if (jobCard) {
          await db.createTask({
            userId: ctx.user.id,
            jobCardId: input.jobCardId,
            title: `Review evidence scan results: ${jobCard.title}`,
            taskType: "review_evidence",
          });
        }

        logAnalyticsEvent(EVT_QUICK_MATCH_RUN, ctx.user.id, { run_type: "evidence" });
        const evidenceResult = {
          runId,
          score: overallScore,
          itemCount: evidenceItemsData.length,
          breakdown: scoreBreakdown,
        };
        markSucceeded(ctx.user.id, "evidence.run", input.actionId, evidenceResult, true);
        return evidenceResult;
      } catch (error: any) {
        await db.updateEvidenceRun(runId, { status: "failed" });
        markFailed(ctx.user.id, "evidence.run", input.actionId, String(error?.message ?? error));
        throw new Error(`Evidence scan failed: ${error.message}`);
      }
    }),
    batchSprint: protectedProcedure.input(z.object({
      jobCardIds: z.array(z.number()).min(1).max(10),
      resumeId: z.number(),
    })).mutation(async ({ ctx, input }) => {
      const balance = await db.getCreditsBalance(ctx.user.id);
      if (balance < 5) {
        throw new Error("Insufficient credits. Batch Sprint costs 5 credits.");
      }
      const spent = await db.spendCredits(ctx.user.id, 5, `Batch Sprint for ${input.jobCardIds.length} jobs`, "batch_sprint");
      if (!spent) throw new Error("Failed to spend credits.");

      const results: { jobCardId: number; runId: number | null; error?: string; score?: number; topSuggestion?: string; title?: string; company?: string }[] = [];
      for (const jobCardId of input.jobCardIds) {
        try {
          const jdSnapshot = await db.getLatestJdSnapshot(jobCardId);
          if (!jdSnapshot) { results.push({ jobCardId, runId: null, error: "No JD snapshot" }); continue; }
          const resume = await db.getResumeById(input.resumeId, ctx.user.id);
          if (!resume) { results.push({ jobCardId, runId: null, error: "Resume not found" }); continue; }
          const profile = await db.getProfile(ctx.user.id);
          const regionCode = profile?.regionCode ?? "CA";
          const trackCode = profile?.trackCode ?? "NEW_GRAD";
          const runId = await db.createEvidenceRun({
            jobCardId, userId: ctx.user.id, resumeId: input.resumeId,
            jdSnapshotId: jdSnapshot.id, regionCode, trackCode, status: "running",
          });
          if (!runId) { results.push({ jobCardId, runId: null, error: "Failed to create run" }); continue; }

          const pack = getRegionPack(regionCode, trackCode);
          const llmResult = await callLLM({
            messages: [
              { role: "system", content: `You are an ATS analyzer for ${pack.label}. Analyze JD vs resume. Return JSON with overall_score (0-100), summary, and top_3_changes (array of 3 strings with the most impactful changes).` },
              { role: "user", content: `JD:\n${jdSnapshot.snapshotText}\n\nRESUME:\n${resume.content}` }
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "batch_sprint",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    overall_score: { type: "integer" },
                    summary: { type: "string" },
                    top_3_changes: { type: "array", items: { type: "string" } },
                  },
                  required: ["overall_score", "summary", "top_3_changes"],
                  additionalProperties: false,
                }
              }
            }
          });
          const parsed = JSON.parse(typeof llmResult.choices[0]?.message?.content === "string" ? llmResult.choices[0].message.content : "{}");
          await db.updateEvidenceRun(runId, { overallScore: parsed.overall_score ?? 0, summary: parsed.summary ?? "", status: "completed", completedAt: new Date() });
          // Phase 10E: enrich result with score + top suggestion (additive — existing clients ignore extra fields)
          const jobCard = await db.getJobCardById(jobCardId, ctx.user.id);
          results.push({
            jobCardId,
            runId,
            score: parsed.overall_score ?? 0,
            topSuggestion: (parsed.top_3_changes?.[0] as string | undefined) ?? parsed.summary ?? "",
            title: jobCard?.title ?? "",
            company: jobCard?.company ?? "",
          });
        } catch (error: any) {
          // Phase 10E: include title/company even on failure for drawer display
          let failTitle = "";
          let failCompany = "";
          try {
            const jc = await db.getJobCardById(jobCardId, ctx.user.id);
            failTitle = jc?.title ?? "";
            failCompany = jc?.company ?? "";
          } catch { /* ignore */ }
          results.push({ jobCardId, runId: null, error: error.message, title: failTitle, company: failCompany });
        }
      }
      return { results };
    }),
  }),

  // ─── Tasks ────────────────────────────────────────────────────────
  tasks: router({
    list: protectedProcedure.input(z.object({
      jobCardId: z.number().optional(),
      completed: z.boolean().optional(),
    }).optional()).query(async ({ ctx, input }) => {
      return db.getTasks(ctx.user.id, input ?? undefined);
    }),
    today: protectedProcedure.query(async ({ ctx }) => {
      return db.getTodayTasks(ctx.user.id);
    }),
    create: protectedProcedure.input(z.object({
      jobCardId: z.number().optional(),
      title: z.string().min(1).max(MAX_LENGTHS.TASK_TITLE, { message: TOO_LONG_MSG }),
      description: z.string().max(MAX_LENGTHS.TASK_DESCRIPTION, { message: TOO_LONG_MSG }).optional(),
      taskType: z.enum(["follow_up", "apply", "interview_prep", "custom", "outreach", "review_evidence"]).optional(),
      dueDate: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      const id = await db.createTask({
        userId: ctx.user.id,
        jobCardId: input.jobCardId ?? null,
        title: input.title,
        description: input.description ?? null,
        taskType: input.taskType ?? "custom",
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
      } as any);
      return { id };
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      title: z.string().max(MAX_LENGTHS.TASK_TITLE, { message: TOO_LONG_MSG }).optional(),
      description: z.string().max(MAX_LENGTHS.TASK_DESCRIPTION, { message: TOO_LONG_MSG }).optional(),
      completed: z.boolean().optional(),
      dueDate: z.string().nullable().optional(),
    })).mutation(async ({ ctx, input }) => {
      const { id, dueDate, ...rest } = input;
      const updateData: any = { ...rest };
      if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
      if (input.completed === true) updateData.completedAt = new Date();
      await db.updateTask(id, ctx.user.id, updateData);
      return { success: true };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      await db.deleteTask(input.id, ctx.user.id);
      return { success: true };
    }),
    // Called by the Tasks tab when the job card is in Applied stage to backfill missing follow-ups
    ensureFollowUps: protectedProcedure.input(z.object({
      jobCardId: z.number(),
    })).mutation(async ({ ctx, input }) => {
      const card = await db.getJobCardById(input.jobCardId, ctx.user.id);
      if (!card || card.stage !== "applied") return { created: 0 };
      const appliedAt = card.appliedAt ?? new Date();
      await ensureFollowUps(ctx.user.id, input.jobCardId, appliedAt);
      return { success: true };
    }),
    /**
     * Mark a follow_up task as sent.
     * - Sets completed = true, completedAt = now, sentAt = now.
     * - Only works for tasks owned by the current user.
     * - Safe to call on any task type; sentAt is only meaningful for follow_up.
     */
    markSent: protectedProcedure.input(z.object({
      id: z.number(),
    })).mutation(async ({ ctx, input }) => {
      const now = new Date();
      await db.updateTask(input.id, ctx.user.id, {
        completed: true,
        completedAt: now,
        sentAt: now,
      } as any);
      return { success: true, sentAt: now };
    }),
  }),

  // --- Contacts ---
  contacts: router({
    list: protectedProcedure.input(z.object({
      jobCardId: z.number().optional(),
    }).optional()).query(async ({ ctx, input }) => {
      return db.getContacts(ctx.user.id, input?.jobCardId);
    }),
    listWithUsage: protectedProcedure.query(async ({ ctx }) => {
      return db.getContactsWithUsage(ctx.user.id);
    }),
    create: protectedProcedure.input(z.object({
      jobCardId: z.number().optional(),
      name: z.string().min(1).max(MAX_LENGTHS.CONTACT_NAME, { message: TOO_LONG_MSG }),
      role: z.string().max(MAX_LENGTHS.CONTACT_ROLE, { message: TOO_LONG_MSG }).optional(),
      company: z.string().max(MAX_LENGTHS.CONTACT_COMPANY, { message: TOO_LONG_MSG }).optional(),
      email: z.string().max(MAX_LENGTHS.CONTACT_EMAIL).optional(),
      linkedinUrl: z.string().max(MAX_LENGTHS.CONTACT_LINKEDIN_URL, { message: TOO_LONG_MSG }).optional(),
      phone: z.string().max(MAX_LENGTHS.CONTACT_PHONE).optional(),
      notes: z.string().max(MAX_LENGTHS.CONTACT_NOTES, { message: TOO_LONG_MSG }).optional(),
    })).mutation(async ({ ctx, input }) => {
      const id = await db.createContact({ userId: ctx.user.id, ...input } as any);
      return { id };
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      name: z.string().max(MAX_LENGTHS.CONTACT_NAME, { message: TOO_LONG_MSG }).optional(),
      role: z.string().max(MAX_LENGTHS.CONTACT_ROLE, { message: TOO_LONG_MSG }).optional(),
      company: z.string().max(MAX_LENGTHS.CONTACT_COMPANY, { message: TOO_LONG_MSG }).optional(),
      email: z.string().max(MAX_LENGTHS.CONTACT_EMAIL).optional(),
      linkedinUrl: z.string().max(MAX_LENGTHS.CONTACT_LINKEDIN_URL, { message: TOO_LONG_MSG }).optional(),
      phone: z.string().max(MAX_LENGTHS.CONTACT_PHONE).optional(),
      notes: z.string().max(MAX_LENGTHS.CONTACT_NOTES, { message: TOO_LONG_MSG }).optional(),
    })).mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      await db.updateContact(id, ctx.user.id, data as any);
      return { success: true };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      await db.deleteContact(input.id, ctx.user.id);
      return { success: true };
    }),
  }),

  // ─── Outreach ─────────────────────────────────────────────────────
  outreach: router({
    threads: protectedProcedure.input(z.object({
      jobCardId: z.number().optional(),
    }).optional()).query(async ({ ctx, input }) => {
      return db.getOutreachThreads(ctx.user.id, input?.jobCardId);
    }),
    messages: protectedProcedure.input(z.object({ threadId: z.number() })).query(async ({ input }) => {
      return db.getOutreachMessages(input.threadId);
    }),
    createThread: protectedProcedure.input(z.object({
      jobCardId: z.number().optional(),
      contactId: z.number().optional(),
      subject: z.string().max(200, { message: TOO_LONG_MSG }).optional(),
      channel: z.enum(["email", "linkedin", "other"]).optional(),
    })).mutation(async ({ ctx, input }) => {
      const id = await db.createOutreachThread({ userId: ctx.user.id, ...input });
      return { id };
    }),
    addMessage: protectedProcedure.input(z.object({
      threadId: z.number(),
      content: z.string().min(1).max(25_000, { message: TOO_LONG_MSG }),
      direction: z.enum(["sent", "received"]).optional(),
      messageType: z.enum(["recruiter_email", "linkedin_dm", "follow_up_1", "follow_up_2", "custom"]).optional(),
    })).mutation(async ({ input }) => {
      const id = await db.createOutreachMessage(input);
      return { id };
    }),
    pack: protectedProcedure.input(z.object({ jobCardId: z.number() })).query(async ({ ctx, input }) => {
      return db.getOutreachPack(input.jobCardId, ctx.user.id);
    }),
    generatePack: protectedProcedure.use(outreachRateLimit).input(z.object({
      jobCardId: z.number(),
      contactId: z.number().optional(),
      actionId: z.string().uuid().optional(),
    })).mutation(async ({ ctx, input }) => {
      // ── Phase 10C: Idempotency guard ─────────────────────────────────
      const idem = checkIdempotency(ctx.user.id, "outreach.generatePack", input.actionId);
      if (idem?.status === "succeeded") return idem.result as any;
      if (idem?.status === "started") throw new Error("IDEMPOTENT_IN_PROGRESS: Outreach Pack is already being generated. Please wait.");
      markStarted(ctx.user.id, "outreach.generatePack", input.actionId);
      try {
      // Check credits
      const balance = await db.getCreditsBalance(ctx.user.id);
      if (balance < 1) throw new Error("Insufficient credits. Outreach Pack costs 1 credit.");

      const jobCard = await db.getJobCardById(input.jobCardId, ctx.user.id);
      if (!jobCard) throw new Error("Job card not found.");

      const jdSnapshot = await db.getLatestJdSnapshot(input.jobCardId);
      const profile = await db.getProfile(ctx.user.id);
      const pack = getRegionPack(profile?.regionCode ?? "CA", profile?.trackCode ?? "NEW_GRAD");

      // Resolve contact name, email, and LinkedIn URL for deterministic salutation (Fix 1/4), To: line (Fix 2/4), and LinkedIn: line (Fix 3/4)
      let contactName: string | null = null;
      let contactEmail: string | null = null;
      let contactLinkedInUrl: string | null = null;
      if (input.contactId) {
        const contact = await db.getContactById(input.contactId, ctx.user.id);
        contactName = contact?.name ?? null;
        contactEmail = contact?.email ?? null;
        contactLinkedInUrl = contact?.linkedinUrl ?? null;
      }
      const emailSalutation = computeSalutation(contactName, "email");
      const linkedinSalutation = computeSalutation(contactName, "linkedin");
      const contactEmailBlock = buildContactEmailBlock(contactEmail);
      const linkedInBlock = buildLinkedInBlock(contactLinkedInUrl);

      // Build signature lines from real profile fields; omit if missing
      const sigLines: string[] = [];
      if (profile?.phone) sigLines.push(`Phone: ${profile.phone}`);
      if (profile?.linkedinUrl) sigLines.push(`LinkedIn: ${profile.linkedinUrl}`);
      const signatureBlock = sigLines.length > 0 ? `\nSignature lines to include:\n${sigLines.join("\n")}` : "\nDo NOT include any phone or LinkedIn placeholder lines in the signature.";

      // Fetch personalization sources (up to 3 most recent) for this job card
      const personalizationSources = await db.getPersonalizationSources(input.jobCardId, ctx.user.id);
      const topSources = personalizationSources.slice(0, 3);
      const personalizationBlock = buildPersonalizationBlock(topSources);
      const llmResult = await callLLM({
        messages: [
          {
            role: "system",
            content: `Generate an outreach pack for a ${pack.label} job application. Tone: ${pack.templates.outreachTone}. Return JSON with recruiter_email, linkedin_dm, follow_up_1, follow_up_2. IMPORTANT: Never use bracket placeholders like [Your Phone Number] or [Your LinkedIn Profile URL]. Use only real values provided or omit those lines entirely.

${buildToneSystemPrompt()}`
          },
          {
            role: "user",
            content: `Job: ${jobCard.title} at ${jobCard.company ?? "Unknown Company"}\n${jdSnapshot ? `JD: ${jdSnapshot.snapshotText.substring(0, 2000)}` : ""}\nApplicant: ${ctx.user.name ?? "Student"}, ${profile?.program ?? ""} at ${profile?.school ?? ""}${signatureBlock}\nSalutation for recruiter_email and follow_up messages: ${emailSalutation}\nSalutation for linkedin_dm: ${linkedinSalutation}${contactEmailBlock ? `\n${contactEmailBlock}` : ""}${linkedInBlock ? `\n${linkedInBlock}` : ""}${personalizationBlock ? `\n\n${personalizationBlock}` : ""}`
          }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "outreach_pack",
            strict: true,
            schema: {
              type: "object",
              properties: {
                recruiter_email: { type: "string" },
                linkedin_dm: { type: "string" },
                follow_up_1: { type: "string" },
                follow_up_2: { type: "string" },
              },
              required: ["recruiter_email", "linkedin_dm", "follow_up_1", "follow_up_2"],
              additionalProperties: false,
            }
          }
        }
      });

      const content = llmResult.choices[0]?.message?.content;
      const rawParsed = JSON.parse(typeof content === "string" ? content : "{}");
      // Strip any remaining bracket placeholders the LLM may have included
      const stripBrackets = (text: string) =>
        text
          .replace(/\[Your Phone Number\]/gi, "")
          .replace(/\[Your LinkedIn Profile URL\]/gi, "")
          .replace(/\[Your LinkedIn URL\]/gi, "")
          .replace(/\[LinkedIn Profile\]/gi, "")
          .replace(/\[Phone\]/gi, "")
          .replace(/\[[^\]]{1,60}\]/g, "") // catch any other short bracket placeholders
          .replace(/\n{3,}/g, "\n\n") // collapse triple+ newlines left by removed lines
          .trim();
      const parsed = {
        recruiter_email: fixContactEmail(sanitizeTone(fixSalutation(stripBrackets(rawParsed.recruiter_email ?? ""), "email"), false), contactEmail),
        linkedin_dm: fixLinkedInUrl(sanitizeTone(fixSalutation(stripBrackets(rawParsed.linkedin_dm ?? ""), "linkedin"), false), contactLinkedInUrl),
        follow_up_1: sanitizeTone(stripPersonalizationFromFollowUp(fixSalutation(stripBrackets(rawParsed.follow_up_1 ?? ""), "email")), true),
        follow_up_2: sanitizeTone(stripPersonalizationFromFollowUp(fixSalutation(stripBrackets(rawParsed.follow_up_2 ?? ""), "email")), true),
      };
      const spent = await db.spendCredits(ctx.user.id, 1, "Outreach Pack generation", "outreach_pack");
      if (!spent) throw new Error("Failed to spend credit.");
      markCreditsCharged(ctx.user.id, "outreach.generatePack", input.actionId); // Phase 10C
      const packId = await db.createOutreachPack({
        userId: ctx.user.id,
        jobCardId: input.jobCardId,
        recruiterEmail: parsed.recruiter_email,
        linkedinDm: parsed.linkedin_dm,
        followUp1: parsed.follow_up_1,
        followUp2: parsed.follow_up_2,
      });

      logAnalyticsEvent(EVT_OUTREACH_GENERATED, ctx.user.id);
      const packResult = { id: packId, ...parsed };
      markSucceeded(ctx.user.id, "outreach.generatePack", input.actionId, packResult, true);
      return packResult;
      } catch (err: any) {
        markFailed(ctx.user.id, "outreach.generatePack", input.actionId, String(err?.message ?? err));
        throw err;
      }
    }),
  }),
  // ─── Analyticss ────────────────────────────────────────────────────
  analytics: router({
    stats: protectedProcedure.query(async ({ ctx }) => {
      const [jobStats, weeklyApps, taskCompletion] = await Promise.all([
        db.getJobCardStats(ctx.user.id),
        db.getWeeklyApplications(ctx.user.id),
        db.getTaskCompletionRate(ctx.user.id),
      ]);
      return { jobStats, weeklyApps, taskCompletion };
    }),
  }),

  // ─── Application Kits ─────────────────────────────────────────────
  applicationKits: router({
    // Get the latest kit for a job card (any tone)
    get: protectedProcedure.input(z.object({
      jobCardId: z.number(),
      resumeId: z.number(),
      evidenceRunId: z.number(),
    })).query(async ({ input }) => {
      return db.getApplicationKit(input.jobCardId, input.resumeId, input.evidenceRunId);
    }),

    // Generate (or regenerate) an Application Kit
    // Option A: free if a completed EvidenceRun already exists for this jobcard+resume
    generate: protectedProcedure.use(kitRateLimit).input(z.object({
      jobCardId: z.number(),
      resumeId: z.number(),
      evidenceRunId: z.number(),
      tone: z.enum(["Human", "Confident", "Warm", "Direct"]).default("Human"),
      actionId: z.string().uuid().optional(),
    })).mutation(async ({ ctx, input }) => {
      // ── Phase 10C: Idempotency guard ─────────────────────────────────
      const idem = checkIdempotency(ctx.user.id, "applicationKits.generate", input.actionId);
      if (idem?.status === "succeeded") return idem.result as any;
      if (idem?.status === "started") throw new Error("IDEMPOTENT_IN_PROGRESS: Application Kit is already being generated. Please wait.");
      markStarted(ctx.user.id, "applicationKits.generate", input.actionId);
      try {
      // ── Option A: verify a completed EvidenceRun exists (no extra credit charge) ──
      const evidenceRuns = await db.getEvidenceRuns(input.jobCardId);
      const validRun = evidenceRuns.find(
        (r) => r.id === input.evidenceRunId && r.status === "completed" && r.resumeId === input.resumeId
      );
      if (!validRun) {
        throw new Error(
          "NO_EVIDENCE_RUN: Run Evidence+ATS scan first. Application Kit is included with a completed scan."
        );
      }

      // ── Fetch requirements ──────────────────────────────────────────
      const requirements = await db.getRequirements(input.jobCardId);
      if (requirements.length === 0) {
        throw new Error(
          "NO_REQUIREMENTS: Extract requirements first from the JD Snapshot tab."
        );
      }

      // ── Fetch evidence items for this run ───────────────────────────
      const allItems = await db.getEvidenceItems(input.evidenceRunId);
      if (allItems.length === 0) {
        throw new Error("No evidence items found for this run. Please re-run the Evidence Scan.");
      }

      // ── Fetch resume + job card + profile ───────────────────────────
      const resume = await db.getResumeById(input.resumeId, ctx.user.id);
      if (!resume) throw new Error("Resume not found.");

      const jobCard = await db.getJobCardById(input.jobCardId, ctx.user.id);
      if (!jobCard) throw new Error("Job card not found.");

      const jdSnapshot = await db.getLatestJdSnapshot(input.jobCardId);
      const profile = await db.getProfile(ctx.user.id);
      const regionCode = profile?.regionCode ?? "CA";
      const trackCode = profile?.trackCode ?? "NEW_GRAD";
      const pack = getRegionPack(regionCode, trackCode);
      // ── V2 Phase 1C-C: Resolve country pack context (flag-gated) ─────
      const v2PackCtx = await resolvePackContextForGeneration({
        userId: ctx.user.id,
        jobCardId: input.jobCardId,
        userLanguageMode: (ctx.user as any).languageMode ?? "en",
      });
      // ── Prioritize missing/partial items for top changess ────────────
      const typeWeight: Record<string, number> = {
        eligibility: 4, tools: 3, responsibilities: 3, skills: 2, soft_skills: 1,
      };
      const prioritized = [...allItems]
        .filter((i) => i.status === "missing" || i.status === "partial")
        .sort((a, b) => {
          const statusWeight = (s: string) => s === "missing" ? 2 : 1;
          const wa = statusWeight(a.status) * (typeWeight[a.groupType] ?? 1);
          const wb = statusWeight(b.status) * (typeWeight[b.groupType] ?? 1);
          return wb - wa;
        });

      const topChangesItems = prioritized.slice(0, 5);
      const bulletItems = prioritized.slice(0, 15); // up to 15 for rewrites

      // ── Build LLM prompt ────────────────────────────────────────────
      const toneInstructions: Record<string, string> = {
        Human: "Write in a natural, conversational tone. Avoid corporate jargon.",
        Confident: "Write assertively. Use strong action verbs and quantify achievements.",
        Warm: "Write with warmth and enthusiasm. Show genuine interest in the company.",
        Direct: "Write concisely. No fluff. Every sentence must add value.",
      };

      const itemsForPrompt = bulletItems.map((item, i) =>
        `${i + 1}. [${item.groupType}] ${item.jdRequirement}\n   proof: ${item.resumeProof ?? "none"}\n   fix: ${item.fix}`
      ).join("\n");

      const topChangesForPrompt = topChangesItems.map((item, i) =>
        `${i + 1}. [${item.status.toUpperCase()}] ${item.jdRequirement} — ${item.fix}`
      ).join("\n");

      const llmResult = await callLLM({
        messages: [
          {
            role: "system",
            content: [
              ...(v2PackCtx.packPromptPrefix ? [v2PackCtx.packPromptPrefix, ``] : []),
              `You are an expert career coach for ${pack.label} job applications.`,
              `Tone instruction: ${toneInstructions[input.tone] ?? toneInstructions.Human}`,
              `RULES:`,
              `- NEVER invent facts not present in the resume proof snippets.`,
              `- If a bullet rewrite introduces a claim not in the proof, set needs_confirmation=true.`,
              `- Cover letter: ~200-300 words, no fake addresses, no overly formal fluff.`,
              `- Cover letter must reference specific evidence from the resume proof snippets.`,
              `- top_changes: exactly ${Math.min(topChangesItems.length, 5)} items from the provided list.`,
              `- bullet_rewrites: one entry per item in the provided list.`,
            ].join("\n"),
          },
          {
            role: "user",
            content: [
              `JOB: ${jobCard.title ?? "Software Engineer"} at ${jobCard.company ?? "the company"}`,
              jobCard.location ? `Location: ${jobCard.location}` : "",
              jdSnapshot ? `JD EXCERPT: ${jdSnapshot.snapshotText.substring(0, 1500)}` : "",
              ``,
              `TOP CHANGES TO ADDRESS (${topChangesItems.length} items):`,
              topChangesForPrompt,
              ``,
              `ITEMS FOR BULLET REWRITES (${bulletItems.length} items):`,
              itemsForPrompt,
              ``,
              `RESUME EXCERPT (first 2000 chars):`,
              resume.content.substring(0, 2000),
            ].filter(Boolean).join("\n"),
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "application_kit",
            strict: true,
            schema: {
              type: "object",
              properties: {
                top_changes: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      requirement_text: { type: "string" },
                      status: { type: "string", enum: ["missing", "partial"] },
                      fix: { type: "string" },
                    },
                    required: ["requirement_text", "status", "fix"],
                    additionalProperties: false,
                  },
                },
                bullet_rewrites: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      requirement_text: { type: "string" },
                      status: { type: "string", enum: ["missing", "partial"] },
                      fix: { type: "string" },
                      rewrite_a: { type: "string" },
                      rewrite_b: { type: "string" },
                      needs_confirmation: { type: "boolean" },
                    },
                    required: ["requirement_text", "status", "fix", "rewrite_a", "rewrite_b", "needs_confirmation"],
                    additionalProperties: false,
                  },
                },
                cover_letter_text: { type: "string" },
              },
              required: ["top_changes", "bullet_rewrites", "cover_letter_text"],
              additionalProperties: false,
            },
          },
        },
      });

      const content = llmResult.choices[0]?.message?.content;
      if (!content) throw new Error("LLM returned no content.");
      const parsed = JSON.parse(typeof content === "string" ? content : "{}");

      // ── Persist kit ─────────────────────────────────────────────────
      const kitId = await db.upsertApplicationKit({
        jobCardId: input.jobCardId,
        resumeId: input.resumeId,
        evidenceRunId: input.evidenceRunId,
        regionCode,
        trackCode,
        tone: input.tone,
        topChangesJson: JSON.stringify(parsed.top_changes ?? []),
        bulletRewritesJson: JSON.stringify(parsed.bullet_rewrites ?? []),
        coverLetterText: parsed.cover_letter_text ?? "",
      });

       logAnalyticsEvent(EVT_COVER_LETTER_GENERATED, ctx.user.id);
      const kitResult = {
        kitId,
        topChanges: parsed.top_changes ?? [],
        bulletRewrites: parsed.bullet_rewrites ?? [],
        coverLetterText: parsed.cover_letter_text ?? "",
      };
      markSucceeded(ctx.user.id, "applicationKits.generate", input.actionId, kitResult, false);
      return kitResult;
      } catch (err: any) {
        markFailed(ctx.user.id, "applicationKits.generate", input.actionId, String(err?.message ?? err));
        throw err;
      }
    }),
    // Create checklist tasks from the kit (no duplicates)
    createTasks: protectedProcedure.input(z.object({
      jobCardId: z.number(),
    })).mutation(async ({ ctx, input }) => {
      const jobCard = await db.getJobCardById(input.jobCardId, ctx.user.id);
      if (!jobCard) throw new Error("Job card not found.");

      // Fetch existing tasks to avoid duplicates
      const existingTasks = await db.getTasks(ctx.user.id, { jobCardId: input.jobCardId });
      const existingTitles = new Set(existingTasks.map((t) => t.title));

      const tasksToCreate: Array<{ title: string; taskType: string }> = [
        { title: "Update resume bullets", taskType: "custom" },
        { title: "Generate/Review cover letter", taskType: "custom" },
        { title: "Submit application", taskType: "apply" },
      ];

      // Only add follow-up task if already applied
      if (jobCard.stage === "applied") {
        tasksToCreate.push({ title: "Follow up on application", taskType: "follow_up" });
      }

      let created = 0;
      for (const task of tasksToCreate) {
        if (!existingTitles.has(task.title)) {
          await db.createTask({
            userId: ctx.user.id,
            jobCardId: input.jobCardId,
            title: task.title,
            taskType: task.taskType,
            dueDate: new Date(),
          } as any);
          created++;
        }
      }

      return { created, skipped: tasksToCreate.length - created };
    }),
  }),

  // ─── Personalization Sources ───────────────────────────────────────────────
  // ─── Waitlist Event Logging ──────────────────────────────────────────────────
  waitlist: router({
    // Called by Waitlist.tsx when a logged-in gated user lands on /waitlist.
    // Records a non-PII operational event (once per user per 24h).
    joined: protectedProcedure.mutation(async ({ ctx }) => {
      const userIdHash = shortHash(String(ctx.user.id));
      const alreadyLogged = await db.waitlistEventRecentlyLogged(userIdHash);
      if (!alreadyLogged) {
        await db.logOperationalEvent({
          requestId: nanoid(),
          endpointGroup: "waitlist",
          eventType: "waitlist_joined",
          statusCode: 200,
          userIdHash,
        });
      }
      return { logged: !alreadyLogged };
    }),
  }),

  personalization: router({
    list: protectedProcedure.input(z.object({
      jobCardId: z.number(),
    })).query(async ({ ctx, input }) => {
      return db.getPersonalizationSources(input.jobCardId, ctx.user.id);
    }),

    upsert: protectedProcedure.input(z.object({
      id: z.number().optional(),
      jobCardId: z.number(),
      sourceType: z.enum(["linkedin_post", "linkedin_about", "company_news", "other"]),
      url: z.string().max(2048).optional(),
      pastedText: z.string().max(5000).optional(),
    }).refine(
      (d) => (d.pastedText && d.pastedText.trim().length >= 50) || (d.url && d.url.trim().length > 0),
      { message: "Paste at least 50 characters of text, or provide a URL." }
    )).mutation(async ({ ctx, input }) => {
      // Enforce max 5 sources per job card (only for new sources)
      if (!input.id) {
        const existing = await db.getPersonalizationSources(input.jobCardId, ctx.user.id);
        if (existing.length >= 5) {
          throw new Error("Maximum 5 personalization sources per job card.");
        }
      }
      const id = await db.upsertPersonalizationSource({
        id: input.id,
        jobCardId: input.jobCardId,
        userId: ctx.user.id,
        sourceType: input.sourceType,
        url: input.url ?? null,
        pastedText: input.pastedText ?? null,
      });
      return { id };
    }),

    delete: protectedProcedure.input(z.object({
      id: z.number(),
    })).mutation(async ({ ctx, input }) => {
      await db.deletePersonalizationSource(input.id, ctx.user.id);
      return { success: true };
    }),
  }),
});

export type AppRouter = typeof appRouter;
