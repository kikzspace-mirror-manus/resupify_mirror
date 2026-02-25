import { trpc } from "@/lib/trpc";
import { useAIConcurrency } from "@/contexts/AIConcurrencyContext";
import BatchSprintResultsDrawer, { type BatchSprintResult } from "@/components/BatchSprintResultsDrawer";
import { ProfileNudgeBanner, useProfileNudge } from "@/components/ProfileNudgeBanner";
import { MAX_LENGTHS } from "../../../shared/maxLengths";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  List,
  LayoutGrid,
  Briefcase,
  MapPin,
  Calendar,
  Clock,
  ExternalLink,
  Search,
  Bell,
  ShieldAlert,
  Loader2,
  MoreHorizontal,
  Archive,
  ArchiveRestore,
  Zap,
  MonitorSmartphone,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { STAGES, STAGE_LABELS } from "../../../shared/regionPacks";
import { normalizeJobUrl, isLikelyBlockedHost } from "../../../shared/urlNormalize";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

const stageColors: Record<string, string> = {
  bookmarked: "bg-slate-100 text-slate-700 border-slate-200",
  applying: "bg-blue-100 text-blue-700 border-blue-200",
  applied: "bg-indigo-100 text-indigo-700 border-indigo-200",
  interviewing: "bg-amber-100 text-amber-700 border-amber-200",
  offered: "bg-emerald-100 text-emerald-700 border-emerald-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
  archived: "bg-gray-100 text-gray-500 border-gray-200",
};

/**
 * Returns styling and label for the next follow-up badge.
 * - Overdue (past today): red
 * - Due within 2 days: amber
 * - Otherwise: green/muted
 */
/**
 * Returns badge props for the eligibility pre-check status.
 */
function getEligibilityBadgeProps(status: string | null | undefined): {
  label: string;
  className: string;
  title: string;
} | null {
  if (!status || status === "none") return null;
  if (status === "conflict") {
    return {
      label: "Eligibility risk",
      className: "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700",
      title: "Based on the job description. Complete your profile or run a scan for details.",
    };
  }
  return {
    label: "Eligibility",
    className: "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700",
    title: "Based on the job description. Complete your profile or run a scan for details.",
  };
}

function getFollowupBadgeProps(nextFollowupDueAt: Date | null | undefined): {
  label: string;
  className: string;
} | null {
  if (!nextFollowupDueAt) return null;
  const due = new Date(nextFollowupDueAt);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffMs = due.getTime() - todayStart.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const dateStr = due.toLocaleDateString(undefined, { month: "short", day: "numeric" });

  if (diffDays < 0) {
    return { label: `Overdue · ${dateStr}`, className: "bg-red-100 text-red-700 border-red-200" };
  }
  if (diffDays <= 2) {
    return { label: `Follow-up · ${dateStr}`, className: "bg-amber-100 text-amber-700 border-amber-200" };
  }
  return { label: `Follow-up · ${dateStr}`, className: "bg-emerald-100 text-emerald-700 border-emerald-200" };
}

const kanbanHeaderColors: Record<string, string> = {
  bookmarked: "border-t-slate-400",
  applying: "border-t-blue-500",
  applied: "border-t-indigo-500",
  interviewing: "border-t-amber-500",
  offered: "border-t-emerald-500",
  rejected: "border-t-red-500",
  archived: "border-t-gray-400",
};

export default function JobCards() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [view, setView] = useState<"list" | "kanban">("list");
  const [search, setSearch] = useState("");
  const [filterStage, setFilterStage] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterSeason, setFilterSeason] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [showCreate, setShowCreate] = useState(false);

  // ── Drag-and-drop state ──────────────────────────────────────────────
  const [activeJobId, setActiveJobId] = useState<number | null>(null);

  // ── Archive state ────────────────────────────────────────────────────
  const [archiveConfirmId, setArchiveConfirmId] = useState<number | null>(null);

  // ── Bulk selection state ───────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkArchiveConfirmOpen, setBulkArchiveConfirmOpen] = useState(false);
  const [bulkArchiveLargeConfirmOpen, setBulkArchiveLargeConfirmOpen] = useState(false);
  const [bulkArchiveProgress, setBulkArchiveProgress] = useState<{ current: number; total: number } | null>(null);

   // ── Batch Sprint state ────────────────────────────────────────────
  const [batchSprintResumeId, setBatchSprintResumeId] = useState<number | null>(null);
  const [showBatchSprintDialog, setShowBatchSprintDialog] = useState(false);
  // Phase 10E: Results drawer state
  const [sprintResultsOpen, setSprintResultsOpen] = useState(false);
  const [sprintResults, setSprintResults] = useState<BatchSprintResult[]>([]);
  const [sprintResumeIdForRetry, setSprintResumeIdForRetry] = useState<number | null>(null);
  const [isRetryingFailed, setIsRetryingFailed] = useState(false);
  const { isBusy, isQueued, runAI, markDone, cancelQueued } = useAIConcurrency();

  const archiveCard = trpc.jobCards.update.useMutation({
    onMutate: async ({ id, stage }) => {
      await utils.jobCards.list.cancel();
      const previous = utils.jobCards.list.getData({});
      utils.jobCards.list.setData({}, (old) =>
        old ? old.map((j) => (j.id === id ? { ...j, stage: stage! } : j)) : old
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) utils.jobCards.list.setData({}, context.previous);
      toast.error("Action failed. Try again.");
    },
    onSuccess: (_data, vars) => {
      const isArchiving = vars.stage === "archived";
      toast.success(isArchiving ? "Job card archived." : "Job card unarchived.");
    },
    onSettled: () => {
      utils.jobCards.list.invalidate();
    },
  });
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const { data: jobs, isLoading } = trpc.jobCards.list.useQuery({});
  const { data: resumes } = trpc.resumes.list.useQuery();

  // ── Batch Sprint mutation ─────────────────────────────────────────────
  const batchSprint = trpc.evidence.batchSprint.useMutation({
    onSuccess: (data) => {
      markDone();
      const succeeded = data.results.filter((r) => r.runId !== null).length;
      const failed = data.results.length - succeeded;
      // Phase 10E: store results and auto-open drawer
      setSprintResults(data.results as BatchSprintResult[]);
      setSprintResultsOpen(true);
      if (failed === 0) {
        toast.success(`Batch Sprint complete! ${succeeded} job${succeeded !== 1 ? "s" : ""} scanned.`);
      } else {
        toast.warning(`Batch Sprint done: ${succeeded} succeeded, ${failed} failed.`);
      }
      utils.jobCards.list.invalidate();
    },
    onError: (err) => {
      markDone();
      toast.error(err.message ?? "Batch Sprint failed. Try again.");
    },
  });

  // Profile nudge banner (shared with Dashboard/Today)
  const { data: profile, isLoading: profileLoading } = trpc.profile.get.useQuery();
  const workStatus = (profile as any)?.workStatus ?? null;
  const { showNudge, handleDismiss: handleDismissNudge } = useProfileNudge(
    profileLoading ? "loading" : workStatus
  );

  // Stage update mutation used by drag-and-drop
  const updateStage = trpc.jobCards.update.useMutation({
    onMutate: async ({ id, stage }) => {
      // Optimistic update: immediately move the card in the cache
      await utils.jobCards.list.cancel();
      const previous = utils.jobCards.list.getData({});
      utils.jobCards.list.setData({}, (old) =>
        old ? old.map((j) => (j.id === id ? { ...j, stage: stage! } : j)) : old
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      // Revert to previous state on failure
      if (context?.previous) {
        utils.jobCards.list.setData({}, context.previous);
      }
      toast.error("Couldn't move card. Try again.");
    },
    onSettled: () => {
      utils.jobCards.list.invalidate();
    },
  });

  const handleDragStart = (event: DragStartEvent) => {
    setActiveJobId(event.active.id as number);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveJobId(null);
    const { active, over } = event;
    if (!over) return;
    const jobId = active.id as number;
    const newStage = over.id as string;
    const job = jobs?.find((j) => j.id === jobId);
    if (!job || job.stage === newStage) return;
    updateStage.mutate({ id: jobId, stage: newStage as any });
  };

  const activeJob = activeJobId ? jobs?.find((j) => j.id === activeJobId) : null;

  const filteredJobs = useMemo(() => {
    if (!jobs) return [];
    let filtered = jobs.filter((job) => {
      if (filterStage === "all" && job.stage === "archived") return false;
      if (filterStage !== "all" && job.stage !== filterStage) return false;
      if (filterPriority !== "all" && job.priority !== filterPriority) return false;
      if (filterSeason !== "all" && job.season !== filterSeason) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          job.title.toLowerCase().includes(q) ||
          (job.company ?? "").toLowerCase().includes(q)
        );
      }
      return true;
    });
    if (sortBy === "newest") {
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortBy === "oldest") {
      filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }
    return filtered;
  }, [jobs, filterStage, filterPriority, filterSeason, search, sortBy]);

  // Prune selectedIds when filteredJobs changes to avoid phantom selections
  useEffect(() => {
    if (selectedIds.size === 0) return;
    const visibleIdSet = new Set(filteredJobs.map((j) => j.id));
    const pruned = new Set(Array.from(selectedIds).filter((id) => visibleIdSet.has(id)));
    if (pruned.size !== selectedIds.size) {
      setSelectedIds(pruned);
    }
  }, [filteredJobs]);

  const jobsByStage = useMemo(() => {
    const map: Record<string, typeof filteredJobs> = {};
    for (const stage of STAGES) map[stage] = [];
    for (const job of filteredJobs) {
      if (map[job.stage]) map[job.stage].push(job);
    }
    return map;
  }, [filteredJobs]);

  // Phase 10E: Retry failed jobs handler
  const handleRetryFailed = (failedIds: number[], resumeId: number) => {
    setIsRetryingFailed(true);
    runAI(() =>
      batchSprint.mutate(
        { jobCardIds: failedIds, resumeId },
        {
          onSuccess: (data) => {
            // Merge retry results into existing results
            setSprintResults((prev) => {
              const updated = [...prev];
              for (const newResult of data.results) {
                const idx = updated.findIndex((r) => r.jobCardId === newResult.jobCardId);
                if (idx !== -1) {
                  updated[idx] = newResult as BatchSprintResult;
                } else {
                  updated.push(newResult as BatchSprintResult);
                }
              }
              return updated;
            });
            setIsRetryingFailed(false);
          },
          onError: () => {
            setIsRetryingFailed(false);
          },
        }
      )
    );
  };

  return (
    <div className="space-y-4">
      {/* Profile completeness nudge — shown only when work_status is unknown */}
      {showNudge && <ProfileNudgeBanner onDismiss={handleDismissNudge} />}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Job Cards</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {jobs?.length ?? 0} total jobs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border rounded-lg overflow-hidden">
            <Button
              variant={view === "list" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setView("list")}
              className="rounded-none"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={view === "kanban" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setView("kanban")}
              className="rounded-none"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
          <CreateJobDialog
            open={showCreate}
            onOpenChange={setShowCreate}
            onCreated={() => {
              utils.jobCards.list.invalidate();
              setShowCreate(false);
            }}
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search jobs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterStage} onValueChange={setFilterStage}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Stage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            {STAGES.filter((s) => s !== "archived").map((s) => (
              <SelectItem key={s} value={s}>
                {STAGE_LABELS[s]}
              </SelectItem>
            ))}
            <SelectSeparator />
            <SelectItem value="archived">
              {STAGE_LABELS["archived"]}
            </SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterSeason} onValueChange={setFilterSeason}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Season" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Seasons</SelectItem>
            <SelectItem value="fall">Fall</SelectItem>
            <SelectItem value="winter">Winter</SelectItem>
            <SelectItem value="summer">Summer</SelectItem>
            <SelectItem value="year_round">Year Round</SelectItem>
          </SelectContent>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="oldest">Oldest first</SelectItem>
          </SelectContent>
        </Select>
        </Select>
      </div>

      {/* Bulk action bar */}
      {view === "list" && selectedIds.size > 0 && (
        <div className="sticky top-0 z-10 bg-blue-50 dark:bg-blue-950/30 border border-blue-300 dark:border-blue-700 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">{selectedIds.size} selected</span>
            </div>
            <div className="flex items-center gap-2">
              {/* Phase 10D: Batch Sprint button */}
              {selectedIds.size <= 10 && (
                <Button
                  data-testid="batch-sprint-btn"
                  size="sm"
                  variant="outline"
                  className="gap-1.5 border-violet-300 text-violet-700 hover:bg-violet-50"
                  disabled={batchSprint.isPending || isBusy || bulkArchiveProgress !== null}
                  onClick={() => {
                    if (isQueued) {
                      toast.info("Already queued — one Batch Sprint is waiting to run.");
                      return;
                    }
                    if (!resumes || resumes.length === 0) {
                      toast.error("Upload a resume first before running Batch Sprint.");
                      return;
                    }
                    const resumeId = batchSprintResumeId ?? resumes[0]?.id;
                    if (!resumeId) return;
                    const ids = Array.from(selectedIds);
                    setSprintResumeIdForRetry(resumeId); // Phase 10E: store for retry
                    runAI(() => batchSprint.mutate({ jobCardIds: ids, resumeId }));
                  }}
                >
                  {batchSprint.isPending ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Running…</>
                  ) : (
                    <><Zap className="h-3.5 w-3.5" /> Batch Sprint (5 credits)</>
                  )}
                </Button>
              )}
              {selectedIds.size > 10 && (
                <span className="text-xs text-amber-600">Select up to 10 for Batch Sprint</span>
              )}
              <Button
                size="sm"
                onClick={() => {
                  if (selectedIds.size > 100) {
                    setBulkArchiveLargeConfirmOpen(true);
                  } else {
                    setBulkArchiveConfirmOpen(true);
                  }
                }}
                disabled={bulkArchiveProgress !== null || Array.from(selectedIds).every(id => jobs?.find(j => j.id === id)?.stage === "archived")}
                title={Array.from(selectedIds).every(id => jobs?.find(j => j.id === id)?.stage === "archived") ? "All selected cards are already archived" : ""}
              >
                {bulkArchiveProgress ? `Archiving ${bulkArchiveProgress.current}/${bulkArchiveProgress.total}...` : "Archive selected"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedIds(new Set())}
                disabled={bulkArchiveProgress !== null}
              >
                Clear
              </Button>
            </div>
          </div>
          {/* Phase 10D: Queue waiting banner — same pattern as EvidenceTab */}
          {isQueued && (
            <div
              data-testid="batch-sprint-queue-waiting"
              className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
            >
              <Loader2 className="h-4 w-4 animate-spin shrink-0 text-amber-600" />
              <span className="flex-1">Waiting for previous AI action to finish…</span>
              <Button
                data-testid="batch-sprint-queue-cancel-btn"
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-amber-700 hover:bg-amber-100"
                onClick={cancelQueued}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      )}

      {/* List View */}
      {view === "list" && (
        <div className="space-y-2">
          {/* Header checkbox row */}
          {!isLoading && filteredJobs.length > 0 && (() => {
            const visibleIds = filteredJobs.map((j) => j.id);
            const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
            const someVisibleSelected = visibleIds.some((id) => selectedIds.has(id)) && !allVisibleSelected;
            return (
              <div className="flex items-center gap-4 px-4 py-2 text-sm font-medium text-muted-foreground">
                <input
                  type="checkbox"
                  ref={(el) => {
                    if (el) el.indeterminate = someVisibleSelected;
                  }}
                  checked={allVisibleSelected}
                  onChange={() => {
                    if (allVisibleSelected) {
                      // Deselect all visible
                      const newSelected = new Set(selectedIds);
                      visibleIds.forEach((id) => newSelected.delete(id));
                      setSelectedIds(newSelected);
                    } else {
                      // Select all visible
                      const newSelected = new Set(selectedIds);
                      visibleIds.forEach((id) => newSelected.add(id));
                      setSelectedIds(newSelected);
                    }
                  }}
                  className="cursor-pointer shrink-0"
                />
                <span>Select all {filteredJobs.length}</span>
              </div>
            );
          })()}
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
            ))
          ) : filteredJobs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Briefcase className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                <p className="font-medium">No job cards yet</p>
                <p className="text-sm mt-1">
                  Create your first job card to start tracking.
                </p>
                <Button
                  size="sm"
                  className="mt-4"
                  onClick={() => setShowCreate(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Job
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredJobs.map((job) => {
              const isSelected = selectedIds.has(job.id);
              return (
              <div
                key={job.id}
                className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${isSelected ? "bg-blue-50 border-blue-300 dark:bg-blue-950/30 dark:border-blue-700" : "bg-card hover:bg-accent/30 cursor-pointer"}`}
                onClick={(e) => { if (!(e.target as HTMLElement).closest('[data-bulk-select]') && !isSelected) setLocation(`/jobs/${job.id}`); }}
              >
                <div
                  data-bulk-select
                  className="flex items-center"
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => { e.stopPropagation(); const newSelected = new Set(selectedIds); if (e.target.checked) { newSelected.add(job.id); } else { newSelected.delete(job.id); } setSelectedIds(newSelected); }}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="cursor-pointer shrink-0"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{job.title}</p>
                    {job.priority === "high" && (
                      <Badge variant="destructive" className="text-xs">High</Badge>
                    )}
                    {job.priority === "medium" && (
                      <Badge variant="secondary" className="text-xs">Medium</Badge>
                    )}
                    {job.priority === "low" && (
                      <Badge variant="outline" className="text-xs text-muted-foreground">Low</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    {job.company && (
                      <span className="flex items-center gap-1">
                        <Briefcase className="h-3 w-3" />
                        {job.company}
                      </span>
                    )}
                    {job.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {job.location}
                      </span>
                    )}
                    {job.dueDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(job.dueDate).toLocaleDateString()}
                      </span>
                    )}
                    {job.createdAt && (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Created: {new Date(job.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {(() => {
                    const ep = getEligibilityBadgeProps((job as any).eligibilityPrecheckStatus);
                    return ep ? (
                      <Badge
                        className={`text-xs border ${ep.className} cursor-pointer`}
                        title={ep.title}
                        onClick={(e) => {
                          e.stopPropagation();
                          setLocation(`/jobs/${job.id}`);
                        }}
                      >
                        <ShieldAlert className="h-3 w-3 mr-1" />
                        {ep.label}
                      </Badge>
                    ) : null;
                  })()}
                  {(() => {
                    const fp = getFollowupBadgeProps((job as any).nextFollowupDueAt);
                    return fp ? (
                      <Badge className={`text-xs border ${fp.className}`}>
                        <Bell className="h-3 w-3 mr-1" />
                        {fp.label}
                      </Badge>
                    ) : null;
                  })()}
                  <Badge className={`${stageColors[job.stage] ?? ""}`}>
                    {STAGE_LABELS[job.stage as keyof typeof STAGE_LABELS] ?? job.stage}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                        aria-label="More actions"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                      {job.stage !== "archived" ? (
                        <DropdownMenuItem
                          onClick={(e) => { e.stopPropagation(); setArchiveConfirmId(job.id); }}
                          className="text-muted-foreground"
                        >
                          <Archive className="h-4 w-4 mr-2" />
                          Archive
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onClick={(e) => { e.stopPropagation(); archiveCard.mutate({ id: job.id, stage: "bookmarked" as any }); }}
                        >
                          <ArchiveRestore className="h-4 w-4 mr-2" />
                          Unarchive
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
            })
          )}
        </div>
      )}

      {/* Archive confirm dialog */}
      <AlertDialog open={archiveConfirmId !== null} onOpenChange={(open) => { if (!open) setArchiveConfirmId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this job card?</AlertDialogTitle>
            <AlertDialogDescription>
              The card will be moved to Archived. You can unarchive it at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (archiveConfirmId !== null) {
                  archiveCard.mutate({ id: archiveConfirmId, stage: "archived" as any });
                  setArchiveConfirmId(null);
                }
              }}
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk archive confirm dialog */}
      <AlertDialog open={bulkArchiveConfirmOpen} onOpenChange={setBulkArchiveConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive {selectedIds.size} job cards?</AlertDialogTitle>
            <AlertDialogDescription>
              You can unarchive them later from the Archived stage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkArchiveProgress !== null}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={bulkArchiveProgress !== null}
              onClick={async () => {
                const toArchive = Array.from(selectedIds).filter(id => {
                  const job = jobs?.find(j => j.id === id);
                  return job && job.stage !== "archived";
                });

                if (toArchive.length === 0) {
                  toast.success("No new cards to archive.");
                  setSelectedIds(new Set());
                  setBulkArchiveConfirmOpen(false);
                  return;
                }

                setBulkArchiveProgress({ current: 0, total: toArchive.length });
                let successCount = 0;
                const failedIds = new Set<number>();

                // Helper: archive a single item with a 15s timeout
                const archiveOne = (id: number): Promise<void> =>
                  new Promise<void>((resolve) => {
                    const timer = setTimeout(() => {
                      failedIds.add(id);
                      setBulkArchiveProgress((p) => p ? { ...p, current: p.current + 1 } : null);
                      resolve();
                    }, 15000);
                    archiveCard.mutate(
                      { id, stage: "archived" as any },
                      {
                        onSuccess: () => {
                          clearTimeout(timer);
                          successCount++;
                          setBulkArchiveProgress((p) => p ? { ...p, current: p.current + 1 } : null);
                          resolve();
                        },
                        onError: () => {
                          clearTimeout(timer);
                          failedIds.add(id);
                          setBulkArchiveProgress((p) => p ? { ...p, current: p.current + 1 } : null);
                          resolve();
                        },
                      }
                    );
                  });

                try {
                  // Archive in chunks of 15 with Promise.allSettled per chunk
                  const CHUNK_SIZE = 15;
                  for (let i = 0; i < toArchive.length; i += CHUNK_SIZE) {
                    const chunk = toArchive.slice(i, i + CHUNK_SIZE);
                    await Promise.allSettled(chunk.map(archiveOne));
                    // Small delay between chunks to avoid rate limits
                    if (i + CHUNK_SIZE < toArchive.length) {
                      await new Promise((r) => setTimeout(r, 200));
                    }
                  }

                  if (failedIds.size > 0) {
                    toast.error(`Archived ${successCount}/${toArchive.length}. Some failed.`);
                    setSelectedIds(failedIds);
                  } else {
                    toast.success(`Archived ${successCount}/${toArchive.length} job cards`);
                    setSelectedIds(new Set());
                  }
                } catch (err) {
                  toast.error("An unexpected error occurred during archiving.");
                } finally {
                  setBulkArchiveProgress(null);
                  setBulkArchiveConfirmOpen(false);
                }
              }}
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Bulk archive LARGE confirm dialog (>100 selections) */}
      <AlertDialog open={bulkArchiveLargeConfirmOpen} onOpenChange={setBulkArchiveLargeConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive {selectedIds.size} jobs?</AlertDialogTitle>
            <AlertDialogDescription>
              This will archive {selectedIds.size} job cards. You can't undo this from the list view.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkArchiveProgress !== null}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={bulkArchiveProgress !== null}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                const toArchive = Array.from(selectedIds).filter(id => {
                  const job = jobs?.find(j => j.id === id);
                  return job && job.stage !== "archived";
                });
                if (toArchive.length === 0) {
                  toast.success("No new cards to archive.");
                  setSelectedIds(new Set());
                  setBulkArchiveLargeConfirmOpen(false);
                  return;
                }
                setBulkArchiveProgress({ current: 0, total: toArchive.length });
                let successCount = 0;
                const failedIds = new Set<number>();
                const archiveOne = (id: number): Promise<void> =>
                  new Promise<void>((resolve) => {
                    const timer = setTimeout(() => {
                      failedIds.add(id);
                      setBulkArchiveProgress((p) => p ? { ...p, current: p.current + 1 } : null);
                      resolve();
                    }, 15000);
                    archiveCard.mutate(
                      { id, stage: "archived" as any },
                      {
                        onSuccess: () => {
                          clearTimeout(timer);
                          successCount++;
                          setBulkArchiveProgress((p) => p ? { ...p, current: p.current + 1 } : null);
                          resolve();
                        },
                        onError: () => {
                          clearTimeout(timer);
                          failedIds.add(id);
                          setBulkArchiveProgress((p) => p ? { ...p, current: p.current + 1 } : null);
                          resolve();
                        },
                      }
                    );
                  });
                try {
                  const CHUNK_SIZE = 15;
                  for (let i = 0; i < toArchive.length; i += CHUNK_SIZE) {
                    const chunk = toArchive.slice(i, i + CHUNK_SIZE);
                    await Promise.allSettled(chunk.map(archiveOne));
                    if (i + CHUNK_SIZE < toArchive.length) {
                      await new Promise((r) => setTimeout(r, 200));
                    }
                  }
                  if (failedIds.size > 0) {
                    toast.error(`Archived ${successCount}/${toArchive.length}. Some failed.`);
                    setSelectedIds(failedIds);
                  } else {
                    toast.success(`Archived ${successCount}/${toArchive.length} job cards`);
                    setSelectedIds(new Set());
                  }
                } catch (err) {
                  toast.error("An unexpected error occurred during archiving.");
                } finally {
                  setBulkArchiveProgress(null);
                  setBulkArchiveLargeConfirmOpen(false);
                }
              }}
            >
              Confirm Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Kanban View */}
      {view === "kanban" && (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <ScrollArea className="w-full">
            <div className="flex gap-4 pb-4" style={{ minWidth: `${STAGES.length * 280}px` }}>
              {STAGES.map((stage) => (
                <KanbanColumn
                  key={stage}
                  stage={stage}
                  jobs={jobsByStage[stage] ?? []}
                  onCardClick={(id) => setLocation(`/jobs/${id}`)}
                  onArchive={(id) => setArchiveConfirmId(id)}
                  onUnarchive={(id) => archiveCard.mutate({ id, stage: "bookmarked" as any })}
                />
              ))}
            </div>
          </ScrollArea>
          {/* Ghost card shown while dragging */}
          <DragOverlay dropAnimation={null}>
            {activeJob ? (
              <div className="p-3 rounded-lg border bg-card shadow-xl opacity-90 w-[260px] rotate-1">
                <p className="text-sm font-medium truncate">{activeJob.title}</p>
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {activeJob.company ?? "—"}
                </p>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Phase 10E: Batch Sprint Results Drawer */}
      <BatchSprintResultsDrawer
        open={sprintResultsOpen}
        onClose={() => setSprintResultsOpen(false)}
        results={sprintResults}
        onRetryFailed={handleRetryFailed}
        resumeId={sprintResumeIdForRetry}
        isRetrying={isRetryingFailed}
      />
    </div>
  );
}
// ─── KanbanColumnn ──────────────────────────────────────────────────────────
function KanbanColumn({
  stage,
  jobs,
  onCardClick,
  onArchive,
  onUnarchive,
}: {
  stage: string;
  jobs: Array<{ id: number; title: string; company?: string | null; priority?: string | null; nextFollowupDueAt?: Date | null; eligibilityPrecheckStatus?: string | null }>;
  onCardClick: (id: number) => void;
  onArchive: (id: number) => void;
  onUnarchive: (id: number) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  return (
    <div className="w-[260px] shrink-0">
      <div
        className={`rounded-t-lg border-t-4 bg-card border border-t-0 p-3 ${
          kanbanHeaderColors[stage as keyof typeof kanbanHeaderColors] ?? ""
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">{STAGE_LABELS[stage as keyof typeof STAGE_LABELS] ?? stage}</span>
          <Badge variant="secondary" className="text-xs">
            {jobs.length}
          </Badge>
        </div>
      </div>
      <div
        ref={setNodeRef}
        className={`space-y-2 mt-2 min-h-[100px] rounded-b-lg transition-colors ${
          isOver ? "bg-primary/5 ring-2 ring-primary/30 ring-inset" : ""
        }`}
      >
        {jobs.map((job) => (
          <KanbanCard
            key={job.id}
            job={job}
            jobStage={stage}
            onCardClick={onCardClick}
            onArchive={onArchive}
            onUnarchive={onUnarchive}
          />
        ))}
      </div>
    </div>
  );
}

// ─── KanbanCard ─────────────────────────────────────────────────────────────
function KanbanCard({
  job,
  jobStage,
  onCardClick,
  onArchive,
  onUnarchive,
}: {
  job: { id: number; title: string; company?: string | null; priority?: string | null; nextFollowupDueAt?: Date | null; eligibilityPrecheckStatus?: string | null };
  jobStage: string;
  onCardClick: (id: number) => void;
  onArchive: (id: number) => void;
  onUnarchive: (id: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: job.id,
  });
  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`p-3 rounded-lg border bg-card hover:shadow-sm transition-shadow cursor-grab active:cursor-grabbing select-none ${
        isDragging ? "opacity-40" : ""
      }`}
      onClick={() => onCardClick(job.id)}
    >
      <div className="flex items-start justify-between gap-1">
        <p className="text-sm font-medium truncate flex-1">{job.title}</p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 shrink-0 -mt-0.5 -mr-1"
              onClick={(e) => e.stopPropagation()}
              aria-label="More actions"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            {jobStage !== "archived" ? (
              <DropdownMenuItem
                onClick={(e) => { e.stopPropagation(); onArchive(job.id); }}
                className="text-muted-foreground"
              >
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onClick={(e) => { e.stopPropagation(); onUnarchive(job.id); }}
              >
                <ArchiveRestore className="h-4 w-4 mr-2" />
                Unarchive
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <p className="text-xs text-muted-foreground mt-1 truncate">
        {job.company ?? "—"}
      </p>
      {job.priority === "high" && (
        <Badge variant="destructive" className="text-xs mt-2">High</Badge>
      )}
      {job.priority === "medium" && (
        <Badge variant="secondary" className="text-xs mt-2">Medium</Badge>
      )}
      {job.priority === "low" && (
        <Badge variant="outline" className="text-xs mt-2 text-muted-foreground">Low</Badge>
      )}
      {(() => {
        const ep = getEligibilityBadgeProps(job.eligibilityPrecheckStatus);
        return ep ? (
          <div
            className={`flex items-center gap-1 text-xs mt-2 px-2 py-0.5 rounded-full border w-fit cursor-pointer ${ep.className}`}
            title={ep.title}
            onClick={(e) => { e.stopPropagation(); onCardClick(job.id); }}
          >
            <ShieldAlert className="h-3 w-3" />
            <span>{ep.label}</span>
          </div>
        ) : null;
      })()}
      {(() => {
        const fp = getFollowupBadgeProps(job.nextFollowupDueAt);
        return fp ? (
          <div
            className={`flex items-center gap-1 text-xs mt-2 px-2 py-0.5 rounded-full border w-fit ${
              fp.className
            }`}
          >
            <Bell className="h-3 w-3" />
            <span>{fp.label}</span>
          </div>
        ) : null;
      })()}
    </div>
  );
}

function CreateJobDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");
  const [url, setUrl] = useState("");
  const [jdText, setJdText] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [season, setSeason] = useState<string>("");
  // Phase 9A: URL fetch state
  const [fetchJdError, setFetchJdError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  // Browser Capture fallback
  const [showBrowserCaptureFallback, setShowBrowserCaptureFallback] = useState(false);
  // Proactive blocked-host detection
  const [isBlockedHost, setIsBlockedHost] = useState(false);

  // Listen for postMessage from /capture tab
  useEffect(() => {
    function handleCaptureMessage(e: MessageEvent) {
      if (e.data?.type === "BROWSER_CAPTURE_RESULT" && typeof e.data.text === "string") {
        const text = e.data.text;
        setJdText(text);
        setFetchJdError(null);
        setShowBrowserCaptureFallback(false);
        toast.success("JD captured from browser! Review and click Create Job Card.");
      }
    }
    window.addEventListener("message", handleCaptureMessage);
    return () => window.removeEventListener("message", handleCaptureMessage);
  }, []);
  // Phase 9B: auto-fill state
  const [autoFilling, setAutoFilling] = useState(false);
  const [autoFilled, setAutoFilled] = useState(false);
  const isValidHttpsUrl = (u: string) => {
    try { const p = new URL(u); return p.protocol === "https:"; } catch { return false; }
  };
  const extractFields = trpc.jdSnapshots.extractFields.useMutation();
  const fetchFromUrl = trpc.jdSnapshots.fetchFromUrl.useMutation({
    onSuccess: async (data) => {
      setJdText(data.text);
      setFetchedAt(new Date(data.fetchedAt).toLocaleTimeString());
      setFetchJdError(null);
      toast.success("JD text fetched! Review and click Create Job Card.");
      // Phase 9B: async auto-fill (non-destructive — only fills empty fields)
      setAutoFilling(true);
      setAutoFilled(false);
      try {
        let hostname = "";
        try { hostname = new URL(url).hostname; } catch {}
        const fields = await extractFields.mutateAsync({ text: data.text, urlHostname: hostname });
        let filled = false;
        // Read current values via closure — only fill if still empty
        setTitle((prev) => { if (!prev.trim() && fields.job_title) { filled = true; return fields.job_title; } return prev; });
        setCompany((prev) => { if (!prev.trim() && fields.company_name) { filled = true; return fields.company_name; } return prev; });
        setLocation((prev) => { if (!prev.trim() && fields.location) { filled = true; return fields.location; } return prev; });
        if (filled) setAutoFilled(true);
      } catch {
        // silently ignore extraction failures
      } finally {
        setAutoFilling(false);
      }
    },
    onError: (err) => {
      setFetchJdError(err.message);
      setShowBrowserCaptureFallback(true);
    },
  });
  const createJob = trpc.jobCards.create.useMutation({
    onSuccess: () => {
      toast.success("Job card created!");
      setTitle("");
      setCompany("");
      setLocation("");
      setUrl("");
      setJdText("");
      setPriority("medium");
      setSeason("");
      onCreated();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Job title is required");
      return;
    }
    createJob.mutate({
      title,
      company: company || undefined,
      location: location || undefined,
      url: url || undefined,
      jdText: jdText || undefined,
      priority,
      season: season ? (season as any) : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1.5" />
          Add Job
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Job Card</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="title">Job Title *</Label>
              {autoFilling && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Auto-filling…
                </span>
              )}
              {!autoFilling && autoFilled && (
                <span className="text-xs text-emerald-600">Auto-filled from JD (edit anytime).</span>
              )}
            </div>
            <Input
              id="title"
              placeholder="e.g., Software Developer Intern"
              value={title}
              maxLength={MAX_LENGTHS.JOB_TITLE}
              onChange={(e) => { setTitle(e.target.value); setAutoFilled(false); }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="url">Job URL</Label>
            <div className="flex gap-2">
              <Input
                id="url"
                placeholder="https://..."
                value={url}
                onChange={(e) => {
                  const val = e.target.value;
                  setUrl(val);
                  setFetchJdError(null);
                  setFetchedAt(null);
                  setIsBlockedHost(isLikelyBlockedHost(val));
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && isValidHttpsUrl(url)) {
                    e.preventDefault();
                    if (isBlockedHost) return;
                    fetchFromUrl.mutate({ url });
                  }
                }}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!isValidHttpsUrl(url) || fetchFromUrl.isPending || isBlockedHost}
                onClick={() => fetchFromUrl.mutate({ url: normalizeJobUrl(url) })}
                className="shrink-0"
                title={isBlockedHost ? "This host blocks server fetch — use Browser Capture instead" : undefined}
              >
                {fetchFromUrl.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Fetch JD"
                )}
              </Button>
            </div>
            {/* Proactive blocked-host hint — shown before any fetch attempt */}
            {isBlockedHost && url && !fetchJdError && (
              <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 px-3 py-2 space-y-1.5">
                <p className="text-xs font-medium text-amber-800 dark:text-amber-300">This site usually blocks automated fetch</p>
                <p className="text-xs text-amber-700 dark:text-amber-400">Use Browser Capture to import the job description reliably.</p>
                <Button
                  type="button"
                  size="sm"
                  className="h-7 text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
                  onClick={() => {
                    const captureUrl = `/capture?url=${encodeURIComponent(normalizeJobUrl(url))}&origin=${encodeURIComponent(window.location.origin)}`;
                    window.open(captureUrl, "_blank");
                  }}
                >
                  <MonitorSmartphone className="h-3.5 w-3.5" />
                  Browser Capture
                </Button>
              </div>
            )}
            {fetchJdError && (
              <div className="space-y-1">
                <p className="text-xs text-destructive">{fetchJdError}</p>
                {showBrowserCaptureFallback && url && (
                  <div className="flex flex-col gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-fit text-xs h-7 gap-1.5"
                      onClick={() => {
                        const captureUrl = `/capture?url=${encodeURIComponent(normalizeJobUrl(url))}&origin=${encodeURIComponent(window.location.origin)}`;
                        window.open(captureUrl, "_blank");
                      }}
                    >
                      <MonitorSmartphone className="h-3.5 w-3.5" />
                      Try Browser Capture
                    </Button>
                    <p className="text-xs text-muted-foreground">Some sites block server fetch. Browser Capture uses your open tab to extract the JD.</p>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                placeholder="e.g., Shopify"
                value={company}
                maxLength={MAX_LENGTHS.COMPANY}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="e.g., Toronto, ON"
                value={location}
                maxLength={MAX_LENGTHS.LOCATION}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Season</Label>
              <Select value={season} onValueChange={setSeason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fall">Fall</SelectItem>
                  <SelectItem value="winter">Winter</SelectItem>
                  <SelectItem value="summer">Summer</SelectItem>
                  <SelectItem value="year_round">Year Round</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="jdText">
              Job Description (paste JD text)
            </Label>
            <Textarea
              id="jdText"
              placeholder="Paste the full job description here, or use Fetch JD above to auto-fill..."
              value={jdText}
              maxLength={MAX_LENGTHS.JD_TEXT}
              onChange={(e) => setJdText(e.target.value)}
              className="min-h-[120px] text-sm"
            />
            {fetchedAt ? (
              <p className="text-xs text-emerald-600">
                Fetched at {fetchedAt} — review and click Create Job Card.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                This will be saved as an immutable JD Snapshot.
              </p>
            )}
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={createJob.isPending}
          >
            {createJob.isPending ? "Creating..." : "Create Job Card"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
