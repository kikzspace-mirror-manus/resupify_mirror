import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Briefcase, FlaskConical, Coins, AlertTriangle, Activity, Cpu } from "lucide-react";
import { Link } from "wouter";

export default function AdminDashboard() {
  const { data: kpis, isLoading } = trpc.admin.kpis.useQuery();
  const { data: llmStatus } = trpc.admin.llmStatus.get.useQuery();

  const kpiCards = [
    { label: "Total Users", value: kpis?.totalUsers ?? 0, icon: Users, color: "text-blue-600", bg: "bg-blue-50", link: "/admin/users" },
    { label: "Active (7d)", value: kpis?.activeUsers7d ?? 0, icon: Activity, color: "text-green-600", bg: "bg-green-50", link: "/admin/users" },
    { label: "Total Job Cards", value: kpis?.totalJobCards ?? 0, icon: Briefcase, color: "text-purple-600", bg: "bg-purple-50", link: null },
    { label: "Evidence Runs", value: kpis?.totalEvidenceRuns ?? 0, icon: FlaskConical, color: "text-orange-600", bg: "bg-orange-50", link: "/admin/runs" },
    { label: "Credits Spent", value: kpis?.totalCreditsSpent ?? 0, icon: Coins, color: "text-yellow-600", bg: "bg-yellow-50", link: "/admin/ledger" },
    { label: "Error Rate", value: `${kpis?.errorRate ?? 0}%`, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50", link: "/admin/health" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">System overview and quick links</p>
          </div>
          {llmStatus && (
            <div className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md bg-muted text-muted-foreground border border-border" title="Active LLM provider and model">
              <Cpu className="h-3.5 w-3.5" />
              <span className="font-mono">{llmStatus.provider}</span>
              <span className="text-muted-foreground/50">/</span>
              <span className="font-mono">{llmStatus.openaiModel}</span>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6"><div className="h-16 bg-muted rounded" /></CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {kpiCards.map((kpi) => {
              const content = (
                <Card key={kpi.label} className={`${kpi.link ? "hover:shadow-md transition-shadow cursor-pointer" : ""}`}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">{kpi.label}</p>
                        <p className="text-3xl font-bold mt-1">{kpi.value}</p>
                      </div>
                      <div className={`p-3 rounded-lg ${kpi.bg}`}>
                        <kpi.icon className={`h-6 w-6 ${kpi.color}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
              return kpi.link ? (
                <Link key={kpi.label} href={kpi.link}>{content}</Link>
              ) : (
                <div key={kpi.label}>{content}</div>
              );
            })}
          </div>
        )}

        {/* Quick Links */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Link href="/admin/users">
                <button className="w-full p-4 rounded-lg border hover:bg-accent transition-colors text-left">
                  <Users className="h-5 w-5 text-blue-600 mb-2" />
                  <p className="font-medium text-sm">Manage Users</p>
                  <p className="text-xs text-muted-foreground">Search, grant credits</p>
                </button>
              </Link>
              <Link href="/admin/runs">
                <button className="w-full p-4 rounded-lg border hover:bg-accent transition-colors text-left">
                  <FlaskConical className="h-5 w-5 text-orange-600 mb-2" />
                  <p className="font-medium text-sm">QA Runs</p>
                  <p className="text-xs text-muted-foreground">Browse & re-run</p>
                </button>
              </Link>
              <Link href="/admin/ledger">
                <button className="w-full p-4 rounded-lg border hover:bg-accent transition-colors text-left">
                  <Coins className="h-5 w-5 text-yellow-600 mb-2" />
                  <p className="font-medium text-sm">Credit Ledger</p>
                  <p className="text-xs text-muted-foreground">View all transactions</p>
                </button>
              </Link>
              <Link href="/admin/sandbox">
                <button className="w-full p-4 rounded-lg border hover:bg-accent transition-colors text-left">
                  <FlaskConical className="h-5 w-5 text-purple-600 mb-2" />
                  <p className="font-medium text-sm">Test Sandbox</p>
                  <p className="text-xs text-muted-foreground">Run tests (no charge)</p>
                </button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
