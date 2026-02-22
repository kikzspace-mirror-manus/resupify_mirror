/**
 * Patch 8G — Dashboard Score Trends Widget
 *
 * Acceptance tests A–D:
 *   A) evidence.activeTrends returns active job cards for the authenticated user
 *   B) Sparkline series ordering is correct (ascending by createdAt)
 *   C) Latest score and delta are correct (last run = latest, delta = last - prev)
 *   D) No N+1 — getActiveScoredJobCards is called exactly once per activeTrends query
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
    getActiveScoredJobCards: vi.fn(),
  };
});
import * as db from "./db";

// ─── Shared fixtures ─────────────────────────────────────────────────
const BASE_DATE = new Date("2026-02-01T10:00:00Z");

function makeRun(id: number, score: number, daysOffset: number) {
  return {
    id,
    overallScore: score,
    createdAt: new Date(BASE_DATE.getTime() + daysOffset * 86_400_000),
  };
}

function makeCard(
  id: number,
  title: string,
  company: string,
  stage: string,
  runs: ReturnType<typeof makeRun>[]
) {
  return {
    id,
    title,
    company,
    stage,
    updatedAt: new Date(),
    runs,
  };
}

// ─── Test Suite ───────────────────────────────────────────────────────
describe("Patch 8G: Dashboard Score Trends", () => {
  const ctx = makeCtx();
  const caller = appRouter.createCaller(ctx);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Test A: widget returns active job cards ───────────────────────
  it("A) activeTrends returns active job cards for the authenticated user", async () => {
    const mockCards = [
      makeCard(1, "Software Engineer", "Acme Corp", "applying", [
        makeRun(10, 72, 0),
        makeRun(11, 80, 1),
      ]),
      makeCard(2, "Backend Developer", "Beta Inc", "applied", []),
    ];
    vi.mocked(db.getActiveScoredJobCards).mockResolvedValueOnce(mockCards);

    const result = await caller.evidence.activeTrends();

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe(1);
    expect(result[0].company).toBe("Acme Corp");
    expect(result[1].id).toBe(2);
    expect(result[1].runs).toHaveLength(0);
    // Verify userId was passed correctly
    expect(db.getActiveScoredJobCards).toHaveBeenCalledWith(ctx.user.id, 10, 10);
  });

  // ── Test B: sparkline series ordering is correct ──────────────────
  it("B) runs are returned in ascending createdAt order (oldest first)", async () => {
    const runsAsc = [
      makeRun(1, 55, 0),
      makeRun(2, 62, 1),
      makeRun(3, 70, 2),
      makeRun(4, 75, 3),
    ];
    const mockCards = [
      makeCard(1, "Data Engineer", "Gamma Ltd", "bookmarked", runsAsc),
    ];
    vi.mocked(db.getActiveScoredJobCards).mockResolvedValueOnce(mockCards);

    const result = await caller.evidence.activeTrends();

    const runs = result[0].runs;
    expect(runs).toHaveLength(4);
    // Verify ascending order
    for (let i = 1; i < runs.length; i++) {
      expect(new Date(runs[i].createdAt).getTime()).toBeGreaterThan(
        new Date(runs[i - 1].createdAt).getTime()
      );
    }
    // First run is oldest, last run is newest
    expect(runs[0].overallScore).toBe(55);
    expect(runs[runs.length - 1].overallScore).toBe(75);
  });

  // ── Test C: latest score and delta are correct ────────────────────
  it("C) latest score and delta can be derived correctly from runs array", async () => {
    const runs = [
      makeRun(1, 60, 0),
      makeRun(2, 68, 1),
      makeRun(3, 73, 2),
    ];
    const mockCards = [makeCard(1, "ML Engineer", "Delta AI", "interviewing", runs)];
    vi.mocked(db.getActiveScoredJobCards).mockResolvedValueOnce(mockCards);

    const result = await caller.evidence.activeTrends();
    const cardRuns = result[0].runs;

    // Latest score = last run's overallScore
    const latestScore = cardRuns[cardRuns.length - 1].overallScore;
    expect(latestScore).toBe(73);

    // Delta = latest - previous
    const prevScore = cardRuns[cardRuns.length - 2].overallScore;
    const delta = (latestScore ?? 0) - (prevScore ?? 0);
    expect(delta).toBe(5); // 73 - 68

    // Previous delta
    const prevPrevScore = cardRuns[cardRuns.length - 3].overallScore;
    const prevDelta = (prevScore ?? 0) - (prevPrevScore ?? 0);
    expect(prevDelta).toBe(8); // 68 - 60
  });

  // ── Test D: no N+1 — single db call ──────────────────────────────
  it("D) getActiveScoredJobCards is called exactly once (no N+1)", async () => {
    const mockCards = [
      makeCard(1, "DevOps Engineer", "Epsilon Cloud", "applying", [makeRun(1, 80, 0)]),
      makeCard(2, "Frontend Dev", "Zeta UI", "applied", [makeRun(2, 65, 0), makeRun(3, 70, 1)]),
      makeCard(3, "QA Engineer", "Eta Testing", "bookmarked", []),
    ];
    vi.mocked(db.getActiveScoredJobCards).mockResolvedValueOnce(mockCards);

    await caller.evidence.activeTrends();

    // Must be called exactly once regardless of how many cards are returned
    expect(db.getActiveScoredJobCards).toHaveBeenCalledTimes(1);
  });

  // ── Test E: empty state — no active cards ─────────────────────────
  it("E) returns empty array when user has no active job cards", async () => {
    vi.mocked(db.getActiveScoredJobCards).mockResolvedValueOnce([]);

    const result = await caller.evidence.activeTrends();

    expect(result).toEqual([]);
    expect(db.getActiveScoredJobCards).toHaveBeenCalledTimes(1);
  });

  // ── Test F: cards with no runs included (partial state) ───────────
  it("F) cards with zero runs are included in results with empty runs array", async () => {
    const mockCards = [
      makeCard(1, "PM", "Alpha Corp", "applying", []),
      makeCard(2, "SWE", "Beta Corp", "bookmarked", [makeRun(5, 77, 0)]),
    ];
    vi.mocked(db.getActiveScoredJobCards).mockResolvedValueOnce(mockCards);

    const result = await caller.evidence.activeTrends();

    expect(result).toHaveLength(2);
    expect(result[0].runs).toHaveLength(0);
    expect(result[1].runs).toHaveLength(1);
    expect(result[1].runs[0].overallScore).toBe(77);
  });
});

// ─── Unit tests for getActiveScoredJobCards helper ───────────────────
describe("Patch 8G: getActiveScoredJobCards helper (pure logic)", () => {
  // Test the run grouping / trimming logic independently
  it("G) run grouping correctly maps runs to their job cards", () => {
    // Simulate the grouping logic from getActiveScoredJobCards
    type Run = { id: number; jobCardId: number; overallScore: number | null; createdAt: Date };
    const runs: Run[] = [
      { id: 1, jobCardId: 10, overallScore: 60, createdAt: new Date("2026-01-01") },
      { id: 2, jobCardId: 10, overallScore: 70, createdAt: new Date("2026-01-02") },
      { id: 3, jobCardId: 20, overallScore: 55, createdAt: new Date("2026-01-01") },
    ];

    const runsByCard = new Map<number, Run[]>();
    for (const run of runs) {
      const arr = runsByCard.get(run.jobCardId) ?? [];
      arr.push(run);
      runsByCard.set(run.jobCardId, arr);
    }

    expect(runsByCard.get(10)).toHaveLength(2);
    expect(runsByCard.get(20)).toHaveLength(1);
    expect(runsByCard.get(10)![0].overallScore).toBe(60);
    expect(runsByCard.get(10)![1].overallScore).toBe(70);
  });

  it("H) run trimming keeps last N runs when over limit", () => {
    const makeSimpleRun = (id: number, score: number) => ({
      id,
      overallScore: score,
      createdAt: new Date(BASE_DATE.getTime() + id * 86_400_000),
    });

    // Simulate 12 runs, limit is 10
    const runs = Array.from({ length: 12 }, (_, i) => makeSimpleRun(i + 1, 50 + i));
    const runsPerCard = 10;
    const trimmed = runs.length > runsPerCard ? runs.slice(runs.length - runsPerCard) : runs;

    expect(trimmed).toHaveLength(10);
    // Should keep the last 10 (most recent), i.e., runs 3-12
    expect(trimmed[0].id).toBe(3);
    expect(trimmed[trimmed.length - 1].id).toBe(12);
  });
});
