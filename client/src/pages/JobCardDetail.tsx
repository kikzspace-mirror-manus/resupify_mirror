import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { STAGES, STAGE_LABELS, EVIDENCE_GROUP_LABELS } from "../../../shared/regionPacks";

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
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview"><Briefcase className="h-3.5 w-3.5 mr-1.5" />Overview</TabsTrigger>
          <TabsTrigger value="jd"><FileText className="h-3.5 w-3.5 mr-1.5" />JD Snapshot</TabsTrigger>
          <TabsTrigger value="evidence"><Target className="h-3.5 w-3.5 mr-1.5" />Evidence Map</TabsTrigger>
          <TabsTrigger value="kit"><Package className="h-3.5 w-3.5 mr-1.5" />Application Kit</TabsTrigger>
          <TabsTrigger value="outreach"><Users className="h-3.5 w-3.5 mr-1.5" />Outreach</TabsTrigger>
          <TabsTrigger value="tasks"><CheckSquare className="h-3.5 w-3.5 mr-1.5" />Tasks</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <OverviewTab job={job} updateJob={updateJob} />
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
          <ApplicationKitTab jobCardId={id} job={job} outreachPack={outreachPack} />
        </TabsContent>

        {/* Outreach Tab */}
        <TabsContent value="outreach" className="space-y-4 mt-4">
          <OutreachTab jobCardId={id} contacts={contacts ?? []} outreachPack={outreachPack} />
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

// ─── Overview Tab ────────────────────────────────────────────────────
function OverviewTab({ job, updateJob }: { job: any; updateJob: any }) {
  const [notes, setNotes] = useState(job.notes ?? "");

  return (
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
  const utils = trpc.useUtils();

  const { data: requirements } = trpc.jdSnapshots.requirements.useQuery({ jobCardId });

  const createSnapshot = trpc.jdSnapshots.create.useMutation({
    onSuccess: () => {
      utils.jdSnapshots.list.invalidate({ jobCardId });
      setNewJdText("");
      toast.success("JD Snapshot saved");
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
        <CardContent>
          <Textarea
            value={newJdText}
            onChange={(e) => setNewJdText(e.target.value)}
            placeholder="Paste the job description text here..."
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
    </div>
  );
}

// ─── Evidence Tab ────────────────────────────────────────────────────
function EvidenceTab({ jobCardId, runs, resumes }: { jobCardId: number; runs: any[]; resumes: any[] }) {
  const [selectedResumeId, setSelectedResumeId] = useState<number | null>(resumes[0]?.id ?? null);
  const [selectedRunId, setSelectedRunId] = useState<number | null>(runs[0]?.id ?? null);
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
      if (error.message.includes("NO_REQUIREMENTS")) {
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

      {/* Run selector */}
      {runs.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {runs.map((run) => (
            <Button
              key={run.id}
              variant={selectedRunId === run.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedRunId(run.id)}
            >
              Run #{run.id} — {run.overallScore ?? "?"}%
              <Badge variant="secondary" className="ml-2 text-xs">
                {run.status}
              </Badge>
            </Button>
          ))}
        </div>
      )}

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

          {/* Group evidence items by type */}
          {evidenceItems && Object.entries(
            evidenceItems.reduce((acc: Record<string, any[]>, item: any) => {
              const group = item.groupType;
              if (!acc[group]) acc[group] = [];
              acc[group].push(item);
              return acc;
            }, {})
          ).map(([groupType, items]) => (
            <div key={groupType}>
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                {EVIDENCE_GROUP_LABELS[groupType as keyof typeof EVIDENCE_GROUP_LABELS] ?? groupType}
                <Badge variant="secondary" className="text-xs">{(items as any[]).length}</Badge>
              </h3>
              <div className="space-y-3">
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
                        <p><span className="font-medium text-muted-foreground">JD:</span> "{item.jdRequirement}"</p>
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
            </div>
          ))}
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
function ApplicationKitTab({ jobCardId, job, outreachPack }: { jobCardId: number; job: any; outreachPack: any }) {
  const { data: latestRun } = trpc.evidence.runs.useQuery({ jobCardId });
  const latestCompleted = latestRun?.find((r) => r.status === "completed");
  const { data: evidenceItems } = trpc.evidence.items.useQuery(
    { evidenceRunId: latestCompleted?.id! },
    { enabled: !!latestCompleted }
  );

  const missingItems = evidenceItems?.filter((i: any) => i.status === "missing") ?? [];
  const partialItems = evidenceItems?.filter((i: any) => i.status === "partial") ?? [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Application Kit for {job.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {latestCompleted ? (
            <>
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-sm font-medium">ATS Score: {latestCompleted.overallScore}%</p>
                <p className="text-xs text-muted-foreground mt-1">{latestCompleted.summary}</p>
              </div>

              {missingItems.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 text-red-600">Resume Gaps to Address ({missingItems.length})</h4>
                  <div className="space-y-2">
                    {missingItems.map((item: any) => (
                      <div key={item.id} className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm">
                        <p className="font-medium">{item.jdRequirement}</p>
                        <p className="text-muted-foreground mt-1">Suggested: {item.rewriteA}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {partialItems.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 text-amber-600">Partial Matches to Strengthen ({partialItems.length})</h4>
                  <div className="space-y-2">
                    {partialItems.map((item: any) => (
                      <div key={item.id} className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm">
                        <p className="font-medium">{item.jdRequirement}</p>
                        <p className="text-muted-foreground mt-1">Current: {item.resumeProof}</p>
                        <p className="text-muted-foreground">Improve to: {item.rewriteA}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <p className="text-sm">Run an Evidence+ATS scan first to generate your Application Kit.</p>
            </div>
          )}

          {outreachPack && (
            <div>
              <h4 className="text-sm font-semibold mb-2">Outreach Pack</h4>
              <div className="grid gap-2">
                <CopyBlock label="Recruiter Email" content={outreachPack.recruiterEmail} />
                <CopyBlock label="LinkedIn DM" content={outreachPack.linkedinDm} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
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
function OutreachTab({ jobCardId, contacts, outreachPack }: { jobCardId: number; contacts: any[]; outreachPack: any }) {
  const utils = trpc.useUtils();
  const [packError, setPackError] = useState<string | null>(null);
  const generatePack = trpc.outreach.generatePack.useMutation({
    onSuccess: () => {
      setPackError(null);
      utils.outreach.pack.invalidate({ jobCardId });
      utils.credits.balance.invalidate();
      toast.success("Outreach Pack generated!");
    },
    onError: (error) => {
      const msg = error.message.toLowerCase().includes("insufficient")
        ? "Insufficient credits. Outreach Pack costs 1 credit. Top up in Billing."
        : "Couldn't generate the outreach pack. Try again.";
      setPackError(msg);
    },
  });

  const [newContactName, setNewContactName] = useState("");
  const [newContactRole, setNewContactRole] = useState("");
  const [newContactEmail, setNewContactEmail] = useState("");

  const createContact = trpc.contacts.create.useMutation({
    onSuccess: () => {
      utils.contacts.list.invalidate({ jobCardId });
      setNewContactName("");
      setNewContactRole("");
      setNewContactEmail("");
      toast.success("Contact added");
    },
  });

  return (
    <div className="space-y-4">
      {/* Generate Pack */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Outreach Pack</CardTitle>
        </CardHeader>
        <CardContent>
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
                  onClick={() => { setPackError(null); generatePack.mutate({ jobCardId }); }}
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
                onClick={() => { setPackError(null); generatePack.mutate({ jobCardId }); }}
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
            <div key={contact.id} className="flex items-center gap-3 p-3 rounded-lg border">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{contact.name}</p>
                <p className="text-xs text-muted-foreground">
                  {contact.contactRole ?? ""} {contact.email ? `· ${contact.email}` : ""}
                </p>
              </div>
            </div>
          ))}
          <div className="flex gap-2">
            <Input placeholder="Name" value={newContactName} onChange={(e) => setNewContactName(e.target.value)} className="flex-1" />
            <Input placeholder="Role" value={newContactRole} onChange={(e) => setNewContactRole(e.target.value)} className="flex-1" />
            <Input placeholder="Email" value={newContactEmail} onChange={(e) => setNewContactEmail(e.target.value)} className="flex-1" />
            <Button size="sm" onClick={() => {
              if (!newContactName.trim()) return;
              createContact.mutate({ jobCardId, name: newContactName, role: newContactRole || undefined, email: newContactEmail || undefined });
            }}>
              <Plus className="h-4 w-4" />
            </Button>
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
            <Input placeholder="Add a task..." value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="flex-1" />
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
