import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Briefcase,
  CalendarCheck,
  Plus,
  ArrowRight,
  Target,
  CheckCircle2,
  Clock,
  TrendingUp,
} from "lucide-react";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { STAGE_LABELS } from "../../../shared/regionPacks";

const stageColors: Record<string, string> = {
  bookmarked: "bg-slate-100 text-slate-700",
  applying: "bg-blue-100 text-blue-700",
  applied: "bg-indigo-100 text-indigo-700",
  interviewing: "bg-amber-100 text-amber-700",
  offered: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  archived: "bg-gray-100 text-gray-500",
};

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { data: profile, isLoading: profileLoading } = trpc.profile.get.useQuery();
  const { data: stats } = trpc.analytics.stats.useQuery();
  const { data: todayTasks } = trpc.tasks.today.useQuery();
  const { data: credits } = trpc.credits.balance.useQuery();
  const { data: recentJobs } = trpc.jobCards.list.useQuery({});

  useEffect(() => {
    if (!profileLoading && profile && !profile.onboardingComplete) {
      setLocation("/onboarding");
    }
  }, [profile, profileLoading, setLocation]);

  const totalJobs = stats?.jobStats?.total ?? 0;
  const appliedCount = stats?.jobStats?.byStage?.applied ?? 0;
  const interviewingCount = stats?.jobStats?.byStage?.interviewing ?? 0;
  const offeredCount = stats?.jobStats?.byStage?.offered ?? 0;
  const taskCompletionRate = stats?.taskCompletion?.rate ?? 0;
  const pendingTasks = todayTasks?.length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Here's your job search overview
          </p>
        </div>
        <Button onClick={() => setLocation("/jobs")} size="sm">
          <Plus className="h-4 w-4 mr-1.5" />
          Add Job
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Briefcase className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalJobs}</p>
                <p className="text-xs text-muted-foreground">Total Jobs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                <Target className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{appliedCount}</p>
                <p className="text-xs text-muted-foreground">Applied</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{interviewingCount}</p>
                <p className="text-xs text-muted-foreground">Interviewing</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{offeredCount}</p>
                <p className="text-xs text-muted-foreground">Offered</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Today's Tasks */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold">
              <CalendarCheck className="h-4 w-4 inline mr-2 text-primary" />
              Today's Tasks
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/today")}
            >
              View All
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent>
            {pendingTasks === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                <p className="text-sm">All caught up! No tasks due today.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {todayTasks?.slice(0, 5).map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div
                      className={`h-2 w-2 rounded-full ${
                        task.taskType === "follow_up"
                          ? "bg-amber-500"
                          : task.taskType === "apply"
                          ? "bg-blue-500"
                          : "bg-primary"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {task.title}
                      </p>
                      {task.dueDate && (
                        <p className="text-xs text-muted-foreground">
                          <Clock className="h-3 w-3 inline mr-1" />
                          {new Date(task.dueDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {task.taskType?.replace("_", " ") ?? "task"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pipeline Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              Pipeline Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(STAGE_LABELS).map(([stage, label]) => {
                const count =
                  stats?.jobStats?.byStage?.[stage] ?? 0;
                return (
                  <div
                    key={stage}
                    className="flex items-center justify-between py-1.5"
                  >
                    <div className="flex items-center gap-2">
                      <Badge
                        className={`text-xs ${
                          stageColors[stage] ?? "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {label}
                      </Badge>
                    </div>
                    <span className="text-sm font-medium tabular-nums">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Task completion</span>
                <span className="font-medium">{taskCompletionRate}%</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-muted-foreground">Credits remaining</span>
                <span className="font-medium">{credits?.balance ?? 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Jobs */}
      {recentJobs && recentJobs.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold">
              Recent Job Cards
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/jobs")}
            >
              View All
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentJobs.slice(0, 5).map((job) => (
                <div
                  key={job.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => setLocation(`/jobs/${job.id}`)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{job.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {job.company ?? "Unknown Company"}
                    </p>
                  </div>
                  <Badge
                    className={`text-xs shrink-0 ${
                      stageColors[job.stage] ?? ""
                    }`}
                  >
                    {STAGE_LABELS[job.stage as keyof typeof STAGE_LABELS] ??
                      job.stage}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
