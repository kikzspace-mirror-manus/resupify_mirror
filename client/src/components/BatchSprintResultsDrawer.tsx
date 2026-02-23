/**
 * Phase 10E: Batch Sprint Results Drawer
 *
 * Displays per-job results after a Batch Sprint completes:
 * - Company + Job Title (truncated)
 * - ATS/Match score
 * - Top-1 change suggestion
 * - Status indicator (Success / Failed)
 * - "Open" link to Job Card detail
 *
 * Features:
 * - Default sort: lowest score first (worst match first)
 * - Filter toggle: All / Failed only
 * - Retry failed button with credit cost label
 * - Retry uses runAI() + fresh actionIds
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
import { ExternalLink, AlertCircle, CheckCircle2, Zap, RefreshCw } from "lucide-react";
import { useAIConcurrency } from "@/contexts/AIConcurrencyContext";

export interface BatchSprintResult {
  jobCardId: number;
  runId: number | null;
  error?: string;
  score?: number;
  topSuggestion?: string;
  title?: string;
  company?: string;
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
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="text-emerald-600 font-medium">{succeededCount} ok</span>
              {failedCount > 0 && (
                <span className="text-red-500 font-medium">{failedCount} failed</span>
              )}
              <span className="text-muted-foreground">/ {results.length} total</span>
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
