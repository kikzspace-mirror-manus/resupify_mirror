import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
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
      <Route path="/" component={Home} />
      <Route path="/onboarding" component={Onboarding} />
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
