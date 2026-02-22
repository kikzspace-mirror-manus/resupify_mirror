import { useAuth } from "@/_core/hooks/useAuth";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Users, FlaskConical, Receipt, Package, Activity, TestTube2,
  ChevronLeft, Shield, ScrollText, Zap, CreditCard
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const adminNavItems = [
  { path: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { path: "/admin/users", label: "Users", icon: Users },
  { path: "/admin/runs", label: "Runs & QA", icon: FlaskConical },
  { path: "/admin/ledger", label: "Ledger", icon: Receipt },
  { path: "/admin/packs", label: "Packs", icon: Package },
  { path: "/admin/health", label: "Health", icon: Activity },
  { path: "/admin/sandbox", label: "Sandbox", icon: TestTube2 },
  { path: "/admin/audit", label: "Audit Log", icon: ScrollText },
  { path: "/admin/operational-events", label: "Ops Events", icon: Zap },
  { path: "/admin/stripe-events", label: "Stripe Events", icon: CreditCard },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [location] = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Shield className="h-12 w-12 text-destructive mx-auto" />
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">You do not have admin privileges.</p>
          <Link href="/dashboard">
            <Button variant="outline">
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card flex flex-col shrink-0">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-orange-500" />
            <span className="font-bold text-lg">Admin Panel</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{user.email}</p>
        </div>

        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {adminNavItems.map((item) => {
            const isActive = location === item.path ||
              (item.path !== "/admin" && location.startsWith(item.path));
            return (
              <Link key={item.path} href={item.path}>
                <button
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                    isActive
                      ? "bg-orange-50 text-orange-700 font-medium"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </button>
              </Link>
            );
          })}
        </nav>

        <Separator />
        <div className="p-3">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground">
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back to App
            </Button>
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
