import { describe, expect, it, vi, beforeEach } from "vitest";
import { getRegionPack, getAvailablePacks, STAGES, STAGE_LABELS, EVIDENCE_GROUP_TYPES } from "../shared/regionPacks";

// ─── Region Pack Tests ──────────────────────────────────────────────
describe("Region Packs", () => {
  describe("getAvailablePacks", () => {
    it("returns CA_COOP and CA_NEW_GRAD packs", () => {
      const packs = getAvailablePacks();
      expect(packs).toHaveLength(2);
      expect(packs.map(p => p.key)).toContain("CA_COOP");
      expect(packs.map(p => p.key)).toContain("CA_NEW_GRAD");
    });

    it("each pack has a key and label", () => {
      const packs = getAvailablePacks();
      packs.forEach(pack => {
        expect(pack.key).toBeTruthy();
        expect(pack.label).toBeTruthy();
      });
    });
  });

  describe("getRegionPack", () => {
    it("returns CA_COOP pack for CA + COOP", () => {
      const pack = getRegionPack("CA", "COOP");
      expect(pack.regionCode).toBe("CA");
      expect(pack.trackCode).toBe("COOP");
      expect(pack.label).toBe("Canada — Co-op");
    });

    it("returns CA_NEW_GRAD pack for CA + NEW_GRAD", () => {
      const pack = getRegionPack("CA", "NEW_GRAD");
      expect(pack.regionCode).toBe("CA");
      expect(pack.trackCode).toBe("NEW_GRAD");
      expect(pack.label).toBe("Canada — New Graduate");
    });

    it("falls back to CA_NEW_GRAD for unknown pack", () => {
      const pack = getRegionPack("US", "INTERN");
      expect(pack.regionCode).toBe("CA");
      expect(pack.trackCode).toBe("NEW_GRAD");
    });
  });

  describe("CA_COOP pack structure", () => {
    const pack = getRegionPack("CA", "COOP");

    it("has education-first resume defaults", () => {
      expect(pack.resumeDefaults.educationFirst).toBe(true);
      expect(pack.resumeDefaults.maxPages).toBe(1);
      expect(pack.resumeDefaults.includeObjective).toBe(false);
    });

    it("has correct scoring weights that sum to ~1.0", () => {
      const weights = pack.scoringWeights;
      const sum = weights.eligibility + weights.tools + weights.responsibilities + weights.skills + weights.softSkills;
      expect(sum).toBeCloseTo(1.0, 1);
    });

    it("has eligibility checks for co-op requirements", () => {
      expect(pack.eligibilityChecks.length).toBeGreaterThanOrEqual(3);
      const fields = pack.eligibilityChecks.map(c => c.field);
      expect(fields).toContain("currentlyEnrolled");
      expect(fields).toContain("school");
      expect(fields).toContain("program");
    });

    it("has school cycles for co-op terms", () => {
      expect(pack.schoolCycles).toHaveLength(3);
      const codes = pack.schoolCycles.map(c => c.code);
      expect(codes).toContain("fall");
      expect(codes).toContain("winter");
      expect(codes).toContain("summer");
    });

    it("enforces no-invented-facts copy rule", () => {
      expect(pack.copyRules.noInventedFacts).toBe(true);
    });

    it("has localization labels for all stages", () => {
      STAGES.forEach(stage => {
        expect(pack.localizationLabels[`stage_${stage}`]).toBeTruthy();
      });
    });

    it("has track tips", () => {
      expect(pack.trackTips.length).toBeGreaterThan(0);
    });
  });

  describe("CA_NEW_GRAD pack structure", () => {
    const pack = getRegionPack("CA", "NEW_GRAD");

    it("has experience-first resume defaults", () => {
      expect(pack.resumeDefaults.educationFirst).toBe(false);
      expect(pack.resumeDefaults.maxPages).toBe(1);
    });

    it("has correct scoring weights that sum to ~1.0", () => {
      const weights = pack.scoringWeights;
      const sum = weights.eligibility + weights.tools + weights.responsibilities + weights.skills + weights.softSkills;
      expect(sum).toBeCloseTo(1.0, 1);
    });

    it("has graduation date eligibility check", () => {
      const fields = pack.eligibilityChecks.map(c => c.field);
      expect(fields).toContain("graduationDate");
    });

    it("has professional-confident outreach tone", () => {
      expect(pack.templates.outreachTone).toBe("professional-confident");
    });
  });
});

// ─── Stage & Label Constants ────────────────────────────────────────
describe("Stage Constants", () => {
  it("has 7 stages", () => {
    expect(STAGES).toHaveLength(7);
  });

  it("includes all expected stages", () => {
    expect(STAGES).toContain("bookmarked");
    expect(STAGES).toContain("applying");
    expect(STAGES).toContain("applied");
    expect(STAGES).toContain("interviewing");
    expect(STAGES).toContain("offered");
    expect(STAGES).toContain("rejected");
    expect(STAGES).toContain("archived");
  });

  it("has labels for all stages", () => {
    STAGES.forEach(stage => {
      expect(STAGE_LABELS[stage]).toBeTruthy();
      expect(typeof STAGE_LABELS[stage]).toBe("string");
    });
  });
});

describe("Evidence Group Types", () => {
  it("has 5 evidence group types", () => {
    expect(EVIDENCE_GROUP_TYPES).toHaveLength(5);
  });

  it("includes all expected types", () => {
    expect(EVIDENCE_GROUP_TYPES).toContain("eligibility");
    expect(EVIDENCE_GROUP_TYPES).toContain("tools");
    expect(EVIDENCE_GROUP_TYPES).toContain("responsibilities");
    expect(EVIDENCE_GROUP_TYPES).toContain("skills");
    expect(EVIDENCE_GROUP_TYPES).toContain("soft_skills");
  });
});

// ─── addBusinessDays utility test ───────────────────────────────────
// We test the utility logic inline since it's a private function in routers.ts
describe("Business Days Calculation", () => {
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

  it("adds 5 business days from Monday to next Monday", () => {
    // Feb 16, 2026 is a Monday
    const monday = new Date("2026-02-16T12:00:00Z");
    const result = addBusinessDays(monday, 5);
    // 5 business days from Monday = next Monday (Feb 23)
    expect(result.getDate()).toBe(23);
    expect(result.getMonth()).toBe(1); // February
  });

  it("adds 1 business day from Friday to Monday", () => {
    // Feb 20, 2026 is a Friday
    const friday = new Date("2026-02-20T12:00:00Z");
    const result = addBusinessDays(friday, 1);
    // 1 business day from Friday = Monday (Feb 23)
    expect(result.getDate()).toBe(23);
    expect(result.getDay()).toBe(1); // Monday
  });

  it("adds 0 business days returns same date", () => {
    const date = new Date("2026-02-18T12:00:00Z");
    const result = addBusinessDays(date, 0);
    expect(result.getDate()).toBe(date.getDate());
  });

  it("skips weekends correctly", () => {
    // Feb 19, 2026 is a Thursday
    const thursday = new Date("2026-02-19T12:00:00Z");
    const result = addBusinessDays(thursday, 3);
    // Thu + 3 business days = Fri, Mon, Tue → Feb 24 (Tuesday)
    expect(result.getDate()).toBe(24);
    expect(result.getDay()).toBe(2); // Tuesday
  });
});

// ─── Router Input Validation Tests (schema-level) ───────────────────
import { z } from "zod";

describe("Input Schema Validation", () => {
  const jobCardCreateSchema = z.object({
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
  });

  it("accepts valid job card input", () => {
    const result = jobCardCreateSchema.safeParse({
      title: "Software Engineer",
      company: "Google",
      stage: "bookmarked",
      priority: "high",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty title", () => {
    const result = jobCardCreateSchema.safeParse({
      title: "",
      company: "Google",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid stage", () => {
    const result = jobCardCreateSchema.safeParse({
      title: "SWE",
      stage: "invalid_stage",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid priority", () => {
    const result = jobCardCreateSchema.safeParse({
      title: "SWE",
      priority: "critical",
    });
    expect(result.success).toBe(false);
  });

  it("accepts minimal input (title only)", () => {
    const result = jobCardCreateSchema.safeParse({ title: "Intern" });
    expect(result.success).toBe(true);
  });

  const resumeCreateSchema = z.object({
    title: z.string().min(1),
    content: z.string().min(1),
  });

  it("accepts valid resume input", () => {
    const result = resumeCreateSchema.safeParse({
      title: "My Resume v1",
      content: "# John Doe\nSoftware Engineer",
    });
    expect(result.success).toBe(true);
  });

  it("rejects resume with empty content", () => {
    const result = resumeCreateSchema.safeParse({
      title: "My Resume",
      content: "",
    });
    expect(result.success).toBe(false);
  });

  const creditsPurchaseSchema = z.object({
    amount: z.number().min(1).max(100),
  });

  it("accepts valid credit purchase", () => {
    const result = creditsPurchaseSchema.safeParse({ amount: 15 });
    expect(result.success).toBe(true);
  });

  it("rejects zero credits", () => {
    const result = creditsPurchaseSchema.safeParse({ amount: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects negative credits", () => {
    const result = creditsPurchaseSchema.safeParse({ amount: -5 });
    expect(result.success).toBe(false);
  });

  it("rejects over 100 credits", () => {
    const result = creditsPurchaseSchema.safeParse({ amount: 101 });
    expect(result.success).toBe(false);
  });

  const taskCreateSchema = z.object({
    jobCardId: z.number().optional(),
    title: z.string().min(1),
    description: z.string().optional(),
    taskType: z.enum(["follow_up", "apply", "interview_prep", "custom", "outreach", "review_evidence"]).optional(),
    dueDate: z.string().optional(),
  });

  it("accepts valid task input", () => {
    const result = taskCreateSchema.safeParse({
      title: "Follow up with recruiter",
      taskType: "follow_up",
      dueDate: "2026-03-01",
    });
    expect(result.success).toBe(true);
  });

  it("rejects task with invalid type", () => {
    const result = taskCreateSchema.safeParse({
      title: "Something",
      taskType: "invalid_type",
    });
    expect(result.success).toBe(false);
  });

  const contactCreateSchema = z.object({
    jobCardId: z.number().optional(),
    name: z.string().min(1),
    role: z.string().optional(),
    company: z.string().optional(),
    email: z.string().optional(),
    linkedinUrl: z.string().optional(),
    phone: z.string().optional(),
    notes: z.string().optional(),
  });

  it("accepts valid contact input", () => {
    const result = contactCreateSchema.safeParse({
      name: "Jane Doe",
      company: "Google",
      role: "Recruiter",
      email: "jane@google.com",
    });
    expect(result.success).toBe(true);
  });

  it("rejects contact with empty name", () => {
    const result = contactCreateSchema.safeParse({
      name: "",
      company: "Google",
    });
    expect(result.success).toBe(false);
  });

  const profileSchema = z.object({
    regionCode: z.string().optional(),
    trackCode: z.enum(["COOP", "NEW_GRAD"]).optional(),
    school: z.string().optional(),
    program: z.string().optional(),
    graduationDate: z.string().optional(),
    currentlyEnrolled: z.boolean().optional(),
    onboardingComplete: z.boolean().optional(),
  });

  it("accepts valid profile input", () => {
    const result = profileSchema.safeParse({
      regionCode: "CA",
      trackCode: "COOP",
      school: "University of Waterloo",
      program: "Computer Science",
      currentlyEnrolled: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid track code", () => {
    const result = profileSchema.safeParse({
      trackCode: "INTERN",
    });
    expect(result.success).toBe(false);
  });
});

// ─── Auth Router Tests ──────────────────────────────────────────────
describe("Auth Router", () => {
  it("auth.me returns null for unauthenticated context", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller({
      user: null,
      req: { protocol: "https", headers: {} } as any,
      res: { clearCookie: () => {} } as any,
    });
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("auth.me returns user for authenticated context", async () => {
    const { appRouter } = await import("./routers");
    const user = {
      id: 1,
      openId: "test-user",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "manus",
      role: "user" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };
    const caller = appRouter.createCaller({
      user,
      req: { protocol: "https", headers: {} } as any,
      res: { clearCookie: () => {} } as any,
    });
    const result = await caller.auth.me();
    expect(result).toEqual(user);
  });

  it("regionPacks.list returns available packs", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller({
      user: null,
      req: { protocol: "https", headers: {} } as any,
      res: { clearCookie: () => {} } as any,
    });
    const result = await caller.regionPacks.list();
    expect(result).toHaveLength(2);
    expect(result.map(p => p.key)).toContain("CA_COOP");
    expect(result.map(p => p.key)).toContain("CA_NEW_GRAD");
  });

  it("regionPacks.get returns correct pack", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller({
      user: null,
      req: { protocol: "https", headers: {} } as any,
      res: { clearCookie: () => {} } as any,
    });
    const result = await caller.regionPacks.get({ regionCode: "CA", trackCode: "COOP" });
    expect(result.label).toBe("Canada — Co-op");
    expect(result.resumeDefaults.educationFirst).toBe(true);
  });
});
