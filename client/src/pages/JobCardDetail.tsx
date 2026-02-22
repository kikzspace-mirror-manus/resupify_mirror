import { trpc } from "@/lib/trpc";
import { MAX_LENGTHS } from "../../../shared/maxLengths";
import { useAuth } from "@/_core/hooks/useAuth";
import { buildCoverLetterFilename, buildResumePatchFilename, buildTopChangesFilename, buildApplicationKitZipFilename } from "../../../shared/filename";
import JSZip from "jszip";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SnapshotDiffView } from "@/components/SnapshotDiffView";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Briefcase,
  FileText,
  Target,
  Package,
  Users,
  CheckSquare,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  Settings,
  XCircle,
  MinusCircle,
  Loader2,
  Copy,
  ExternalLink,
  Plus,
  Send,
  MailCheck,
  Sparkles,
  ListChecks,
  TrendingUp,
  TrendingDown,
  Minus,
  Download,
  ChevronDown,
  History,
  GitCompare,
  Pencil,
  Trash2,
  BookOpen,
  CopyCheck,
  Mail,
  Link2,
  UserCircle,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { STAGES, STAGE_LABELS, EVIDENCE_GROUP_LABELS } from "../../../shared/regionPacks";
import { buildOutreachCopyAllText } from "@/lib/outreachCopyAll";

const stageColors: Record<string, string> = {
  bookmarked: "bg-slate-100 text-slate-700",
  applying: "bg-blue-100 text-blue-700",
  applied: "bg-indigo-100 text-indigo-700",
  interviewing: "bg-amber-100 text-amber-700",
  offered: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  archived: "bg-gray-100 text-gray-500",
};

const statusIcons = {
  matched: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
  partial: <MinusCircle className="h-4 w-4 text-amber-600" />,
  missing: <XCircle className="h-4 w-4 text-red-600" />,
};

const statusColors = {
  matched: "bg-emerald-50 border-emerald-200 text-emerald-800",
  partial: "bg-amber-50 border-amber-200 text-amber-800",
  missing: "bg-red-50 border-red-200 text-red-800",
};

export default function JobCardDetail({ id }: { id: number }) {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const { data: job, isLoading } = trpc.jobCards.get.useQuery({ id });
  const { data: jdSnapshots } = trpc.jdSnapshots.list.useQuery({ jobCardId: id });
  const { data: evidenceRuns } = trpc.evidence.runs.useQuery({ jobCardId: id });
  const { data: tasks } = trpc.tasks.list.useQuery({ jobCardId: id });
  const { data: resumes } = trpc.resumes.list.useQuery();
  const { data: outreachPack } = trpc.outreach.pack.useQuery({ jobCardId: id });
  const { data: contacts } = trpc.contacts.list.useQuery({ jobCardId: id });
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("tab") ?? "overview";
  });

  const updateJob = trpc.jobCards.update.useMutation({
    onSuccess: (_, variables) => {
      utils.jobCards.get.invalidate({ id });
      utils.jobCards.list.invalidate();
      // Invalidate tasks so the Tasks tab auto-reflects new follow-up tasks
      if (variables.stage === "applied") {
        utils.tasks.list.invalidate({ jobCardId: id });
        utils.tasks.today.invalidate();
      }
      toast.success("Job updated");
    },
  });

  const updateTask = trpc.tasks.update.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
      utils.tasks.today.invalidate();
    },
  });

  const createTask = trpc.tasks.create.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
      toast.success("Task created");
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Job card not found</p>
        <Button variant="outline" onClick={() => setLocation("/jobs")} className="mt-4">
          Back to Jobs
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/jobs")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold tracking-tight truncate">{job.title}</h1>
            <Badge className={stageColors[job.stage] ?? ""}>
              {STAGE_LABELS[job.stage as keyof typeof STAGE_LABELS] ?? job.stage}
            </Badge>
          </div>
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
            {job.company && <span>{job.company}</span>}
            {job.location && <span>· {job.location}</span>}
            {job.url && (
              <a href={job.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                <ExternalLink className="h-3 w-3" /> Link
              </a>
            )}
          </div>
        </div>
        <Select
          value={job.stage}
          onValueChange={(v) => updateJob.mutate({ id, stage: v as any })}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STAGES.map((s) => (
              <SelectItem key={s} value={s}>{STAGE_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview"><Briefcase className="h-3.5 w-3.5 mr-1.5" />Overview</TabsTrigger>
          <TabsTrigger value="jd"><FileText className="h-3.5 w-3.5 mr-1.5" />JD Snapshot</TabsTrigger>
          <TabsTrigger value="evidence"><Target className="h-3.5 w-3.5 mr-1.5" />Evidence Map</TabsTrigger>
          <TabsTrigger value="kit"><Package className="h-3.5 w-3.5 mr-1.5" />Application Kit</TabsTrigger>
          <TabsTrigger value="outreach"><Users className="h-3.5 w-3.5 mr-1.5" />Outreach</TabsTrigger>
          <TabsTrigger value="tasks"><CheckSquare className="h-3.5 w-3.5 mr-1.5" />Tasks</TabsTrigger>
          <TabsTrigger value="personalization"><BookOpen className="h-3.5 w-3.5 mr-1.5" />Personalization</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <OverviewTab job={job} updateJob={updateJob} jobCardId={id} resumes={resumes ?? []} evidenceRuns={evidenceRuns ?? []} />
        </TabsContent>

        {/* JD Snapshot Tab */}
        <TabsContent value="jd" className="space-y-4 mt-4">
          <JdSnapshotTab jobCardId={id} snapshots={jdSnapshots ?? []} />
        </TabsContent>

        {/* Evidence Map Tab */}
        <TabsContent value="evidence" className="space-y-4 mt-4">
          <EvidenceTab jobCardId={id} runs={evidenceRuns ?? []} resumes={resumes ?? []} />
        </TabsContent>

        {/* Application Kit Tab */}
        <TabsContent value="kit" className="space-y-4 mt-4">
          <ApplicationKitTab jobCardId={id} job={job} resumes={resumes ?? []} evidenceRuns={evidenceRuns ?? []} />
        </TabsContent>

        {/* Outreach Tab */}
        <TabsContent value="outreach" className="space-y-4 mt-4">
          <OutreachTab jobCardId={id} contacts={contacts ?? []} outreachPack={outreachPack} onSwitchTab={setActiveTab} />
        </TabsContent>

        {/* Personalization Tab */}
        <TabsContent value="personalization" className="space-y-4 mt-4">
          <PersonalizationTab jobCardId={id} />
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="space-y-4 mt-4">
          <TasksTab
            jobCardId={id}
            jobStage={job?.stage ?? ""}
            tasks={tasks ?? []}
            updateTask={updateTask}
            createTask={createTask}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Score Trend Card (Sparkline) ────────────────────────────────────────────────────
function ScoreTrendCard({
  jobCardId,
  resumes,
  evidenceRuns,
}: {
  jobCardId: number;
  resumes: Array<{ id: number; title: string }>;
  evidenceRuns: Array<{ resumeId: number; status: string }>;
}) {
  // Build selectable resume list from resumes prop + any resume IDs found in runs
  const runResumeIds = Array.from(
    new Set(evidenceRuns.map((r) => r.resumeId))
  );
  const resumeMap = new Map(resumes.map((r) => [r.id, r.title]));
  const allIds = Array.from(new Set([...resumes.map((r) => r.id), ...runResumeIds]));
  const selectableResumes = allIds.map((id) => ({
    id,
    title: resumeMap.get(id) ?? `Resume ${id}`,
  }));

  const defaultId = selectableResumes[0]?.id;
  const [selectedResumeId, setSelectedResumeId] = useState<number | undefined>(defaultId);

  const { data: history, isLoading } = trpc.evidence.scoreHistory.useQuery(
    { jobCardId, resumeId: selectedResumeId },
    { enabled: true }
  );

  if (isLoading) return null;

  const runs = history ?? [];
  const latestScore = runs.length > 0 ? runs[runs.length - 1].overallScore ?? 0 : null;
  const prevScore = runs.length > 1 ? runs[runs.length - 2].overallScore ?? 0 : null;
  const delta = latestScore !== null && prevScore !== null ? latestScore - prevScore : null;

  const chartData = runs.map((r) => ({
    date: new Date(r.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    score: r.overallScore ?? 0,
  }));

  const showDropdown = selectableResumes.length > 1;
  const selectedResumeName = selectableResumes.find((r) => r.id === selectedResumeId)?.title ?? "Resume";

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 shrink-0">
            <TrendingUp className="h-4 w-4 text-primary" />
            Score Trend
          </CardTitle>
          <div className="flex items-center gap-2 ml-auto">
            {latestScore !== null && (
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{latestScore}</span>
                {delta !== null && (
                  <Badge
                    variant="outline"
                    className={`text-xs font-semibold ${
                      delta > 0
                        ? "text-emerald-600 border-emerald-300 bg-emerald-50"
                        : delta < 0
                        ? "text-red-600 border-red-300 bg-red-50"
                        : "text-muted-foreground"
                    }`}
                  >
                    {delta > 0 ? <TrendingUp className="h-3 w-3 mr-0.5" /> : delta < 0 ? <TrendingDown className="h-3 w-3 mr-0.5" /> : <Minus className="h-3 w-3 mr-0.5" />}
                    {delta > 0 ? "+" : ""}{delta}
                  </Badge>
                )}
                {runs.length === 1 && (
                  <Badge variant="outline" className="text-xs text-muted-foreground">First run</Badge>
                )}
              </div>
            )}
            {showDropdown && (
              <Select
                value={selectedResumeId?.toString() ?? ""}
                onValueChange={(v) => setSelectedResumeId(Number(v))}
              >
                <SelectTrigger className="h-7 text-xs w-36">
                  <SelectValue placeholder="Resume">{selectedResumeName}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {selectableResumes.map((r) => (
                    <SelectItem key={r.id} value={r.id.toString()}>
                      {r.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {runs.length === 0 ? (
          <div className="flex items-center justify-center h-16 text-xs text-muted-foreground">
            {showDropdown
              ? "No runs yet for this resume. Run Evidence+ATS to start a trend."
              : "Run Evidence+ATS to see your score trend."}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={80}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, left: -32, bottom: 0 }}>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                ticks={[0, 50, 100]}
              />
              <Tooltip
                contentStyle={{
                  fontSize: 11,
                  padding: "4px 8px",
                  borderRadius: 6,
                  border: "1px solid var(--border)",
                  background: "var(--card)",
                  color: "var(--card-foreground)",
                }}
                formatter={(value: number) => [`${value}%`, "Score"]}
              />
              {runs.length === 1 && (
                <ReferenceLine y={chartData[0].score} stroke="var(--primary)" strokeDasharray="4 2" />
              )}
              <Line
                type="monotone"
                dataKey="score"
                stroke="var(--primary)"
                strokeWidth={2}
                dot={{ r: 3, fill: "var(--primary)", strokeWidth: 0 }}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Overview Tab ────────────────────────────────────────────────────
function OverviewTab({ job, updateJob, jobCardId, resumes, evidenceRuns }: { job: any; updateJob: any; jobCardId: number; resumes: any[]; evidenceRuns: any[] }) {
  const [notes, setNotes] = useState(job.notes ?? "");
  const { data: profile } = trpc.profile.get.useQuery();
  const { data: requirements } = trpc.jdSnapshots.requirements.useQuery({ jobCardId });

  // Detect eligibility triggers in JD requirements
  const hasEligibilityRequirements = (requirements ?? []).some(
    (r: any) => r.requirementType === "eligibility"
  );
  const profileUnknown = !profile?.workStatus || profile.workStatus === "unknown";

  return (
    <div className="space-y-4">
      <ScoreTrendCard jobCardId={jobCardId} resumes={resumes} evidenceRuns={evidenceRuns} />
      <EligibilityBanner evidenceRuns={evidenceRuns} workStatus={profile?.workStatus ?? "unknown"} />
      {/* Inline eligibility nudge: shown when JD has eligibility requirements and profile is unknown */}
      {hasEligibilityRequirements && profileUnknown && (
        <EligibilityProfileNudge />
      )}
      <div className="grid md:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Company</span>
            <span className="font-medium">{job.company ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Location</span>
            <span className="font-medium">{job.location ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Priority</span>
            <Badge variant={job.priority === "high" ? "destructive" : "secondary"} className="text-xs">
              {job.priority ?? "medium"}
            </Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Season</span>
            <span className="font-medium">{job.season ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Salary</span>
            <span className="font-medium">{job.salary ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Created</span>
            <span className="font-medium">{new Date(job.createdAt).toLocaleDateString()}</span>
          </div>
          {job.appliedAt && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Applied</span>
              <span className="font-medium">{new Date(job.appliedAt).toLocaleDateString()}</span>
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={notes}
            maxLength={MAX_LENGTHS.JOB_NOTES}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes about this job..."
            className="min-h-[150px] text-sm"
          />
          <Button
            size="sm"
            className="mt-3"
            onClick={() => updateJob.mutate({ id: job.id, notes })}
            disabled={updateJob.isPending}
          >
            Save Notes
          </Button>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}

// ─── Eligibility Profile Nudge (inline, no blocking) ───────────────
function EligibilityProfileNudge() {
  const [, setLocation] = useLocation();
  return (
    <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50/60 px-4 py-2.5 text-sm">
      <ShieldQuestion className="h-4 w-4 text-blue-500 shrink-0" aria-hidden />
      <p className="flex-1 text-xs text-blue-800">
        Complete work authorization to improve eligibility checks for this role.
      </p>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 text-xs text-blue-700 hover:text-blue-900 hover:bg-blue-100 shrink-0"
        onClick={() => setLocation("/profile")}
      >
        Go to Profile
      </Button>
    </div>
  );
}

// ─── Eligibility Banner ─────────────────────────────────────────────
function EligibilityBanner({ evidenceRuns, workStatus }: { evidenceRuns: any[]; workStatus?: string }) {
  const [, setLocation] = useLocation();

  // Find the latest completed run with scoreBreakdownJson
  const latestRun = evidenceRuns
    .filter((r: any) => r.status === "completed" && r.scoreBreakdownJson)
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  let workAuthFlags: Array<{ ruleId: string; title: string; guidance: string; penalty: number }> = [];
  if (latestRun?.scoreBreakdownJson) {
    try {
      const bd = JSON.parse(latestRun.scoreBreakdownJson);
      workAuthFlags = bd.workAuthorizationFlags ?? [];
    } catch {
      workAuthFlags = [];
    }
  }

  const hasFlags = workAuthFlags.length > 0;
  const statusUnknown = !workStatus || workStatus === "unknown";

  if (!hasFlags && !statusUnknown) return null;

  return (
    <Card className={hasFlags ? "border-amber-200 bg-amber-50/50" : "border-blue-100 bg-blue-50/30"}>
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          {hasFlags ? (
            <ShieldAlert className="h-4 w-4 text-amber-600" />
          ) : (
            <ShieldQuestion className="h-4 w-4 text-blue-500" />
          )}
          Eligibility checks
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pb-4">
        {hasFlags ? (
          workAuthFlags.map((flag: any) => (
            <div key={flag.ruleId} className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                <span className="text-sm font-medium text-amber-800">{flag.title}</span>
                <Badge variant="outline" className="text-xs text-amber-700 border-amber-300 ml-auto shrink-0">
                  Role fit: {flag.penalty}
                </Badge>
              </div>
              <p className="text-xs text-amber-700 ml-5">{flag.guidance}</p>
            </div>
          ))
        ) : (
          <p className="text-xs text-blue-700">
            Add your work status to reduce eligibility uncertainty on postings that screen for authorization.
          </p>
        )}
        <Button
          variant="outline"
          size="sm"
          className="text-xs h-7 mt-1"
          onClick={() => setLocation("/profile")}
        >
          <Settings className="h-3 w-3 mr-1" />
          Update work status
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── JD Snapshot Tab ─────────────────────────────────────────────────
const REQUIREMENT_TYPE_LABELS: Record<string, string> = {
  skill: "Skills",
  responsibility: "Responsibilities",
  tool: "Tools & Technologies",
  softskill: "Soft Skills",
  eligibility: "Eligibility",
};

const REQUIREMENT_TYPE_COLORS: Record<string, string> = {
  skill: "bg-blue-50 text-blue-700 border-blue-200",
  responsibility: "bg-purple-50 text-purple-700 border-purple-200",
  tool: "bg-emerald-50 text-emerald-700 border-emerald-200",
  softskill: "bg-amber-50 text-amber-700 border-amber-200",
  eligibility: "bg-red-50 text-red-700 border-red-200",
};

function JdSnapshotTab({ jobCardId, snapshots }: { jobCardId: number; snapshots: any[] }) {
  const [newJdText, setNewJdText] = useState("");
  const [extractError, setExtractError] = useState<string | null>(null);
  // Patch 8I: URL fetch state
  const [fetchUrl, setFetchUrl] = useState("");
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  // Patch 8K: Diff state
  const [diffOpen, setDiffOpen] = useState(false);
  const sortedSnaps = [...snapshots].sort((a, b) => a.version - b.version);
  const [fromVersion, setFromVersion] = useState<number | null>(null);
  const [toVersion, setToVersion] = useState<number | null>(null);
  const utils = trpc.useUtils();

  const { data: requirements } = trpc.jdSnapshots.requirements.useQuery({ jobCardId });

  const createSnapshot = trpc.jdSnapshots.create.useMutation({
    onSuccess: () => {
      utils.jdSnapshots.list.invalidate({ jobCardId });
      setNewJdText("");
      toast.success("JD Snapshot saved");
    },
  });

  const fetchFromUrl = trpc.jdSnapshots.fetchFromUrl.useMutation({
    onSuccess: (data) => {
      setNewJdText(data.text);
      setFetchedAt(new Date(data.fetchedAt).toLocaleTimeString());
      setFetchError(null);
      setFetchUrl("");
      toast.success("JD text fetched! Review and click Save Snapshot.");
    },
    onError: (err) => {
      setFetchError(err.message);
    },
  });

  const extractRequirements = trpc.jdSnapshots.extract.useMutation({
    onSuccess: (data) => {
      utils.jdSnapshots.requirements.invalidate({ jobCardId });
      utils.jobCards.get.invalidate({ id: jobCardId });
      utils.jobCards.list.invalidate();
      setExtractError(null);
      toast.success(`Extracted ${data.count} requirements`);
    },
    onError: (err) => {
      setExtractError(err.message);
    },
  });

  const hasSnapshot = snapshots.length > 0;

  // Group requirements by type
  const grouped = (requirements ?? []).reduce<Record<string, typeof requirements>>((acc, req) => {
    const t = req!.requirementType;
    if (!acc[t]) acc[t] = [];
    acc[t]!.push(req);
    return acc;
  }, {});
  const groupOrder = ["eligibility", "skill", "tool", "responsibility", "softskill"];

  return (
    <div className="space-y-4">
      {/* Paste + Save */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Add New JD Snapshot</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Patch 8I: URL fetch row */}
          <div className="flex gap-2">
            <Input
              type="url"
              placeholder="Paste a job posting URL (Greenhouse, Lever, Ashby, Workday…)"
              value={fetchUrl}
              onChange={(e) => { setFetchUrl(e.target.value); setFetchError(null); }}
              className="text-sm flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter" && fetchUrl.trim() && !fetchFromUrl.isPending) {
                  fetchFromUrl.mutate({ url: fetchUrl.trim() });
                }
              }}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => fetchFromUrl.mutate({ url: fetchUrl.trim() })}
              disabled={fetchFromUrl.isPending || !fetchUrl.trim()}
            >
              {fetchFromUrl.isPending ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Fetching...</> : "Fetch from URL"}
            </Button>
          </div>
          {fetchError && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 shrink-0" />{fetchError}
            </p>
          )}
          {fetchedAt && !fetchError && (
            <p className="text-xs text-muted-foreground">Fetched at {fetchedAt} — review the text below, then click Save Snapshot.</p>
          )}
          <Textarea
            value={newJdText}
            maxLength={MAX_LENGTHS.SNAPSHOT_TEXT}
            onChange={(e) => setNewJdText(e.target.value)}
            placeholder="Paste the job description text here, or fetch from a URL above…"
            className="min-h-[120px] text-sm font-mono"
          />
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              variant="outline"
              onClick={() => createSnapshot.mutate({ jobCardId, snapshotText: newJdText })}
              disabled={createSnapshot.isPending || !newJdText.trim()}
            >
              {createSnapshot.isPending ? "Saving..." : "Save Snapshot"}
            </Button>
            {hasSnapshot && (
              <Button
                size="sm"
                onClick={() => {
                  setExtractError(null);
                  extractRequirements.mutate({ jobCardId });
                }}
                disabled={extractRequirements.isPending}
              >
                {extractRequirements.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Extracting...</>
                ) : (
                  <><Sparkles className="h-4 w-4 mr-1.5" />{(requirements ?? []).length > 0 ? "Re-extract Requirements" : "Extract Requirements"}</>
                )}
              </Button>
            )}
          </div>
          {extractError && (
            <p className="text-xs text-destructive mt-2 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />{extractError}
            </p>
          )}
          {hasSnapshot && (requirements ?? []).length === 0 && !extractRequirements.isPending && (
            <p className="text-xs text-muted-foreground mt-2">
              Click "Extract Requirements" to parse skills, responsibilities, and eligibility from the saved JD.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Extracted Requirements */}
      {(requirements ?? []).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-semibold">
                Extracted Requirements ({requirements!.length})
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {groupOrder.filter(t => grouped[t]?.length).map(type => (
              <div key={type}>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  {REQUIREMENT_TYPE_LABELS[type] ?? type}
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {grouped[type]!.map(req => (
                    <span
                      key={req!.id}
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs border font-medium ${REQUIREMENT_TYPE_COLORS[type] ?? "bg-gray-100 text-gray-700"}`}
                    >
                      {req!.requirementText}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Raw Snapshots */}
      {snapshots.map((snap) => (
        <Card key={snap.id}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Version {snap.version}</CardTitle>
              <span className="text-xs text-muted-foreground">
                Saved {new Date(snap.capturedAt).toLocaleString()}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <pre className="text-sm whitespace-pre-wrap font-mono bg-muted/50 p-4 rounded-lg max-h-[400px] overflow-y-auto">
              {snap.snapshotText}
            </pre>
          </CardContent>
        </Card>
      ))}

      {snapshots.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
          <p className="text-sm">No JD snapshots yet. Paste a job description above.</p>
        </div>
      )}

      {/* Patch 8K: Snapshot History + Diff */}
      {snapshots.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <GitCompare className="h-4 w-4" />
                Snapshot History
                <Badge variant="secondary" className="text-xs">{Math.min(sortedSnaps.length, 10)}</Badge>
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* History list */}
            <div className="divide-y rounded-lg border">
              {sortedSnaps.slice(-10).reverse().map((snap) => (
                <div key={snap.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">v{snap.version}</Badge>
                    <span className="text-muted-foreground text-xs">{new Date(snap.capturedAt).toLocaleString()}</span>
                    {snap.sourceUrl && (
                      <a href={snap.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline truncate max-w-[200px]">
                        {snap.sourceUrl}
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Diff controls */}
            {snapshots.length < 2 ? (
              <p className="text-sm text-muted-foreground italic">No prior version to compare.</p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-end gap-3 flex-wrap">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">From (older)</label>
                    <Select
                      value={fromVersion?.toString() ?? ""}
                      onValueChange={(v) => setFromVersion(Number(v))}
                    >
                      <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="Select version" />
                      </SelectTrigger>
                      <SelectContent>
                        {sortedSnaps.slice(0, -1).map((snap) => (
                          <SelectItem key={snap.id} value={snap.version.toString()}>
                            v{snap.version} — {new Date(snap.capturedAt).toLocaleDateString()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">To (newer)</label>
                    <Select
                      value={toVersion?.toString() ?? ""}
                      onValueChange={(v) => setToVersion(Number(v))}
                    >
                      <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="Select version" />
                      </SelectTrigger>
                      <SelectContent>
                        {sortedSnaps.slice(1).map((snap) => (
                          <SelectItem key={snap.id} value={snap.version.toString()}>
                            v{snap.version} — {new Date(snap.capturedAt).toLocaleDateString()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Auto-select oldest→newest if not chosen
                      if (!fromVersion) setFromVersion(sortedSnaps[0]!.version);
                      if (!toVersion) setToVersion(sortedSnaps[sortedSnaps.length - 1]!.version);
                      setDiffOpen(true);
                    }}
                    className="flex items-center gap-1.5"
                  >
                    <GitCompare className="h-4 w-4" />
                    View diff
                  </Button>
                  {diffOpen && (
                    <Button variant="ghost" size="sm" onClick={() => setDiffOpen(false)}>
                      Hide diff
                    </Button>
                  )}
                </div>

                {/* Lazy diff render */}
                {diffOpen && (() => {
                  const effectiveFrom = fromVersion ?? sortedSnaps[0]!.version;
                  const effectiveTo = toVersion ?? sortedSnaps[sortedSnaps.length - 1]!.version;
                  const fromSnap = sortedSnaps.find((s) => s.version === effectiveFrom);
                  const toSnap = sortedSnaps.find((s) => s.version === effectiveTo);
                  if (!fromSnap || !toSnap || fromSnap.version === toSnap.version) {
                    return (
                      <p className="text-sm text-amber-600">Select two different versions to compare.</p>
                    );
                  }
                  return (
                    <SnapshotDiffView
                      oldSnapshot={fromSnap}
                      newSnapshot={toSnap}
                    />
                  );
                })()}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
// ─── Evidence Tabb ────────────────────────────────────────────────────
function EvidenceTab({ jobCardId, runs, resumes }: { jobCardId: number; runs: any[]; resumes: any[] }) {
  const [selectedResumeId, setSelectedResumeId] = useState<number | null>(resumes[0]?.id ?? null);
  const [selectedRunId, setSelectedRunId] = useState<number | null>(runs[0]?.id ?? null);
  // Patch 8J: Past Runs panel state (collapsed by default)
  const [pastRunsOpen, setPastRunsOpen] = useState(false);
  // Prompt A: collapsible category sections (skills open, others collapsed)
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({ skills: true });
  const toggleCategory = (group: string) => setOpenCategories((prev) => ({ ...prev, [group]: !prev[group] }));
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  // Check if requirements have been extracted for this job card
  const { data: requirements } = trpc.jdSnapshots.requirements.useQuery({ jobCardId });
  const hasRequirements = (requirements?.length ?? 0) > 0;

  const runEvidence = trpc.evidence.run.useMutation({
    onSuccess: (data) => {
      utils.evidence.runs.invalidate({ jobCardId });
      utils.credits.balance.invalidate();
      utils.tasks.list.invalidate();
      toast.success(`Evidence scan complete! Score: ${data.score}/100 (${data.itemCount} items)`);
    },
    onError: (error) => {
      if (error.data?.code === "TOO_MANY_REQUESTS") {
        const match = error.message.match(/(\d+)s/);
        const seconds = match ? parseInt(match[1], 10) : 600;
        const minutes = Math.ceil(seconds / 60);
        toast.error(`You've run too many scans. Try again in ${minutes} minute${minutes !== 1 ? "s" : ""}.`);
      } else if (error.message.includes("NO_REQUIREMENTS")) {
        toast.error("Extract requirements first from the JD Snapshot tab.");
      } else {
        toast.error(error.message);
      }
    },
  });

  const { data: evidenceItems } = trpc.evidence.items.useQuery(
    { evidenceRunId: selectedRunId! },
    { enabled: !!selectedRunId }
  );

  const activeRun = runs.find((r) => r.id === selectedRunId);

  // Parse score breakdown JSON from the active run
  const scoreBreakdown = (() => {
    if (!activeRun?.scoreBreakdownJson) return null;
    try { return JSON.parse(activeRun.scoreBreakdownJson); } catch { return null; }
  })();

  return (
    <div className="space-y-4">
      {/* Backward-compat: show message if no requirements extracted yet */}
      {!hasRequirements && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">Requirements not extracted yet</p>
            <p className="text-xs text-amber-700 mt-1">
              Evidence Scan now uses your extracted requirements as the source of truth.
              Go to the <strong>JD Snapshot</strong> tab and click <strong>Extract Requirements</strong> first.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 text-amber-700 border-amber-300 hover:bg-amber-100"
              onClick={() => {
                // Switch to JD Snapshot tab by navigating to the URL with tab param
                const url = new URL(window.location.href);
                url.searchParams.set("tab", "jd-snapshot");
                window.history.pushState({}, "", url.toString());
                window.dispatchEvent(new Event("popstate"));
              }}
            >
              <FileText className="h-3.5 w-3.5 mr-1.5" />
              Go to JD Snapshot tab
            </Button>
          </div>
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Run Evidence+ATS Scan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3">
            <div className="flex-1 space-y-2">
              <Label className="text-xs">Select Resume</Label>
              <Select
                value={selectedResumeId?.toString() ?? ""}
                onValueChange={(v) => setSelectedResumeId(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a resume..." />
                </SelectTrigger>
                <SelectContent>
                  {resumes.map((r) => (
                    <SelectItem key={r.id} value={r.id.toString()}>{r.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => {
                if (!selectedResumeId) { toast.error("Select a resume first"); return; }
                if (!hasRequirements) { toast.error("Extract requirements first from the JD Snapshot tab."); return; }
                runEvidence.mutate({ jobCardId, resumeId: selectedResumeId });
              }}
              disabled={runEvidence.isPending || !selectedResumeId}
            >
              {runEvidence.isPending ? (
                <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Running...</>
              ) : (
                <><Target className="h-4 w-4 mr-1.5" />Run Scan (1 credit)</>
              )}
            </Button>
          </div>
          {hasRequirements && (
            <p className="text-xs text-muted-foreground mt-2">
              Costs 1 credit. Analyzes {requirements?.length} extracted requirements against your resume.
            </p>
          )}
          {!hasRequirements && (
            <p className="text-xs text-amber-600 mt-2">
              Extract requirements from JD Snapshot tab first to enable scanning.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Patch 8J: Past Runs collapsible panel */}
      <Collapsible open={pastRunsOpen} onOpenChange={setPastRunsOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="w-full flex items-center justify-between">
            <span className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Past Runs
              {runs.length > 0 && (
                <Badge variant="secondary" className="text-xs">{Math.min(runs.length, 20)}</Badge>
              )}
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${pastRunsOpen ? "rotate-180" : ""}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-2 rounded-lg border bg-card">
            {runs.length === 0 ? (
              <div className="flex items-center gap-2 px-4 py-6 text-center justify-center text-muted-foreground">
                <History className="h-4 w-4" />
                <p className="text-sm">No past runs yet.</p>
              </div>
            ) : (
              <div className="divide-y">
                {runs.slice(0, 20).map((run, idx) => {
                  const prevRun = runs[idx + 1];
                  const delta = (run.overallScore != null && prevRun?.overallScore != null)
                    ? run.overallScore - prevRun.overallScore
                    : null;
                  const resume = resumes.find((r) => r.id === run.resumeId);
                  const isActive = selectedRunId === run.id;
                  return (
                    <button
                      key={run.id}
                      onClick={() => setSelectedRunId(run.id)}
                      className={`w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-muted/50 transition-colors text-left ${
                        isActive ? "bg-primary/5 border-l-2 border-primary" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col">
                          <span className="font-medium text-xs text-muted-foreground">
                            {new Date(run.createdAt).toLocaleString()}
                          </span>
                          {resume && (
                            <span className="text-xs text-muted-foreground truncate max-w-[160px]">{resume.title}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {run.status === "completed" ? (
                          <>
                            <span className={`text-sm font-bold ${
                              (run.overallScore ?? 0) >= 75 ? "text-emerald-600" :
                              (run.overallScore ?? 0) >= 50 ? "text-amber-600" : "text-red-600"
                            }`}>
                              {run.overallScore ?? "—"}%
                            </span>
                            {delta !== null && (
                              <span className={`text-xs font-medium flex items-center gap-0.5 ${
                                delta > 0 ? "text-emerald-600" : delta < 0 ? "text-red-600" : "text-muted-foreground"
                              }`}>
                                {delta > 0 ? <TrendingUp className="h-3 w-3" /> : delta < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                                {delta > 0 ? `+${delta}` : delta}
                              </span>
                            )}
                          </>
                        ) : (
                          <Badge variant="secondary" className="text-xs">{run.status}</Badge>
                        )}
                        {isActive && (
                          <Badge variant="default" className="text-xs">Viewing</Badge>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Score + Breakdown */}
      {activeRun && activeRun.status === "completed" && (
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="text-3xl font-bold text-primary">{activeRun.overallScore}%</div>
                <div className="flex-1">
                  <p className="font-medium">ATS Match Score</p>
                  <p className="text-sm text-muted-foreground">{activeRun.summary}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Region: {activeRun.regionCode} | Track: {activeRun.trackCode}
                  </p>
                </div>
              </div>

              {/* Score breakdown */}
              {scoreBreakdown && (
                <div className="mt-4 space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">How this score was calculated</p>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Evidence Strength */}
                    <div className="rounded-md border p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">Evidence Strength</span>
                        <span className="text-sm font-bold">{scoreBreakdown.evidence_strength?.score ?? "—"}%</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{scoreBreakdown.evidence_strength?.explanation}</p>
                      <div className="flex gap-2 text-xs mt-1">
                        <span className="text-emerald-600 font-medium">{scoreBreakdown.evidence_strength?.matched_count ?? 0} matched</span>
                        <span className="text-amber-600 font-medium">{scoreBreakdown.evidence_strength?.partial_count ?? 0} partial</span>
                        <span className="text-red-600 font-medium">{scoreBreakdown.evidence_strength?.missing_count ?? 0} missing</span>
                      </div>
                    </div>
                    {/* Keyword Coverage */}
                    <div className="rounded-md border p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">Keyword Coverage</span>
                        <span className="text-sm font-bold">{scoreBreakdown.keyword_coverage?.score ?? "—"}%</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{scoreBreakdown.keyword_coverage?.explanation}</p>
                    </div>
                    {/* Formatting & ATS */}
                    <div className="rounded-md border p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">Formatting & ATS</span>
                        <span className="text-sm font-bold">{scoreBreakdown.formatting_ats?.score ?? "—"}%</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{scoreBreakdown.formatting_ats?.explanation}</p>
                    </div>
                    {/* Role Fit */}
                    <div className={`rounded-md border p-3 space-y-1 ${
                      (scoreBreakdown.flags?.length ?? 0) > 0 ? "border-amber-300 bg-amber-50" : ""
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">Role Fit</span>
                        <span className="text-sm font-bold">{scoreBreakdown.role_fit?.score ?? "—"}%</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{scoreBreakdown.role_fit?.explanation}</p>
                    </div>
                  </div>
                  {/* Flags */}
                  {scoreBreakdown.flags?.length > 0 && (
                    <div className="rounded-md border border-amber-300 bg-amber-50 p-3 space-y-1">
                      <p className="text-xs font-semibold text-amber-800 flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Eligibility / Fit Flags
                      </p>
                      {scoreBreakdown.flags.map((flag: string, i: number) => (
                        <p key={i} className="text-xs text-amber-700">{flag}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Group evidence items by type — Prompt A: collapsible categories */}
          {evidenceItems && (() => {
            const grouped = evidenceItems.reduce((acc: Record<string, any[]>, item: any) => {
              const group = item.groupType;
              if (!acc[group]) acc[group] = [];
              acc[group].push(item);
              return acc;
            }, {});
            const ORDER = ["skills", "tools", "responsibilities", "soft_skills", "eligibility"];
            const sorted = Object.entries(grouped).sort(([a], [b]) => {
              const ai = ORDER.indexOf(a); const bi = ORDER.indexOf(b);
              return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
            });
            return sorted.map(([groupType, items]) => {
              const isOpen = openCategories[groupType] ?? false;
              return (
                <div key={groupType} className="border rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleCategory(groupType)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors text-left"
                  >
                    <span className="text-sm font-semibold flex items-center gap-2">
                      {EVIDENCE_GROUP_LABELS[groupType as keyof typeof EVIDENCE_GROUP_LABELS] ?? groupType}
                      <Badge variant="secondary" className="text-xs">{(items as any[]).length}</Badge>
                    </span>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isOpen && (
                    <div className="p-3 space-y-3">
                      {(items as any[]).map((item: any) => (
                        <Card key={item.id} className={`border ${statusColors[item.status as keyof typeof statusColors] ?? ""}`}>
                          <CardContent className="pt-4 space-y-2 text-sm">
                            <div className="flex items-start gap-2">
                              {statusIcons[item.status as keyof typeof statusIcons]}
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <Badge variant={item.status === "matched" ? "default" : item.status === "partial" ? "secondary" : "destructive"} className="text-xs">
                                    {item.status}
                                  </Badge>
                                  {item.needsConfirmation && (
                                    <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                                      <AlertTriangle className="h-3 w-3 mr-1" />
                                      Needs confirmation
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="pl-6 space-y-1.5">
                              <p><span className="font-bold">JD:</span> <span className="font-semibold">"{item.jdRequirement}"</span></p>
                              <p><span className="font-medium text-muted-foreground">Resume proof:</span> "{item.resumeProof ?? "None found"}"</p>
                              <p><span className="font-medium text-muted-foreground">Fix:</span> {item.fix}</p>
                              <p><span className="font-medium text-muted-foreground">Rewrite A:</span> {item.rewriteA}</p>
                              <p><span className="font-medium text-muted-foreground">Rewrite B:</span> {item.rewriteB}</p>
                              <p><span className="font-medium text-muted-foreground">Why it matters:</span> {item.whyItMatters}</p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              );
            });
          })()}
        </div>
      )}

      {runs.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Target className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
          <p className="text-sm">No evidence scans yet. Select a resume and run a scan.</p>
        </div>
      )}
    </div>
  );
}

// ─── Application Kit Tab ─────────────────────────────────────────────
const TONES = ["Human", "Confident", "Warm", "Direct"] as const;
type Tone = typeof TONES[number];
const TONE_DESCRIPTIONS: Record<Tone, string> = {
  Human: "Natural",
  Confident: "Assertive",
  Warm: "Enthusiastic",
  Direct: "Concise",
};

function ApplicationKitTab({ jobCardId, job, resumes, evidenceRuns }: {
  jobCardId: number;
  job: any;
  resumes: any[];
  evidenceRuns: any[];
}) {
  const utils = trpc.useUtils();
  const { user } = useAuth();
  const completedRuns = evidenceRuns.filter((r) => r.status === "completed");
  const [selectedResumeId, setSelectedResumeId] = useState<number | null>(resumes[0]?.id ?? null);
  const [selectedRunId, setSelectedRunId] = useState<number | null>(completedRuns[0]?.id ?? null);
  const [tone, setTone] = useState<Tone>("Human");
  // Patch 8H: regeneration guard
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  // Prompt A: collapsible kit sections (Top Changes open, rest collapsed)
  const [kitSections, setKitSections] = useState({ topChanges: true, bulletRewrites: false, coverLetter: false });
  const toggleKitSection = (key: keyof typeof kitSections) => setKitSections((prev) => ({ ...prev, [key]: !prev[key] }));
  const selectedRun = completedRuns.find((r) => r.id === selectedRunId);
  const { data: requirements } = trpc.jdSnapshots.requirements.useQuery({ jobCardId });
  const hasRequirements = (requirements?.length ?? 0) > 0;
  const { data: existingKit, refetch: refetchKit } = trpc.applicationKits.get.useQuery(
    { jobCardId, resumeId: selectedResumeId!, evidenceRunId: selectedRunId! },
    { enabled: !!selectedResumeId && !!selectedRunId }
  );
  const generateKit = trpc.applicationKits.generate.useMutation({
    onSuccess: () => { refetchKit(); toast.success("Application Kit generated!"); },
    onError: (error) => {
      if (error.data?.code === "TOO_MANY_REQUESTS") {
        const match = error.message.match(/(\d+)s/);
        const seconds = match ? parseInt(match[1], 10) : 600;
        const minutes = Math.ceil(seconds / 60);
        toast.error(`You've generated too many kits. Try again in ${minutes} minute${minutes !== 1 ? "s" : ""}.`);
      } else if (error.message.includes("NO_EVIDENCE_RUN")) {
        toast.error("Run Evidence+ATS scan first.");
      } else if (error.message.includes("NO_REQUIREMENTS")) {
        toast.error("Extract requirements from JD Snapshot tab first.");
      } else {
        toast.error(error.message);
      }
    },
  });
  const createTasks = trpc.applicationKits.createTasks.useMutation({
    onSuccess: (data) => {
      utils.tasks.list.invalidate({ jobCardId });
      utils.tasks.today.invalidate();
      if (data.created > 0) toast.success(`${data.created} task${data.created > 1 ? "s" : ""} created!`);
      else toast.info("All tasks already exist.");
    },
    onError: (error) => toast.error(error.message),
  });
  const topChanges: Array<{ requirement_text: string; status: string; fix: string }> = (() => {
    if (!existingKit?.topChangesJson) return [];
    try { return JSON.parse(existingKit.topChangesJson); } catch { return []; }
  })();
  const bulletRewrites: Array<{ requirement_text: string; status: string; fix: string; rewrite_a: string; rewrite_b: string; needs_confirmation: boolean }> = (() => {
    if (!existingKit?.bulletRewritesJson) return [];
    try { return JSON.parse(existingKit.bulletRewritesJson); } catch { return []; }
  })();
  const coverLetterText = existingKit?.coverLetterText ?? "";
  const missingRewrites = bulletRewrites.filter((r) => r.status === "missing");
  const partialRewrites = bulletRewrites.filter((r) => r.status === "partial");
  const noRun = completedRuns.length === 0;

  return (
    <div className="space-y-4">
      {/* Backward-compat warnings */}
      {!hasRequirements && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">Requirements not extracted yet</p>
            <p className="text-xs text-amber-700 mt-1">Go to the <strong>JD Snapshot</strong> tab and click <strong>Extract Requirements</strong> first.</p>
          </div>
        </div>
      )}
      {hasRequirements && noRun && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 flex items-start gap-3">
          <Target className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-blue-800">No Evidence Scan yet</p>
            <p className="text-xs text-blue-700 mt-1">Go to the <strong>Evidence Map</strong> tab and run a scan first. Application Kit is included free with a completed scan.</p>
          </div>
        </div>
      )}

      {/* Header card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Package className="h-4 w-4" />Application Kit
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Resume</Label>
              <Select value={selectedResumeId?.toString() ?? ""} onValueChange={(v) => setSelectedResumeId(Number(v))}>
                <SelectTrigger className="text-xs"><SelectValue placeholder="Choose resume..." /></SelectTrigger>
                <SelectContent>
                  {resumes.map((r) => (<SelectItem key={r.id} value={r.id.toString()}>{r.title}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Evidence Run</Label>
              <Select value={selectedRunId?.toString() ?? ""} onValueChange={(v) => setSelectedRunId(Number(v))}>
                <SelectTrigger className="text-xs"><SelectValue placeholder="Choose run..." /></SelectTrigger>
                <SelectContent>
                  {completedRuns.map((r) => {
                    const d = new Date(r.createdAt);
                    const mmmd = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
                    const company = job?.company ?? "";
                    const title = job?.title ?? "";
                    const label = [company, title].filter(Boolean).join(" — ");
                    return (
                      <SelectItem key={r.id} value={r.id.toString()}>
                        <span title={`Run #${r.id}`}>
                          {label ? `${label} (${r.overallScore}%) · ${mmmd}` : `${r.overallScore}% · ${mmmd}`}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Tone</Label>
            <div className="flex gap-2 flex-wrap">
              {TONES.map((t) => (
                <button key={t} onClick={() => setTone(t)} className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${tone === t ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground hover:bg-accent"}`}>
                  {t} <span className="ml-1 text-[10px] opacity-70">— {TONE_DESCRIPTIONS[t]}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              {selectedRun && (() => {
                const d = new Date(selectedRun.createdAt);
                const mmmd = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
                const company = job?.company ?? "";
                const title = job?.title ?? "";
                const lbl = [company, title].filter(Boolean).join(" — ");
                const friendly = lbl ? `${lbl} (${selectedRun.overallScore}%) · ${mmmd}` : `${selectedRun.overallScore}% · ${mmmd}`;
                return <span title={`Run #${selectedRun.id}`}>{friendly}</span>;
              })()}
            </div>
            <div className="flex items-center gap-2">
              {existingKit && (coverLetterText || bulletRewrites.length > 0 || topChanges.length > 0) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    const zip = new JSZip();
                    const d = new Date();
                    const year = d.getFullYear();
                    const month = String(d.getMonth() + 1).padStart(2, "0");
                    const day = String(d.getDate()).padStart(2, "0");
                    const dateStr = `${year}-${month}-${day}`;
                    const selectedResume = resumes.find((r) => r.id === selectedResumeId);
                    const resumeName = selectedResume?.name ?? "Resume";
                    const runDate = selectedRun?.createdAt
                      ? new Date(selectedRun.createdAt).toLocaleDateString()
                      : "N/A";
                    const userName = user?.name ?? "User";
                    const companyName = job?.company ?? "Company";

                    // Cover letter
                    if (coverLetterText) {
                      const filename = buildCoverLetterFilename(userName, companyName);
                      zip.file(filename, coverLetterText + "\n");
                    }

                    // Resume patch (bullet rewrites)
                    if (bulletRewrites.length > 0) {
                      const filename = buildResumePatchFilename(userName, companyName);
                      const lines: string[] = [
                        `Job: ${job?.title ?? ""} \u2014 ${companyName}`,
                        `Date: ${dateStr}`,
                        `Resume: ${resumeName}`,
                        `Evidence run: ${runDate}`,
                        "",
                      ];
                      const groups = bulletRewrites.reduce((acc: Record<string, typeof bulletRewrites>, item) => {
                        const key = item.requirement_text?.split(" ")[0] ?? "other";
                        if (!acc[key]) acc[key] = [];
                        acc[key].push(item);
                        return acc;
                      }, {});
                      for (const [groupKey, items] of Object.entries(groups)) {
                        lines.push(`=== ${groupKey.toUpperCase()} ===`);
                        lines.push("");
                        for (const item of items) {
                          lines.push(`Requirement: ${item.requirement_text}`);
                          lines.push(`Status: ${item.status === "missing" ? "Missing" : "Partial"}`);
                          lines.push(`Fix: ${item.fix}`);
                          if (item.rewrite_a) lines.push(`Rewrite A: ${item.rewrite_a}`);
                          if (item.rewrite_b) lines.push(`Rewrite B: ${item.rewrite_b}`);
                          if (item.needs_confirmation) lines.push(`Needs confirmation: Yes`);
                          lines.push("");
                        }
                      }
                      zip.file(filename, lines.join("\n") + "\n");
                    }

                    // Top changes
                    if (topChanges.length > 0) {
                      const filename = buildTopChangesFilename(userName, companyName);
                      const lines: string[] = [
                        `Job: ${job?.title ?? ""} \u2014 ${companyName}`,
                        `Date: ${dateStr}`,
                        `Resume: ${resumeName}`,
                        `Evidence run: ${runDate}`,
                        "",
                        "=== Top Changes ===",
                        "",
                      ];
                      topChanges.forEach((change, i) => {
                        lines.push(`${i + 1}. ${change.requirement_text}`);
                        lines.push(`   Status: ${change.status === "missing" ? "Missing" : "Partial"}`);
                        lines.push(`   Action: ${change.fix}`);
                        lines.push("");
                      });
                      lines.push("=== Next Steps ===");
                      lines.push("");
                      lines.push("[ ] Update resume bullets");
                      lines.push("[ ] Review cover letter draft");
                      lines.push("[ ] Submit application");
                      zip.file(filename, lines.join("\n") + "\n");
                    }

                    const zipFilename = buildApplicationKitZipFilename(userName, companyName);
                    const blob = await zip.generateAsync({ type: "blob" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = zipFilename;
                    a.click();
                    URL.revokeObjectURL(url);
                    toast.success(`Downloaded ${zipFilename}`);
                  }}
                >
                  <Download className="h-4 w-4 mr-1.5" />Download Kit (.zip)
                </Button>
              )}
              {/* Patch 8H: regeneration guard dialog */}
              <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Replace existing kit?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Regenerating will replace your current Application Kit content (cover letter, rewrites, and top changes). If you already downloaded files, regenerate only if you want new versions.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={generateKit.isPending}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      disabled={generateKit.isPending}
                      onClick={() => {
                        setShowConfirmDialog(false);
                        generateKit.mutate({ jobCardId, resumeId: selectedResumeId!, evidenceRunId: selectedRunId!, tone });
                      }}
                    >
                      {generateKit.isPending ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Replacing...</> : "Replace kit"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button
                onClick={() => {
                  if (!selectedResumeId) { toast.error("Select a resume first."); return; }
                  if (!selectedRunId) { toast.error("Select an evidence run first."); return; }
                  if (existingKit) {
                    // Kit already exists — show confirmation guard
                    setShowConfirmDialog(true);
                  } else {
                    // First-time generation — run immediately
                    generateKit.mutate({ jobCardId, resumeId: selectedResumeId, evidenceRunId: selectedRunId, tone });
                  }
                }}
                disabled={generateKit.isPending || !hasRequirements || noRun}
              >
                {generateKit.isPending ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Generating...</> : existingKit ? <><Sparkles className="h-4 w-4 mr-1.5" />Regenerate Kit</> : <><Sparkles className="h-4 w-4 mr-1.5" />Generate Kit</>}
              </Button>
            </div>
          </div>
          {existingKit && (
            <p className="text-xs text-muted-foreground">Generated {new Date(existingKit.createdAt).toLocaleString()} • Tone: {existingKit.tone} • Included free with Evidence Scan</p>
          )}
        </CardContent>
      </Card>

      {/* Kit content */}
      {existingKit && (
        <>
          {topChanges.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <button type="button" onClick={() => toggleKitSection("topChanges")} className="flex items-center gap-2 text-left hover:opacity-80 transition-opacity">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2"><ListChecks className="h-4 w-4 text-primary" />Top Changes ({topChanges.length})</CardTitle>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${kitSections.topChanges ? "rotate-180" : ""}`} />
                  </button>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const d = new Date();
                        const year = d.getFullYear();
                        const month = String(d.getMonth() + 1).padStart(2, "0");
                        const day = String(d.getDate()).padStart(2, "0");
                        const dateStr = `${year}-${month}-${day}`;
                        const selectedResume = resumes.find((r) => r.id === selectedResumeId);
                        const resumeName = selectedResume?.name ?? "Resume";
                        const runDate = selectedRun?.createdAt
                          ? new Date(selectedRun.createdAt).toLocaleDateString()
                          : "N/A";

                        const lines: string[] = [
                          `Job: ${job?.title ?? ""} — ${job?.company ?? "Company"}`,
                          `Date: ${dateStr}`,
                          `Resume: ${resumeName}`,
                          `Evidence run: ${runDate}`,
                          "",
                          "=== Top Changes ===",
                          "",
                        ];

                        topChanges.forEach((change, i) => {
                          lines.push(`${i + 1}. ${change.requirement_text}`);
                          lines.push(`   Status: ${change.status === "missing" ? "Missing" : "Partial"}`);
                          lines.push(`   Action: ${change.fix}`);
                          lines.push("");
                        });

                        lines.push("=== Next Steps ===");
                        lines.push("");
                        lines.push("[ ] Update resume bullets");
                        lines.push("[ ] Review cover letter draft");
                        lines.push("[ ] Submit application");

                        const content = lines.join("\n");
                        const filename = buildTopChangesFilename(
                          user?.name ?? "User",
                          job?.company ?? "Company"
                        );
                        const blob = new Blob([content + "\n"], { type: "text/plain" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = filename;
                        a.click();
                        URL.revokeObjectURL(url);
                        toast.success(`Downloaded ${filename}`);
                      }}
                    >
                      <Download className="h-3.5 w-3.5 mr-1.5" />Download .txt
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => createTasks.mutate({ jobCardId })} disabled={createTasks.isPending}>
                      {createTasks.isPending ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Creating...</> : <><CheckSquare className="h-3.5 w-3.5 mr-1.5" />Create Tasks</>}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {kitSections.topChanges && (
                <CardContent className="space-y-2">
                  {topChanges.map((change, i) => (
                    <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${change.status === "missing" ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}`}>
                      <Badge variant={change.status === "missing" ? "destructive" : "secondary"} className="text-xs mt-0.5 shrink-0">{change.status}</Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{change.requirement_text}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{change.fix}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              )}
            </Card>
          )}

          {bulletRewrites.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <button type="button" onClick={() => toggleKitSection("bulletRewrites")} className="flex items-center gap-2 text-left hover:opacity-80 transition-opacity">
                    <CardTitle className="text-sm font-semibold">Bullet Rewrites ({bulletRewrites.length})</CardTitle>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${kitSections.bulletRewrites ? "rotate-180" : ""}`} />
                  </button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Build plain-text resume patch document
                      const d = new Date();
                      const year = d.getFullYear();
                      const month = String(d.getMonth() + 1).padStart(2, "0");
                      const day = String(d.getDate()).padStart(2, "0");
                      const dateStr = `${year}-${month}-${day}`;
                      const selectedResume = resumes.find((r) => r.id === selectedResumeId);
                      const resumeName = selectedResume?.name ?? "Resume";
                      const runDate = selectedRun?.createdAt
                        ? new Date(selectedRun.createdAt).toLocaleDateString()
                        : "N/A";

                      const lines: string[] = [
                        `Job: ${job?.title ?? ""} — ${job?.company ?? "Company"}`,
                        `Date: ${dateStr}`,
                        `Resume: ${resumeName}`,
                        `Evidence run: ${runDate}`,
                        "",
                      ];

                      const groups = [
                        { label: "Missing — Add to resume", items: missingRewrites },
                        { label: "Partial — Strengthen existing bullets", items: partialRewrites },
                      ];
                      for (const group of groups) {
                        if (group.items.length === 0) continue;
                        lines.push(`=== ${group.label} ===`);
                        lines.push("");
                        for (const item of group.items) {
                          lines.push(`Requirement: ${item.requirement_text}`);
                          lines.push(`Status: ${item.status === "missing" ? "Missing" : "Partial"}`);
                          lines.push(`Fix: ${item.fix}`);
                          lines.push(`Rewrite A: ${item.rewrite_a}`);
                          lines.push(`Rewrite B: ${item.rewrite_b}`);
                          if (item.needs_confirmation) lines.push("Needs confirmation: Yes");
                          lines.push("");
                        }
                      }

                      const content = lines.join("\n");
                      const filename = buildResumePatchFilename(
                        user?.name ?? "User",
                        job?.company ?? "Company"
                      );
                      const blob = new Blob([content + "\n"], { type: "text/plain" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = filename;
                      a.click();
                      URL.revokeObjectURL(url);
                      toast.success(`Downloaded ${filename}`);
                    }}
                  >
                    <Download className="h-3.5 w-3.5 mr-1.5" />Download .txt
                  </Button>
                </div>
              </CardHeader>
              {kitSections.bulletRewrites && (
              <CardContent className="space-y-4">
                {missingRewrites.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2">Missing — Add to resume</p>
                    <div className="space-y-3">
                      {missingRewrites.map((item, i) => (
                        <div key={i} className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-medium flex-1">{item.requirement_text}</p>
                            {item.needs_confirmation && <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 shrink-0"><AlertTriangle className="h-3 w-3 mr-1" />Needs confirmation</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground">{item.fix}</p>
                          {[item.rewrite_a, item.rewrite_b].map((rw, ri) => (
                            <div key={ri} className="flex items-start gap-2">
                              <p className="text-xs flex-1 bg-white rounded p-2 border">{rw}</p>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={() => { navigator.clipboard.writeText(rw); toast.success("Copied!"); }}><Copy className="h-3.5 w-3.5" /></Button>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {partialRewrites.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-2">Partial — Strengthen existing bullets</p>
                    <div className="space-y-3">
                      {partialRewrites.map((item, i) => (
                        <div key={i} className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-medium flex-1">{item.requirement_text}</p>
                            {item.needs_confirmation && <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 shrink-0"><AlertTriangle className="h-3 w-3 mr-1" />Needs confirmation</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground">{item.fix}</p>
                          {[item.rewrite_a, item.rewrite_b].map((rw, ri) => (
                            <div key={ri} className="flex items-start gap-2">
                              <p className="text-xs flex-1 bg-white rounded p-2 border">{rw}</p>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={() => { navigator.clipboard.writeText(rw); toast.success("Copied!"); }}><Copy className="h-3.5 w-3.5" /></Button>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
              )}
            </Card>
          )}
          {coverLetterText && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <button type="button" onClick={() => toggleKitSection("coverLetter")} className="flex items-center gap-2 text-left hover:opacity-80 transition-opacity">
                    <CardTitle className="text-sm font-semibold">Cover Letter Draft</CardTitle>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${kitSections.coverLetter ? "rotate-180" : ""}`} />
                  </button>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(coverLetterText); toast.success("Cover letter copied!"); }}>
                      <Copy className="h-3.5 w-3.5 mr-1.5" />Copy
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const filename = buildCoverLetterFilename(
                          user?.name ?? "User",
                          job?.company ?? "Company"
                        );
                        const blob = new Blob([coverLetterText + "\n"], { type: "text/plain" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = filename;
                        a.click();
                        URL.revokeObjectURL(url);
                        toast.success(`Downloaded ${filename}`);
                      }}
                    >
                      <Download className="h-3.5 w-3.5 mr-1.5" />Download .txt
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {kitSections.coverLetter && (
                <CardContent>
                  <div className="text-sm whitespace-pre-wrap rounded-lg bg-muted/30 p-4 border">{coverLetterText}</div>
                </CardContent>
              )}
            </Card>
          )}
        </>
      )}

      {!existingKit && !generateKit.isPending && hasRequirements && !noRun && (
        <div className="text-center py-8 text-muted-foreground">
          <Package className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
          <p className="text-sm">Select a resume and evidence run, then click Generate Kit.</p>
          <p className="text-xs mt-1">Application Kit is included free with a completed Evidence Scan.</p>
        </div>
      )}
    </div>
  );
}

// ─── PersonalizationContextCard ─────────────────────────────────────────────
const PCTX_TYPE_LABELS: Record<string, string> = {
  linkedin_post: "LinkedIn Post",
  linkedin_about: "LinkedIn About",
  company_news: "Company News",
  other: "Other",
};
const PCTX_TYPE_COLORS: Record<string, string> = {
  linkedin_post: "bg-blue-100 text-blue-700",
  linkedin_about: "bg-indigo-100 text-indigo-700",
  company_news: "bg-amber-100 text-amber-700",
  other: "bg-gray-100 text-gray-600",
};

function getSourceLabel(src: { sourceUrl?: string | null; pastedText?: string | null }): string {
  if (src.sourceUrl) {
    try { return new URL(src.sourceUrl).hostname; } catch { return src.sourceUrl.slice(0, 40); }
  }
  return "Pasted snippet";
}

function getSourcePreview(src: { pastedText?: string | null; sourceUrl?: string | null }): string {
  const text = src.pastedText ?? src.sourceUrl ?? "";
  return text.length > 80 ? text.slice(0, 80) + "…" : text;
}

function PersonalizationContextCard({ jobCardId, onEditSources }: { jobCardId: number; onEditSources: () => void }) {
  const { data: sources, isLoading } = trpc.personalization.list.useQuery({ jobCardId });

  if (isLoading) return null;

  const list = sources ?? [];
  const top3 = list.slice(0, 3);

  if (list.length === 0) {
    return (
      <div className="mb-3 flex items-center justify-between rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
        <span>No personalization sources saved (optional).</span>
        <button
          type="button"
          onClick={onEditSources}
          className="ml-2 text-primary hover:underline shrink-0"
        >
          Add sources
        </button>
      </div>
    );
  }

  return (
    <div className="mb-3 rounded-md border bg-muted/20 px-3 py-2 space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">Personalization context</span>
        <button
          type="button"
          onClick={onEditSources}
          className="text-xs text-primary hover:underline"
        >
          Edit sources
        </button>
      </div>
      <p className="text-xs text-muted-foreground">Using {list.length} saved source{list.length !== 1 ? "s" : ""}</p>
      <ul className="space-y-1">
        {top3.map((src: any) => (
          <li key={src.id} className="flex items-start gap-2">
            <span className={`shrink-0 rounded px-1 py-0.5 text-[10px] font-medium ${PCTX_TYPE_COLORS[src.sourceType] ?? PCTX_TYPE_COLORS.other}`}>
              {PCTX_TYPE_LABELS[src.sourceType] ?? "Other"}
            </span>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">{getSourceLabel(src)}</p>
              {getSourcePreview(src) && (
                <p className="text-[11px] text-muted-foreground/70 truncate">{getSourcePreview(src)}</p>
              )}
            </div>
          </li>
        ))}
      </ul>
      <p className="text-[10px] text-muted-foreground/60 pt-0.5">
        Resupify uses only what you pasted. One personalization line max in email/DM.
      </p>
    </div>
  );
}

// ─── SelectedContactChip ─────────────────────────────────────────────────────
function SelectedContactChip({ contact, hasContacts }: { contact: any | null; hasContacts: boolean }) {
  if (!contact) {
    return (
      <div className="mb-3 flex items-center gap-2 rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
        <UserCircle className="h-3.5 w-3.5 shrink-0" />
        <span>
          {hasContacts
            ? "No contact selected. Select one below to personalise salutation."
            : "No contact selected (optional). Outreach will use \u2018Dear Hiring Manager\u2019."}
        </span>
      </div>
    );
  }

  return (
    <div className="mb-3 flex items-start gap-2.5 rounded-md border bg-muted/30 px-3 py-2">
      <UserCircle className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
      <div className="flex-1 min-w-0 space-y-0.5">
        <p className="text-xs font-medium leading-tight">
          <span className="text-muted-foreground mr-1">Using:</span>
          {contact.name}
        </p>
        {contact.email && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Mail className="h-3 w-3 shrink-0" />
            {contact.email}
          </p>
        )}
        {contact.linkedinUrl && (
          <a
            href={contact.linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Link2 className="h-3 w-3 shrink-0" />
            {contact.linkedinUrl}
          </a>
        )}
      </div>
    </div>
  );
}

function CopyBlock({ label, content }: { label: string; content: string }) {
  return (
    <div className="p-3 rounded-lg border bg-muted/30">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs"
          onClick={() => { navigator.clipboard.writeText(content); toast.success("Copied!"); }}
        >
          <Copy className="h-3 w-3 mr-1" />Copy
        </Button>
      </div>
      <p className="text-sm whitespace-pre-wrap">{content}</p>
    </div>
  );
}

// ─── Outreach Tab ────────────────────────────────────────────────────
function OutreachTab({ jobCardId, contacts, outreachPack, onSwitchTab }: { jobCardId: number; contacts: any[]; outreachPack: any; onSwitchTab?: (tab: string) => void }) {
  const utils = trpc.useUtils();
  const [packError, setPackError] = useState<string | null>(null);
  const [selectedContactId, setSelectedContactId] = useState<number | undefined>(undefined);
  const generatePack = trpc.outreach.generatePack.useMutation({
    onSuccess: () => {
      setPackError(null);
      utils.outreach.pack.invalidate({ jobCardId });
      utils.credits.balance.invalidate();
      toast.success("Outreach Pack generated!");
    },
    onError: (error) => {
      if (error.data?.code === "TOO_MANY_REQUESTS") {
        const match = error.message.match(/(\d+)s/);
        const seconds = match ? parseInt(match[1], 10) : 600;
        const minutes = Math.ceil(seconds / 60);
        const msg = `You've sent too many outreach requests. Try again in ${minutes} minute${minutes !== 1 ? "s" : ""}.`;
        setPackError(msg);
        toast.error(msg);
      } else {
        const msg = error.message.toLowerCase().includes("insufficient")
          ? "Insufficient credits. Outreach Pack costs 1 credit. Top up in Billing."
          : "Couldn't generate the outreach pack. Try again.";
        setPackError(msg);
      }
    },
  });

   const [newContactName, setNewContactName] = useState("");
  const [newContactRole, setNewContactRole] = useState("");
  const [newContactEmail, setNewContactEmail] = useState("");
  const [newContactLinkedInUrl, setNewContactLinkedInUrl] = useState("");
  const [linkedInUrlError, setLinkedInUrlError] = useState<string | null>(null);
  const createContact = trpc.contacts.create.useMutation({
    onSuccess: () => {
      utils.contacts.list.invalidate({ jobCardId });
      setNewContactName("");
      setNewContactRole("");
      setNewContactEmail("");
      setNewContactLinkedInUrl("");
      setLinkedInUrlError(null);
      toast.success("Contact added");
    },
  });

  const selectedContact = contacts.find((c) => c.id === selectedContactId) ?? null;
  const noContacts = contacts.length === 0;
  const missingEmail = selectedContact && !selectedContact.email;
  const missingLinkedIn = selectedContact && !selectedContact.linkedinUrl;

  return (
    <div className="space-y-4">
      {/* Contact tip nudges */}
      {noContacts && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50/60 px-4 py-2.5">
          <UserCircle className="h-4 w-4 text-amber-500 shrink-0" />
          <p className="flex-1 text-xs text-amber-800">
            Add a recruiter contact below to personalise the salutation and improve outreach quality.
          </p>
        </div>
      )}
      {!noContacts && !selectedContactId && (
        <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50/60 px-4 py-2.5">
          <UserCircle className="h-4 w-4 text-blue-500 shrink-0" />
          <p className="flex-1 text-xs text-blue-800">
            Select a contact below to personalise the salutation in your outreach messages.
          </p>
        </div>
      )}
      {(missingEmail || missingLinkedIn) && (
        <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50/60 px-4 py-2.5">
          <Mail className="h-4 w-4 text-blue-500 shrink-0" />
          <p className="flex-1 text-xs text-blue-800">
            {missingEmail && missingLinkedIn
              ? "Add the contact's email and LinkedIn URL for a more complete outreach pack."
              : missingEmail
              ? "Add the contact's email to include a direct To: line in the recruiter email."
              : "Add the contact's LinkedIn URL to personalise the LinkedIn DM."}
          </p>
        </div>
      )}
      {/* Generate Pack */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Outreach Pack</CardTitle>
            {outreachPack && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  const text = buildOutreachCopyAllText({
                    recruiter_email: outreachPack.recruiterEmail,
                    linkedin_dm: outreachPack.linkedinDm,
                    follow_up_1: outreachPack.followUp1,
                    follow_up_2: outreachPack.followUp2,
                  });
                  navigator.clipboard.writeText(text)
                    .then(() => toast.success("Copied all messages"))
                    .catch(() => toast.error("Could not copy. Please try again."));
                }}
              >
                <CopyCheck className="h-3.5 w-3.5" />
                Copy all
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Selected contact summary chip */}
          <SelectedContactChip contact={contacts.find((c) => c.id === selectedContactId) ?? null} hasContacts={contacts.length > 0} />
          {/* Personalization context summary */}
          <PersonalizationContextCard jobCardId={jobCardId} onEditSources={() => onSwitchTab?.("personalization")} />
          {outreachPack ? (
            <div className="space-y-3">
              <CopyBlock label="Recruiter Email" content={outreachPack.recruiterEmail} />
              <CopyBlock label="LinkedIn DM" content={outreachPack.linkedinDm} />
              <CopyBlock label="Follow-up #1" content={outreachPack.followUp1} />
              <CopyBlock label="Follow-up #2" content={outreachPack.followUp2} />
              <div className="pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setPackError(null); generatePack.mutate({ jobCardId, contactId: selectedContactId }); }}
                  disabled={generatePack.isPending}
                >
                  {generatePack.isPending ? (
                    <><Loader2 className="h-3 w-3 mr-1.5 animate-spin" />Regenerating...</>
                  ) : (
                    "Regenerate Pack (1 credit)"
                  )}
                </Button>
                {packError && (
                  <p className="text-xs text-destructive mt-2">{packError}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-1">No outreach pack yet.</p>
              <p className="text-xs text-muted-foreground mb-3">Creates: recruiter email + LinkedIn DM + 2 follow-ups</p>
              <Button
                onClick={() => { setPackError(null); generatePack.mutate({ jobCardId, contactId: selectedContactId }); }}
                disabled={generatePack.isPending}
              >
                {generatePack.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Generating...</>
                ) : (
                  "Generate Pack (1 credit)"
                )}
              </Button>
              {packError && (
                <p className="text-xs text-destructive mt-2">{packError}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contacts */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Contacts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {contacts.map((contact) => (
            <div key={contact.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedContactId === contact.id ? "border-primary bg-primary/5" : "hover:bg-muted/30"}`} onClick={() => setSelectedContactId(selectedContactId === contact.id ? undefined : contact.id)}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{contact.name}</p>
                <p className="text-xs text-muted-foreground">
                  {contact.contactRole ?? ""} {contact.email ? `· ${contact.email}` : ""}
                </p>
              </div>
              {selectedContactId === contact.id && (
                <span className="text-xs text-primary font-medium">Selected for outreach</span>
              )}
            </div>
          ))}
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input placeholder="Name *" value={newContactName} maxLength={MAX_LENGTHS.CONTACT_NAME} onChange={(e) => setNewContactName(e.target.value)} className="flex-1" />
              <Input placeholder="Role" value={newContactRole} maxLength={MAX_LENGTHS.CONTACT_ROLE} onChange={(e) => setNewContactRole(e.target.value)} className="flex-1" />
              <Input placeholder="Email" value={newContactEmail} maxLength={MAX_LENGTHS.CONTACT_EMAIL} onChange={(e) => setNewContactEmail(e.target.value)} className="flex-1" />
            </div>
            <div className="flex gap-2 items-start">
              <div className="flex-1">
                <Input
                  placeholder="https://linkedin.com/in/… (optional)"
                  value={newContactLinkedInUrl}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewContactLinkedInUrl(val);
                    if (val && !val.startsWith("https://")) {
                      setLinkedInUrlError("LinkedIn URL must start with https://");
                    } else {
                      setLinkedInUrlError(null);
                    }
                  }}
                  className={linkedInUrlError ? "border-destructive" : ""}
                />
                {linkedInUrlError && (
                  <p className="text-xs text-destructive mt-0.5">{linkedInUrlError}</p>
                )}
              </div>
              <Button
                size="sm"
                onClick={() => {
                  if (!newContactName.trim()) return;
                  if (linkedInUrlError) return;
                  createContact.mutate({
                    jobCardId,
                    name: newContactName,
                    role: newContactRole || undefined,
                    email: newContactEmail || undefined,
                    linkedinUrl: newContactLinkedInUrl || undefined,
                  });
                }}
                disabled={!!linkedInUrlError}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tasks Tab ───────────────────────────────────────────────────────
function TasksTab({ jobCardId, jobStage, tasks, updateTask, createTask }: { jobCardId: number; jobStage: string; tasks: any[]; updateTask: any; createTask: any }) {
  const [newTitle, setNewTitle] = useState("");
  const utils = trpc.useUtils();

  const markSent = trpc.tasks.markSent.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate({ jobCardId });
      utils.tasks.today.invalidate();
      // Invalidate job cards list so the follow-up badge shifts to the next slot
      utils.jobCards.list.invalidate();
      toast.success("Follow-up marked as sent!");
    },
    onError: (err) => toast.error(err.message),
  });

  const ensureFollowUps = trpc.tasks.ensureFollowUps.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate({ jobCardId });
      utils.tasks.today.invalidate();
    },
  });

  // When the Tasks tab mounts for an Applied card, backfill any missing follow-up tasks
  useEffect(() => {
    if (jobStage === "applied") {
      ensureFollowUps.mutate({ jobCardId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobCardId, jobStage]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={(e) => {
            e.preventDefault();
            if (!newTitle.trim()) return;
            createTask.mutate({ jobCardId, title: newTitle });
            setNewTitle("");
          }} className="flex gap-3">
            <Input placeholder="Add a task..." value={newTitle} maxLength={MAX_LENGTHS.TASK_TITLE} onChange={(e) => setNewTitle(e.target.value)} className="flex-1" />
            <Button type="submit" size="sm"><Plus className="h-4 w-4 mr-1" />Add</Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {tasks.map((task) => (
          <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
            <Checkbox
              checked={task.completed}
              onCheckedChange={(checked) => updateTask.mutate({ id: task.id, completed: !!checked })}
            />
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${task.completed ? "line-through text-muted-foreground" : ""}`}>
                {task.title}
              </p>
              {task.dueDate && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Clock className="h-3 w-3" />{new Date(task.dueDate).toLocaleDateString()}
                </p>
              )}
              {/* Show "Sent {date}" label for completed follow_up tasks that have sentAt */}
              {task.taskType === "follow_up" && task.completed && task.sentAt && (
                <p className="text-xs text-emerald-600 flex items-center gap-1 mt-0.5">
                  <MailCheck className="h-3 w-3" />Sent {new Date(task.sentAt).toLocaleDateString()}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {/* "Mark as sent" button: only for incomplete follow_up tasks */}
              {task.taskType === "follow_up" && !task.completed && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7 px-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                  onClick={() => markSent.mutate({ id: task.id })}
                  disabled={markSent.isPending}
                >
                  <Send className="h-3 w-3 mr-1" />
                  Mark as sent
                </Button>
              )}
              <Badge variant="secondary" className="text-xs">
                {(task.taskType ?? "custom").replace("_", " ")}
              </Badge>
            </div>
          </div>
        ))}
        {tasks.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <CheckSquare className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
            <p className="text-sm">No tasks yet for this job card.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Personalization Tab ─────────────────────────────────────────────────────
const SOURCE_TYPE_LABELS: Record<string, string> = {
  linkedin_post: "LinkedIn Post",
  linkedin_about: "LinkedIn About",
  company_news: "Company News",
  other: "Other",
};
const SOURCE_TYPE_COLORS: Record<string, string> = {
  linkedin_post: "bg-blue-100 text-blue-700",
  linkedin_about: "bg-indigo-100 text-indigo-700",
  company_news: "bg-amber-100 text-amber-700",
  other: "bg-gray-100 text-gray-600",
};

type SourceType = "linkedin_post" | "linkedin_about" | "company_news" | "other";

interface SourceForm {
  id?: number;
  sourceType: SourceType;
  url: string;
  pastedText: string;
}

const EMPTY_FORM: SourceForm = { sourceType: "other", url: "", pastedText: "" };

function PersonalizationTab({ jobCardId }: { jobCardId: number }) {
  const utils = trpc.useUtils();
  const { data: sources, isLoading } = trpc.personalization.list.useQuery({ jobCardId });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<SourceForm>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const upsert = trpc.personalization.upsert.useMutation({
    onSuccess: () => {
      utils.personalization.list.invalidate({ jobCardId });
      setShowForm(false);
      setForm(EMPTY_FORM);
      setFormError(null);
      toast.success(form.id ? "Source updated" : "Source added");
    },
    onError: (err) => {
      setFormError(err.message);
    },
  });

  const del = trpc.personalization.delete.useMutation({
    onSuccess: () => {
      utils.personalization.list.invalidate({ jobCardId });
      toast.success("Source removed");
    },
  });

  function handleEdit(src: any) {
    setForm({
      id: src.id,
      sourceType: src.sourceType as SourceType,
      url: src.url ?? "",
      pastedText: src.pastedText ?? "",
    });
    setFormError(null);
    setShowForm(true);
  }

  function handleCancel() {
    setShowForm(false);
    setForm(EMPTY_FORM);
    setFormError(null);
  }

  function handleSubmit() {
    setFormError(null);
    const trimmedText = form.pastedText.trim();
    const trimmedUrl = form.url.trim();
    if (trimmedText.length > 0 && trimmedText.length < 50 && trimmedUrl.length === 0) {
      setFormError("Paste at least 50 characters of text, or provide a URL.");
      return;
    }
    if (trimmedText.length === 0 && trimmedUrl.length === 0) {
      setFormError("Paste at least 50 characters of text, or provide a URL.");
      return;
    }
    if (trimmedText.length > 5000) {
      setFormError("Pasted text must be 5,000 characters or less.");
      return;
    }
    upsert.mutate({
      id: form.id,
      jobCardId,
      sourceType: form.sourceType,
      url: trimmedUrl || undefined,
      pastedText: trimmedText || undefined,
    });
  }

  const canAdd = !showForm && (sources?.length ?? 0) < 5;

  return (
    <div className="space-y-4">
      {/* Disclaimer */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <span className="font-semibold">Privacy note:</span> Use only professional content you're comfortable referencing. Resupify uses only what you paste here — no scraping or external fetching.
      </div>

      {/* Source list */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading sources…
        </div>
      ) : (sources ?? []).length === 0 && !showForm ? (
        <div className="text-center py-10 text-muted-foreground text-sm">
          <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-30" />
          No personalization sources yet. Add a LinkedIn post, About section, or company news snippet to help personalize future outreach.
        </div>
      ) : (
        <div className="space-y-2">
          {(sources ?? []).map((src: any) => (
            <Card key={src.id} className="p-3">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={`text-xs ${SOURCE_TYPE_COLORS[src.sourceType] ?? SOURCE_TYPE_COLORS.other}`}>
                      {SOURCE_TYPE_LABELS[src.sourceType] ?? src.sourceType}
                    </Badge>
                    {src.url && (
                      <a
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline flex items-center gap-1 truncate max-w-[240px]"
                      >
                        <ExternalLink className="h-3 w-3 shrink-0" />
                        {src.url}
                      </a>
                    )}
                    <span className="text-xs text-muted-foreground ml-auto">
                      {new Date(src.capturedAt).toLocaleDateString()}
                    </span>
                  </div>
                  {src.pastedText && (
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {src.pastedText}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleEdit(src)}
                    title="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => del.mutate({ id: src.id })}
                    title="Delete"
                    disabled={del.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit form */}
      {showForm && (
        <Card className="p-4 space-y-3 border-primary/30">
          <h3 className="text-sm font-semibold">{form.id ? "Edit source" : "Add source"}</h3>

          <div className="space-y-1">
            <Label className="text-xs">Source type</Label>
            <Select
              value={form.sourceType}
              onValueChange={(v) => setForm((f) => ({ ...f, sourceType: v as SourceType }))}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="linkedin_post">LinkedIn Post</SelectItem>
                <SelectItem value="linkedin_about">LinkedIn About</SelectItem>
                <SelectItem value="company_news">Company News</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">URL <span className="text-muted-foreground">(optional)</span></Label>
            <Input
              className="h-8 text-sm"
              placeholder="https://linkedin.com/posts/..."
              value={form.url}
              onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">
              Pasted text <span className="text-muted-foreground">(required if no URL; min 50 chars, max 5,000)</span>
            </Label>
            <Textarea
              className="text-sm min-h-[100px] resize-y"
              placeholder="Paste the relevant excerpt here…"
              value={form.pastedText}
              onChange={(e) => setForm((f) => ({ ...f, pastedText: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground text-right">
              {form.pastedText.length}/5000
            </p>
          </div>

          {formError && (
            <p className="text-xs text-destructive">{formError}</p>
          )}

          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={handleCancel}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSubmit} disabled={upsert.isPending}>
              {upsert.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
              {form.id ? "Save changes" : "Add source"}
            </Button>
          </div>
        </Card>
      )}

      {/* Add button */}
      {canAdd && (
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => { setForm(EMPTY_FORM); setFormError(null); setShowForm(true); }}
        >
          <Plus className="h-3.5 w-3.5" />
          Add source
          <span className="text-muted-foreground text-xs ml-1">({(sources?.length ?? 0)}/5)</span>
        </Button>
      )}
      {!canAdd && !showForm && (sources?.length ?? 0) >= 5 && (
        <p className="text-xs text-muted-foreground">Maximum 5 sources reached. Delete one to add another.</p>
      )}
    </div>
  );
}
