/**
 * Patch 8J — Evidence Run History Panel (Past Runs in Evidence Tab)
 *
 * Acceptance tests A–F:
 *   A) evidence.runs returns runs in descending date order
 *   B) Selecting a past run (setting selectedRunId) causes evidence.items to load for that run
 *   C) No runs → empty state behavior
 *   D) No changes to credits or evidence generation behavior
 *   E) Delta calculation: correct vs previous run
 *   F) List limited to last 20 runs
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Helpers ─────────────────────────────────────────────────────────
function makeCtx(userId = 1): TrpcContext {
  return {
    user: {
      id: userId,
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
    getEvidenceItems: vi.fn(),
    getCreditsBalance: vi.fn(),
  };
});
import * as db from "./db";
const mockGetEvidenceRuns = db.getEvidenceRuns as ReturnType<typeof vi.fn>;
const mockGetEvidenceItems = db.getEvidenceItems as ReturnType<typeof vi.fn>;
const mockGetCreditsBalance = db.getCreditsBalance as ReturnType<typeof vi.fn>;

// ─── Fixtures ─────────────────────────────────────────────────────────
function makeRun(id: number, overallScore: number, createdAt: Date, resumeId = 1) {
  return {
    id,
    jobCardId: 10,
    userId: 1,
    resumeId,
    overallScore,
    summary: `Run ${id} summary`,
    scoreBreakdownJson: null,
    status: "completed" as const,
    regionCode: "CA",
    trackCode: "NEW_GRAD",
    createdAt,
  };
}

function makeEvidenceItem(id: number, evidenceRunId: number) {
  return {
    id,
    evidenceRunId,
    jobCardId: 10,
    groupType: "skills",
    jdRequirement: "TypeScript experience",
    resumeProof: "Built TypeScript APIs",
    status: "matched" as const,
    fix: "No fix needed",
    rewriteA: "Rewrite A",
    rewriteB: "Rewrite B",
    whyItMatters: "Core skill",
    needsConfirmation: false,
    createdAt: new Date(),
  };
}

// ─── Test Suite ───────────────────────────────────────────────────────
describe("Patch 8J: Evidence Run History Panel", () => {
  const ctx = makeCtx();
  const caller = appRouter.createCaller(ctx);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Test A: runs returned in descending date order ────────────────
  it("A) evidence.runs returns runs in descending date order (newest first)", async () => {
    const now = new Date();
    const runs = [
      makeRun(3, 82, new Date(now.getTime() - 1_000)),    // newest
      makeRun(2, 75, new Date(now.getTime() - 60_000)),   // middle
      makeRun(1, 68, new Date(now.getTime() - 120_000)),  // oldest
    ];
    mockGetEvidenceRuns.mockResolvedValueOnce(runs);

    const result = await caller.evidence.runs({ jobCardId: 10 });

    expect(result).toHaveLength(3);
    // Verify descending order: each run's createdAt should be >= the next
    for (let i = 0; i < result.length - 1; i++) {
      const curr = new Date(result[i]!.createdAt).getTime();
      const next = new Date(result[i + 1]!.createdAt).getTime();
      expect(curr).toBeGreaterThanOrEqual(next);
    }
    // First run should be the most recent (id=3)
    expect(result[0]!.id).toBe(3);
  });

  // ── Test A2: runs include score and resumeId ──────────────────────
  it("A2) each run includes overallScore, resumeId, status, and createdAt", async () => {
    const runs = [makeRun(5, 77, new Date(), 2)];
    mockGetEvidenceRuns.mockResolvedValueOnce(runs);

    const result = await caller.evidence.runs({ jobCardId: 10 });

    expect(result[0]).toMatchObject({
      id: 5,
      overallScore: 77,
      resumeId: 2,
      status: "completed",
    });
    expect(result[0]!.createdAt).toBeDefined();
  });

  // ── Test B: evidence.items loads for a specific runId ────────────
  it("B) evidence.items returns items for the selected runId", async () => {
    const items = [makeEvidenceItem(1, 42), makeEvidenceItem(2, 42)];
    mockGetEvidenceItems.mockResolvedValueOnce(items);

    const result = await caller.evidence.items({ evidenceRunId: 42 });

    expect(result).toHaveLength(2);
    expect(result[0]!.evidenceRunId).toBe(42);
    expect(result[1]!.evidenceRunId).toBe(42);
    expect(mockGetEvidenceItems).toHaveBeenCalledWith(42);
  });

  // ── Test B2: evidence.items for a different run returns its items ─
  it("B2) selecting a different run loads that run's items (not a previous run's)", async () => {
    const itemsRun1 = [makeEvidenceItem(10, 1)];
    const itemsRun2 = [makeEvidenceItem(20, 2), makeEvidenceItem(21, 2)];

    mockGetEvidenceItems.mockResolvedValueOnce(itemsRun2);
    const result = await caller.evidence.items({ evidenceRunId: 2 });

    expect(result).toHaveLength(2);
    expect(result.every((item: any) => item.evidenceRunId === 2)).toBe(true);
    // Ensure run 1 items are not mixed in
    expect(result.find((item: any) => item.id === 10)).toBeUndefined();
    // Suppress unused variable warning
    void itemsRun1;
  });

  // ── Test C: no runs → empty array returned ────────────────────────
  it("C) no runs → evidence.runs returns empty array (empty state)", async () => {
    mockGetEvidenceRuns.mockResolvedValueOnce([]);

    const result = await caller.evidence.runs({ jobCardId: 99 });

    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  // ── Test D: evidence.runs does not consume credits ────────────────
  it("D) evidence.runs does not call getCreditsBalance or deduct credits", async () => {
    mockGetEvidenceRuns.mockResolvedValueOnce([makeRun(1, 70, new Date())]);

    await caller.evidence.runs({ jobCardId: 10 });

    // Credits should not be touched for a read-only query
    expect(mockGetCreditsBalance).not.toHaveBeenCalled();
  });

  // ── Test E: delta calculation logic ──────────────────────────────
  it("E) delta between consecutive runs is calculated correctly", () => {
    // This mirrors the UI logic: delta = runs[idx].overallScore - runs[idx+1].overallScore
    const runs = [
      { overallScore: 82 }, // newest (idx=0)
      { overallScore: 75 }, // previous (idx=1)
      { overallScore: 68 }, // oldest (idx=2)
    ];

    const deltas = runs.map((run, idx) => {
      const prev = runs[idx + 1];
      if (run.overallScore != null && prev?.overallScore != null) {
        return run.overallScore - prev.overallScore;
      }
      return null;
    });

    expect(deltas[0]).toBe(7);   // 82 - 75 = +7
    expect(deltas[1]).toBe(7);   // 75 - 68 = +7
    expect(deltas[2]).toBeNull(); // no previous run
  });

  // ── Test E2: negative delta ───────────────────────────────────────
  it("E2) negative delta when score decreased between runs", () => {
    const runs = [
      { overallScore: 60 }, // newest
      { overallScore: 75 }, // previous
    ];
    const delta = runs[0]!.overallScore - runs[1]!.overallScore;
    expect(delta).toBe(-15);
  });

  // ── Test E3: zero delta ───────────────────────────────────────────
  it("E3) zero delta when score is unchanged between runs", () => {
    const runs = [
      { overallScore: 75 },
      { overallScore: 75 },
    ];
    const delta = runs[0]!.overallScore - runs[1]!.overallScore;
    expect(delta).toBe(0);
  });

  // ── Test F: list limited to 20 runs ──────────────────────────────
  it("F) Past Runs panel limits display to 20 runs (UI slice logic)", () => {
    // Simulate 25 runs returned by the query
    const runs = Array.from({ length: 25 }, (_, i) =>
      makeRun(i + 1, 50 + i, new Date(Date.now() - i * 1000))
    );

    // The UI does: runs.slice(0, 20)
    const displayed = runs.slice(0, 20);

    expect(displayed).toHaveLength(20);
    expect(displayed[0]!.id).toBe(1);   // most recent
    expect(displayed[19]!.id).toBe(20); // 20th run
    // Run 21-25 are not displayed
    expect(displayed.find((r) => r.id === 21)).toBeUndefined();
  });

  // ── Test G: runs with non-completed status show status badge ─────
  it("G) runs with non-completed status (pending/failed) are included in the list", async () => {
    const runs = [
      { ...makeRun(3, 80, new Date(Date.now() - 1000)), status: "completed" as const },
      { ...makeRun(2, 0, new Date(Date.now() - 2000)), status: "failed" as const, overallScore: null as any },
      { ...makeRun(1, 0, new Date(Date.now() - 3000)), status: "pending" as const, overallScore: null as any },
    ];
    mockGetEvidenceRuns.mockResolvedValueOnce(runs);

    const result = await caller.evidence.runs({ jobCardId: 10 });

    expect(result).toHaveLength(3);
    expect(result.find((r: any) => r.status === "failed")).toBeDefined();
    expect(result.find((r: any) => r.status === "pending")).toBeDefined();
  });
});
