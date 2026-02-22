/**
 * Analytics ATS Score History — acceptance tests
 *
 * A) getAllScannedJobCards only returns jobs with >=1 completed run
 * B) Results are sorted by latest run date descending
 * C) Each job includes all its runs (no cap)
 * D) Open job link target includes /jobs/:id?tab=evidence
 * E) Jobs with 0 completed runs are excluded
 * F) avgScore computation from scanned jobs
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { _enableTestBypass, _disableTestBypass } from "./rateLimiter";

beforeAll(() => _enableTestBypass());
afterAll(() => _disableTestBypass());

// ─── Helper: simulate getAllScannedJobCards filtering + sorting logic ─────────
type Run = { id: number; overallScore: number | null; createdAt: Date };
type Card = { id: number; title: string; company: string | null; stage: string; runs: Run[] };

function processScannedJobs(cards: Card[]): Card[] {
  return cards
    .map((card) => ({ ...card }))
    .filter((card) => card.runs.length > 0)
    .sort((a, b) => {
      const aLatest = a.runs[a.runs.length - 1]?.createdAt?.getTime() ?? 0;
      const bLatest = b.runs[b.runs.length - 1]?.createdAt?.getTime() ?? 0;
      return bLatest - aLatest;
    });
}

// ─── Helper: simulate avgScore computation ────────────────────────────────────
function computeAvgScore(jobs: Card[]): number {
  const allScores = jobs.flatMap((j) =>
    j.runs.map((r) => r.overallScore).filter((s): s is number => s !== null)
  );
  if (allScores.length === 0) return 0;
  return Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length);
}

// ─── Helper: build open job link ─────────────────────────────────────────────
function buildOpenJobLink(cardId: number): string {
  return `/jobs/${cardId}?tab=evidence`;
}

const now = new Date();
const earlier = new Date(now.getTime() - 1000 * 60 * 60); // 1 hour ago
const evenEarlier = new Date(now.getTime() - 1000 * 60 * 60 * 2); // 2 hours ago

const mockCards: Card[] = [
  {
    id: 1,
    title: "Software Engineer",
    company: "Acme Corp",
    stage: "applied",
    runs: [
      { id: 10, overallScore: 72, createdAt: evenEarlier },
      { id: 11, overallScore: 80, createdAt: earlier },
    ],
  },
  {
    id: 2,
    title: "Product Manager",
    company: "Globex",
    stage: "bookmarked",
    runs: [], // 0 runs — should be excluded
  },
  {
    id: 3,
    title: "Data Analyst",
    company: null,
    stage: "interviewing",
    runs: [{ id: 20, overallScore: 65, createdAt: now }],
  },
];

describe("Analytics ATS Score History — getAllScannedJobCards logic", () => {
  it("A) only returns jobs with >=1 completed run", () => {
    const result = processScannedJobs(mockCards);
    expect(result.every((j) => j.runs.length > 0)).toBe(true);
    expect(result.length).toBe(2); // job 2 excluded
  });

  it("B) sorted by latest run date descending", () => {
    const result = processScannedJobs(mockCards);
    // job 3 has latest run = now, job 1 has latest run = earlier
    expect(result[0].id).toBe(3);
    expect(result[1].id).toBe(1);
  });

  it("C) each job includes all its runs (no cap)", () => {
    const result = processScannedJobs(mockCards);
    const job1 = result.find((j) => j.id === 1);
    expect(job1?.runs.length).toBe(2);
  });

  it("D) open job link includes /jobs/:id?tab=evidence", () => {
    expect(buildOpenJobLink(3)).toBe("/jobs/3?tab=evidence");
    expect(buildOpenJobLink(1)).toBe("/jobs/1?tab=evidence");
  });

  it("E) jobs with 0 completed runs are excluded", () => {
    const result = processScannedJobs(mockCards);
    expect(result.find((j) => j.id === 2)).toBeUndefined();
  });

  it("F) avgScore computed correctly across all scanned jobs", () => {
    const result = processScannedJobs(mockCards);
    // Scores: 72, 80, 65 → avg = Math.round((72+80+65)/3) = Math.round(72.33) = 72
    expect(computeAvgScore(result)).toBe(72);
  });

  it("G) empty input returns empty array", () => {
    expect(processScannedJobs([])).toEqual([]);
  });

  it("H) all-zero-run input returns empty array", () => {
    const noRuns: Card[] = [
      { id: 99, title: "Ghost", company: null, stage: "bookmarked", runs: [] },
    ];
    expect(processScannedJobs(noRuns)).toEqual([]);
  });
});
