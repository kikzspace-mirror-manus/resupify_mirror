import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { FileText, Plus, Edit, Trash2, Clock, Eye } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Resumes() {
  const utils = trpc.useUtils();
  const { data: resumes, isLoading } = trpc.resumes.list.useQuery();
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewingId, setViewingId] = useState<number | null>(null);

  const deleteResume = trpc.resumes.delete.useMutation({
    onSuccess: () => {
      utils.resumes.list.invalidate();
      toast.success("Resume deleted");
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Resume Library</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your resumes and versions
          </p>
        </div>
        <CreateResumeDialog
          open={showCreate}
          onOpenChange={setShowCreate}
          onCreated={() => {
            utils.resumes.list.invalidate();
            setShowCreate(false);
          }}
        />
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : resumes && resumes.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-4">
          {resumes.map((resume) => (
            <Card key={resume.id} className="group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <CardTitle className="text-base">{resume.title}</CardTitle>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    v{resume.version}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                  {resume.content.substring(0, 200)}...
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(resume.updatedAt).toLocaleDateString()}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setViewingId(resume.id)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingId(resume.id)}
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm("Delete this resume?")) {
                          deleteResume.mutate({ id: resume.id });
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="font-medium">No resumes yet</p>
            <p className="text-sm mt-1">
              Add your first resume to start matching against job descriptions.
            </p>
            <Button
              size="sm"
              className="mt-4"
              onClick={() => setShowCreate(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Resume
            </Button>
          </CardContent>
        </Card>
      )}

      {/* View Dialog */}
      {viewingId && (
        <ViewResumeDialog
          resumeId={viewingId}
          open={!!viewingId}
          onOpenChange={(open) => !open && setViewingId(null)}
        />
      )}

      {/* Edit Dialog */}
      {editingId && (
        <EditResumeDialog
          resumeId={editingId}
          open={!!editingId}
          onOpenChange={(open) => !open && setEditingId(null)}
          onSaved={() => {
            utils.resumes.list.invalidate();
            setEditingId(null);
          }}
        />
      )}
    </div>
  );
}

function CreateResumeDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const createResume = trpc.resumes.create.useMutation({
    onSuccess: () => {
      toast.success("Resume created!");
      setTitle("");
      setContent("");
      onCreated();
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1.5" />
          Add Resume
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Resume</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!title.trim() || !content.trim()) {
              toast.error("Title and content are required");
              return;
            }
            createResume.mutate({ title, content });
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              placeholder="e.g., Software Engineer Resume"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Resume Content</Label>
            <Textarea
              placeholder="Paste your full resume text here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[250px] font-mono text-sm"
            />
          </div>
          <Button type="submit" className="w-full" disabled={createResume.isPending}>
            {createResume.isPending ? "Creating..." : "Create Resume"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ViewResumeDialog({
  resumeId,
  open,
  onOpenChange,
}: {
  resumeId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: resume } = trpc.resumes.get.useQuery({ id: resumeId });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{resume?.title ?? "Resume"}</DialogTitle>
        </DialogHeader>
        <pre className="text-sm whitespace-pre-wrap font-mono bg-muted/50 p-4 rounded-lg">
          {resume?.content ?? "Loading..."}
        </pre>
      </DialogContent>
    </Dialog>
  );
}

function EditResumeDialog({
  resumeId,
  open,
  onOpenChange,
  onSaved,
}: {
  resumeId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const { data: resume } = trpc.resumes.get.useQuery({ id: resumeId });
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [initialized, setInitialized] = useState(false);

  if (resume && !initialized) {
    setTitle(resume.title);
    setContent(resume.content);
    setInitialized(true);
  }

  const updateResume = trpc.resumes.update.useMutation({
    onSuccess: () => {
      toast.success("Resume updated!");
      onSaved();
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Resume</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Content</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[250px] font-mono text-sm"
            />
          </div>
          <Button
            className="w-full"
            onClick={() => updateResume.mutate({ id: resumeId, title, content })}
            disabled={updateResume.isPending}
          >
            {updateResume.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
