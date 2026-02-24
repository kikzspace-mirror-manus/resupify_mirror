/**
 * AdminGrowthDashboard.tsx — V2 Phase 1B.2 (updated: layout-cleanup + timeline)
 *
 * Admin-only Growth KPI Dashboard.
 * Gated behind featureFlags.v2GrowthDashboardEnabled (server-side).
 *
 * Three states:
 * 1) growth=false → "Not enabled" card
 * 2) growth=true, analytics=false → dashboard shell + analytics-off warning banner
 * 3) growth=true, analytics=true → full dashboard with timeline chart
 */
import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import {
  Users, TrendingUp, Zap, AlertTriangle, Clock,
  BarChart2, CheckCircle2, XCircle, Activity, Radio,
  ChevronDown, ChevronUp, RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from "recharts";
import { Globe } from "lucide-react";

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
          <div className={`${bg} p-2 rounded-lg shrink-0`}>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Timeline metric options ──────────────────────────────────────────────────
const METRIC_OPTIONS = [
  { key: "eventsTotal", label: "All Events", color: "#6366f1" },
  { key: "newUsers",    label: "New Users",  color: "#10b981" },
  { key: "quickMatchRun",       label: "Quick Match Runs",   color: "#f59e0b" },
  { key: "jobCardCreated",      label: "Job Cards Created",  color: "#3b82f6" },
  { key: "outreachGenerated",   label: "Outreach Generated", color: "#ec4899" },
] as const;
type MetricKey = (typeof METRIC_OPTIONS)[number]["key"];

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminGrowthDashboard() {
  const [timelineRange, setTimelineRange] = useState<7 | 14 | 30>(7);
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>("eventsTotal");
  const [healthOpen, setHealthOpen] = useState(false);
  const [adoptionRange, setAdoptionRange] = useState<7 | 14 | 30>(30);

  const { data, isLoading, error, refetch } = trpc.admin.growth.kpis.useQuery();
  const { data: timelineData, isLoading: timelineLoading } = trpc.admin.timeline.daily.useQuery(
    { rangeDays: timelineRange },
  );
  const { data: adoptionData, isLoading: adoptionLoading } = trpc.admin.countryPackAdoption.daily.useQuery(
    { rangeDays: adoptionRange },
  );

  // ── State 1: growth flag OFF ──────────────────────────────────────
  if (!isLoading && !error && data && !data.enabled) {
    return (
      <AdminLayout>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-orange-500" />
              Growth Dashboard
            </h1>
          </div>
          <FlagStatusBox growthEnabled={false} analyticsEnabled={data.analyticsEnabled ?? false} />
          <Card>
            <CardContent className="pt-10 pb-10 text-center space-y-3">
              <BarChart2 className="h-12 w-12 text-muted-foreground mx-auto" />
              <h2 className="text-lg font-semibold">Growth Dashboard is not yet enabled</h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Set{" "}
                <code className="bg-muted px-1 rounded text-xs">V2_GROWTH_DASHBOARD_ENABLED=true</code>{" "}
                in Settings → Secrets to activate this dashboard.
              </p>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  const kpis = data?.enabled ? data.data : null;
  const analyticsEnabled = data?.analyticsEnabled ?? false;
  const growthEnabled = data?.enabled ?? false;

  return (
    <AdminLayout>
      <div className="space-y-6">

        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-orange-500" />
              Growth Dashboard
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Admin-only · All data is non-PII</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
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

        {/* ── States 2 & 3: growth flag ON ─────────────────────── */}
        {!isLoading && !error && growthEnabled && (
          <div className="space-y-6">
            {/* Flag Status */}
            <FlagStatusBox growthEnabled={growthEnabled} analyticsEnabled={analyticsEnabled} />

            {/* Analytics-off warning */}
            {!analyticsEnabled && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Analytics logging is OFF.</strong>{" "}
                  Set{" "}
                  <code className="bg-muted px-1 rounded text-xs">V2_ANALYTICS_ENABLED=true</code>{" "}
                  in Settings → Secrets to start populating data. Event-based KPIs will show 0 until enabled.
                </AlertDescription>
              </Alert>
            )}

            {/* ── Row 1: Audience ──────────────────────────────── */}
            <div>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Audience</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KpiCard label="WAU" value={kpis?.wau} icon={Users} color="text-blue-600" bg="bg-blue-50" description="Weekly active users" />
                <KpiCard label="MAU" value={kpis?.mau} icon={Users} color="text-indigo-600" bg="bg-indigo-50" description="Monthly active users" />
                <KpiCard label="New Users (7d)" value={kpis?.newUsers7d} icon={TrendingUp} color="text-green-600" bg="bg-green-50" />
                <KpiCard label="New Users (30d)" value={kpis?.newUsers30d} icon={TrendingUp} color="text-emerald-600" bg="bg-emerald-50" />
              </div>
            </div>

            {/* ── Row 2: Activation + Quality ──────────────────── */}
            <div>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Activation &amp; Quality</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KpiCard
                  label="Activated (7d)"
                  value={kpis?.activatedUsers7d}
                  icon={CheckCircle2}
                  color="text-teal-600"
                  bg="bg-teal-50"
                  description="Ran quick match"
                />
                <KpiCard
                  label="Activation Rate (7d)"
                  value={kpis?.activationRate7d != null ? `${kpis.activationRate7d}%` : null}
                  icon={Zap}
                  color="text-teal-600"
                  bg="bg-teal-50"
                  description="Activated / new users"
                />
                <KpiCard
                  label="P95 AI Latency (7d)"
                  value={kpis?.p95LatencyMs7d != null ? `${kpis.p95LatencyMs7d}ms` : null}
                  icon={Clock}
                  color="text-purple-600"
                  bg="bg-purple-50"
                  description="95th percentile"
                />
                <KpiCard
                  label="Errors (7d)"
                  value={kpis?.errorCount7d}
                  icon={AlertTriangle}
                  color="text-red-600"
                  bg="bg-red-50"
                  description="Failed AI runs"
                />
              </div>
            </div>

            {/* ── Timeline ─────────────────────────────────────── */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <CardTitle className="text-base">Timeline</CardTitle>
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Range selector */}
                    <div className="flex rounded-md border overflow-hidden text-xs">
                      {([7, 14, 30] as const).map((r) => (
                        <button
                          key={r}
                          onClick={() => setTimelineRange(r)}
                          className={`px-3 py-1.5 font-medium transition-colors ${
                            timelineRange === r
                              ? "bg-primary text-primary-foreground"
                              : "bg-background text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          {r}d
                        </button>
                      ))}
                    </div>
                    {/* Metric selector */}
                    <select
                      value={selectedMetric}
                      onChange={(e) => setSelectedMetric(e.target.value as MetricKey)}
                      className="text-xs border rounded-md px-2 py-1.5 bg-background text-foreground"
                    >
                      {METRIC_OPTIONS.map((m) => (
                        <option key={m.key} value={m.key}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {timelineLoading ? (
                  <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Loading…</div>
                ) : !analyticsEnabled ? (
                  <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                    Enable <code className="mx-1 bg-muted px-1 rounded text-xs">V2_ANALYTICS_ENABLED</code> to see timeline data.
                  </div>
                ) : !timelineData?.data || timelineData.data.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                    No data for this range yet.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={timelineData.data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v: string) => v.slice(5)}
                      />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip />
                      {METRIC_OPTIONS.filter((m) => m.key === selectedMetric).map((m) => (
                        <Line
                          key={m.key}
                          type="monotone"
                          dataKey={m.key}
                          name={m.label}
                          stroke={m.color}
                          strokeWidth={2}
                          dot={{ r: 3 }}
                          activeDot={{ r: 5 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* -- Pack Adoption KPI Cards -- */}
            {growthEnabled && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="pack-adoption-kpi-cards">
                {([
                  { key: "CA", label: "Canada", color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/30", dot: "bg-red-500" },
                  { key: "VN", label: "Vietnam", color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30", dot: "bg-amber-500" },
                  { key: "PH", label: "Philippines", color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30", dot: "bg-blue-500" },
                  { key: "US", label: "United States", color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/30", dot: "bg-green-500" },
                ] as const).map(({ key, label, color, bg, dot }) => (
                  <div
                    key={key}
                    className={`rounded-xl border p-4 ${bg}`}
                    data-testid={`pack-kpi-${key}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`inline-block w-2 h-2 rounded-full ${dot}`} />
                      <span className="text-xs font-medium text-muted-foreground">{label}</span>
                    </div>
                    <div className={`text-2xl font-bold ${color}`} data-testid={`pack-kpi-${key}-value`}>
                      {adoptionLoading ? "—" : (adoptionData?.totals?.[key] ?? 0).toLocaleString()}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">Selections ({adoptionRange}d)</div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Country Pack Adoption ──────────────────────────────────── */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Globe className="h-4 w-4 text-blue-500" />
                    Country Pack Adoption
                  </CardTitle>
                  <div className="flex rounded-md border overflow-hidden text-xs">
                    {([7, 14, 30] as const).map((r) => (
                      <button
                        key={r}
                        onClick={() => setAdoptionRange(r)}
                        className={`px-3 py-1.5 font-medium transition-colors ${
                          adoptionRange === r
                            ? "bg-primary text-primary-foreground"
                            : "bg-background text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {r}d
                      </button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {adoptionLoading ? (
                  <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Loading…</div>
                ) : !analyticsEnabled ? (
                  <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                    Enable <code className="mx-1 bg-muted px-1 rounded text-xs">V2_ANALYTICS_ENABLED</code> to see adoption data.
                  </div>
                ) : !adoptionData?.data || adoptionData.data.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                    No pack selection events yet.
                  </div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={adoptionData.data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 11 }}
                          tickFormatter={(v: string) => v.slice(5)}
                        />
                        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Line type="monotone" dataKey="CA" name="CA" stroke="#ef4444" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                        <Line type="monotone" dataKey="VN" name="VN" stroke="#f59e0b" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                        <Line type="monotone" dataKey="PH" name="PH" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                        <Line type="monotone" dataKey="US" name="US" stroke="#22c55e" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                        {adoptionData.totals && adoptionData.totals.OTHER > 0 && (
                          <Line type="monotone" dataKey="OTHER" name="Global" stroke="#6b7280" strokeWidth={1.5} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                    {/* Totals row */}
                    {adoptionData.totals && (
                      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground border-t pt-3">
                        <span className="font-medium text-foreground">Totals ({adoptionRange}d):</span>
                        <span><span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1" />CA: <strong className="text-foreground">{adoptionData.totals.CA.toLocaleString()}</strong></span>
                        <span><span className="inline-block w-2 h-2 rounded-full bg-amber-500 mr-1" />VN: <strong className="text-foreground">{adoptionData.totals.VN.toLocaleString()}</strong></span>
                        <span><span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-1" />PH: <strong className="text-foreground">{adoptionData.totals.PH.toLocaleString()}</strong></span>
                        <span><span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1" />US: <strong className="text-foreground">{adoptionData.totals.US.toLocaleString()}</strong></span>
                        {adoptionData.totals.OTHER > 0 && (
                          <span><span className="inline-block w-2 h-2 rounded-full bg-gray-500 mr-1" />Global: <strong className="text-foreground">{adoptionData.totals.OTHER.toLocaleString()}</strong></span>
                        )}
                        <span className="ml-auto">Total: <strong className="text-foreground">{adoptionData.totals.total.toLocaleString()}</strong></span>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* ── Funnel + Outcomes ─────────────────────────────── */}
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
                      {kpis?.funnel7d?.map((row) => (
                        <tr key={row.step} className="border-b last:border-0">
                          <td className="py-2 pr-4 text-xs text-muted-foreground font-mono">{row.step}</td>
                          <td className="py-2 pr-4 text-sm font-medium tabular-nums">{row.count.toLocaleString()}</td>
                          <td className="py-2 text-sm text-muted-foreground">{row.pct}%</td>
                        </tr>
                      ))}
                      {(!kpis?.funnel7d || kpis.funnel7d.length === 0) && (
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
                        <td className="py-2 text-sm font-medium tabular-nums">{kpis?.outcomes?.interviews?.toLocaleString() ?? "N/A"}</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4 text-sm text-muted-foreground">Offers</td>
                        <td className="py-2 text-sm font-medium tabular-nums">{kpis?.outcomes?.offers?.toLocaleString() ?? "N/A"}</td>
                      </tr>
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>

            {/* ── Instrumentation Health (collapsible) ─────────── */}
            <div className="border rounded-lg overflow-hidden">
              <button
                onClick={() => setHealthOpen((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Radio className="h-4 w-4 text-muted-foreground" />
                  Instrumentation Health (24h)
                  {kpis?.instrumentationHealth && (
                    <Badge variant="secondary" className="text-xs ml-1">
                      {kpis.instrumentationHealth.events24h} events
                    </Badge>
                  )}
                </span>
                {healthOpen
                  ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </button>
              {healthOpen && (
                <div className="px-4 pb-4 border-t bg-muted/20">
                  {!kpis?.instrumentationHealth ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">Enable analytics to see instrumentation health.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Events (24h)</p>
                        <p className="text-3xl font-bold tabular-nums">{kpis.instrumentationHealth.events24h.toLocaleString()}</p>
                        {kpis.instrumentationHealth.events24h === 0 && (
                          <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" /> No events in last 24h
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Last Event</p>
                        {kpis.instrumentationHealth.lastEventAt ? (
                          <>
                            <p className="text-sm font-medium">{new Date(kpis.instrumentationHealth.lastEventAt).toLocaleString()}</p>
                            <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                              <Activity className="h-3 w-3" /> Events flowing
                            </p>
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground">No events yet</p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Top Events (24h)</p>
                        {kpis.instrumentationHealth.topEvents24h.length === 0 ? (
                          <p className="text-sm text-muted-foreground">None</p>
                        ) : (
                          <ul className="space-y-1">
                            {kpis.instrumentationHealth.topEvents24h.map((ev) => (
                              <li key={ev.name} className="flex items-center justify-between text-xs">
                                <span className="font-mono text-muted-foreground truncate max-w-[140px]">{ev.name}</span>
                                <span className="font-medium tabular-nums ml-2">{ev.count}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </AdminLayout>
  );
}
