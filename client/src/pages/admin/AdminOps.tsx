import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock, Webhook } from "lucide-react";

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

export default function AdminOps() {
  const { data: status, isLoading } = trpc.admin.ops.getStatus.useQuery(undefined, {
    refetchInterval: 30_000,
  });

  const hasSuccess = !!status?.lastStripeWebhookSuccessAt;
  const hasFailure = !!status?.lastStripeWebhookFailureAt;

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
              <div className="ml-auto">
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
              </div>
            )}
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-muted-foreground text-sm animate-pulse">Loading…</div>
            ) : status === null ? (
              <p className="text-muted-foreground text-sm">
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
