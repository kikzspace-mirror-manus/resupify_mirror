import { adminProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import { invokeLLM } from "../_core/llm";
import { getRegionPack, getAvailablePacks } from "../../shared/regionPacks";

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
    })).mutation(async ({ ctx, input }) => {
      const jobCard = await db.getJobCardById(input.jobCardId, ctx.user.id);
      if (!jobCard) throw new Error("Job card not found.");

      const jdSnapshot = await db.getLatestJdSnapshot(input.jobCardId);
      const profile = await db.getProfile(ctx.user.id);
      const pack = getRegionPack(profile?.regionCode ?? "CA", profile?.trackCode ?? "COOP");

      // Admin test mode: delta=0
      await db.adminLogTestRun(ctx.user.id, "Sandbox Outreach Pack generation", "outreach_pack");
      await db.logAdminAction(ctx.user.id, "sandbox_outreach_pack", undefined, { jobCardId: input.jobCardId });

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
});
