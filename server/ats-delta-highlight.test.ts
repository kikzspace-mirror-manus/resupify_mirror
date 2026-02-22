/**
 * Phase: ATS Score Delta Highlight
 * Tests: computeDelta helper and threshold gating
 */
import { describe, it, expect } from "vitest";
import { computeDelta } from "../client/src/components/ScoreTrendsWidget";

const DELTA_THRESHOLD = 10;

function makeRuns(scores: (number | null)[]) {
  return scores.map((overallScore, i) => ({
    id: i + 1,
    overallScore,
    createdAt: new Date(Date.now() + i * 1000),
  }));
}

describe("computeDelta", () => {
  it("A1: returns null when fewer than 2 runs", () => {
    expect(computeDelta(makeRuns([75]))).toBeNull();
    expect(computeDelta(makeRuns([]))).toBeNull();
  });

  it("A2: returns correct positive delta", () => {
    expect(computeDelta(makeRuns([60, 80]))).toBe(20);
  });

  it("A3: returns correct negative delta", () => {
    expect(computeDelta(makeRuns([80, 55]))).toBe(-25);
  });

  it("A4: returns 0 when scores are equal", () => {
    expect(computeDelta(makeRuns([70, 70]))).toBe(0);
  });

  it("A5: uses only the last two runs (ignores earlier runs)", () => {
    // runs: 40 → 90 → 72 → delta should be 72-90 = -18, not 90-40
    expect(computeDelta(makeRuns([40, 90, 72]))).toBe(-18);
  });

  it("A6: returns null when latest score is null", () => {
    expect(computeDelta(makeRuns([70, null]))).toBeNull();
  });

  it("A7: returns null when previous score is null", () => {
    expect(computeDelta(makeRuns([null, 80]))).toBeNull();
  });
});

describe("Delta threshold gating (abs >= 10)", () => {
  it("B1: delta of +10 meets threshold", () => {
    const delta = computeDelta(makeRuns([60, 70]));
    expect(delta).toBe(10);
    expect(Math.abs(delta!)).toBeGreaterThanOrEqual(DELTA_THRESHOLD);
  });

  it("B2: delta of +9 does NOT meet threshold", () => {
    const delta = computeDelta(makeRuns([61, 70]));
    expect(delta).toBe(9);
    expect(Math.abs(delta!)).toBeLessThan(DELTA_THRESHOLD);
  });

  it("B3: delta of -10 meets threshold", () => {
    const delta = computeDelta(makeRuns([80, 70]));
    expect(delta).toBe(-10);
    expect(Math.abs(delta!)).toBeGreaterThanOrEqual(DELTA_THRESHOLD);
  });

  it("B4: delta of -9 does NOT meet threshold", () => {
    const delta = computeDelta(makeRuns([79, 70]));
    expect(delta).toBe(-9);
    expect(Math.abs(delta!)).toBeLessThan(DELTA_THRESHOLD);
  });

  it("B5: delta of 0 does NOT meet threshold", () => {
    const delta = computeDelta(makeRuns([70, 70]));
    expect(delta).toBe(0);
    expect(Math.abs(delta!)).toBeLessThan(DELTA_THRESHOLD);
  });

  it("B6: null delta is never shown (no indicator)", () => {
    const delta = computeDelta(makeRuns([70]));
    expect(delta).toBeNull();
    // null → indicator should not render
    const shouldShow = delta !== null && Math.abs(delta) >= DELTA_THRESHOLD;
    expect(shouldShow).toBe(false);
  });

  it("B7: large positive delta (+25) shows positive indicator", () => {
    const delta = computeDelta(makeRuns([50, 75]));
    expect(delta).toBe(25);
    expect(delta! >= DELTA_THRESHOLD).toBe(true);
  });

  it("B8: large negative delta (-20) shows negative indicator", () => {
    const delta = computeDelta(makeRuns([90, 70]));
    expect(delta).toBe(-20);
    expect(delta! <= -DELTA_THRESHOLD).toBe(true);
  });
});
