import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Database, AlertTriangle, Clock, Server, MemoryStick } from "lucide-react";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatUptime(seconds: number) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function AdminHealth() {
  const { data: health, isLoading } = trpc.admin.health.overview.useQuery(undefined, {
    refetchInterval: 30000,
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">System Health</h1>
          <p className="text-muted-foreground">Server status, failed runs, and recent admin actions</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="animate-pulse"><CardContent className="p-6"><div className="h-20 bg-muted rounded" /></CardContent></Card>
            ))}
          </div>
        ) : (
          <>
            {/* Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <Database className={`h-8 w-8 ${health?.dbConnected ? "text-green-500" : "text-red-500"}`} />
                    <div>
                      <p className="text-sm text-muted-foreground">Database</p>
                      <Badge variant={health?.dbConnected ? "default" : "destructive"}>
                        {health?.dbConnected ? "Connected" : "Disconnected"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <Clock className="h-8 w-8 text-blue-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Server Uptime</p>
                      <p className="text-lg font-bold">{formatUptime(health?.serverUptime ?? 0)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <Server className="h-8 w-8 text-purple-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Node.js</p>
                      <p className="text-lg font-bold">{health?.nodeVersion}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Memory Usage */}
            {health?.memoryUsage && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MemoryStick className="h-5 w-5" />
                    Memory Usage
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground">RSS</p>
                      <p className="text-lg font-bold">{formatBytes(health.memoryUsage.rss)}</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground">Heap Used</p>
                      <p className="text-lg font-bold">{formatBytes(health.memoryUsage.heapUsed)}</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground">Heap Total</p>
                      <p className="text-lg font-bold">{formatBytes(health.memoryUsage.heapTotal)}</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground">External</p>
                      <p className="text-lg font-bold">{formatBytes(health.memoryUsage.external)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Failed Runs */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  Recent Failed Runs ({health?.failedRuns?.length ?? 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {health?.failedRuns && health.failedRuns.length > 0 ? (
                  <div className="space-y-2">
                    {health.failedRuns.map((run) => (
                      <div key={run.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="text-sm font-medium">Run #{run.id}</p>
                          <p className="text-xs text-muted-foreground">
                            User #{run.userId} · Job #{run.jobCardId} · {run.regionCode}/{run.trackCode}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant="destructive">Failed</Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(run.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No recent failures</p>
                )}
              </CardContent>
            </Card>

            {/* Recent Admin Actions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5 text-orange-500" />
                  Recent Admin Actions ({health?.recentActions?.length ?? 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {health?.recentActions && health.recentActions.length > 0 ? (
                  <div className="space-y-2">
                    {health.recentActions.map((action) => (
                      <div key={action.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="text-sm font-medium">{action.action}</p>
                          <p className="text-xs text-muted-foreground">
                            Admin #{action.adminUserId}
                            {action.targetUserId ? ` → User #${action.targetUserId}` : ""}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(action.createdAt).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No admin actions yet</p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
