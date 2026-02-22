import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import HowItWorks from "./pages/HowItWorks";
import Pricing from "./pages/Pricing";
import Trust from "./pages/Trust";
import FAQ from "./pages/FAQ";
import Contact from "./pages/Contact";
import DashboardLayout from "./components/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Today from "./pages/Today";
import JobCards from "./pages/JobCards";
import JobCardDetail from "./pages/JobCardDetail";
import Resumes from "./pages/Resumes";
import Outreach from "./pages/Outreach";
import Analytics from "./pages/Analytics";
import Billing from "./pages/Billing";
import Onboarding from "./pages/Onboarding";
import Profile from "./pages/Profile";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminRuns from "./pages/admin/AdminRuns";
import AdminLedger from "./pages/admin/AdminLedger";
import AdminPacks from "./pages/admin/AdminPacks";
import AdminHealth from "./pages/admin/AdminHealth";
import AdminSandbox from "./pages/admin/AdminSandbox";
import AdminAudit from "./pages/admin/AdminAudit";
import AdminOperationalEvents from "./pages/admin/AdminOperationalEvents";
import AdminStripeEvents from "./pages/admin/AdminStripeEvents";

function DashboardRoute({ component: Component }: { component: React.ComponentType }) {
  return (
    <DashboardLayout>
      <Component />
    </DashboardLayout>
  );
}

function Router() {
  return (
    <Switch>
      {/* Public marketing pages */}
      <Route path="/" component={Home} />
      <Route path="/how-it-works" component={HowItWorks} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/trust" component={Trust} />
      <Route path="/faq" component={FAQ} />
      <Route path="/contact" component={Contact} />

      {/* Onboarding */}
      <Route path="/onboarding" component={Onboarding} />

      {/* Protected app pages */}
      <Route path="/dashboard">
        <DashboardRoute component={Dashboard} />
      </Route>
      <Route path="/today">
        <DashboardRoute component={Today} />
      </Route>
      <Route path="/jobs">
        <DashboardRoute component={JobCards} />
      </Route>
      <Route path="/jobs/:id">
        {(params) => (
          <DashboardLayout>
            <JobCardDetail id={Number(params.id)} />
          </DashboardLayout>
        )}
      </Route>
      <Route path="/resumes">
        <DashboardRoute component={Resumes} />
      </Route>
      <Route path="/outreach">
        <DashboardRoute component={Outreach} />
      </Route>
      <Route path="/analytics">
        <DashboardRoute component={Analytics} />
      </Route>
      <Route path="/billing">
        <DashboardRoute component={Billing} />
      </Route>
      <Route path="/profile">
        <DashboardRoute component={Profile} />
      </Route>

      {/* Admin pages */}
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/users" component={AdminUsers} />
      <Route path="/admin/runs" component={AdminRuns} />
      <Route path="/admin/ledger" component={AdminLedger} />
      <Route path="/admin/packs" component={AdminPacks} />
      <Route path="/admin/health" component={AdminHealth} />
      <Route path="/admin/sandbox" component={AdminSandbox} />
      <Route path="/admin/audit" component={AdminAudit} />
      <Route path="/admin/operational-events" component={AdminOperationalEvents} />
      <Route path="/admin/stripe-events" component={AdminStripeEvents} />

      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
