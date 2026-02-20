import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FlaskConical, Eye, ChevronRight, CheckCircle2, AlertCircle, XCircle } from "lucide-react";

const statusColors: Record<string, string> = {
  completed: "bg-green-100 text-green-700",
  running: "bg-blue-100 text-blue-700",
  pending: "bg-yellow-100 text-yellow-700",
  failed: "bg-red-100 text-red-700",
};

const matchColors: Record<string, { icon: typeof CheckCircle2; color: string }> = {
  matched: { icon: CheckCircle2, color: "text-green-600" },
  partial: { icon: AlertCircle, color: "text-yellow-600" },
  missing: { icon: XCircle, color: "text-red-600" },
};

export default function AdminRuns() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);

  const { data: runsData, isLoading } = trpc.admin.runs.list.useQuery({
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  const { data: runDetail } = trpc.admin.runs.detail.useQuery(
    { runId: selectedRunId! },
    { enabled: !!selectedRunId }
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Runs & Output QA</h1>
            <p className="text-muted-foreground">Browse Evidence+ATS runs, view details, re-run in test mode</p>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="running">Running</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <p className="text-sm text-muted-foreground">{runsData?.total ?? 0} runs found</p>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="animate-pulse"><CardContent className="p-4"><div className="h-12 bg-muted rounded" /></CardContent></Card>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {runsData?.runs.map((run) => (
              <Card
                key={run.id}
                className="cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => setSelectedRunId(run.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <FlaskConical className="h-5 w-5 text-orange-500 shrink-0" />
                      <div>
                        <p className="font-medium text-sm">Run #{run.id}</p>
                        <p className="text-xs text-muted-foreground">
                          User #{run.userId} · Job #{run.jobCardId} · {run.regionCode}/{run.trackCode}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {run.overallScore !== null && (
                        <span className={`text-lg font-bold ${
                          (run.overallScore ?? 0) >= 70 ? "text-green-600" : (run.overallScore ?? 0) >= 40 ? "text-yellow-600" : "text-red-600"
                        }`}>
                          {run.overallScore}
                        </span>
                      )}
                      <Badge className={statusColors[run.status ?? "pending"]}>
                        {run.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(run.createdAt).toLocaleString()}
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {runsData?.runs.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No runs found</p>
            )}
          </div>
        )}

        {/* Run Detail Dialog */}
        <Dialog open={!!selectedRunId && !!runDetail} onOpenChange={() => setSelectedRunId(null)}>
          <DialogContent className="max-w-4xl max-h-[85vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Run #{runDetail?.id} Detail
              </DialogTitle>
              <DialogDescription>
                Score: {runDetail?.overallScore ?? "—"} · Status: {runDetail?.status} · {runDetail?.regionCode}/{runDetail?.trackCode}
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[65vh]">
              <div className="space-y-4 pr-4">
                {/* User info */}
                {runDetail?.user && (
                  <div className="p-3 bg-muted/50 rounded-lg text-sm">
                    <p className="font-medium">User: {runDetail.user.name ?? "—"} ({runDetail.user.email})</p>
                  </div>
                )}

                {/* Summary */}
                {runDetail?.summary && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Summary</CardTitle></CardHeader>
                    <CardContent><p className="text-sm">{runDetail.summary}</p></CardContent>
                  </Card>
                )}

                {/* JD Snapshot */}
                {runDetail?.jdSnapshot && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">JD Snapshot (v{runDetail.jdSnapshot.version})</CardTitle></CardHeader>
                    <CardContent>
                      <pre className="text-xs whitespace-pre-wrap bg-muted p-3 rounded max-h-40 overflow-y-auto">
                        {runDetail.jdSnapshot.snapshotText}
                      </pre>
                    </CardContent>
                  </Card>
                )}

                {/* Resume */}
                {runDetail?.resume && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Resume: {runDetail.resume.title}</CardTitle></CardHeader>
                    <CardContent>
                      <pre className="text-xs whitespace-pre-wrap bg-muted p-3 rounded max-h-40 overflow-y-auto">
                        {runDetail.resume.content}
                      </pre>
                    </CardContent>
                  </Card>
                )}

                {/* Evidence Items */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Evidence Items ({runDetail?.items?.length ?? 0})</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {runDetail?.items?.map((item) => {
                      const match = matchColors[item.status] ?? matchColors.missing;
                      const MatchIcon = match.icon;
                      return (
                        <div key={item.id} className="border rounded-lg p-3 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2">
                              <MatchIcon className={`h-4 w-4 mt-0.5 shrink-0 ${match.color}`} />
                              <div>
                                <Badge variant="outline" className="text-xs mb-1">{item.groupType}</Badge>
                                <p className="text-sm font-medium">{item.jdRequirement}</p>
                              </div>
                            </div>
                            <Badge className={`shrink-0 ${
                              item.status === "matched" ? "bg-green-100 text-green-700" :
                              item.status === "partial" ? "bg-yellow-100 text-yellow-700" :
                              "bg-red-100 text-red-700"
                            }`}>
                              {item.status}
                            </Badge>
                          </div>
                          <div className="text-xs space-y-1 pl-6">
                            <p><span className="text-muted-foreground">Proof:</span> {item.resumeProof ?? <em className="text-red-500">None found</em>}</p>
                            <p><span className="text-muted-foreground">Fix:</span> {item.fix}</p>
                            {item.rewriteA && <p><span className="text-muted-foreground">Rewrite A:</span> {item.rewriteA}</p>}
                            {item.rewriteB && <p><span className="text-muted-foreground">Rewrite B:</span> {item.rewriteB}</p>}
                            <p><span className="text-muted-foreground">Why:</span> {item.whyItMatters}</p>
                            {item.needsConfirmation && <Badge variant="destructive" className="text-xs">Needs Confirmation</Badge>}
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
