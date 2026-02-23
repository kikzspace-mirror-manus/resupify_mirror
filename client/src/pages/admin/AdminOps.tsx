import { useState, useEffect, useRef } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Clock, Webhook, RefreshCw } from "lucide-react";

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

export default function AdminOps() {
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  // Tick every second so the freshness label updates live
  const [, setTick] = useState(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
      </div>
    </AdminLayout>
  );
}
