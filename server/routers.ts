import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { invokeLLM } from "./_core/llm";
import { getRegionPack, getAvailablePacks } from "../shared/regionPacks";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";
import { adminRouter } from "./routers/admin";

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

export const appRouter = router({
  system: systemRouter,
  admin: adminRouter,

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
      regionCode: z.string().optional(),
      trackCode: z.enum(["COOP", "NEW_GRAD"]).optional(),
      school: z.string().optional(),
      program: z.string().optional(),
      graduationDate: z.string().optional(),
      currentlyEnrolled: z.boolean().optional(),
      onboardingComplete: z.boolean().optional(),
    })).mutation(async ({ ctx, input }) => {
      await db.upsertProfile(ctx.user.id, input);
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
      title: z.string().min(1),
      content: z.string().min(1),
    })).mutation(async ({ ctx, input }) => {
      const id = await db.createResume({ userId: ctx.user.id, title: input.title, content: input.content });
      return { id };
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      title: z.string().optional(),
      content: z.string().optional(),
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
      title: z.string().min(1),
      content: z.string().min(1),
      fileName: z.string(),
      fileBase64: z.string(),
      mimeType: z.string(),
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
      title: z.string().min(1),
      company: z.string().optional(),
      location: z.string().optional(),
      url: z.string().optional(),
      stage: z.enum(["bookmarked", "applying", "applied", "interviewing", "offered", "rejected", "archived"]).optional(),
      priority: z.enum(["low", "medium", "high"]).optional(),
      season: z.enum(["fall", "winter", "summer", "year_round"]).optional(),
      notes: z.string().optional(),
      salary: z.string().optional(),
      jobType: z.string().optional(),
      dueDate: z.string().optional(),
      jdText: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      const { jdText, dueDate, ...cardData } = input;
      const id = await db.createJobCard({
        userId: ctx.user.id,
        ...cardData,
        dueDate: dueDate ? new Date(dueDate) : undefined,
      } as any);
      if (id && jdText) {
        await db.createJdSnapshot({ jobCardId: id, snapshotText: jdText, sourceUrl: input.url ?? null });
      }
      return { id };
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      title: z.string().optional(),
      company: z.string().optional(),
      location: z.string().optional(),
      url: z.string().optional(),
      stage: z.enum(["bookmarked", "applying", "applied", "interviewing", "offered", "rejected", "archived"]).optional(),
      priority: z.enum(["low", "medium", "high"]).optional(),
      season: z.enum(["fall", "winter", "summer", "year_round"]).optional(),
      notes: z.string().optional(),
      salary: z.string().optional(),
      jobType: z.string().optional(),
      nextTouchAt: z.string().nullable().optional(),
      dueDate: z.string().nullable().optional(),
    })).mutation(async ({ ctx, input }) => {
      const { id, nextTouchAt, dueDate, ...rest } = input;
      const updateData: any = { ...rest };
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

      // Stage change: Applied → auto-create follow-up task in 5 business days
      if (input.stage === "applied" && currentCard && currentCard.stage !== "applied") {
        const followUpDate = addBusinessDays(new Date(), 5);
        await db.updateJobCard(id, ctx.user.id, { appliedAt: new Date() });
        await db.createTask({
          userId: ctx.user.id,
          jobCardId: id,
          title: `Follow up after applying: ${currentCard.title}`,
          taskType: "follow_up",
          dueDate: followUpDate,
        });
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
      snapshotText: z.string().min(1),
      sourceUrl: z.string().optional(),
    })).mutation(async ({ input }) => {
      const id = await db.createJdSnapshot({
        jobCardId: input.jobCardId,
        snapshotText: input.snapshotText,
        sourceUrl: input.sourceUrl ?? null,
      });
      return { id };
    }),
  }),

  // ─── Evidence Scan ─────────────────────────────────────────────────
  evidence: router({
    runs: protectedProcedure.input(z.object({ jobCardId: z.number() })).query(async ({ input }) => {
      return db.getEvidenceRuns(input.jobCardId);
    }),
    items: protectedProcedure.input(z.object({ evidenceRunId: z.number() })).query(async ({ input }) => {
      return db.getEvidenceItems(input.evidenceRunId);
    }),
    run: protectedProcedure.input(z.object({
      jobCardId: z.number(),
      resumeId: z.number(),
    })).mutation(async ({ ctx, input }) => {
      // Check credits
      const balance = await db.getCreditsBalance(ctx.user.id);
      if (balance < 1) {
        throw new Error("Insufficient credits. You need 1 credit for an Evidence+ATS run.");
      }

      // Get JD snapshot and resume
      const jdSnapshot = await db.getLatestJdSnapshot(input.jobCardId);
      if (!jdSnapshot) throw new Error("No JD snapshot found. Please add a job description first.");

      const resume = await db.getResumeById(input.resumeId, ctx.user.id);
      if (!resume) throw new Error("Resume not found.");

      // Get user profile for region/track
      const profile = await db.getProfile(ctx.user.id);
      const regionCode = profile?.regionCode ?? "CA";
      const trackCode = profile?.trackCode ?? "NEW_GRAD";
      const pack = getRegionPack(regionCode, trackCode);

      // Create evidence run
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

      // Spend credit
      const spent = await db.spendCredits(ctx.user.id, 1, "Evidence+ATS run", "evidence_run", runId);
      if (!spent) throw new Error("Failed to spend credit.");

      // Build eligibility context
      const eligibilityContext = pack.eligibilityChecks.map(check => {
        const profileValue = profile ? (profile as any)[check.field] : null;
        return `- ${check.label}: ${profileValue ? "Present" : "MISSING"} ${!profileValue && check.required ? `(RISK: ${check.riskMessage})` : ""}`;
      }).join("\n");

      // Call LLM
      try {
        const llmResult = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are an expert ATS resume analyzer for ${pack.label} track. Analyze the job description against the resume and produce evidence items.

SCORING WEIGHTS: Eligibility=${pack.scoringWeights.eligibility}, Tools=${pack.scoringWeights.tools}, Responsibilities=${pack.scoringWeights.responsibilities}, Skills=${pack.scoringWeights.skills}, Soft Skills=${pack.scoringWeights.softSkills}

RULES:
- Generate 10-20 evidence items
- Group by type: eligibility, tools, responsibilities, skills, soft_skills
- For each item, provide: jd_requirement, resume_proof (or null if none found), status (matched/partial/missing), fix, rewrite_a, rewrite_b, why_it_matters
- If a rewrite adds a claim not in the resume, set needs_confirmation=true
- ${pack.copyRules.noInventedFacts ? "NEVER invent facts not in the resume." : ""}
- ${pack.copyRules.noExperienceHelper ? "If no relevant experience, convert projects/clubs/volunteering into bullets." : ""}

USER PROFILE ELIGIBILITY:
${eligibilityContext}

Return a JSON object with:
{
  "overall_score": number (0-100),
  "summary": string,
  "items": [
    {
      "group_type": "eligibility"|"tools"|"responsibilities"|"skills"|"soft_skills",
      "jd_requirement": string,
      "resume_proof": string|null,
      "status": "matched"|"partial"|"missing",
      "fix": string,
      "rewrite_a": string,
      "rewrite_b": string,
      "why_it_matters": string,
      "needs_confirmation": boolean
    }
  ]
}`
            },
            {
              role: "user",
              content: `JOB DESCRIPTION:\n${jdSnapshot.snapshotText}\n\nRESUME:\n${resume.content}`
            }
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "evidence_scan",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  overall_score: { type: "integer", description: "Overall ATS match score 0-100" },
                  summary: { type: "string", description: "Brief summary of the analysis" },
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
                    }
                  }
                },
                required: ["overall_score", "summary", "items"],
                additionalProperties: false,
              }
            }
          }
        });

        const content = llmResult.choices[0]?.message?.content;
        const parsed = JSON.parse(typeof content === "string" ? content : "{}");

        // Save evidence items
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
        await db.updateEvidenceRun(runId, {
          overallScore: parsed.overall_score ?? 0,
          summary: parsed.summary ?? "",
          status: "completed",
          completedAt: new Date(),
        });

        // Auto-create tasks after evidence run
        const jobCard = await db.getJobCardById(input.jobCardId, ctx.user.id);
        if (jobCard) {
          await db.createTask({
            userId: ctx.user.id,
            jobCardId: input.jobCardId,
            title: `Review evidence scan results: ${jobCard.title}`,
            taskType: "review_evidence",
          });
        }

        return { runId, score: parsed.overall_score, itemCount: evidenceItemsData.length };
      } catch (error: any) {
        await db.updateEvidenceRun(runId, { status: "failed" });
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

      const results: { jobCardId: number; runId: number | null; error?: string }[] = [];
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
          const llmResult = await invokeLLM({
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
          results.push({ jobCardId, runId });
        } catch (error: any) {
          results.push({ jobCardId, runId: null, error: error.message });
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
      title: z.string().min(1),
      description: z.string().optional(),
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
      title: z.string().optional(),
      description: z.string().optional(),
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
  }),

  // ─── Contacts ─────────────────────────────────────────────────────
  contacts: router({
    list: protectedProcedure.input(z.object({
      jobCardId: z.number().optional(),
    }).optional()).query(async ({ ctx, input }) => {
      return db.getContacts(ctx.user.id, input?.jobCardId);
    }),
    create: protectedProcedure.input(z.object({
      jobCardId: z.number().optional(),
      name: z.string().min(1),
      role: z.string().optional(),
      company: z.string().optional(),
      email: z.string().optional(),
      linkedinUrl: z.string().optional(),
      phone: z.string().optional(),
      notes: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      const id = await db.createContact({ userId: ctx.user.id, ...input } as any);
      return { id };
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      name: z.string().optional(),
      role: z.string().optional(),
      company: z.string().optional(),
      email: z.string().optional(),
      linkedinUrl: z.string().optional(),
      phone: z.string().optional(),
      notes: z.string().optional(),
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
      subject: z.string().optional(),
      channel: z.enum(["email", "linkedin", "other"]).optional(),
    })).mutation(async ({ ctx, input }) => {
      const id = await db.createOutreachThread({ userId: ctx.user.id, ...input });
      return { id };
    }),
    addMessage: protectedProcedure.input(z.object({
      threadId: z.number(),
      content: z.string().min(1),
      direction: z.enum(["sent", "received"]).optional(),
      messageType: z.enum(["recruiter_email", "linkedin_dm", "follow_up_1", "follow_up_2", "custom"]).optional(),
    })).mutation(async ({ input }) => {
      const id = await db.createOutreachMessage(input);
      return { id };
    }),
    pack: protectedProcedure.input(z.object({ jobCardId: z.number() })).query(async ({ ctx, input }) => {
      return db.getOutreachPack(input.jobCardId, ctx.user.id);
    }),
    generatePack: protectedProcedure.input(z.object({
      jobCardId: z.number(),
    })).mutation(async ({ ctx, input }) => {
      // Check credits
      const balance = await db.getCreditsBalance(ctx.user.id);
      if (balance < 1) throw new Error("Insufficient credits. Outreach Pack costs 1 credit.");

      const jobCard = await db.getJobCardById(input.jobCardId, ctx.user.id);
      if (!jobCard) throw new Error("Job card not found.");

      const jdSnapshot = await db.getLatestJdSnapshot(input.jobCardId);
      const profile = await db.getProfile(ctx.user.id);
      const pack = getRegionPack(profile?.regionCode ?? "CA", profile?.trackCode ?? "NEW_GRAD");

      const llmResult = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `Generate an outreach pack for a ${pack.label} job application. Tone: ${pack.templates.outreachTone}. Return JSON with recruiter_email, linkedin_dm, follow_up_1, follow_up_2.`
          },
          {
            role: "user",
            content: `Job: ${jobCard.title} at ${jobCard.company ?? "Unknown Company"}\n${jdSnapshot ? `JD: ${jdSnapshot.snapshotText.substring(0, 2000)}` : ""}\nApplicant: ${ctx.user.name ?? "Student"}, ${profile?.program ?? ""} at ${profile?.school ?? ""}`
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
      const parsed = JSON.parse(typeof content === "string" ? content : "{}");

      const spent = await db.spendCredits(ctx.user.id, 1, "Outreach Pack generation", "outreach_pack");
      if (!spent) throw new Error("Failed to spend credit.");

      const packId = await db.createOutreachPack({
        userId: ctx.user.id,
        jobCardId: input.jobCardId,
        recruiterEmail: parsed.recruiter_email,
        linkedinDm: parsed.linkedin_dm,
        followUp1: parsed.follow_up_1,
        followUp2: parsed.follow_up_2,
      });

      return { id: packId, ...parsed };
    }),
  }),

  // ─── Analytics ────────────────────────────────────────────────────
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
});

export type AppRouter = typeof appRouter;
