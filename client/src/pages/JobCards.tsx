import { trpc } from "@/lib/trpc";
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
  ExternalLink,
  Search,
  Bell,
} from "lucide-react";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { STAGES, STAGE_LABELS } from "../../../shared/regionPacks";

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
  const [showCreate, setShowCreate] = useState(false);

  const { data: jobs, isLoading } = trpc.jobCards.list.useQuery({});

  const filteredJobs = useMemo(() => {
    if (!jobs) return [];
    return jobs.filter((job) => {
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
  }, [jobs, filterStage, filterPriority, filterSeason, search]);

  const jobsByStage = useMemo(() => {
    const map: Record<string, typeof filteredJobs> = {};
    for (const stage of STAGES) map[stage] = [];
    for (const job of filteredJobs) {
      if (map[job.stage]) map[job.stage].push(job);
    }
    return map;
  }, [filteredJobs]);

  return (
    <div className="space-y-4">
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
            {STAGES.map((s) => (
              <SelectItem key={s} value={s}>
                {STAGE_LABELS[s]}
              </SelectItem>
            ))}
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
        </Select>
      </div>

      {/* List View */}
      {view === "list" && (
        <div className="space-y-2">
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
            filteredJobs.map((job) => (
              <div
                key={job.id}
                className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-accent/30 transition-colors cursor-pointer"
                onClick={() => setLocation(`/jobs/${job.id}`)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{job.title}</p>
                    {job.priority === "high" && (
                      <Badge variant="destructive" className="text-xs">
                        High
                      </Badge>
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
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
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
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Kanban View */}
      {view === "kanban" && (
        <ScrollArea className="w-full">
          <div className="flex gap-4 pb-4" style={{ minWidth: `${STAGES.length * 280}px` }}>
            {STAGES.map((stage) => (
              <div key={stage} className="w-[260px] shrink-0">
                <div
                  className={`rounded-t-lg border-t-4 bg-card border border-t-0 p-3 ${kanbanHeaderColors[stage]}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">
                      {STAGE_LABELS[stage]}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {jobsByStage[stage]?.length ?? 0}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2 mt-2 min-h-[100px]">
                  {(jobsByStage[stage] ?? []).map((job) => (
                    <div
                      key={job.id}
                      className="p-3 rounded-lg border bg-card hover:shadow-sm transition-shadow cursor-pointer"
                      onClick={() => setLocation(`/jobs/${job.id}`)}
                    >
                      <p className="text-sm font-medium truncate">
                        {job.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {job.company ?? "—"}
                      </p>
                      {job.priority === "high" && (
                        <Badge
                          variant="destructive"
                          className="text-xs mt-2"
                        >
                          High Priority
                        </Badge>
                      )}
                      {(() => {
                        const fp = getFollowupBadgeProps((job as any).nextFollowupDueAt);
                        return fp ? (
                          <div className={`flex items-center gap-1 text-xs mt-2 px-2 py-0.5 rounded-full border w-fit ${fp.className}`}>
                            <Bell className="h-3 w-3" />
                            <span>{fp.label}</span>
                          </div>
                        ) : null;
                      })()}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
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
            <Label htmlFor="title">Job Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Software Developer Intern"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                placeholder="e.g., Shopify"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="e.g., Toronto, ON"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="url">Job URL</Label>
            <Input
              id="url"
              placeholder="https://..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
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
              placeholder="Paste the full job description here to create a JD Snapshot..."
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              className="min-h-[120px] text-sm"
            />
            <p className="text-xs text-muted-foreground">
              This will be saved as an immutable JD Snapshot.
            </p>
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
