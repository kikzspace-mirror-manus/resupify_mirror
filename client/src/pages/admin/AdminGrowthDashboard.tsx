/**
 * AdminGrowthDashboard.tsx — V2 Phase 1B.2 (updated: 1B.2-fix)
 *
 * Admin-only Growth KPI Dashboard.
 * Gated behind featureFlags.v2GrowthDashboardEnabled (server-side).
 *
 * Three states:
 * 1) growth=false → "Not enabled" card (exact env var name shown)
 * 2) growth=true, analytics=false → dashboard shell + analytics-off warning banner
 * 3) growth=true, analytics=true → full dashboard
 */
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import {
  Users, TrendingUp, Zap, AlertTriangle, Clock,
  BarChart2, CheckCircle2, XCircle, Activity
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

// ─── Flag Status Box ──────────────────────────────────────────────────────────

function FlagStatusBox({
  growthEnabled,
  analyticsEnabled,
}: {
  growthEnabled: boolean;
  analyticsEnabled: boolean;
}) {
  return (
    <div className="rounded-lg border bg-muted/40 px-4 py-3 flex flex-wrap gap-x-6 gap-y-2 items-center text-sm">
      <span className="font-medium text-muted-foreground text-xs uppercase tracking-wide">Flag Status</span>
      <span className="flex items-center gap-1.5">
        {growthEnabled
          ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
          : <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />}
        <code className="text-xs bg-background border rounded px-1">V2_GROWTH_DASHBOARD_ENABLED</code>
        <Badge variant={growthEnabled ? "default" : "secondary"} className="text-xs h-5">
          {growthEnabled ? "ON" : "OFF"}
        </Badge>
      </span>
      <span className="flex items-center gap-1.5">
        {analyticsEnabled
          ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
          : <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />}
        <code className="text-xs bg-background border rounded px-1">V2_ANALYTICS_ENABLED</code>
        <Badge variant={analyticsEnabled ? "default" : "secondary"} className="text-xs h-5">
          {analyticsEnabled ? "ON" : "OFF"}
        </Badge>
      </span>
      {(!growthEnabled || !analyticsEnabled) && (
        <span className="text-muted-foreground text-xs ml-auto">Enable both to see live data.</span>
      )}
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  icon: Icon,
  color,
  bg,
  description,
}: {
  label: string;
  value: string | number | null | undefined;
  icon: React.ElementType;
  color: string;
  bg: string;
  description?: string;
}) {
  const display = value === null || value === undefined ? "N/A" : String(value);
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold mt-1">{display}</p>
            {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
          </div>
          <div className={`${bg} p-2 rounded-lg`}>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminGrowthDashboard() {
  const { data, isLoading, error } = trpc.admin.growth.kpis.useQuery();

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-orange-500" />
              Growth Dashboard
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Analytics events from the last 7–30 days. All data is non-PII.
            </p>
          </div>
          <Badge variant="outline" className="text-xs">V2 Phase 1B.2</Badge>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Activity className="h-4 w-4 animate-pulse" />
            Loading KPIs…
          </div>
        )}

        {/* Error */}
        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-5">
              <p className="text-destructive text-sm">Failed to load growth data: {error.message}</p>
            </CardContent>
          </Card>
        )}

        {/* State 1: growth flag OFF */}
        {!isLoading && !error && data && !data.enabled && (
          <div className="space-y-4">
            <FlagStatusBox growthEnabled={false} analyticsEnabled={data.analyticsEnabled} />
            <Card>
              <CardContent className="pt-10 pb-10 text-center space-y-3">
                <BarChart2 className="h-12 w-12 text-muted-foreground mx-auto" />
                <h2 className="text-lg font-semibold">Growth Dashboard is not yet enabled</h2>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Set{" "}
                  <code className="bg-muted px-1 rounded text-xs">V2_GROWTH_DASHBOARD_ENABLED=true</code>{" "}
                  in Settings → Secrets to activate this dashboard.
                </p>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  Also set{" "}
                  <code className="bg-muted px-1 rounded text-xs">V2_ANALYTICS_ENABLED=true</code>{" "}
                  to start logging events.
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* States 2 & 3: growth flag ON */}
        {!isLoading && !error && data?.enabled && data.data && (() => {
          const d = data.data;

          return (
            <div className="space-y-6">
              {/* Flag Status */}
              <FlagStatusBox growthEnabled={true} analyticsEnabled={data.analyticsEnabled} />

              {/* State 2: analytics flag OFF — warning banner */}
              {!data.analyticsEnabled && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Analytics logging is OFF.</strong>{" "}
                    Set{" "}
                    <code className="bg-muted px-1 rounded text-xs">V2_ANALYTICS_ENABLED=true</code>{" "}
                    in Settings → Secrets to start populating data. KPIs below will show 0 until events are logged.
                  </AlertDescription>
                </Alert>
              )}

              {/* Audience KPIs */}
              <div>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Audience</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <KpiCard label="WAU" value={d.wau} icon={Users} color="text-blue-600" bg="bg-blue-50" description="Weekly active users" />
                  <KpiCard label="MAU" value={d.mau} icon={Users} color="text-indigo-600" bg="bg-indigo-50" description="Monthly active users" />
                  <KpiCard label="New Users (7d)" value={d.newUsers7d} icon={TrendingUp} color="text-green-600" bg="bg-green-50" />
                  <KpiCard label="New Users (30d)" value={d.newUsers30d} icon={TrendingUp} color="text-emerald-600" bg="bg-emerald-50" />
                </div>
              </div>

              {/* Activation */}
              <div>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Activation</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <KpiCard
                    label="Activated (7d)"
                    value={d.activatedUsers7d}
                    icon={CheckCircle2}
                    color="text-teal-600"
                    bg="bg-teal-50"
                    description="Users who created a job card"
                  />
                  <KpiCard
                    label="Activation Rate (7d)"
                    value={d.activationRate7d !== null ? `${d.activationRate7d}%` : null}
                    icon={CheckCircle2}
                    color="text-teal-600"
                    bg="bg-teal-50"
                    description="Activated / new users"
                  />
                  <KpiCard
                    label="P95 AI Latency (7d)"
                    value={d.p95LatencyMs7d !== null ? `${d.p95LatencyMs7d}ms` : null}
                    icon={Clock}
                    color="text-purple-600"
                    bg="bg-purple-50"
                    description="95th percentile"
                  />
                  <KpiCard
                    label="Errors (7d)"
                    value={d.errorCount7d}
                    icon={AlertTriangle}
                    color="text-red-600"
                    bg="bg-red-50"
                    description="Failed AI runs"
                  />
                </div>
              </div>

              {/* Funnel + Outcomes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Zap className="h-4 w-4 text-orange-500" />
                      7-Day Funnel
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left text-xs text-muted-foreground pb-2 font-normal">Step</th>
                          <th className="text-left text-xs text-muted-foreground pb-2 font-normal">Count</th>
                          <th className="text-left text-xs text-muted-foreground pb-2 font-normal">Conv.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {d.funnel7d.map((row) => (
                          <tr key={row.step} className="border-b last:border-0">
                            <td className="py-2 pr-4 text-xs text-muted-foreground font-mono">{row.step}</td>
                            <td className="py-2 pr-4 text-sm font-medium tabular-nums">{row.count.toLocaleString()}</td>
                            <td className="py-2 text-sm text-muted-foreground">{row.pct}%</td>
                          </tr>
                        ))}
                        {d.funnel7d.length === 0 && (
                          <tr>
                            <td colSpan={3} className="py-4 text-center text-sm text-muted-foreground">
                              No funnel data yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      All-Time Outcomes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left text-xs text-muted-foreground pb-2 font-normal">Outcome</th>
                          <th className="text-left text-xs text-muted-foreground pb-2 font-normal">Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b">
                          <td className="py-2 pr-4 text-sm text-muted-foreground">Interviews</td>
                          <td className="py-2 text-sm font-medium tabular-nums">{d.outcomes.interviews.toLocaleString()}</td>
                        </tr>
                        <tr>
                          <td className="py-2 pr-4 text-sm text-muted-foreground">Offers</td>
                          <td className="py-2 text-sm font-medium tabular-nums">{d.outcomes.offers.toLocaleString()}</td>
                        </tr>
                      </tbody>
                    </table>
                    <p className="text-xs text-muted-foreground mt-3">
                      Reported by users via the Outcome tracking feature.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          );
        })()}
      </div>
    </AdminLayout>
  );
}
