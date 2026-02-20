import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import PublicNav from "@/components/PublicNav";
import PublicFooter from "@/components/PublicFooter";
import {
  ArrowRight,
  Briefcase,
  FileSearch,
  PenLine,
  ClipboardList,
  Zap,
  Shield,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import { useEffect } from "react";
import { useLocation, Link } from "wouter";

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
      <PublicNav />

      {/* ─── Hero ─────────────────────────────────────────────── */}
      <section className="py-20 md:py-32">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-[3.5rem] font-extrabold tracking-tight leading-[1.1] mb-6">
              Make your applications clearer, faster, and{" "}
              <span className="text-primary">easier to trust.</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              Resupify helps you tailor each application with proof. It shows
              what the job asks for, what your resume supports, and what to
              change next — without turning your resume into fluff.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                onClick={() => (window.location.href = getLoginUrl())}
                className="text-base px-8"
              >
                Try free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() =>
                  document
                    .getElementById("how-it-works")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="text-base px-8"
              >
                See how it works
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Start in minutes. No credit card needed.
            </p>
          </div>
        </div>
      </section>

      {/* ─── Outcome Bullets ──────────────────────────────────── */}
      <section className="pb-16">
        <div className="container">
          <div className="max-w-3xl mx-auto grid sm:grid-cols-3 gap-6 text-center">
            {[
              {
                icon: FileSearch,
                text: "Stop guessing what recruiters want",
              },
              {
                icon: PenLine,
                text: "Fix the missing pieces before you submit",
              },
              {
                icon: ClipboardList,
                text: "Follow up without losing track",
              },
            ].map((item) => (
              <div key={item.text} className="flex flex-col items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <item.icon className="h-5.5 w-5.5 text-primary" />
                </div>
                <p className="text-sm font-medium text-foreground leading-snug">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── What You Get (3 cards) ───────────────────────────── */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold tracking-tight mb-3">
              What you get
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                icon: Briefcase,
                title: "A place to run your job search",
                body: "Track each opportunity with a simple pipeline, tasks, and follow-ups so nothing slips.",
              },
              {
                icon: FileSearch,
                title: "Edits grounded in the job description",
                body: "Every suggestion points to a specific requirement and shows the proof in your resume — or 'None found'.",
              },
              {
                icon: Shield,
                title: "Cleaner writing you can defend",
                body: "If a rewrite adds a new claim, Resupify flags it so you can keep everything honest and interview-ready.",
              },
            ].map((card) => (
              <div
                key={card.title}
                className="bg-card rounded-xl p-7 border shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center mb-5">
                  <card.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{card.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {card.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How It Works (3 steps) ───────────────────────────── */}
      <section id="how-it-works" className="py-20">
        <div className="container">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold tracking-tight mb-3">
              How it works
            </h2>
          </div>
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  step: "1",
                  title: "Save the job description",
                  body: "Paste it or import from a link. Resupify saves a JD Snapshot so your results stay consistent.",
                },
                {
                  step: "2",
                  title: "Run Evidence + Score",
                  body: "Get an Evidence Map and an explainable score breakdown, so you know what to fix first.",
                },
                {
                  step: "3",
                  title: "Execute the next steps",
                  body: "Resupify creates tasks and follow-ups tied to the job, so you keep moving.",
                },
              ].map((item) => (
                <div key={item.step} className="text-center">
                  <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold mx-auto mb-5">
                    {item.step}
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Evidence Example ─────────────────────────────────── */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold tracking-tight mb-3">
                Example: what "evidence-based" means
              </h2>
              <p className="text-muted-foreground">
                One requirement. One proof check. Two rewrite options.
              </p>
            </div>

            <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
              {/* JD Requirement */}
              <div className="p-5 border-b bg-muted/20">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  JD Requirement
                </p>
                <p className="text-sm font-medium">
                  "Experience collaborating with cross-functional partners to
                  ship projects."
                </p>
              </div>

              {/* Resume Proof */}
              <div className="p-5 border-b">
                <div className="flex items-center gap-2 mb-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Resume Proof
                  </p>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                    <AlertTriangle className="h-3 w-3" />
                    Missing
                  </span>
                </div>
                <p className="text-sm text-muted-foreground italic">
                  None found
                </p>
              </div>

              {/* Fix */}
              <div className="p-5 border-b bg-amber-50/50">
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 mb-1.5">
                  Fix
                </p>
                <p className="text-sm">
                  Add one concrete example of cross-functional work you've
                  actually done.
                </p>
              </div>

              {/* Rewrites */}
              <div className="p-5 border-b">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">
                  Rewrite Options
                </p>
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                    <p className="text-xs font-semibold text-primary mb-1">
                      Option A
                    </p>
                    <p className="text-sm">
                      "Partnered with design and engineering to launch a new
                      onboarding flow, coordinating requirements and feedback
                      through weekly check-ins."
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                    <p className="text-xs font-semibold text-primary mb-1">
                      Option B
                    </p>
                    <p className="text-sm">
                      "Worked across teams to align timelines and deliverables on
                      a project, translating stakeholder input into clear next
                      steps."
                    </p>
                  </div>
                </div>
              </div>

              {/* Why It Matters */}
              <div className="p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Why It Matters
                </p>
                <p className="text-sm text-muted-foreground">
                  Recruiters scan for proof of collaboration, and ATS looks for
                  role language.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Trust (short) ────────────────────────────────────── */}
      <section className="py-20">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-bold tracking-tight mb-8">
              Built for trust, not buzzwords
            </h2>
            <div className="grid sm:grid-cols-3 gap-6">
              {[
                "No invented experience",
                "JD Snapshot saved, not silently changed",
                "Explainable scoring in plain language",
              ].map((text) => (
                <div
                  key={text}
                  className="flex flex-col items-center gap-3 p-5 rounded-xl bg-muted/30"
                >
                  <CheckCircle2 className="h-6 w-6 text-primary" />
                  <p className="text-sm font-medium text-center">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Final CTA ────────────────────────────────────────── */}
      <section className="py-20 bg-primary/5">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-bold tracking-tight mb-4">
              Ready to tighten your next application?
            </h2>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              Bring one posting. Get your checklist. Make the edits. Follow up.
            </p>
            <Button
              size="lg"
              onClick={() => (window.location.href = getLoginUrl())}
              className="text-base px-8"
            >
              Try free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
