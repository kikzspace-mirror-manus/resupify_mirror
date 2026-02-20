/**
 * Patch 6F — Score History Sparkline
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
    getScoreHistory: vi.fn(),
  };
});

import * as db from "./db";

// ─── Shared fixtures ─────────────────────────────────────────────────
const BASE_DATE = new Date("2026-01-01T10:00:00Z");

function makeRun(id: number, score: number, daysOffset: number) {
  return {
    id,
    resumeId: 5,
    overallScore: score,
    createdAt: new Date(BASE_DATE.getTime() + daysOffset * 86400000),
  };
}

// ─── Test Suite ───────────────────────────────────────────────────────
describe("Patch 6F: Score History Sparkline", () => {
  const ctx = makeCtx();
  const caller = appRouter.createCaller(ctx);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Test A: 0 runs returns empty array ──────────────────────────────
  it("A) Job Card with 0 runs returns empty array", async () => {
    (db.getScoreHistory as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await caller.evidence.scoreHistory({ jobCardId: 1 });

    expect(result).toEqual([]);
    expect(db.getScoreHistory).toHaveBeenCalledWith(1, undefined, 20);
  });

  // ─── Test B: 1 run returns single-point array ─────────────────────────
  it("B) With 1 run returns single-point array with current score", async () => {
    const runs = [makeRun(10, 65, 0)];
    (db.getScoreHistory as ReturnType<typeof vi.fn>).mockResolvedValue(runs);

    const result = await caller.evidence.scoreHistory({ jobCardId: 1 });

    expect(result).toHaveLength(1);
    expect(result[0].overallScore).toBe(65);
    expect(result[0].id).toBe(10);
  });

  // ─── Test C: Multiple runs returns correct latest score and delta ─────
  it("C) With multiple runs returns chronological array with correct scores", async () => {
    const runs = [
      makeRun(10, 55, 0),
      makeRun(11, 61, 3),
      makeRun(12, 72, 7),
    ];
    (db.getScoreHistory as ReturnType<typeof vi.fn>).mockResolvedValue(runs);

    const result = await caller.evidence.scoreHistory({ jobCardId: 1 });

    expect(result).toHaveLength(3);
    const latestScore = result[result.length - 1].overallScore;
    const prevScore = result[result.length - 2].overallScore;
    expect(latestScore).toBe(72);
    expect(prevScore).toBe(61);
    // Delta should be +11
    const delta = (latestScore ?? 0) - (prevScore ?? 0);
    expect(delta).toBe(11);
  });

  // ─── Test D: Data ordering is chronological ───────────────────────────
  it("D) Data ordering is chronological (ascending by createdAt)", async () => {
    // Return runs already sorted ascending (db helper handles ordering)
    const runs = [
      makeRun(10, 55, 0),   // Jan 1
      makeRun(11, 61, 3),   // Jan 4
      makeRun(12, 72, 7),   // Jan 8
    ];
    (db.getScoreHistory as ReturnType<typeof vi.fn>).mockResolvedValue(runs);

    const result = await caller.evidence.scoreHistory({ jobCardId: 1 });

    // Verify ascending order
    for (let i = 1; i < result.length; i++) {
      const prev = new Date(result[i - 1].createdAt).getTime();
      const curr = new Date(result[i].createdAt).getTime();
      expect(curr).toBeGreaterThanOrEqual(prev);
    }
  });

  // ─── Test E: No changes to score calculation or run creation ─────────
  it("E) scoreHistory query does not modify any run data (read-only)", async () => {
    const runs = [makeRun(10, 72, 0)];
    (db.getScoreHistory as ReturnType<typeof vi.fn>).mockResolvedValue(runs);

    const result = await caller.evidence.scoreHistory({ jobCardId: 1 });

    // Only getScoreHistory was called — no mutations
    expect(db.getScoreHistory).toHaveBeenCalledOnce();
    // The returned data is unchanged from what the db returned
    expect(result[0].overallScore).toBe(72);
    expect(result[0].id).toBe(10);
  });

  // ─── Test F: Single query per page load (no N+1) ─────────────────────
  it("F) scoreHistory query is called exactly once per jobCardId", async () => {
    (db.getScoreHistory as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await caller.evidence.scoreHistory({ jobCardId: 42 });

    // Exactly one db call, with the correct jobCardId and limit
    expect(db.getScoreHistory).toHaveBeenCalledTimes(1);
    expect(db.getScoreHistory).toHaveBeenCalledWith(42, undefined, 20);
  });

  // ─── Test F2: Optional resumeId filter is passed through ─────────────
  it("F2) Optional resumeId is forwarded to db.getScoreHistory", async () => {
    (db.getScoreHistory as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await caller.evidence.scoreHistory({ jobCardId: 1, resumeId: 5 });

    expect(db.getScoreHistory).toHaveBeenCalledWith(1, 5, 20);
  });
});
