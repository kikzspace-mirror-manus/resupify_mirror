import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollText, User, ArrowRight } from "lucide-react";

const actionColors: Record<string, string> = {
  grant_credits: "bg-green-100 text-green-700",
  set_admin: "bg-orange-100 text-orange-700",
  set_disabled: "bg-red-100 text-red-700",
  admin_test_evidence_run: "bg-blue-100 text-blue-700",
  sandbox_create_sample_job: "bg-purple-100 text-purple-700",
  sandbox_create_sample_resume: "bg-purple-100 text-purple-700",
  sandbox_evidence_run: "bg-blue-100 text-blue-700",
  sandbox_outreach_pack: "bg-indigo-100 text-indigo-700",
};

export default function AdminAudit() {
  const { data: logs, isLoading } = trpc.admin.auditLogs.useQuery({ limit: 100 });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Audit Log</h1>
          <p className="text-muted-foreground">Complete history of admin actions</p>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="animate-pulse"><CardContent className="p-4"><div className="h-10 bg-muted rounded" /></CardContent></Card>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {logs?.map((log) => (
              <Card key={log.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ScrollText className="h-5 w-5 text-muted-foreground shrink-0" />
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={actionColors[log.action] ?? "bg-gray-100 text-gray-700"}>
                            {log.action}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <User className="h-3 w-3" />
                          Admin #{log.adminUserId}
                          {log.targetUserId && (
                            <>
                              <ArrowRight className="h-3 w-3" />
                              User #{log.targetUserId}
                            </>
                          )}
                        </p>
                        {log.metadataJson && (
                          <p className="text-xs text-muted-foreground mt-1 font-mono">
                            {log.metadataJson}
                          </p>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground shrink-0">
                      {new Date(log.createdAt).toLocaleString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
            {(!logs || logs.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                <ScrollText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No admin actions logged yet</p>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
