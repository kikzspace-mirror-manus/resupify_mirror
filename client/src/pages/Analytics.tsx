import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  Briefcase,
  Target,
  CheckCircle2,
  TrendingUp,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { STAGE_LABELS } from "../../../shared/regionPacks";
import { useLocation } from "wouter";

const stageColors: Record<string, string> = {
  bookmarked: "bg-slate-400",
  applying: "bg-blue-500",
  applied: "bg-indigo-500",
  interviewing: "bg-amber-500",
  offered: "bg-emerald-500",
  rejected: "bg-red-500",
  archived: "bg-gray-400",
};

function scoreColor(score: number | null): string {
  if (score === null) return "text-muted-foreground";
  if (score >= 75) return "text-emerald-600 font-bold";
  if (score >= 50) return "text-amber-600 font-bold";
  return "text-red-600 font-bold";
}

export default function Analytics() {
  const { data: stats, isLoading } = trpc.analytics.stats.useQuery();
  const { data: scannedJobs, isLoading: scannedLoading } = trpc.evidence.allScannedJobs.useQuery();
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [, setLocation] = useLocation();

  const totalJobs = stats?.jobStats?.total ?? 0;
  const byStage = stats?.jobStats?.byStage ?? {};
  const taskCompletion = stats?.taskCompletion ?? { rate: 0, completed: 0, total: 0 };
  const weeklyApps = stats?.weeklyApps?.reduce((sum, w) => sum + w.count, 0) ?? 0;

  // Compute real avg ATS score from scanned jobs
  const allScores = (scannedJobs ?? []).flatMap((j) =>
    j.runs.map((r) => r.overallScore).filter((s): s is number => s !== null)
  );
  const avgScore = allScores.length > 0
    ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
    : 0;

  // Calculate response rate (interviewing + offered) / applied
  const applied = (byStage.applied ?? 0) + (byStage.interviewing ?? 0) + (byStage.offered ?? 0);
  const responses = (byStage.interviewing ?? 0) + (byStage.offered ?? 0);
  const responseRate = applied > 0 ? Math.round((responses / applied) * 100) : 0;

  // Calculate conversion rate (offered / total)
  const conversionRate = totalJobs > 0 ? Math.round(((byStage.offered ?? 0) / totalJobs) * 100) : 0;

  function toggleRow(id: number) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

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

      {/* ATS Score History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            ATS Score History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {scannedLoading ? (
            <div className="px-6 py-8 text-center text-sm text-muted-foreground">
              Loading scan history…
            </div>
          ) : !scannedJobs || scannedJobs.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-muted-foreground">
              No scans yet. Run your first scan to see history here.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {/* Table header */}
              <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-6 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide bg-muted/30">
                <span>Job</span>
                <span className="text-right">Last scan</span>
                <span className="text-right">Score</span>
                <span className="text-right">Runs</span>
                <span />
              </div>
              {scannedJobs.map((job) => {
                const latestRun = job.runs[job.runs.length - 1];
                const isExpanded = expandedRows.has(job.id);
                const titleDisplay = job.title.length > 60
                  ? job.title.slice(0, 60) + "…"
                  : job.title;
                return (
                  <div key={job.id}>
                    {/* Row */}
                    <div
                      className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-6 py-3 items-center hover:bg-muted/20 cursor-pointer transition-colors"
                      onClick={() => toggleRow(job.id)}
                    >
                      {/* Job title + company */}
                      <div className="min-w-0">
                        <p
                          className="text-sm font-medium truncate"
                          style={{ overflowWrap: "anywhere", wordBreak: "break-word" }}
                        >
                          {titleDisplay}
                        </p>
                        {job.company && (
                          <p className="text-xs text-muted-foreground truncate">{job.company}</p>
                        )}
                      </div>
                      {/* Last scan date */}
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {latestRun
                          ? new Date(latestRun.createdAt).toLocaleDateString()
                          : "—"}
                      </span>
                      {/* Latest score */}
                      <span className={`text-sm tabular-nums ${scoreColor(latestRun?.overallScore ?? null)}`}>
                        {latestRun?.overallScore != null ? `${latestRun.overallScore}` : "—"}
                      </span>
                      {/* Run count */}
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {job.runs.length} {job.runs.length === 1 ? "run" : "runs"}
                      </span>
                      {/* Expand + open */}
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          title="Open job card"
                          onClick={() => setLocation(`/jobs/${job.id}?tab=evidence`)}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          title={isExpanded ? "Collapse" : "Expand run history"}
                          onClick={() => toggleRow(job.id)}
                        >
                          {isExpanded
                            ? <ChevronDown className="h-3.5 w-3.5" />
                            : <ChevronRight className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    </div>
                    {/* Expanded run history */}
                    {isExpanded && (
                      <div className="px-6 pb-3 bg-muted/10">
                        <div className="border-l-2 border-border pl-4 space-y-1">
                          {[...job.runs].reverse().map((run, idx) => (
                            <div key={run.id} className="flex items-center justify-between text-xs py-0.5">
                              <span className="text-muted-foreground">
                                {new Date(run.createdAt).toLocaleString()}
                                {idx === 0 && (
                                  <Badge variant="outline" className="ml-2 text-[10px] py-0 px-1">latest</Badge>
                                )}
                              </span>
                              <span className={scoreColor(run.overallScore)}>
                                {run.overallScore != null ? `${run.overallScore}` : "—"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
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
