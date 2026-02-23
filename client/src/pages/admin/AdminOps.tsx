import { useState, useEffect, useRef } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Clock, Webhook, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";

function formatTs(ts: Date | null | undefined): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleString();
}

function AgeLabel({ ts }: { ts: Date | null | undefined }) {
  if (!ts) return <span className="text-muted-foreground text-sm">Never</span>;
  const diffMs = Date.now() - new Date(ts).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);
  let label = "";
  if (diffD > 0) label = `${diffD}d ago`;
  else if (diffH > 0) label = `${diffH}h ago`;
  else if (diffMin > 0) label = `${diffMin}m ago`;
  else label = "just now";
  return <span className="text-muted-foreground text-sm">{label}</span>;
}

/** Format how long ago a Date was, for the "Last refreshed" label */
function formatFreshness(ts: Date | null): string {
  if (!ts) return "";
  const diffMs = Date.now() - ts.getTime();
  const diffSec = Math.floor(diffMs / 1_000);
  if (diffSec < 5) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.round(diffSec / 60);
  return `${diffMin}m ago`;
}

const STATUS_COLORS: Record<string, string> = {
  processed: "bg-green-100 text-green-800 border-green-200",
  manual_review: "bg-yellow-100 text-yellow-800 border-yellow-200",
  skipped: "bg-gray-100 text-gray-600 border-gray-200",
};

const PAGE_SIZE = 20;

export default function AdminOps() {
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  // Tick every second so the freshness label updates live
  const [, setTick] = useState(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Pagination state: stack of cursors (undefined = first page)
  const [cursorStack, setCursorStack] = useState<(number | undefined)[]>([undefined]);
  const currentCursor = cursorStack[cursorStack.length - 1];

  useEffect(() => {
    tickRef.current = setInterval(() => setTick(t => t + 1), 1_000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  const { data: status, isLoading, isFetching, refetch, dataUpdatedAt } =
    trpc.admin.ops.getStatus.useQuery(undefined, {
      refetchInterval: 30_000,
    });

  const { data: eventsPage, isLoading: eventsLoading } =
    trpc.admin.ops.listStripeEvents.useQuery(
      { limit: PAGE_SIZE, cursor: currentCursor },
      { placeholderData: (prev: any) => prev }
    );

  // Update lastRefreshedAt whenever a successful fetch completes (dataUpdatedAt changes)
  useEffect(() => {
    if (dataUpdatedAt > 0) {
      setLastRefreshedAt(new Date(dataUpdatedAt));
    }
  }, [dataUpdatedAt]);

  const hasSuccess = !!status?.lastStripeWebhookSuccessAt;
  const hasFailure = !!status?.lastStripeWebhookFailureAt;

  function handleRefresh() {
    refetch();
  }

  function handleNext() {
    if (eventsPage?.nextCursor != null) {
      setCursorStack(prev => [...prev, eventsPage.nextCursor!]);
    }
  }

  function handlePrev() {
    if (cursorStack.length > 1) {
      setCursorStack(prev => prev.slice(0, -1));
    }
  }

  const pageNum = cursorStack.length;
  const hasPrev = cursorStack.length > 1;
  const hasNext = !!eventsPage?.nextCursor;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ops Status</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Operational health of background services. Refreshes every 30 seconds.
          </p>
        </div>

        {/* Stripe Webhooks card */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-3">
            <Webhook className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Stripe Webhooks</CardTitle>
            {!isLoading && (
              <div className="ml-auto flex items-center gap-3">
                {/* Status badge */}
                {status === null ? (
                  <Badge variant="secondary">No data yet</Badge>
                ) : hasFailure && !hasSuccess ? (
                  <Badge variant="destructive">Last event failed</Badge>
                ) : hasFailure &&
                  hasSuccess &&
                  new Date(status.lastStripeWebhookFailureAt!).getTime() >
                    new Date(status.lastStripeWebhookSuccessAt!).getTime() ? (
                  <Badge variant="destructive">Last event failed</Badge>
                ) : hasSuccess ? (
                  <Badge className="bg-green-600 text-white hover:bg-green-700">Healthy</Badge>
                ) : (
                  <Badge variant="secondary">No data yet</Badge>
                )}
                {/* Freshness label */}
                {lastRefreshedAt && (
                  <span
                    className="text-xs text-muted-foreground whitespace-nowrap"
                    data-testid="freshness-label"
                  >
                    Last refreshed: {formatFreshness(lastRefreshedAt)}
                  </span>
                )}
                {/* Manual refresh button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isFetching}
                  data-testid="refresh-button"
                  className="h-7 px-2 text-xs gap-1"
                >
                  <RefreshCw className={`h-3 w-3 ${isFetching ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-muted-foreground text-sm animate-pulse">Loading…</div>
            ) : status === null ? (
              <p className="text-muted-foreground text-sm" data-testid="no-data-message">
                No webhook events have been processed yet. Once a live Stripe event arrives, the
                status will appear here.
              </p>
            ) : (() => {
              const s = status!;
              return (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Last success */}
                <div className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Last success</p>
                    <p className="text-sm text-foreground font-mono truncate">
                      {formatTs(s.lastStripeWebhookSuccessAt)}
                    </p>
                    <AgeLabel ts={s.lastStripeWebhookSuccessAt} />
                  </div>
                </div>

                {/* Last failure */}
                <div className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                  <XCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Last failure</p>
                    <p className="text-sm text-foreground font-mono truncate">
                      {formatTs(s.lastStripeWebhookFailureAt)}
                    </p>
                    <AgeLabel ts={s.lastStripeWebhookFailureAt} />
                  </div>
                </div>

                {/* Last event */}
                {(s.lastStripeWebhookEventId || s.lastStripeWebhookEventType) && (
                  <div className="flex items-start gap-3 p-3 rounded-lg border bg-card sm:col-span-2">
                    <Clock className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="min-w-0 space-y-1">
                      <p className="text-sm font-medium">Last processed event</p>
                      {s.lastStripeWebhookEventType && (
                        <Badge variant="outline" className="font-mono text-xs">
                          {s.lastStripeWebhookEventType}
                        </Badge>
                      )}
                      {s.lastStripeWebhookEventId && (
                        <p className="text-xs text-muted-foreground font-mono truncate">
                          {s.lastStripeWebhookEventId}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* Recent Stripe Events audit table */}
        <Card data-testid="stripe-events-table-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Stripe Events</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {eventsLoading ? (
              <div className="px-6 py-4 text-muted-foreground text-sm animate-pulse">Loading…</div>
            ) : !eventsPage || eventsPage.items.length === 0 ? (
              <div
                className="px-6 py-8 text-center text-muted-foreground text-sm"
                data-testid="no-events-message"
              >
                No events yet
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" data-testid="stripe-events-table">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        <th className="px-4 py-2 text-left font-medium text-muted-foreground">Event ID</th>
                        <th className="px-4 py-2 text-left font-medium text-muted-foreground">Type</th>
                        <th className="px-4 py-2 text-left font-medium text-muted-foreground">Status</th>
                        <th className="px-4 py-2 text-left font-medium text-muted-foreground">User</th>
                        <th className="px-4 py-2 text-left font-medium text-muted-foreground">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {eventsPage.items.map((evt) => (
                        <tr key={evt.eventId} className="border-b last:border-0 hover:bg-muted/20">
                          <td className="px-4 py-2 font-mono text-xs text-muted-foreground truncate max-w-[180px]">
                            {evt.eventId}
                          </td>
                          <td className="px-4 py-2 font-mono text-xs">
                            {evt.eventType}
                          </td>
                          <td className="px-4 py-2">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${STATUS_COLORS[evt.status] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}
                            >
                              {evt.status}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-xs text-muted-foreground">
                            {evt.userId != null ? `#${evt.userId}` : "—"}
                          </td>
                          <td className="px-4 py-2 text-xs text-muted-foreground whitespace-nowrap">
                            {formatTs(evt.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination controls */}
                <div
                  className="flex items-center justify-between px-4 py-3 border-t"
                  data-testid="pagination-controls"
                >
                  <span className="text-xs text-muted-foreground">
                    Page {pageNum}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrev}
                      disabled={!hasPrev}
                      data-testid="prev-button"
                      className="h-7 px-2 text-xs gap-1"
                    >
                      <ChevronLeft className="h-3 w-3" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNext}
                      disabled={!hasNext}
                      data-testid="next-button"
                      className="h-7 px-2 text-xs gap-1"
                    >
                      Next
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
