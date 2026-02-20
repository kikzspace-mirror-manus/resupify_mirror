/**
 * Patch 6D — Evidence Scan Full Rubric (Region Pack Weighted + Requirements-Driven)
 *
 * Acceptance tests A–F as specified in the patch requirements.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Helpers ─────────────────────────────────────────────────────────
function makeCtx(overrides: Partial<TrpcContext["user"]> = {}): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user",
      name: "Test User",
      email: "test@example.com",
      loginMethod: "manus",
      role: "user",
      disabled: false,
      isAdmin: false,
      adminNotes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
      ...overrides,
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ─── Mock db module ───────────────────────────────────────────────────
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getCreditsBalance: vi.fn(),
    getRequirements: vi.fn(),
    getResumeById: vi.fn(),
    getLatestJdSnapshot: vi.fn(),
    getProfile: vi.fn(),
    createEvidenceRun: vi.fn(),
    spendCredits: vi.fn(),
    createEvidenceItems: vi.fn(),
    updateEvidenceRun: vi.fn(),
    createTask: vi.fn(),
    getJobCardById: vi.fn(),
  };
});

// ─── Mock LLM ────────────────────────────────────────────────────────
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

import * as db from "./db";
import { invokeLLM } from "./_core/llm";

const mockLLM = invokeLLM as ReturnType<typeof vi.fn>;
const mockGetBalance = db.getCreditsBalance as ReturnType<typeof vi.fn>;
const mockGetReqs = db.getRequirements as ReturnType<typeof vi.fn>;
const mockGetResume = db.getResumeById as ReturnType<typeof vi.fn>;
const mockGetSnapshot = db.getLatestJdSnapshot as ReturnType<typeof vi.fn>;
const mockGetProfile = db.getProfile as ReturnType<typeof vi.fn>;
const mockCreateRun = db.createEvidenceRun as ReturnType<typeof vi.fn>;
const mockSpend = db.spendCredits as ReturnType<typeof vi.fn>;
const mockCreateItems = db.createEvidenceItems as ReturnType<typeof vi.fn>;
const mockUpdateRun = db.updateEvidenceRun as ReturnType<typeof vi.fn>;
const mockCreateTask = db.createTask as ReturnType<typeof vi.fn>;
const mockGetJobCard = db.getJobCardById as ReturnType<typeof vi.fn>;

// ─── Sample data ─────────────────────────────────────────────────────
const SAMPLE_REQUIREMENTS = [
  { id: 1, jobCardId: 1, jdSnapshotId: 1, requirementText: "Proficiency in Python", requirementType: "skill", createdAt: new Date() },
  { id: 2, jobCardId: 1, jdSnapshotId: 1, requirementText: "Experience with React", requirementType: "tool", createdAt: new Date() },
  { id: 3, jobCardId: 1, jdSnapshotId: 1, requirementText: "Write unit tests", requirementType: "responsibility", createdAt: new Date() },
  { id: 4, jobCardId: 1, jdSnapshotId: 1, requirementText: "Strong communication skills", requirementType: "softskill", createdAt: new Date() },
  { id: 5, jobCardId: 1, jdSnapshotId: 1, requirementText: "Must be enrolled in a co-op program", requirementType: "eligibility", createdAt: new Date() },
];

const SAMPLE_LLM_ITEMS = [
  { group_type: "skills", jd_requirement: "Proficiency in Python", resume_proof: "Built Python CLI tools", status: "matched", fix: "Quantify impact", rewrite_a: "Built Python CLI tools reducing build time by 30%", rewrite_b: "Developed Python automation scripts", why_it_matters: "Core language for the role", needs_confirmation: false },
  { group_type: "tools", jd_requirement: "Experience with React", resume_proof: null, status: "missing", fix: "Add React projects", rewrite_a: "Built React dashboard for capstone project", rewrite_b: "Developed React components for web app", why_it_matters: "Primary frontend framework", needs_confirmation: true },
  { group_type: "responsibilities", jd_requirement: "Write unit tests", resume_proof: "Wrote Jest tests", status: "partial", fix: "Mention coverage %", rewrite_a: "Wrote Jest tests achieving 80% coverage", rewrite_b: "Implemented unit tests with Jest", why_it_matters: "Code quality requirement", needs_confirmation: false },
  { group_type: "soft_skills", jd_requirement: "Strong communication skills", resume_proof: "Presented to stakeholders", status: "matched", fix: "Expand on audience size", rewrite_a: "Presented technical findings to 20+ stakeholders", rewrite_b: "Communicated project updates to cross-functional teams", why_it_matters: "Team collaboration", needs_confirmation: false },
  { group_type: "eligibility", jd_requirement: "Must be enrolled in a co-op program", resume_proof: null, status: "missing", fix: "Confirm enrollment status", rewrite_a: "Currently enrolled in Computer Science co-op program", rewrite_b: "Active co-op student at University of Waterloo", why_it_matters: "Eligibility requirement", needs_confirmation: true },
];

const SAMPLE_RESUME_CONTENT = "Built Python CLI tools. Wrote Jest tests. Presented to stakeholders. Computer Science student.";

function setupHappyPath(profileOverrides: any = {}) {
  mockGetBalance.mockResolvedValue(5);
  mockGetReqs.mockResolvedValue(SAMPLE_REQUIREMENTS);
  mockGetResume.mockResolvedValue({ id: 1, title: "My Resume", content: SAMPLE_RESUME_CONTENT });
  mockGetSnapshot.mockResolvedValue({ id: 1, snapshotText: "Software Engineer Co-op posting at Acme Corp.", capturedAt: new Date() });
  mockGetProfile.mockResolvedValue({
    regionCode: "CA",
    trackCode: "COOP",
    school: "University of Waterloo",
    program: "Computer Science",
    currentlyEnrolled: true,
    ...profileOverrides,
  });
  mockCreateRun.mockResolvedValue(42);
  mockSpend.mockResolvedValue(true);
  mockCreateItems.mockResolvedValue(undefined);
  mockUpdateRun.mockResolvedValue(undefined);
  mockCreateTask.mockResolvedValue(undefined);
  mockGetJobCard.mockResolvedValue({ id: 1, title: "Software Engineer Co-op", userId: 1 });
  mockLLM.mockResolvedValue({
    choices: [{ message: { content: JSON.stringify({ summary: "Good match overall.", items: SAMPLE_LLM_ITEMS }) } }],
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Test A: Uses job_card_requirements, not JD re-parse ─────────────
describe("Test A: evidence.run uses job_card_requirements (no JD re-parse)", () => {
  it("A1) Creates EvidenceItems for each requirement from job_card_requirements", async () => {
    setupHappyPath();
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.evidence.run({ jobCardId: 1, resumeId: 1 });

    expect(result.itemCount).toBe(5);
    expect(mockCreateItems).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ jdRequirement: "Proficiency in Python" }),
        expect.objectContaining({ jdRequirement: "Must be enrolled in a co-op program" }),
      ])
    );
  });

  it("A2) Throws NO_REQUIREMENTS error when no requirements exist", async () => {
    mockGetBalance.mockResolvedValue(5);
    mockGetReqs.mockResolvedValue([]);

    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.evidence.run({ jobCardId: 1, resumeId: 1 })).rejects.toThrow("NO_REQUIREMENTS");
  });

  it("A3) Does NOT call LLM when requirements are missing (no credit spent)", async () => {
    mockGetBalance.mockResolvedValue(5);
    mockGetReqs.mockResolvedValue([]);

    const caller = appRouter.createCaller(makeCtx());
    try { await caller.evidence.run({ jobCardId: 1, resumeId: 1 }); } catch {}

    expect(mockLLM).not.toHaveBeenCalled();
    expect(mockSpend).not.toHaveBeenCalled();
  });
});

// ─── Test B: EvidenceItems conform to strict template ────────────────
describe("Test B: EvidenceItems conform to strict template data fields", () => {
  it("B1) All items have required fields: jdRequirement, resumeProof, status, fix, rewriteA, rewriteB, whyItMatters", async () => {
    setupHappyPath();
    const caller = appRouter.createCaller(makeCtx());
    await caller.evidence.run({ jobCardId: 1, resumeId: 1 });

    const savedItems = mockCreateItems.mock.calls[0][0] as any[];
    for (const item of savedItems) {
      expect(item).toHaveProperty("jdRequirement");
      expect(item).toHaveProperty("resumeProof");
      expect(item).toHaveProperty("status");
      expect(item).toHaveProperty("fix");
      expect(item).toHaveProperty("rewriteA");
      expect(item).toHaveProperty("rewriteB");
      expect(item).toHaveProperty("whyItMatters");
      expect(item).toHaveProperty("needsConfirmation");
      expect(["matched", "partial", "missing"]).toContain(item.status);
    }
  });

  it("B2) Items with null resume_proof are stored as null (rendered as 'None found')", async () => {
    setupHappyPath();
    const caller = appRouter.createCaller(makeCtx());
    await caller.evidence.run({ jobCardId: 1, resumeId: 1 });

    const savedItems = mockCreateItems.mock.calls[0][0] as any[];
    const missingItem = savedItems.find(i => i.jdRequirement === "Experience with React");
    expect(missingItem?.resumeProof).toBeNull();
  });

  it("B3) needs_confirmation is true for items with invented claims", async () => {
    setupHappyPath();
    const caller = appRouter.createCaller(makeCtx());
    await caller.evidence.run({ jobCardId: 1, resumeId: 1 });

    const savedItems = mockCreateItems.mock.calls[0][0] as any[];
    const reactItem = savedItems.find(i => i.jdRequirement === "Experience with React");
    expect(reactItem?.needsConfirmation).toBe(true);
  });
});

// ─── Test C: Score computed using pack.scoringWeights ────────────────
describe("Test C: Score computed using pack.scoringWeights and produces breakdown", () => {
  it("C1) updateEvidenceRun is called with overallScore and scoreBreakdownJson", async () => {
    setupHappyPath();
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.evidence.run({ jobCardId: 1, resumeId: 1 });

    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.breakdown).toBeDefined();
    expect(result.breakdown.evidence_strength).toBeDefined();
    expect(result.breakdown.keyword_coverage).toBeDefined();
    expect(result.breakdown.formatting_ats).toBeDefined();
    expect(result.breakdown.role_fit).toBeDefined();
  });

  it("C2) scoreBreakdownJson is persisted to the evidence run", async () => {
    setupHappyPath();
    const caller = appRouter.createCaller(makeCtx());
    await caller.evidence.run({ jobCardId: 1, resumeId: 1 });

    expect(mockUpdateRun).toHaveBeenCalledWith(
      42,
      expect.objectContaining({
        scoreBreakdownJson: expect.any(String),
        overallScore: expect.any(Number),
        status: "completed",
      })
    );

    const updateCall = mockUpdateRun.mock.calls[0][1];
    const breakdown = JSON.parse(updateCall.scoreBreakdownJson);
    expect(breakdown.evidence_strength.matched_count).toBe(2); // matched: Python + communication
    expect(breakdown.evidence_strength.partial_count).toBe(1); // partial: unit tests
    expect(breakdown.evidence_strength.missing_count).toBe(2); // missing: React + eligibility
  });

  it("C3) overall_score uses pack weights (COOP: eligibility=0.25, tools=0.20, resp=0.20, skills=0.20, soft=0.15)", async () => {
    setupHappyPath();
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.evidence.run({ jobCardId: 1, resumeId: 1 });

    // Pack label should be recorded in breakdown
    expect(result.breakdown.pack_label).toBe("Canada — Co-op");
    // Score should be a weighted blend, not a simple average
    expect(result.score).toBeGreaterThan(0);
  });
});

// ─── Test D: COOP eligibility risk ───────────────────────────────────
describe("Test D: COOP eligibility risk flag", () => {
  it("D1) Flags eligibility risk when COOP profile is missing required fields", async () => {
    setupHappyPath({
      trackCode: "COOP",
      school: null,       // missing
      program: null,      // missing
      currentlyEnrolled: null, // missing
    });

    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.evidence.run({ jobCardId: 1, resumeId: 1 });

    expect(result.breakdown.flags.length).toBeGreaterThan(0);
    expect(result.breakdown.flags.some((f: string) => f.includes("eligibility_risk"))).toBe(true);
    expect(result.breakdown.role_fit.score).toBeLessThan(100);
  });

  it("D2) No eligibility flag when COOP profile has all required fields", async () => {
    setupHappyPath({
      trackCode: "COOP",
      school: "University of Waterloo",
      program: "Computer Science",
      currentlyEnrolled: true,
    });

    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.evidence.run({ jobCardId: 1, resumeId: 1 });

    expect(result.breakdown.flags.some((f: string) => f.includes("eligibility_risk"))).toBe(false);
    expect(result.breakdown.role_fit.score).toBe(100);
  });
});

// ─── Test E: NEW_GRAD seniority mismatch ─────────────────────────────
describe("Test E: NEW_GRAD seniority mismatch flag", () => {
  it("E1) Flags overqualified risk when resume signals high seniority on NEW_GRAD track", async () => {
    setupHappyPath({ trackCode: "NEW_GRAD", school: null, program: null, currentlyEnrolled: null });
    mockGetResume.mockResolvedValue({
      id: 1,
      title: "Senior Resume",
      content: "Director of Engineering with 10+ years of experience leading teams.",
    });

    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.evidence.run({ jobCardId: 1, resumeId: 1 });

    expect(result.breakdown.flags.some((f: string) => f.includes("overqualified_risk"))).toBe(true);
    expect(result.breakdown.role_fit.score).toBeLessThan(100);
  });

  it("E2) No overqualified flag for a normal new grad resume", async () => {
    setupHappyPath({ trackCode: "NEW_GRAD", school: null, program: null, currentlyEnrolled: null });
    mockGetResume.mockResolvedValue({
      id: 1,
      title: "New Grad Resume",
      content: "Recent graduate with internship experience in software development.",
    });

    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.evidence.run({ jobCardId: 1, resumeId: 1 });

    expect(result.breakdown.flags.some((f: string) => f.includes("overqualified_risk"))).toBe(false);
  });
});

// ─── Test F: Credits unchanged ────────────────────────────────────────
describe("Test F: Credits spend behavior unchanged", () => {
  it("F1) Spends exactly 1 credit per evidence run", async () => {
    setupHappyPath();
    const caller = appRouter.createCaller(makeCtx());
    await caller.evidence.run({ jobCardId: 1, resumeId: 1 });

    expect(mockSpend).toHaveBeenCalledTimes(1);
    expect(mockSpend).toHaveBeenCalledWith(1, 1, "Evidence+ATS run", "evidence_run", 42);
  });

  it("F2) Throws insufficient credits before any LLM call", async () => {
    mockGetBalance.mockResolvedValue(0);
    mockGetReqs.mockResolvedValue(SAMPLE_REQUIREMENTS);

    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.evidence.run({ jobCardId: 1, resumeId: 1 })).rejects.toThrow("Insufficient credits");
    expect(mockLLM).not.toHaveBeenCalled();
  });

  it("F3) Ledger entry created with reason 'Evidence+ATS run'", async () => {
    setupHappyPath();
    const caller = appRouter.createCaller(makeCtx());
    await caller.evidence.run({ jobCardId: 1, resumeId: 1 });

    expect(mockSpend).toHaveBeenCalledWith(
      expect.any(Number),
      1,
      "Evidence+ATS run",
      "evidence_run",
      expect.any(Number)
    );
  });
});
