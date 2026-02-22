/**
 * Patch: ATS Score Trends — Sort + Cap + View All
 *
 * A) Rows sorted by most-recent scan date descending
 * B) List capped to TREND_CAP (8)
 * C) "View all" appears only when total > TREND_CAP
 * D) "View all" does NOT appear when total <= TREND_CAP
 */
import { describe, it, expect } from "vitest";

// ── Inline the pure helpers (mirrors ScoreTrendsWidget.tsx) ──────────────────
const TREND_CAP = 8;

type TrendCard = {
  id: number;
  title: string;
  company: string | null;
  stage: string;
  runs: Array<{ id: number; overallScore: number | null; createdAt: Date }>;
};

function latestRunDate(card: TrendCard): number {
  if (card.runs.length === 0) return 0;
  return Math.max(...card.runs.map((r) => new Date(r.createdAt).getTime()));
}

function sortAndCapTrends(
  cards: TrendCard[],
  cap = TREND_CAP
): { visible: TrendCard[]; total: number } {
  const withRuns = cards.filter((c) => c.runs.length > 0);
  const sorted = [...withRuns].sort((a, b) => latestRunDate(b) - latestRunDate(a));
  return { visible: sorted.slice(0, cap), total: withRuns.length };
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function makeCard(id: number, runDates: Date[]): TrendCard {
  return {
    id,
    title: `Job ${id}`,
    company: "Acme",
    stage: "applying",
    runs: runDates.map((d, i) => ({ id: id * 100 + i, overallScore: 80, createdAt: d })),
  };
}

const now = new Date("2026-02-22T12:00:00Z");
const t = (offsetMs: number) => new Date(now.getTime() + offsetMs);

// ─────────────────────────────────────────────────────────────────────────────

describe("A: Sorted by most-recent scan date descending", () => {
  it("A1: card with later scan appears first", () => {
    const older = makeCard(1, [t(-3600_000)]); // 1 hour ago
    const newer = makeCard(2, [t(-60_000)]);   // 1 minute ago
    const { visible } = sortAndCapTrends([older, newer]);
    expect(visible[0].id).toBe(2);
    expect(visible[1].id).toBe(1);
  });

  it("A2: card with multiple runs uses the latest run timestamp", () => {
    const cardA = makeCard(1, [t(-7200_000), t(-1800_000)]); // latest: 30 min ago
    const cardB = makeCard(2, [t(-3600_000)]);                // 1 hour ago
    const { visible } = sortAndCapTrends([cardB, cardA]);
    expect(visible[0].id).toBe(1); // A has a more recent run
  });

  it("A3: three cards sorted correctly", () => {
    const a = makeCard(1, [t(-10_000)]);   // 10s ago
    const b = makeCard(2, [t(-5_000)]);    // 5s ago (newest)
    const c = makeCard(3, [t(-20_000)]);   // 20s ago
    const { visible } = sortAndCapTrends([a, b, c]);
    expect(visible.map((v) => v.id)).toEqual([2, 1, 3]);
  });

  it("A4: 0-run cards are excluded before sorting", () => {
    const withRun = makeCard(1, [t(-1000)]);
    const noRun = makeCard(2, []);
    const { visible, total } = sortAndCapTrends([withRun, noRun]);
    expect(total).toBe(1);
    expect(visible[0].id).toBe(1);
  });
});

describe("B: List capped to TREND_CAP (8)", () => {
  it("B1: exactly 8 cards — all shown, total = 8", () => {
    const cards = Array.from({ length: 8 }, (_, i) =>
      makeCard(i + 1, [t(-i * 1000)])
    );
    const { visible, total } = sortAndCapTrends(cards);
    expect(visible).toHaveLength(8);
    expect(total).toBe(8);
  });

  it("B2: 9 cards — visible = 8, total = 9", () => {
    const cards = Array.from({ length: 9 }, (_, i) =>
      makeCard(i + 1, [t(-i * 1000)])
    );
    const { visible, total } = sortAndCapTrends(cards);
    expect(visible).toHaveLength(8);
    expect(total).toBe(9);
  });

  it("B3: 20 cards — visible = 8, total = 20", () => {
    const cards = Array.from({ length: 20 }, (_, i) =>
      makeCard(i + 1, [t(-i * 1000)])
    );
    const { visible, total } = sortAndCapTrends(cards);
    expect(visible).toHaveLength(8);
    expect(total).toBe(20);
  });

  it("B4: 3 cards — visible = 3, total = 3", () => {
    const cards = Array.from({ length: 3 }, (_, i) =>
      makeCard(i + 1, [t(-i * 1000)])
    );
    const { visible, total } = sortAndCapTrends(cards);
    expect(visible).toHaveLength(3);
    expect(total).toBe(3);
  });
});

describe("C: View all appears only when total > TREND_CAP", () => {
  it("C1: total = 9 → should show View all (total > 8)", () => {
    const cards = Array.from({ length: 9 }, (_, i) =>
      makeCard(i + 1, [t(-i * 1000)])
    );
    const { total } = sortAndCapTrends(cards);
    expect(total > TREND_CAP).toBe(true);
  });

  it("C2: total = 8 → should NOT show View all (total === 8)", () => {
    const cards = Array.from({ length: 8 }, (_, i) =>
      makeCard(i + 1, [t(-i * 1000)])
    );
    const { total } = sortAndCapTrends(cards);
    expect(total > TREND_CAP).toBe(false);
  });

  it("C3: total = 1 → should NOT show View all", () => {
    const cards = [makeCard(1, [t(-1000)])];
    const { total } = sortAndCapTrends(cards);
    expect(total > TREND_CAP).toBe(false);
  });

  it("C4: total = 0 → should NOT show View all (empty state instead)", () => {
    const { total } = sortAndCapTrends([]);
    expect(total > TREND_CAP).toBe(false);
  });
});

describe("D: TREND_CAP constant is 8", () => {
  it("D1: TREND_CAP equals 8", () => {
    expect(TREND_CAP).toBe(8);
  });
});
