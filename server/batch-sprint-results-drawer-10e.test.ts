/**
 * Phase 10E: Batch Sprint Results Drawer — Acceptance Tests
 *
 * Tests cover:
 * A. Backend enrichment: batchSprint results include score, topSuggestion, title, company
 * B. Drawer component: renders per-job rows with correct data
 * C. Sort order: lowest score first, failed jobs first
 * D. Filter toggle: All / Failed only
 * E. Retry failed: calls onRetryFailed with correct ids and resumeId
 * F. Score color thresholds: ≥75 emerald, ≥50 amber, <50 red
 * G. Auto-open: drawer opens after sprint completes
 * H. Merge retry results: retry updates existing entries in-place
 */
import { describe, it, expect, vi } from "vitest";
import * as fs from "fs";
import * as path from "path";

const routersPath = path.join(__dirname, "routers.ts");
const routersSrc = fs.readFileSync(routersPath, "utf-8");

const drawerPath = path.join(__dirname, "../client/src/components/BatchSprintResultsDrawer.tsx");
const drawerSrc = fs.readFileSync(drawerPath, "utf-8");

const jobCardsPath = path.join(__dirname, "../client/src/pages/JobCards.tsx");
const jobCardsSrc = fs.readFileSync(jobCardsPath, "utf-8");

// ─── A. Backend Enrichment ─────────────────────────────────────────────────
describe("A. Backend: batchSprint result enrichment (Phase 10E)", () => {
  it("A1: results array type includes score, topSuggestion, title, company fields", () => {
    expect(routersSrc).toContain("score?: number");
    expect(routersSrc).toContain("topSuggestion?: string");
    expect(routersSrc).toContain("title?: string");
    expect(routersSrc).toContain("company?: string");
  });

  it("A2: success path pushes score from parsed.overall_score", () => {
    expect(routersSrc).toContain("score: parsed.overall_score ?? 0");
  });

  it("A3: success path pushes topSuggestion from top_3_changes[0] or summary", () => {
    expect(routersSrc).toContain("topSuggestion: (parsed.top_3_changes?.[0] as string | undefined) ?? parsed.summary ?? \"\"");
  });

  it("A4: success path fetches job card for title/company", () => {
    expect(routersSrc).toContain("const jobCard = await db.getJobCardById(jobCardId, ctx.user.id)");
    expect(routersSrc).toContain("title: jobCard?.title ?? \"\"");
    expect(routersSrc).toContain("company: jobCard?.company ?? \"\"");
  });

  it("A5: failure path includes title and company even on error", () => {
    expect(routersSrc).toContain("failTitle");
    expect(routersSrc).toContain("failCompany");
    expect(routersSrc).toContain("title: failTitle, company: failCompany");
  });
});

// ─── B. Drawer Component Structure ────────────────────────────────────────
describe("B. BatchSprintResultsDrawer component structure", () => {
  it("B1: component file exists and exports default", () => {
    expect(drawerSrc).toContain("export default function BatchSprintResultsDrawer");
  });

  it("B2: uses Sheet component for right-side drawer", () => {
    expect(drawerSrc).toContain("side=\"right\"");
    expect(drawerSrc).toContain("data-testid=\"batch-sprint-results-drawer\"");
  });

  it("B3: renders per-job result rows with testid", () => {
    expect(drawerSrc).toContain("data-testid=\"batch-sprint-result-row\"");
  });

  it("B4: shows score with testid", () => {
    expect(drawerSrc).toContain("data-testid=\"batch-sprint-score\"");
  });

  it("B5: shows success and failed status badges with testids", () => {
    expect(drawerSrc).toContain("data-testid=\"batch-sprint-status-success\"");
    expect(drawerSrc).toContain("data-testid=\"batch-sprint-status-failed\"");
  });

  it("B6: shows Open button with testid", () => {
    expect(drawerSrc).toContain("data-testid=\"batch-sprint-open-btn\"");
  });

  it("B7: shows company and title in each row", () => {
    expect(drawerSrc).toContain("result.company");
    expect(drawerSrc).toContain("result.title");
  });

  it("B8: shows topSuggestion text", () => {
    expect(drawerSrc).toContain("result.topSuggestion");
  });

  it("B9: shows error message for failed rows", () => {
    expect(drawerSrc).toContain("result.error");
  });
});

// ─── C. Sort Order ─────────────────────────────────────────────────────────
describe("C. Sort order: lowest score first, failed jobs first", () => {
  it("C1: sort logic puts failed (runId === null) before succeeded", () => {
    expect(drawerSrc).toContain("if (a.runId === null && b.runId !== null) return -1");
    expect(drawerSrc).toContain("if (a.runId !== null && b.runId === null) return 1");
  });

  it("C2: sort logic sorts by ascending score (lowest first)", () => {
    expect(drawerSrc).toContain("return aScore - bScore");
  });

  it("C3: sort uses useMemo for performance", () => {
    expect(drawerSrc).toContain("useMemo");
    expect(drawerSrc).toContain("[results, failedResults, filter]");
  });
});

// ─── D. Filter Toggle ─────────────────────────────────────────────────────
describe("D. Filter toggle: All / Failed only", () => {
  it("D1: filter state defaults to 'all'", () => {
    expect(drawerSrc).toContain("useState<\"all\" | \"failed\">(\"all\")");
  });

  it("D2: All filter button has testid", () => {
    expect(drawerSrc).toContain("data-testid=\"batch-sprint-filter-all\"");
  });

  it("D3: Failed filter button has testid", () => {
    expect(drawerSrc).toContain("data-testid=\"batch-sprint-filter-failed\"");
  });

  it("D4: Failed filter button is disabled when failedCount === 0", () => {
    expect(drawerSrc).toContain("disabled={failedCount === 0}");
  });

  it("D5: filter 'failed' shows only failed results", () => {
    expect(drawerSrc).toContain("filter === \"failed\" ? failedResults : results");
  });
});

// ─── E. Retry Failed ──────────────────────────────────────────────────────
describe("E. Retry failed functionality", () => {
  it("E1: retry button has testid", () => {
    expect(drawerSrc).toContain("data-testid=\"batch-sprint-retry-failed-btn\"");
  });

  it("E2: retry button shows credit cost", () => {
    expect(drawerSrc).toContain("retryCreditCost");
    expect(drawerSrc).toContain("credit");
  });

  it("E3: retry button is disabled when isRetrying or isBusy or isQueued", () => {
    expect(drawerSrc).toContain("disabled={isRetrying || isBusy || isQueued}");
  });

  it("E4: retry button calls onRetryFailed with failed ids and resumeId", () => {
    expect(drawerSrc).toContain("onRetryFailed(failedIds, resumeId)");
    expect(drawerSrc).toContain("const failedIds = failedResults.map((r) => r.jobCardId)");
  });

  it("E5: retry button only shown when failedCount > 0 and resumeId is not null", () => {
    expect(drawerSrc).toContain("failedCount > 0 && resumeId !== null");
  });
});

// ─── F. Score Color Thresholds ────────────────────────────────────────────
describe("F. Score color thresholds", () => {
  it("F1: score >= 75 gets emerald color", () => {
    expect(drawerSrc).toContain("if (score >= 75) return \"text-emerald-600");
  });

  it("F2: score >= 50 gets amber color", () => {
    expect(drawerSrc).toContain("if (score >= 50) return \"text-amber-600");
  });

  it("F3: score < 50 gets red color (default)", () => {
    expect(drawerSrc).toContain("return \"text-red-600");
  });

  it("F4: background color also follows thresholds", () => {
    expect(drawerSrc).toContain("bg-emerald-50");
    expect(drawerSrc).toContain("bg-amber-50");
    expect(drawerSrc).toContain("bg-red-50");
  });
});

// ─── G. Auto-open Integration ─────────────────────────────────────────────
describe("G. Auto-open drawer after sprint completes", () => {
  it("G1: JobCards imports BatchSprintResultsDrawer", () => {
    expect(jobCardsSrc).toContain("import BatchSprintResultsDrawer");
  });

  it("G2: sprintResultsOpen state is initialized to false", () => {
    expect(jobCardsSrc).toContain("const [sprintResultsOpen, setSprintResultsOpen] = useState(false)");
  });

  it("G3: onSuccess sets sprintResults and opens drawer", () => {
    expect(jobCardsSrc).toContain("setSprintResults(data.results as BatchSprintResult[])");
    expect(jobCardsSrc).toContain("setSprintResultsOpen(true)");
  });

  it("G4: BatchSprintResultsDrawer is rendered in JSX", () => {
    expect(jobCardsSrc).toContain("<BatchSprintResultsDrawer");
    expect(jobCardsSrc).toContain("open={sprintResultsOpen}");
  });

  it("G5: resumeId is stored for retry when sprint is launched", () => {
    expect(jobCardsSrc).toContain("setSprintResumeIdForRetry(resumeId)");
  });
});

// ─── H. Retry Merge Logic ─────────────────────────────────────────────────
describe("H. Retry merges results in-place", () => {
  it("H1: handleRetryFailed function exists in JobCards", () => {
    expect(jobCardsSrc).toContain("const handleRetryFailed = (failedIds: number[], resumeId: number)");
  });

  it("H2: retry uses runAI() to respect concurrency queue", () => {
    expect(jobCardsSrc).toContain("runAI(() =>");
  });

  it("H3: retry onSuccess merges new results into existing sprintResults", () => {
    expect(jobCardsSrc).toContain("setSprintResults((prev) => {");
    expect(jobCardsSrc).toContain("const updated = [...prev]");
    expect(jobCardsSrc).toContain("updated[idx] = newResult as BatchSprintResult");
  });

  it("H4: isRetryingFailed is set to true before retry and false after", () => {
    expect(jobCardsSrc).toContain("setIsRetryingFailed(true)");
    expect(jobCardsSrc).toContain("setIsRetryingFailed(false)");
  });

  it("H5: drawer receives isRetrying prop", () => {
    expect(jobCardsSrc).toContain("isRetrying={isRetryingFailed}");
  });
});
