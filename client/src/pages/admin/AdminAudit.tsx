import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { ScrollText, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

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
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const toggleExpanded = (id: number) => {
    const newSet = new Set(expandedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedIds(newSet);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Audit Log</h1>
          <p className="text-muted-foreground">Complete history of admin actions</p>
        </div>

        {/* Phase 12R: Compact table layout */}
        {isLoading ? (
          <div className="border rounded-lg overflow-hidden">
            <div className="space-y-2 p-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-10 bg-muted rounded animate-pulse" />
              ))}
            </div>
          </div>
        ) : (!logs || logs.length === 0) ? (
          <div className="border rounded-lg text-center py-12 text-muted-foreground">
            <ScrollText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No admin actions logged yet</p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="w-[40px]" />
                  <TableHead className="w-[140px]">Action</TableHead>
                  <TableHead className="w-[160px]">Actor</TableHead>
                  <TableHead className="w-[160px]">Target</TableHead>
                  <TableHead className="w-[160px] text-right">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs?.map((log, idx) => (
                  <div key={log.id}>
                    <TableRow
                      className={`cursor-pointer ${idx % 2 === 0 ? "bg-white hover:bg-muted/30" : "bg-muted/5 hover:bg-muted/30"}`}
                      onClick={() => toggleExpanded(log.id)}
                    >
                      <TableCell className="text-center p-2">
                        {log.metadataJson ? (
                          expandedIds.has(log.id) ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )
                        ) : null}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        <Badge className={actionColors[log.action] ?? "bg-gray-100 text-gray-700"}>
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground truncate">
                        Admin #{log.adminUserId}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground truncate">
                        {log.targetUserId ? `User #${log.targetUserId}` : "—"}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString()}
                      </TableCell>
                    </TableRow>
                    {expandedIds.has(log.id) && log.metadataJson && (
                      <TableRow className={idx % 2 === 0 ? "bg-muted/10" : "bg-muted/15"}>
                        <TableCell colSpan={5} className="p-3">
                          <div className="bg-muted/30 rounded p-2 font-mono text-xs overflow-x-auto max-h-40 overflow-y-auto">
                            <pre className="whitespace-pre-wrap break-words">{log.metadataJson}</pre>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </div>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
