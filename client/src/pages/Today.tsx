import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  CalendarCheck,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Send,
  MailCheck,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const taskTypeColors: Record<string, string> = {
  follow_up: "bg-amber-100 text-amber-700",
  apply: "bg-blue-100 text-blue-700",
  interview_prep: "bg-purple-100 text-purple-700",
  outreach: "bg-cyan-100 text-cyan-700",
  review_evidence: "bg-emerald-100 text-emerald-700",
  custom: "bg-gray-100 text-gray-700",
};

export default function Today() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const { data: todayTasks, isLoading } = trpc.tasks.today.useQuery();
  const { data: allTasks } = trpc.tasks.list.useQuery({ completed: false });
  const updateTask = trpc.tasks.update.useMutation({
    onSuccess: () => {
      utils.tasks.today.invalidate();
      utils.tasks.list.invalidate();
    },
  });
  const markSent = trpc.tasks.markSent.useMutation({
    onSuccess: () => {
      utils.tasks.today.invalidate();
      utils.tasks.list.invalidate();
      utils.jobCards.list.invalidate();
      toast.success("Follow-up marked as sent!");
    },
    onError: (err) => toast.error(err.message),
  });
  const createTask = trpc.tasks.create.useMutation({
    onSuccess: () => {
      utils.tasks.today.invalidate();
      utils.tasks.list.invalidate();
      setNewTaskTitle("");
      toast.success("Task created");
    },
  });

  const [newTaskTitle, setNewTaskTitle] = useState("");

  const handleToggle = (taskId: number, completed: boolean) => {
    updateTask.mutate({ id: taskId, completed });
    if (completed) toast.success("Task completed!");
  };

  const overdueTasks = (allTasks ?? []).filter((t) => {
    if (!t.dueDate || t.completed) return false;
    return new Date(t.dueDate) < new Date(new Date().toDateString());
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Today</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Tasks due today and follow-ups
        </p>
      </div>

      {/* Quick Add */}
      <Card>
        <CardContent className="pt-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newTaskTitle.trim()) return;
              createTask.mutate({ title: newTaskTitle });
            }}
            className="flex gap-3"
          >
            <Input
              placeholder="Add a quick task..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" size="sm" disabled={createTask.isPending}>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Overdue */}
      {overdueTasks.length > 0 && (
        <Card className="border-destructive/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Overdue ({overdueTasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {overdueTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onToggle={handleToggle}
                  onNavigate={setLocation}
                  onMarkSent={markSent.isPending ? undefined : (id) => markSent.mutate({ id })}
                  isOverdue
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today's Tasks */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <CalendarCheck className="h-4 w-4 text-primary" />
            Due Today ({todayTasks?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : todayTasks && todayTasks.length > 0 ? (
            <div className="space-y-2">
              {todayTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onToggle={handleToggle}
                  onNavigate={setLocation}
                  onMarkSent={markSent.isPending ? undefined : (id) => markSent.mutate({ id })}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="font-medium">All caught up!</p>
              <p className="text-sm mt-1">No tasks due today.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TaskItem({
  task,
  onToggle,
  onNavigate,
  onMarkSent,
  isOverdue,
}: {
  task: any;
  onToggle: (id: number, completed: boolean) => void;
  onNavigate: (path: string) => void;
  onMarkSent?: (id: number) => void;
  isOverdue?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
        isOverdue
          ? "bg-destructive/5 border-destructive/20"
          : "bg-card hover:bg-accent/50"
      }`}
    >
      <Checkbox
        checked={task.completed}
        onCheckedChange={(checked) => onToggle(task.id, !!checked)}
      />
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium truncate ${
            task.completed ? "line-through text-muted-foreground" : ""
          }`}
        >
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {task.dueDate && (
            <span
              className={`text-xs flex items-center gap-1 ${
                isOverdue ? "text-destructive" : "text-muted-foreground"
              }`}
            >
              <Clock className="h-3 w-3" />
              {new Date(task.dueDate).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge
          className={`text-xs ${
            taskTypeColors[task.taskType ?? "custom"] ?? taskTypeColors.custom
          }`}
        >
          {(task.taskType ?? "custom").replace("_", " ")}
        </Badge>
        {/* Mark as sent: only for incomplete follow_up tasks */}
        {task.taskType === "follow_up" && !task.completed && onMarkSent && (
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-7 px-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
            onClick={() => onMarkSent(task.id)}
          >
            <Send className="h-3 w-3 mr-1" />
            Mark as sent
          </Button>
        )}
        {task.jobCardId && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => onNavigate(`/jobs/${task.jobCardId}`)}
          >
            View Job
          </Button>
        )}
      </div>
    </div>
  );
}
