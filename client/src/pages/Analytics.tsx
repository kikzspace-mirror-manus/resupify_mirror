import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  Briefcase,
  Target,
  CheckCircle2,
  TrendingUp,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { STAGE_LABELS } from "../../../shared/regionPacks";

const stageColors: Record<string, string> = {
  bookmarked: "bg-slate-400",
  applying: "bg-blue-500",
  applied: "bg-indigo-500",
  interviewing: "bg-amber-500",
  offered: "bg-emerald-500",
  rejected: "bg-red-500",
  archived: "bg-gray-400",
};

export default function Analytics() {
  const { data: stats, isLoading } = trpc.analytics.stats.useQuery();

  const totalJobs = stats?.jobStats?.total ?? 0;
  const byStage = stats?.jobStats?.byStage ?? {};
  const taskCompletion = stats?.taskCompletion ?? { rate: 0, completed: 0, total: 0 };
  const weeklyApps = stats?.weeklyApps?.reduce((sum, w) => sum + w.count, 0) ?? 0;
  const avgScore = 0; // Computed from evidence runs if available

  // Calculate response rate (interviewing + offered) / applied
  const applied = (byStage.applied ?? 0) + (byStage.interviewing ?? 0) + (byStage.offered ?? 0);
  const responses = (byStage.interviewing ?? 0) + (byStage.offered ?? 0);
  const responseRate = applied > 0 ? Math.round((responses / applied) * 100) : 0;

  // Calculate conversion rate (offered / total)
  const conversionRate = totalJobs > 0 ? Math.round(((byStage.offered ?? 0) / totalJobs) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Track your job search performance
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={<Briefcase className="h-5 w-5 text-primary" />}
          label="Total Applications"
          value={totalJobs}
          bgColor="bg-primary/10"
        />
        <MetricCard
          icon={<Calendar className="h-5 w-5 text-blue-600" />}
          label="This Week"
          value={weeklyApps}
          bgColor="bg-blue-50"
        />
        <MetricCard
          icon={<TrendingUp className="h-5 w-5 text-amber-600" />}
          label="Response Rate"
          value={`${responseRate}%`}
          bgColor="bg-amber-50"
        />
        <MetricCard
          icon={<Target className="h-5 w-5 text-emerald-600" />}
          label="Avg ATS Score"
          value={avgScore > 0 ? `${avgScore}%` : "—"}
          bgColor="bg-emerald-50"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Pipeline Breakdown */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Pipeline Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(STAGE_LABELS).map(([stage, label]) => {
                const count = byStage[stage] ?? 0;
                const pct = totalJobs > 0 ? Math.round((count / totalJobs) * 100) : 0;
                return (
                  <div key={stage} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>{label}</span>
                      <span className="font-medium tabular-nums">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${stageColors[stage] ?? "bg-gray-400"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">{responseRate}%</p>
                <p className="text-xs text-muted-foreground mt-1">Response Rate</p>
                <p className="text-xs text-muted-foreground">
                  {responses} of {applied} applications
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">{conversionRate}%</p>
                <p className="text-xs text-muted-foreground mt-1">Offer Rate</p>
                <p className="text-xs text-muted-foreground">
                  {byStage.offered ?? 0} of {totalJobs} total
                </p>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{taskCompletion.rate}%</p>
                  <p className="text-xs text-muted-foreground mt-1">Task Completion</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{taskCompletion.completed}/{taskCompletion.total}</p>
                  <p className="text-xs text-muted-foreground">tasks done</p>
                </div>
              </div>
              <div className="h-2 bg-background rounded-full overflow-hidden mt-3">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${taskCompletion.rate}%` }}
                />
              </div>
            </div>

            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold">{avgScore > 0 ? `${avgScore}%` : "—"}</p>
              <p className="text-xs text-muted-foreground mt-1">Average ATS Match Score</p>
              <p className="text-xs text-muted-foreground">
                Across all evidence scans
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  bgColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  bgColor: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-lg ${bgColor} flex items-center justify-center`}>
            {icon}
          </div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
