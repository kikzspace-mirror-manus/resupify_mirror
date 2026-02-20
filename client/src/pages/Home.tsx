import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import {
  Zap,
  Briefcase,
  FileSearch,
  BarChart3,
  Users,
  ArrowRight,
  CheckCircle2,
  Target,
  Sparkles,
} from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isAuthenticated && user) {
      setLocation("/dashboard");
    }
  }, [isAuthenticated, user, setLocation]);

  if (loading) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="h-4.5 w-4.5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">Resupify</span>
          </div>
          <Button
            onClick={() => (window.location.href = getLoginUrl())}
            size="sm"
          >
            Get Started
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-20 md:py-32">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Sparkles className="h-3.5 w-3.5" />
              Built for Canadian students & new grads
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight mb-6">
              Land more interviews with{" "}
              <span className="text-primary">evidence-based</span> job tracking
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              Resupify combines a powerful job search CRM with AI-powered ATS
              matching. Every suggestion is grounded in your actual resume — no
              guesswork.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                onClick={() => (window.location.href = getLoginUrl())}
                className="text-base px-8"
              >
                Start Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() =>
                  document
                    .getElementById("features")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="text-base px-8"
              >
                See Features
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              3 free Evidence+ATS scans included. No credit card required.
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-muted/30">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight mb-4">
              Everything you need to manage your job search
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              From tracking applications to optimizing your resume, Resupify
              keeps your entire job search organized.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                icon: Briefcase,
                title: "Job Card CRM",
                desc: "Kanban pipeline with stages from Bookmarked to Offered. Track every application with tasks and follow-ups.",
              },
              {
                icon: FileSearch,
                title: "Evidence-Based ATS Matching",
                desc: "AI analyzes your resume against each JD. Every suggestion is grounded with proof from your actual experience.",
              },
              {
                icon: Target,
                title: "Canada-First Tracks",
                desc: "Co-op and New Grad tracks with eligibility checks, season awareness, and region-specific templates.",
              },
              {
                icon: Users,
                title: "Outreach CRM",
                desc: "Manage contacts, track outreach threads, and generate recruiter emails and LinkedIn DMs.",
              },
              {
                icon: BarChart3,
                title: "Analytics Dashboard",
                desc: "Track applications per week, response rates, stage conversions, and follow-up completion.",
              },
              {
                icon: CheckCircle2,
                title: "Smart Automation",
                desc: "Auto-create follow-up tasks when you apply. Never miss a deadline with the Today page.",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="bg-card rounded-xl p-6 border shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-bold tracking-tight mb-4">
              Ready to level up your job search?
            </h2>
            <p className="text-muted-foreground mb-8">
              Join students and new grads across Canada who are landing more
              interviews with Resupify.
            </p>
            <Button
              size="lg"
              onClick={() => (window.location.href = getLoginUrl())}
              className="text-base px-8"
            >
              Get Started Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center">
              <Zap className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sm">Resupify</span>
          </div>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Resupify. Built for Canadian
            students.
          </p>
        </div>
      </footer>
    </div>
  );
}
