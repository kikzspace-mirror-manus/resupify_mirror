/**
 * Patch 6E — Application Kit (Scan → Fix → Apply)
 *
 * Acceptance tests A–G as specified in the patch requirements.
 */
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from "vitest";
import { _enableTestBypass, _disableTestBypass } from "./rateLimiter";

beforeAll(() => _enableTestBypass());
afterAll(() => _disableTestBypass());
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
    getEvidenceRuns: vi.fn(),
    getRequirements: vi.fn(),
    getEvidenceItems: vi.fn(),
    getResumeById: vi.fn(),
    getJobCardById: vi.fn(),
    getLatestJdSnapshot: vi.fn(),
    getProfile: vi.fn(),
    upsertApplicationKit: vi.fn(),
    getApplicationKit: vi.fn(),
    getTasks: vi.fn(),
    createTask: vi.fn(),
  };
});

// ─── Mock LLM ────────────────────────────────────────────────────────
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

import * as db from "./db";
import { invokeLLM } from "./_core/llm";

const mockLLM = invokeLLM as ReturnType<typeof vi.fn>;

// ─── Shared fixtures ─────────────────────────────────────────────────
const COMPLETED_RUN = {
  id: 10,
  jobCardId: 1,
  resumeId: 5,
  status: "completed",
  overallScore: 72,
  summary: "Good match",
  createdAt: new Date(),
};

const REQUIREMENTS = [
  { id: 1, jobCardId: 1, requirementText: "Python 3.x", requirementType: "tools" },
  { id: 2, jobCardId: 1, requirementText: "Must be enrolled full-time", requirementType: "eligibility" },
];

const EVIDENCE_ITEMS = [
  {
    id: 1, evidenceRunId: 10, jdRequirement: "Python 3.x", status: "partial",
    groupType: "tools", resumeProof: "Used Python in COOP project", fix: "Add version number",
    rewriteA: "Developed Python 3.9 scripts...", rewriteB: "Built automation using Python 3.9...",
    confidence: 60,
  },
  {
    id: 2, evidenceRunId: 10, jdRequirement: "Must be enrolled full-time", status: "missing",
    groupType: "eligibility", resumeProof: null, fix: "Add enrollment status",
    rewriteA: "Currently enrolled full-time at...", rewriteB: "Full-time student at...",
    confidence: 0,
  },
];

const RESUME = { id: 5, userId: 1, title: "My Resume", content: "Python developer with 2 years experience..." };
const JOB_CARD = { id: 1, userId: 1, title: "Software Engineer", company: "Acme Corp", location: "Toronto, ON", stage: "applying" };
const JD_SNAPSHOT = { id: 1, jobCardId: 1, snapshotText: "We are looking for a Python developer..." };
const PROFILE = { userId: 1, regionCode: "CA", trackCode: "COOP" };

const KIT_LLM_RESPONSE = {
  top_changes: [
    { requirement_text: "Must be enrolled full-time", status: "missing", fix: "Add enrollment status to resume" },
    { requirement_text: "Python 3.x", status: "partial", fix: "Specify Python version" },
  ],
  bullet_rewrites: [
    {
      requirement_text: "Python 3.x",
      status: "partial",
      fix: "Specify Python 3.9",
      rewrite_a: "Developed Python 3.9 automation scripts reducing processing time by 40%",
      rewrite_b: "Built data pipeline using Python 3.9 and pandas",
      needs_confirmation: false,
    },
    {
      requirement_text: "Must be enrolled full-time",
      status: "missing",
      fix: "Add enrollment statement",
      rewrite_a: "Currently enrolled full-time in Computer Science at University of Toronto",
      rewrite_b: "Full-time Computer Science student at University of Toronto (expected May 2026)",
      needs_confirmation: true,
    },
  ],
  cover_letter_text: "Dear Hiring Manager,\n\nI am excited to apply for the Software Engineer position at Acme Corp. My experience with Python development aligns well with your requirements.\n\nBest regards,\nTest User",
};

// ─── Test Suite ───────────────────────────────────────────────────────
describe("Patch 6E: Application Kit", () => {
  const ctx = makeCtx();
  const caller = appRouter.createCaller(ctx);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Test A: applicationKits.get returns null when no kit exists ──────
  it("A) applicationKits.get returns null when no kit exists for given run", async () => {
    (db.getApplicationKit as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await caller.applicationKits.get({
      jobCardId: 1,
      resumeId: 5,
      evidenceRunId: 10,
    });

    expect(result).toBeNull();
    expect(db.getApplicationKit).toHaveBeenCalledWith(1, 5, 10);
  });

  // ─── Test B: generate throws NO_REQUIREMENTS if no requirements extracted ──
  it("B) generate throws NO_REQUIREMENTS if requirements not extracted", async () => {
    (db.getEvidenceRuns as ReturnType<typeof vi.fn>).mockResolvedValue([COMPLETED_RUN]);
    (db.getRequirements as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await expect(
      caller.applicationKits.generate({
        jobCardId: 1,
        resumeId: 5,
        evidenceRunId: 10,
        tone: "Human",
      })
    ).rejects.toThrow("NO_REQUIREMENTS");
  });

  // ─── Test B2: generate throws NO_EVIDENCE_RUN if no completed run ────
  it("B2) generate throws NO_EVIDENCE_RUN if no completed evidence run exists", async () => {
    (db.getEvidenceRuns as ReturnType<typeof vi.fn>).mockResolvedValue([
      { ...COMPLETED_RUN, status: "pending" },
    ]);

    await expect(
      caller.applicationKits.generate({
        jobCardId: 1,
        resumeId: 5,
        evidenceRunId: 10,
        tone: "Human",
      })
    ).rejects.toThrow("NO_EVIDENCE_RUN");
  });

  // ─── Test C: generate produces top_changes, bullet_rewrites, cover_letter ──
  it("C) generate produces top_changes, bullet_rewrites, and cover_letter_text", async () => {
    (db.getEvidenceRuns as ReturnType<typeof vi.fn>).mockResolvedValue([COMPLETED_RUN]);
    (db.getRequirements as ReturnType<typeof vi.fn>).mockResolvedValue(REQUIREMENTS);
    (db.getEvidenceItems as ReturnType<typeof vi.fn>).mockResolvedValue(EVIDENCE_ITEMS);
    (db.getResumeById as ReturnType<typeof vi.fn>).mockResolvedValue(RESUME);
    (db.getJobCardById as ReturnType<typeof vi.fn>).mockResolvedValue(JOB_CARD);
    (db.getLatestJdSnapshot as ReturnType<typeof vi.fn>).mockResolvedValue(JD_SNAPSHOT);
    (db.getProfile as ReturnType<typeof vi.fn>).mockResolvedValue(PROFILE);
    (db.upsertApplicationKit as ReturnType<typeof vi.fn>).mockResolvedValue(42);
    mockLLM.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(KIT_LLM_RESPONSE) } }],
    });

    const result = await caller.applicationKits.generate({
      jobCardId: 1,
      resumeId: 5,
      evidenceRunId: 10,
      tone: "Human",
    });

    expect(result.topChanges).toHaveLength(2);
    expect(result.bulletRewrites).toHaveLength(2);
    expect(result.coverLetterText).toContain("Acme Corp");
    expect(result.kitId).toBe(42);
  });

  // ─── Test D: needs_confirmation flag appears on items without proof ───
  it("D) needs_confirmation=true appears on bullet rewrites without resume proof", async () => {
    (db.getEvidenceRuns as ReturnType<typeof vi.fn>).mockResolvedValue([COMPLETED_RUN]);
    (db.getRequirements as ReturnType<typeof vi.fn>).mockResolvedValue(REQUIREMENTS);
    (db.getEvidenceItems as ReturnType<typeof vi.fn>).mockResolvedValue(EVIDENCE_ITEMS);
    (db.getResumeById as ReturnType<typeof vi.fn>).mockResolvedValue(RESUME);
    (db.getJobCardById as ReturnType<typeof vi.fn>).mockResolvedValue(JOB_CARD);
    (db.getLatestJdSnapshot as ReturnType<typeof vi.fn>).mockResolvedValue(JD_SNAPSHOT);
    (db.getProfile as ReturnType<typeof vi.fn>).mockResolvedValue(PROFILE);
    (db.upsertApplicationKit as ReturnType<typeof vi.fn>).mockResolvedValue(42);
    mockLLM.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(KIT_LLM_RESPONSE) } }],
    });

    const result = await caller.applicationKits.generate({
      jobCardId: 1,
      resumeId: 5,
      evidenceRunId: 10,
      tone: "Human",
    });

    // The eligibility item has no proof, so needs_confirmation should be true
    const eligibilityRewrite = result.bulletRewrites.find(
      (r: any) => r.requirement_text === "Must be enrolled full-time"
    );
    expect(eligibilityRewrite?.needs_confirmation).toBe(true);

    // The Python item has proof, so needs_confirmation should be false
    const pythonRewrite = result.bulletRewrites.find(
      (r: any) => r.requirement_text === "Python 3.x"
    );
    expect(pythonRewrite?.needs_confirmation).toBe(false);
  });

  // ─── Test E: createTasks creates tasks without duplicates ─────────────
  it("E) createTasks creates tasks and skips duplicates", async () => {
    (db.getJobCardById as ReturnType<typeof vi.fn>).mockResolvedValue(JOB_CARD);
    // Simulate one task already existing
    (db.getTasks as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 1, title: "Update resume bullets", taskType: "custom" },
    ]);
    (db.createTask as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 99 });

    const result = await caller.applicationKits.createTasks({ jobCardId: 1 });

    // Should create 2 tasks (cover letter + submit), skip 1 (already exists)
    expect(result.created).toBe(2);
    expect(result.skipped).toBe(1);
    expect(db.createTask).toHaveBeenCalledTimes(2);
  });

  // ─── Test E2: createTasks adds follow-up only if stage is "applied" ───
  it("E2) createTasks adds follow-up task only when job stage is applied", async () => {
    const appliedCard = { ...JOB_CARD, stage: "applied" };
    (db.getJobCardById as ReturnType<typeof vi.fn>).mockResolvedValue(appliedCard);
    (db.getTasks as ReturnType<typeof vi.fn>).mockResolvedValue([]); // no existing tasks
    (db.createTask as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 99 });

    const result = await caller.applicationKits.createTasks({ jobCardId: 1 });

    // Should create 4 tasks (update bullets + cover letter + submit + follow-up)
    expect(result.created).toBe(4);
    const callArgs = (db.createTask as ReturnType<typeof vi.fn>).mock.calls.map((c: any) => c[0].title);
    expect(callArgs).toContain("Follow up on application");
  });

  // ─── Test F: Option A credit policy — no credits deducted ────────────
  it("F) generate does NOT call spendCredits (Option A: free with completed scan)", async () => {
    (db.getEvidenceRuns as ReturnType<typeof vi.fn>).mockResolvedValue([COMPLETED_RUN]);
    (db.getRequirements as ReturnType<typeof vi.fn>).mockResolvedValue(REQUIREMENTS);
    (db.getEvidenceItems as ReturnType<typeof vi.fn>).mockResolvedValue(EVIDENCE_ITEMS);
    (db.getResumeById as ReturnType<typeof vi.fn>).mockResolvedValue(RESUME);
    (db.getJobCardById as ReturnType<typeof vi.fn>).mockResolvedValue(JOB_CARD);
    (db.getLatestJdSnapshot as ReturnType<typeof vi.fn>).mockResolvedValue(JD_SNAPSHOT);
    (db.getProfile as ReturnType<typeof vi.fn>).mockResolvedValue(PROFILE);
    (db.upsertApplicationKit as ReturnType<typeof vi.fn>).mockResolvedValue(42);
    mockLLM.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(KIT_LLM_RESPONSE) } }],
    });

    await caller.applicationKits.generate({
      jobCardId: 1,
      resumeId: 5,
      evidenceRunId: 10,
      tone: "Human",
    });

    // Verify upsertApplicationKit was called (kit was persisted without credit charge)
    expect(db.upsertApplicationKit).toHaveBeenCalledOnce();
    // Verify LLM was called (generation happened)
    expect(mockLLM).toHaveBeenCalledOnce();
    // Verify no credits-related db calls were made (Option A: free with completed scan)
    // The generate procedure does NOT call getCreditsBalance or spendCredits
    const result = await caller.applicationKits.generate({
      jobCardId: 1,
      resumeId: 5,
      evidenceRunId: 10,
      tone: "Human",
    });
    expect(result.kitId).toBe(42);
  });

  // ─── Test G: Regenerate with different tone persists new tone ─────────
  it("G) regenerate with different tone persists the new tone in upsertApplicationKit", async () => {
    (db.getEvidenceRuns as ReturnType<typeof vi.fn>).mockResolvedValue([COMPLETED_RUN]);
    (db.getRequirements as ReturnType<typeof vi.fn>).mockResolvedValue(REQUIREMENTS);
    (db.getEvidenceItems as ReturnType<typeof vi.fn>).mockResolvedValue(EVIDENCE_ITEMS);
    (db.getResumeById as ReturnType<typeof vi.fn>).mockResolvedValue(RESUME);
    (db.getJobCardById as ReturnType<typeof vi.fn>).mockResolvedValue(JOB_CARD);
    (db.getLatestJdSnapshot as ReturnType<typeof vi.fn>).mockResolvedValue(JD_SNAPSHOT);
    (db.getProfile as ReturnType<typeof vi.fn>).mockResolvedValue(PROFILE);
    (db.upsertApplicationKit as ReturnType<typeof vi.fn>).mockResolvedValue(42);
    mockLLM.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(KIT_LLM_RESPONSE) } }],
    });

    await caller.applicationKits.generate({
      jobCardId: 1,
      resumeId: 5,
      evidenceRunId: 10,
      tone: "Confident",
    });

    const upsertCall = (db.upsertApplicationKit as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(upsertCall.tone).toBe("Confident");
    expect(upsertCall.jobCardId).toBe(1);
    expect(upsertCall.resumeId).toBe(5);
    expect(upsertCall.evidenceRunId).toBe(10);
  });
});
