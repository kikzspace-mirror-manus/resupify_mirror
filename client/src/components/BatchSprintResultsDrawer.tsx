/**
 * Phase 10E: Batch Sprint Results Drawer
 * Phase 10F: CSV Export
 *
 * Displays per-job results after a Batch Sprint completes:
 * - Company + Job Title (truncated)
 * - ATS/Match score
 * - Top-1 change suggestion
 * - Status indicator (Success / Failed)
 * - "Open" link to Job Card detail
 * - Download CSV button (Phase 10F)
 *
 * Features:
 * - Default sort: lowest score first (worst match first)
 * - Filter toggle: All / Failed only
 * - Retry failed button with credit cost label
 * - Retry uses runAI() + fresh actionIds
 * - Export respects current filter (All vs Failed-only)
 */
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ExternalLink, AlertCircle, CheckCircle2, Zap, RefreshCw, Download } from "lucide-react";
import { useAIConcurrency } from "@/contexts/AIConcurrencyContext";
import { toast } from "sonner";

export interface BatchSprintResult {
  jobCardId: number;
  runId: number | null;
  error?: string;
  score?: number;
  topSuggestion?: string;
  title?: string;
  company?: string;
  /** Optional: job stage if available */
  stage?: string;
  /** Optional: job priority if available */
  priority?: string;
}

interface BatchSprintResultsDrawerProps {
  open: boolean;
  onClose: () => void;
  results: BatchSprintResult[];
  /** Called when user retries failed jobs. Receives the failed jobCardIds and resumeId. */
  onRetryFailed: (jobCardIds: number[], resumeId: number) => void;
  resumeId: number | null;
  isRetrying?: boolean;
}

// ─── CSV Utilities (Phase 10F) ─────────────────────────────────────────────

/**
 * Escapes a single CSV field value.
 * - Wraps in double-quotes if the value contains commas, double-quotes, or newlines.
 * - Doubles any internal double-quote characters.
 * - Replaces newlines within the value with a space to keep rows single-line.
 */
export function csvEscape(val: string | number | undefined | null): string {
  if (val === undefined || val === null) return "";
  const str = String(val)
    .replace(/\r\n/g, " ")
    .replace(/\n/g, " ")
    .replace(/\r/g, " ")
    .trim();
  // Wrap in quotes if the value contains a comma, double-quote, or was multi-line
  if (str.includes(",") || str.includes('"') || String(val).includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Builds a CSV string from an array of BatchSprintResult rows.
 * Columns (in order): company, title, score, top_suggestion, status, stage, priority, job_card_url
 */
export function buildSprintCsv(rows: BatchSprintResult[], origin: string): string {
  const header = ["company", "title", "score", "top_suggestion", "status", "stage", "priority", "job_card_url"].join(",");
  const dataRows = rows.map((r) => {
    const status = r.runId !== null ? "Success" : "Failed";
    const url = `${origin}/jobs/${r.jobCardId}`;
    return [
      csvEscape(r.company),
      csvEscape(r.title),
      csvEscape(r.score),
      csvEscape(r.topSuggestion),
      csvEscape(status),
      csvEscape(r.stage),
      csvEscape(r.priority),
      csvEscape(url),
    ].join(",");
  });
  return [header, ...dataRows].join("\n");
}

/**
 * Triggers a browser download of the given CSV string.
 */
export function downloadCsvFile(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates a filename like: batch-sprint-results-2026-02-23-1430.csv
 */
export function buildCsvFilename(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}`;
  return `batch-sprint-results-${date}-${time}.csv`;
}

// ─── Score Helpers ─────────────────────────────────────────────────────────

function scoreColor(score: number | undefined): string {
  if (score === undefined) return "text-gray-500";
  if (score >= 75) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 50) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function scoreBg(score: number | undefined): string {
  if (score === undefined) return "bg-gray-100 dark:bg-gray-800";
  if (score >= 75) return "bg-emerald-50 dark:bg-emerald-900/20";
  if (score >= 50) return "bg-amber-50 dark:bg-amber-900/20";
  return "bg-red-50 dark:bg-red-900/20";
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function BatchSprintResultsDrawer({
  open,
  onClose,
  results,
  onRetryFailed,
  resumeId,
  isRetrying = false,
}: BatchSprintResultsDrawerProps) {
  const [, setLocation] = useLocation();
  const [filter, setFilter] = useState<"all" | "failed">("all");
  const { isBusy, isQueued } = useAIConcurrency();

  const failedResults = useMemo(
    () => results.filter((r) => r.runId === null),
    [results]
  );

  const displayResults = useMemo(() => {
    const base = filter === "failed" ? failedResults : results;
    // Sort: failed first (no score), then lowest score first
    return [...base].sort((a, b) => {
      if (a.runId === null && b.runId !== null) return -1;
      if (a.runId !== null && b.runId === null) return 1;
      const aScore = a.score ?? 0;
      const bScore = b.score ?? 0;
      return aScore - bScore; // lowest first
    });
  }, [results, failedResults, filter]);

  const failedCount = failedResults.length;
  const succeededCount = results.length - failedCount;
  // Each retry costs 1 credit per job (same as individual evidence.run)
  const retryCreditCost = failedCount;

  // Phase 10F: CSV download handler
  const handleDownloadCsv = () => {
    const origin = window.location.origin;
    const csv = buildSprintCsv(displayResults, origin);
    const filename = buildCsvFilename();
    downloadCsvFile(csv, filename);
    toast.success("CSV downloaded");
  };

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent
        side="right"
        data-testid="batch-sprint-results-drawer"
        className="w-full sm:max-w-lg flex flex-col gap-0 p-0"
      >
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base font-semibold flex items-center gap-2">
              <Zap className="h-4 w-4 text-violet-500" />
              Batch Sprint Results
            </SheetTitle>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="text-emerald-600 font-medium">{succeededCount} ok</span>
                {failedCount > 0 && (
                  <span className="text-red-500 font-medium">{failedCount} failed</span>
                )}
                <span className="text-muted-foreground">/ {results.length} total</span>
              </div>
              {/* Phase 10F: Download CSV button */}
              <Button
                data-testid="batch-sprint-download-csv-btn"
                size="sm"
                variant="outline"
                className="h-7 px-2.5 text-xs gap-1.5"
                disabled={displayResults.length === 0}
                onClick={handleDownloadCsv}
                title="Download CSV"
              >
                <Download className="h-3 w-3" />
                CSV
              </Button>
            </div>
          </div>

          {/* Filter + Retry row */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex gap-1">
              <Button
                data-testid="batch-sprint-filter-all"
                size="sm"
                variant={filter === "all" ? "default" : "outline"}
                className="h-7 px-3 text-xs"
                onClick={() => setFilter("all")}
              >
                All ({results.length})
              </Button>
              <Button
                data-testid="batch-sprint-filter-failed"
                size="sm"
                variant={filter === "failed" ? "default" : "outline"}
                className="h-7 px-3 text-xs"
                onClick={() => setFilter("failed")}
                disabled={failedCount === 0}
              >
                Failed ({failedCount})
              </Button>
            </div>
            {failedCount > 0 && resumeId !== null && (
              <Button
                data-testid="batch-sprint-retry-failed-btn"
                size="sm"
                variant="outline"
                className="h-7 px-3 text-xs gap-1.5 border-violet-300 text-violet-700 hover:bg-violet-50"
                disabled={isRetrying || isBusy || isQueued}
                onClick={() => {
                  const failedIds = failedResults.map((r) => r.jobCardId);
                  onRetryFailed(failedIds, resumeId);
                }}
              >
                <RefreshCw className="h-3 w-3" />
                {isRetrying ? "Retrying…" : `Retry failed (${retryCreditCost} credit${retryCreditCost !== 1 ? "s" : ""})`}
              </Button>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 px-6 py-3">
          {displayResults.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground text-sm">
              <CheckCircle2 className="h-8 w-8 text-emerald-400 mb-2" />
              No failed jobs — all scans succeeded!
            </div>
          )}
          <div className="space-y-2">
            {displayResults.map((result) => {
              const isFailed = result.runId === null;
              return (
                <div
                  key={result.jobCardId}
                  data-testid="batch-sprint-result-row"
                  className={`rounded-lg border p-3 ${isFailed ? "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-900/10" : `${scoreBg(result.score)} border-border`}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {/* Company + Title */}
                      <p className="text-sm font-medium truncate leading-tight">
                        {result.company ? (
                          <span className="text-muted-foreground">{result.company} · </span>
                        ) : null}
                        <span>{result.title || `Job #${result.jobCardId}`}</span>
                      </p>

                      {/* Top suggestion or error */}
                      {isFailed ? (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-0.5 line-clamp-2">
                          {result.error ?? "Unknown error"}
                        </p>
                      ) : result.topSuggestion ? (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {result.topSuggestion}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Score badge */}
                      {!isFailed && result.score !== undefined && (
                        <span
                          data-testid="batch-sprint-score"
                          className={`text-sm font-bold tabular-nums ${scoreColor(result.score)}`}
                        >
                          {result.score}%
                        </span>
                      )}

                      {/* Status badge */}
                      {isFailed ? (
                        <Badge
                          data-testid="batch-sprint-status-failed"
                          variant="outline"
                          className="text-xs border-red-300 text-red-600 bg-red-50 dark:bg-red-900/20 gap-1"
                        >
                          <AlertCircle className="h-3 w-3" />
                          Failed
                        </Badge>
                      ) : (
                        <Badge
                          data-testid="batch-sprint-status-success"
                          variant="outline"
                          className="text-xs border-emerald-300 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 gap-1"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          OK
                        </Badge>
                      )}

                      {/* Open link */}
                      <Button
                        data-testid="batch-sprint-open-btn"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        title="Open job card"
                        onClick={() => setLocation(`/jobs/${result.jobCardId}`)}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
