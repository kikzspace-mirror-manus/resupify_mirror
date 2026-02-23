import { adminProcedure, router } from "../_core/trpc";
import { ENV } from "../_core/env";
import { z } from "zod";
import * as db from "../db";
import { featureFlags } from "../../shared/featureFlags";
import { invokeLLM } from "../_core/llm";
import { getRegionPack, getAvailablePacks } from "../../shared/regionPacks";
import { computeSalutation, fixSalutation, buildPersonalizationBlock, stripPersonalizationFromFollowUp, buildContactEmailBlock, fixContactEmail, buildLinkedInBlock, fixLinkedInUrl } from "../../shared/outreachHelpers";
import { buildToneSystemPrompt, sanitizeTone } from "../../shared/toneGuardrails";
import { endpointGroupSchema, eventTypeSchema } from "../../shared/operational-events";
import { sendPurchaseConfirmationEmail } from "../email";

export const adminRouter = router({
  // ─── Dashboard KPIs ──────────────────────────────────────────────
  kpis: adminProcedure.query(async () => {
    return db.adminGetKPIs();
  }),

  // ─── User Management ─────────────────────────────────────────────
  users: router({
    list: adminProcedure.input(z.object({
      search: z.string().optional(),
      limit: z.number().optional().default(50),
      offset: z.number().optional().default(0),
    }).optional()).query(async ({ input }) => {
      return db.adminListUsers(input?.search, input?.limit, input?.offset);
    }),

    detail: adminProcedure.input(z.object({ userId: z.number() })).query(async ({ input }) => {
      return db.adminGetUserDetail(input.userId);
    }),

    grantCredits: adminProcedure.input(z.object({
      userId: z.number(),
      amount: z.number().min(1).max(1000),
    })).mutation(async ({ ctx, input }) => {
      await db.adminGrantCredits(input.userId, input.amount, ctx.user.id);
      await db.logAdminAction(ctx.user.id, "grant_credits", input.userId, { amount: input.amount });
      return { success: true };
    }),

    setAdmin: adminProcedure.input(z.object({
      userId: z.number(),
      isAdmin: z.boolean(),
    })).mutation(async ({ ctx, input }) => {
      await db.adminSetIsAdmin(input.userId, input.isAdmin);
      await db.logAdminAction(ctx.user.id, "set_admin", input.userId, { isAdmin: input.isAdmin });
      return { success: true };
    }),

    setDisabled: adminProcedure.input(z.object({
      userId: z.number(),
      disabled: z.boolean(),
    })).mutation(async ({ ctx, input }) => {
      await db.adminSetDisabled(input.userId, input.disabled);
      await db.logAdminAction(ctx.user.id, "set_disabled", input.userId, { disabled: input.disabled });
      return { success: true };
    }),
  }),

  // ─── Runs & Output QA ────────────────────────────────────────────
  runs: router({
    list: adminProcedure.input(z.object({
      userId: z.number().optional(),
      status: z.string().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      limit: z.number().optional().default(50),
      offset: z.number().optional().default(0),
    }).optional()).query(async ({ input }) => {
      return db.adminListEvidenceRuns({
        userId: input?.userId,
        status: input?.status,
        dateFrom: input?.dateFrom ? new Date(input.dateFrom) : undefined,
        dateTo: input?.dateTo ? new Date(input.dateTo) : undefined,
      }, input?.limit, input?.offset);
    }),

    detail: adminProcedure.input(z.object({ runId: z.number() })).query(async ({ input }) => {
      return db.adminGetEvidenceRunDetail(input.runId);
    }),

    rerunTestMode: adminProcedure.input(z.object({
      jobCardId: z.number(),
      resumeId: z.number(),
    })).mutation(async ({ ctx, input }) => {
      // Admin test mode: no credit deduction
      const jdSnapshot = await db.getLatestJdSnapshot(input.jobCardId);
      if (!jdSnapshot) throw new Error("No JD snapshot found.");
      const resume = await db.getResumeById(input.resumeId, ctx.user.id);
      // For admin, allow reading any resume
      let resumeData = resume;
      if (!resumeData) {
        // Try fetching without user filter for admin
        const dbInstance = await db.getDb();
        if (dbInstance) {
          const { resumes: resumesTable } = await import("../../drizzle/schema");
          const { eq } = await import("drizzle-orm");
          const rows = await dbInstance.select().from(resumesTable).where(eq(resumesTable.id, input.resumeId)).limit(1);
          resumeData = rows[0] ?? null;
        }
      }
      if (!resumeData) throw new Error("Resume not found.");

      const profile = await db.getProfile(ctx.user.id);
      const regionCode = profile?.regionCode ?? "CA";
      const trackCode = profile?.trackCode ?? "NEW_GRAD";
      const pack = getRegionPack(regionCode, trackCode);

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

      // Log admin test run (delta=0, no charge)
      await db.adminLogTestRun(ctx.user.id, "Evidence+ATS run", "evidence_run", runId);
      await db.logAdminAction(ctx.user.id, "admin_test_evidence_run", undefined, { jobCardId: input.jobCardId, resumeId: input.resumeId, runId });

      try {
        // Fetch personalization sources (up to 3 most recent) for this job card
      const personalizationSources = await db.getPersonalizationSources(input.jobCardId, ctx.user.id);
      const topSources = personalizationSources.slice(0, 3);
      const personalizationBlock = buildPersonalizationBlock(topSources);
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

Return a JSON object with:
{
  "overall_score": number (0-100),
  "summary": string,
  "items": [...]
}`
            },
            {
              role: "user",
              content: `JOB DESCRIPTION:\n${jdSnapshot.snapshotText}\n\nRESUME:\n${resumeData.content}`
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

        return { runId, score: parsed.overall_score, itemCount: evidenceItemsData.length, adminTestMode: true };
      } catch (error: any) {
        await db.updateEvidenceRun(runId, { status: "failed" });
        throw new Error(`Evidence scan failed: ${error.message}`);
      }
    }),
  }),

  // ─── Credit & Ledger ─────────────────────────────────────────────
  ledger: router({
    list: adminProcedure.input(z.object({
      userId: z.number().optional(),
      referenceType: z.string().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      limit: z.number().optional().default(100),
      offset: z.number().optional().default(0),
    }).optional()).query(async ({ input }) => {
      return db.adminListLedger({
        userId: input?.userId,
        referenceType: input?.referenceType,
        dateFrom: input?.dateFrom ? new Date(input.dateFrom) : undefined,
        dateTo: input?.dateTo ? new Date(input.dateTo) : undefined,
      }, input?.limit, input?.offset);
    }),
  }),

  // ─── Content/Pack Management (read-only V1) ──────────────────────
  packs: router({
    list: adminProcedure.query(() => {
      const packs = getAvailablePacks();
      return packs.map(p => {
        const parts = p.key.split("_");
        const regionCode = parts[0];
        const trackCode = parts.slice(1).join("_");
        return {
          ...p,
          regionCode,
          trackCode,
          packData: getRegionPack(regionCode, trackCode),
        };
      });
    }),
    detail: adminProcedure.input(z.object({
      regionCode: z.string(),
      trackCode: z.string(),
    })).query(({ input }) => {
      const pack = getRegionPack(input.regionCode, input.trackCode);
      return {
        pack,
        rawJson: JSON.stringify(pack, null, 2),
        lastUpdated: new Date().toISOString(), // In V1, packs are static
      };
    }),
  }),

  // ─── System Health ───────────────────────────────────────────────
  health: router({
    overview: adminProcedure.query(async () => {
      const dbInstance = await db.getDb();
      const dbConnected = !!dbInstance;
      // Get recent failed runs
      const { runs: failedRuns } = await db.adminListEvidenceRuns({ status: "failed" }, 10);
      // Get admin action logs
      const recentActions = await db.getAdminActionLogs(20);
      return {
        dbConnected,
        failedRuns,
        recentActions,
        serverUptime: process.uptime(),
        nodeVersion: process.version,
        memoryUsage: process.memoryUsage(),
      };
    }),
  }),

  // ─── Test Sandbox ────────────────────────────────────────────────
  sandbox: router({
    createSampleJobCard: adminProcedure.mutation(async ({ ctx }) => {
      const sampleJd = `Kensington Tours – Intern, Brand Marketing

About the Role:
Join our award-winning marketing team for a 4-month co-op placement. You'll support brand campaigns, social media content creation, and market research for luxury travel experiences.

Requirements:
- Currently enrolled in a Marketing, Communications, or Business program at a Canadian university
- Strong written and verbal communication skills
- Experience with social media platforms (Instagram, TikTok, LinkedIn)
- Proficiency in Canva, Adobe Creative Suite, or similar design tools
- Understanding of SEO basics and Google Analytics
- Detail-oriented with ability to manage multiple projects
- Creative thinker with passion for travel and storytelling

Nice to have:
- Previous internship or co-op experience in marketing
- Knowledge of email marketing platforms (Mailchimp, HubSpot)
- Photography or video editing skills

Location: Toronto, ON (Hybrid)
Duration: 4 months (Summer 2026)
Compensation: $20/hr`;

      const id = await db.createJobCard({
        userId: ctx.user.id,
        title: "Intern, Brand Marketing",
        company: "Kensington Tours",
        location: "Toronto, ON",
        url: "https://kensingtontours.com/careers",
        stage: "bookmarked",
        priority: "high",
        season: "summer",
        jobType: "internship",
        notes: "[ADMIN SANDBOX SAMPLE]",
      } as any);

      if (id) {
        await db.createJdSnapshot({
          jobCardId: id,
          snapshotText: sampleJd,
          sourceUrl: "https://kensingtontours.com/careers",
        });
      }

      await db.logAdminAction(ctx.user.id, "sandbox_create_sample_job", undefined, { jobCardId: id });
      return { jobCardId: id };
    }),

    createSampleResume: adminProcedure.mutation(async ({ ctx }) => {
      const sampleResume = `ALEX CHEN
Toronto, ON | alex.chen@university.ca | linkedin.com/in/alexchen

EDUCATION
University of Toronto – Bachelor of Commerce (BComm)
Major: Marketing & Strategy | Expected Graduation: April 2027
GPA: 3.6/4.0 | Dean's List 2024, 2025

RELEVANT EXPERIENCE
Marketing Assistant (Volunteer) | UofT Student Union | Sep 2024 – Apr 2025
- Created social media content for Instagram and TikTok reaching 5,000+ followers
- Designed event posters and promotional materials using Canva
- Coordinated email campaigns for 3 major campus events using Mailchimp

Content Creator | Personal Blog – "Wanderlust Diaries" | Jan 2024 – Present
- Write weekly travel and lifestyle articles averaging 500+ monthly readers
- Manage SEO optimization resulting in 40% increase in organic traffic
- Edit photos and short-form videos for Instagram and TikTok

PROJECTS
Digital Marketing Campaign – Course Project | Jan 2025
- Developed a full digital marketing strategy for a local Toronto restaurant
- Conducted market research and competitor analysis
- Created mock social media ads and measured projected ROI

SKILLS
Tools: Canva, Adobe Photoshop, Google Analytics, Mailchimp, Microsoft Office
Social Media: Instagram, TikTok, LinkedIn, Twitter/X
Languages: English (Native), Mandarin (Conversational)

EXTRACURRICULAR
- UofT Marketing Club – VP Communications
- Volunteer photographer for campus events`;

      const id = await db.createResume({
        userId: ctx.user.id,
        title: "[SAMPLE] Alex Chen – Marketing Resume",
        content: sampleResume,
      });

      await db.logAdminAction(ctx.user.id, "sandbox_create_sample_resume", undefined, { resumeId: id });
      return { resumeId: id };
    }),

    runEvidenceTestMode: adminProcedure.input(z.object({
      jobCardId: z.number(),
      resumeId: z.number(),
    })).mutation(async ({ ctx, input }) => {
      // Delegates to the runs.rerunTestMode but we keep it here for sandbox convenience
      const jdSnapshot = await db.getLatestJdSnapshot(input.jobCardId);
      if (!jdSnapshot) throw new Error("No JD snapshot found. Create a sample job card first.");

      const dbInstance = await db.getDb();
      let resumeData = null;
      if (dbInstance) {
        const { resumes: resumesTable } = await import("../../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const rows = await dbInstance.select().from(resumesTable).where(eq(resumesTable.id, input.resumeId)).limit(1);
        resumeData = rows[0] ?? null;
      }
      if (!resumeData) throw new Error("Resume not found. Create a sample resume first.");

      const profile = await db.getProfile(ctx.user.id);
      const regionCode = profile?.regionCode ?? "CA";
      const trackCode = profile?.trackCode ?? "COOP";
      const pack = getRegionPack(regionCode, trackCode);

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

      // Admin test mode: delta=0
      await db.adminLogTestRun(ctx.user.id, "Sandbox Evidence+ATS run", "evidence_run", runId);
      await db.logAdminAction(ctx.user.id, "sandbox_evidence_run", undefined, { jobCardId: input.jobCardId, resumeId: input.resumeId, runId });

      try {
        const llmResult = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are an expert ATS resume analyzer for ${pack.label} track. Analyze the job description against the resume. Return JSON with overall_score (0-100), summary, and items array.

Each item: { group_type, jd_requirement, resume_proof (or null), status (matched/partial/missing), fix, rewrite_a, rewrite_b, why_it_matters, needs_confirmation }`
            },
            {
              role: "user",
              content: `JOB DESCRIPTION:\n${jdSnapshot.snapshotText}\n\nRESUME:\n${resumeData.content}`
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
                  overall_score: { type: "integer" },
                  summary: { type: "string" },
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

        return { runId, score: parsed.overall_score, itemCount: evidenceItemsData.length, adminTestMode: true };
      } catch (error: any) {
        await db.updateEvidenceRun(runId, { status: "failed" });
        throw new Error(`Sandbox evidence scan failed: ${error.message}`);
      }
    }),

    generateOutreachTestMode: adminProcedure.input(z.object({
      jobCardId: z.number(),
      contactName: z.string().optional(),
      contactEmail: z.string().email().optional(),
      contactLinkedInUrl: z.string().url().optional(),
    })).mutation(async ({ ctx, input }) => {
      const jobCard = await db.getJobCardById(input.jobCardId, ctx.user.id);
      if (!jobCard) throw new Error("Job card not found.");

      const jdSnapshot = await db.getLatestJdSnapshot(input.jobCardId);
      const profile = await db.getProfile(ctx.user.id);
      const pack = getRegionPack(profile?.regionCode ?? "CA", profile?.trackCode ?? "COOP");
      // Resolve contact name, email, and LinkedIn URL for deterministic salutation (Fix 1/4), To: line (Fix 2/4), and LinkedIn: line (Fix 3/4)
      const emailSalutation = computeSalutation(input.contactName ?? null, "email");
      const linkedinSalutation = computeSalutation(input.contactName ?? null, "linkedin");
      const contactEmailBlock = buildContactEmailBlock(input.contactEmail ?? null);
      const linkedInBlock = buildLinkedInBlock(input.contactLinkedInUrl ?? null);
      // Build signature lines from real profile fields (same as production, Prompt B1)
      const sigLines: string[] = [];
      if (profile?.phone) sigLines.push(`Phone: ${profile.phone}`);
      if (profile?.linkedinUrl) sigLines.push(`LinkedIn: ${profile.linkedinUrl}`);
      const signatureBlock = sigLines.length > 0
        ? `\nSignature lines to include:\n${sigLines.join("\n")}`
        : "\nDo NOT include any phone or LinkedIn placeholder lines in the signature.";
      // Admin test mode: delta=0
      await db.adminLogTestRun(ctx.user.id, "Sandbox Outreach Pack generation", "outreach_pack");
      await db.logAdminAction(ctx.user.id, "sandbox_outreach_pack", undefined, { jobCardId: input.jobCardId });
      // Fetch personalization sources (up to 3 most recent) for this job card
      const personalizationSources = await db.getPersonalizationSources(input.jobCardId, ctx.user.id);
      const topSources = personalizationSources.slice(0, 3);
      const personalizationBlock = buildPersonalizationBlock(topSources);
      const llmResult = await invokeLLM({
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
      // Strip bracket placeholders and fix salutation (parity with production)
      const stripBrackets = (text: string) =>
        text
          .replace(/\[Your Phone Number\]/gi, "")
          .replace(/\[Your LinkedIn Profile URL\]/gi, "")
          .replace(/\[Your LinkedIn URL\]/gi, "")
          .replace(/\[LinkedIn Profile\]/gi, "")
          .replace(/\[Phone\]/gi, "")
          .replace(/\[[^\]]{1,60}\]/g, "")
          .replace(/\n{3,}/g, "\n\n")
          .trim();
      const parsed = {
        recruiter_email: fixContactEmail(sanitizeTone(fixSalutation(stripBrackets(rawParsed.recruiter_email ?? ""), "email"), false), input.contactEmail ?? null),
        linkedin_dm: fixLinkedInUrl(sanitizeTone(fixSalutation(stripBrackets(rawParsed.linkedin_dm ?? ""), "linkedin"), false), input.contactLinkedInUrl ?? null),
        follow_up_1: sanitizeTone(stripPersonalizationFromFollowUp(fixSalutation(stripBrackets(rawParsed.follow_up_1 ?? ""), "email")), true),
        follow_up_2: sanitizeTone(stripPersonalizationFromFollowUp(fixSalutation(stripBrackets(rawParsed.follow_up_2 ?? ""), "email")), true),
      };

      const packId = await db.createOutreachPack({
        userId: ctx.user.id,
        jobCardId: input.jobCardId,
        recruiterEmail: parsed.recruiter_email,
        linkedinDm: parsed.linkedin_dm,
        followUp1: parsed.follow_up_1,
        followUp2: parsed.follow_up_2,
      });

      return { id: packId, ...parsed, adminTestMode: true };
    }),
  }),

  // ─── Audit Logs ──────────────────────────────────────────────────
  auditLogs: adminProcedure.input(z.object({
    limit: z.number().optional().default(100),
  }).optional()).query(async ({ input }) => {
    return db.getAdminActionLogs(input?.limit ?? 100);
  }),

  // ─── LLM Status (Admin LLM Status patch) ──────────────────────────
  // Returns active provider + model. No secrets. Admin-only.
  llmStatus: router({
    get: adminProcedure.query(() => ({
      provider: ENV.LLM_PROVIDER,
      openaiModel: ENV.LLM_MODEL_OPENAI,
    })),
  }),
  // ─── Stripe Events (Phase 10C-2) ──────────────────────────────────
  // Read-only, admin-only. Returns stripe_events table rows only.
  // No joins, no PII, no free text.
  stripeEvents: router({
    list: adminProcedure.input(z.object({
      status: z.enum(["processed", "manual_review", "skipped"]).optional(),
      eventType: z.string().max(128).optional(),
      limit: z.number().min(1).max(500).optional().default(100),
      offset: z.number().min(0).optional().default(0),
    }).optional()).query(async ({ input }) => {
      return db.adminListStripeEvents({
        status: input?.status,
        eventType: input?.eventType,
        limit: input?.limit ?? 100,
        offset: input?.offset ?? 0,
      });
    }),
  }),
  // ─── Operational Events (Phase 10B-2B) ───────────────────────────
  // Read-only, admin-only. Returns non-PII operational signals.
  // No payload, no names, no emails — only hashes + enum fields.
  operationalEvents: router({
    list: adminProcedure.input(z.object({
      endpointGroup: endpointGroupSchema.optional(),
      eventType: eventTypeSchema.optional(),
      limit: z.number().min(1).max(500).optional().default(100),
      offset: z.number().min(0).optional().default(0),
    }).optional()).query(async ({ input }) => {
      return db.adminListOperationalEvents({
        endpointGroup: input?.endpointGroup,
        eventType: input?.eventType,
        limit: input?.limit ?? 100,
        offset: input?.offset ?? 0,
      });
    }),
  }),
  // ─── Growth Dashboard (V2 Phase 1B.2) ──────────────────────────
  growth: router({
    kpis: adminProcedure.query(async () => {
      const analyticsEnabled = featureFlags.v2AnalyticsEnabled;
      if (!featureFlags.v2GrowthDashboardEnabled) {
        return { enabled: false, analyticsEnabled, data: null };
      }
      const [wau, mau, newUsers7d, newUsers30d, activatedUsers7d, funnel7d, p95Latency7d, outcomes, errorCount7d, instrumentationHealth] = await Promise.all([
        db.getWAU(),
        db.getMAU(),
        db.getNewUsers(7),   // DB ground truth (users.createdAt)
        db.getNewUsers(30),  // DB ground truth (users.createdAt)
        db.getActivatedUsers7d(),
        db.getFunnelCompletion7d(),
        db.getP95AiLatency7d(),
        db.getOutcomeCounts(),
        db.getErrorCount7d(),
        db.getInstrumentationHealth24h(),
      ]);
      return {
        enabled: true,
        analyticsEnabled,
        data: {
          wau,
          mau,
          newUsers7d,
          newUsers30d,
          activatedUsers7d,
          // null = N/A (avoid divide-by-zero when no new users)
          activationRate7d: newUsers7d > 0 ? Math.round((activatedUsers7d / newUsers7d) * 100) : null,
          funnel7d,
          p95LatencyMs7d: p95Latency7d,
          outcomes,
          errorCount7d,
          instrumentationHealth,
        },
      };
    }),
  }),
  // --- Growth Timeline ---
  timeline: router({
    daily: adminProcedure.input(z.object({
      rangeDays: z.union([z.literal(7), z.literal(14), z.literal(30)]).default(7),
    })).query(async ({ input }) => {
      if (!featureFlags.v2GrowthDashboardEnabled) {
        return { enabled: false, data: null };
      }
      const data = await db.getDailyMetrics(input.rangeDays);
      return { enabled: true, data };
    }),
  }),
  // --- Early Access (Phase 10F-1) ---
  // Admin-only toggle to grant/revoke earlyAccessEnabled on a user.
  earlyAccess: router({
    lookupByEmail: adminProcedure.input(z.object({
      email: z.string().email().max(320),
    })).query(async ({ input }) => {
      return db.adminGetUserByEmail(input.email);
    }),
    setAccess: adminProcedure.input(z.object({
      userId: z.number().int().positive(),
      enabled: z.boolean(),
    })).mutation(async ({ input, ctx }) => {
      const { creditsGranted } = await db.adminSetEarlyAccess(input.userId, input.enabled);
      await db.logAdminAction(ctx.user.id, input.enabled ? "early_access_granted" : "early_access_revoked", input.userId);
      return { success: true, userId: input.userId, enabled: input.enabled, creditsGranted };
    }),
  }),
  // ─── Refund Queue (Phase 11D) ──────────────────────────────────────────────────
  // Admin-only endpoints for reviewing and processing Stripe refunds.
  refunds: router({
    // List all refund queue items, optionally filtered by status
    list: adminProcedure.input(z.object({
      status: z.enum(["pending", "processed", "ignored"]).optional(),
    }).optional()).query(async ({ input }) => {
      return db.listRefundQueueItems(input?.status);
    }),
    // Process a refund: debit credits and mark as processed
    process: adminProcedure.input(z.object({
      refundQueueId: z.number().int().positive(),
      debitAmount: z.number().int().min(0).max(1000),
    })).mutation(async ({ ctx, input }) => {
      const { refundQueueId, debitAmount } = input;
      // Fetch the item to build the ledger reason
      const items = await db.listRefundQueueItems();
      const item = items.find((r) => r.id === refundQueueId);
      if (!item) throw new Error(`Refund queue item ${refundQueueId} not found`);
      if (item.status !== "pending") {
        return { success: false, alreadyProcessed: true };
      }
      const reason = item.packId
        ? `Refund: ${item.packId} (${item.stripeRefundId})`
        : `Refund (${item.stripeRefundId})`;
      const ledgerEntryId = await db.processRefundQueueItem(
        refundQueueId,
        ctx.user.id,
        debitAmount,
        reason
      );
      await db.logAdminAction(ctx.user.id, "refund_processed", item.userId ?? undefined, {
        refundQueueId,
        debitAmount,
        stripeRefundId: item.stripeRefundId,
        ledgerEntryId,
      });
      return { success: true, ledgerEntryId };
    }),
    // Ignore a refund queue item with a required reason
    ignore: adminProcedure.input(z.object({
      refundQueueId: z.number().int().positive(),
      reason: z.string().min(1).max(512),
    })).mutation(async ({ ctx, input }) => {
      const { refundQueueId, reason } = input;
      const items = await db.listRefundQueueItems();
      const item = items.find((r) => r.id === refundQueueId);
      if (!item) throw new Error(`Refund queue item ${refundQueueId} not found`);
      if (item.status !== "pending") {
        return { success: false, alreadyProcessed: true };
      }
      await db.ignoreRefundQueueItem(refundQueueId, ctx.user.id, reason);
      await db.logAdminAction(ctx.user.id, "refund_ignored", item.userId ?? undefined, {
        refundQueueId,
        reason,
        stripeRefundId: item.stripeRefundId,
      });
      return { success: true };
    }),
  }),
  // ─── Admin Billing: Retry purchase confirmation email ────────────────────────
  billing: router({
    listReceipts: adminProcedure
      .input(z.object({
        userId: z.number().int().positive().optional(),
        emailSentAt: z.enum(["sent", "unsent"]).optional(),
        query: z.string().optional(),
        limit: z.number().int().min(1).max(200).default(100),
        offset: z.number().int().min(0).default(0),
      }))
      .query(async ({ input }) => {
        return db.adminListPurchaseReceipts(
          { userId: input.userId, emailSentAt: input.emailSentAt, query: input.query },
          input.limit,
          input.offset
        );
      }),
    retryReceiptEmail: adminProcedure
      .input(z.object({ receiptId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const receipt = await db.getPurchaseReceiptById(input.receiptId);
        if (!receipt) {
          return { status: "not_found" as const };
        }
        // Idempotency guard: already sent
        if (receipt.emailSentAt !== null) {
          return { status: "already_sent" as const };
        }
        const user = await db.getUserById(receipt.userId);
        if (!user?.email) {
          return { status: "failed" as const, error: "User email missing" };
        }
        const balance = await db.getCreditsBalance(receipt.userId);
        const result = await sendPurchaseConfirmationEmail({
          toEmail: user.email,
          receiptId: receipt.id,
          packId: receipt.packId,
          creditsAdded: receipt.creditsAdded,
          amountCents: receipt.amountCents,
          currency: receipt.currency,
          purchasedAt: receipt.createdAt,
          stripeCheckoutSessionId: receipt.stripeCheckoutSessionId,
          newBalance: balance,
        });
        if (result.sent) {
          await db.markReceiptEmailSent(receipt.id);
          await db.logAdminAction(ctx.user.id, "receipt_email_retried", receipt.userId, {
            receiptId: receipt.id,
            status: "sent",
          });
          return { status: "sent" as const };
        } else {
          await db.markReceiptEmailError(receipt.id, result.error);
          await db.logAdminAction(ctx.user.id, "receipt_email_retry_failed", receipt.userId, {
            receiptId: receipt.id,
            error: result.error,
          });
          return { status: "failed" as const, error: result.error };
        }
      }),
  }),

  // ─── Ops Status (Phase 12E.1) ─────────────────────────────────────────────
  ops: router({
    /** Return the current ops_status row, or null if no events have been processed yet. */
    getStatus: adminProcedure.query(async () => {
      const row = await db.getOpsStatus();
      if (!row) return null;
      return {
        lastStripeWebhookSuccessAt: row.lastStripeWebhookSuccessAt ?? null,
        lastStripeWebhookFailureAt: row.lastStripeWebhookFailureAt ?? null,
        lastStripeWebhookEventId: row.lastStripeWebhookEventId ?? null,
        lastStripeWebhookEventType: row.lastStripeWebhookEventType ?? null,
        updatedAt: row.updatedAt,
      };
    }),
    /** Paginated read-only list of stripe_events (newest first). Admin-only. */
    listStripeEvents: adminProcedure
      .input(
        z.object({
          limit: z.number().int().min(1).max(50).default(20),
          cursor: z.number().int().optional(),
        })
      )
      .query(async ({ input }) => {
        const { items, nextCursor } = await db.getStripeEventsPage(input.limit, input.cursor);
        return {
          items: items.map((e) => ({
            eventId: e.stripeEventId,
            eventType: e.eventType,
            status: e.status,
            userId: e.userId ?? null,
            creditsPurchased: e.creditsPurchased ?? null,
            createdAt: e.createdAt,
          })),
          nextCursor,
        };
      }),
  }),
});
