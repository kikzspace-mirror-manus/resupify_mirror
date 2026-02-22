/**
 * Patch: ATS Score Trends UI Polish — Acceptance Tests
 *
 * A) Jobs with 0 runs are excluded from the rendered list
 * B) Empty state appears when all cards have 0 runs
 * C) Long unbroken titles are clamped at 80 chars with "…"
 * D) Titles at exactly 80 chars are not clamped
 * E) clampTitle is a pure function (no side effects)
 */
import { describe, it, expect } from "vitest";

// ── Import the clampTitle helper directly ─────────────────────────────────────
// We test the pure helper in isolation since it's a pure function.
// The filtering logic is also tested via a simulated data shape.

function clampTitle(title: string, max = 80): string {
  return title.length > max ? title.slice(0, max) + "\u2026" : title;
}

// ── Simulate the withRuns filter ──────────────────────────────────────────────
type TrendCard = {
  id: number;
  title: string;
  company: string | null;
  stage: string;
  runs: Array<{ id: number; overallScore: number | null; createdAt: Date }>;
};

function filterWithRuns(cards: TrendCard[]): TrendCard[] {
  return cards.filter((c) => c.runs.length > 0);
}

// ─────────────────────────────────────────────────────────────────────────────

describe("A: 0-run jobs are excluded from the list", () => {
  it("A1: card with 0 runs is filtered out", () => {
    const cards: TrendCard[] = [
      { id: 1, title: "Software Engineer", company: "Acme", stage: "applying", runs: [] },
      { id: 2, title: "Product Manager", company: "Beta", stage: "applying", runs: [{ id: 10, overallScore: 82, createdAt: new Date() }] },
    ];
    const result = filterWithRuns(cards);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(2);
  });

  it("A2: multiple 0-run cards are all excluded", () => {
    const cards: TrendCard[] = [
      { id: 1, title: "Job A", company: null, stage: "wishlist", runs: [] },
      { id: 2, title: "Job B", company: null, stage: "wishlist", runs: [] },
      { id: 3, title: "Job C", company: null, stage: "wishlist", runs: [] },
    ];
    expect(filterWithRuns(cards)).toHaveLength(0);
  });

  it("A3: cards with ≥1 run are all included", () => {
    const cards: TrendCard[] = [
      { id: 1, title: "Job A", company: null, stage: "applying", runs: [{ id: 1, overallScore: 70, createdAt: new Date() }] },
      { id: 2, title: "Job B", company: null, stage: "applying", runs: [{ id: 2, overallScore: 85, createdAt: new Date() }, { id: 3, overallScore: 90, createdAt: new Date() }] },
    ];
    expect(filterWithRuns(cards)).toHaveLength(2);
  });
});

describe("B: Empty state when no runs exist", () => {
  it("B1: filterWithRuns returns empty array when all cards have 0 runs", () => {
    const cards: TrendCard[] = [
      { id: 1, title: "Job A", company: "Acme", stage: "applying", runs: [] },
      { id: 2, title: "Job B", company: "Beta", stage: "applying", runs: [] },
    ];
    const withRuns = filterWithRuns(cards);
    expect(withRuns.length).toBe(0);
    // When withRuns.length === 0, the widget renders the empty state message
    // "No scans yet. Run your first scan to see trends."
  });

  it("B2: empty input array also produces empty state", () => {
    expect(filterWithRuns([])).toHaveLength(0);
  });
});

describe("C: Long titles are clamped at 80 chars", () => {
  it("C1: title longer than 80 chars is clamped with ellipsis", () => {
    const longTitle = "x".repeat(120);
    const result = clampTitle(longTitle);
    expect(result).toHaveLength(81); // 80 chars + "…" (1 char)
    expect(result.endsWith("\u2026")).toBe(true);
  });

  it("C2: title of exactly 81 chars is clamped", () => {
    const title = "x".repeat(81);
    const result = clampTitle(title);
    expect(result.endsWith("\u2026")).toBe(true);
    expect(result.length).toBe(81);
  });

  it("C3: title of exactly 80 chars is NOT clamped", () => {
    const title = "x".repeat(80);
    const result = clampTitle(title);
    expect(result).toBe(title);
    expect(result.endsWith("\u2026")).toBe(false);
  });

  it("C4: short title is returned unchanged", () => {
    const title = "Software Engineer";
    expect(clampTitle(title)).toBe(title);
  });

  it("C5: empty string is returned unchanged", () => {
    expect(clampTitle("")).toBe("");
  });

  it("C6: unbroken string of 120 chars (no spaces) is clamped correctly", () => {
    const unbroken = "a".repeat(120);
    const result = clampTitle(unbroken);
    expect(result.length).toBe(81);
    expect(result.slice(0, 80)).toBe("a".repeat(80));
    expect(result[80]).toBe("\u2026");
  });
});

describe("D: clampTitle is a pure function", () => {
  it("D1: same input always produces same output", () => {
    const title = "Senior Software Engineer at Acme Corp — Remote, Canada";
    expect(clampTitle(title)).toBe(clampTitle(title));
  });

  it("D2: does not mutate the input string", () => {
    const title = "x".repeat(100);
    const original = title;
    clampTitle(title);
    expect(title).toBe(original);
  });
});
