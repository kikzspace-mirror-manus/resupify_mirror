import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import PublicNav from "@/components/PublicNav";
import PublicFooter from "@/components/PublicFooter";
import {
  ArrowRight,
  Briefcase,
  FileText,
  BarChart3,
  Target,
  CalendarCheck,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

export default function HowItWorks() {
  return (
    <div className="min-h-screen bg-background">
      <PublicNav />

      {/* Header */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-5">
              How Resupify works
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Resupify doesn't list jobs. It helps you execute on applications
              you're already sending.
            </p>
          </div>
        </div>
      </section>

      {/* Section 1: Job Card */}
      <section className="py-16 bg-muted/30">
        <div className="container">
          <div className="max-w-3xl mx-auto flex flex-col md:flex-row items-start gap-8">
            <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Briefcase className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight mb-3">
                One Job Card per opportunity
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Everything stays together: job description, your resume version,
                evidence results, tasks, and follow-ups. No more juggling
                spreadsheets, browser tabs, and email threads.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: JD Snapshot */}
      <section className="py-16">
        <div className="container">
          <div className="max-w-3xl mx-auto flex flex-col md:flex-row items-start gap-8">
            <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight mb-3">
                Your inputs stay stable
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                When you import a job description, Resupify saves a JD Snapshot.
                That's the exact text used for your Evidence Map and score. If
                the posting changes later, you can capture a new version on
                purpose.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Evidence Map */}
      <section className="py-16 bg-muted/30">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <div className="flex flex-col md:flex-row items-start gap-8 mb-10">
              <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight mb-3">
                  Evidence Map shows what's matched, partial, or missing
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  You'll get 10–20 items grouped by type (Eligibility, Tools,
                  Responsibilities, Skills). Each includes a fix and two rewrite
                  options.
                </p>
              </div>
            </div>

            {/* Evidence example */}
            <div className="bg-card rounded-xl border shadow-sm overflow-hidden ml-0 md:ml-[5.5rem]">
              <div className="p-4 border-b bg-muted/20">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  JD Requirement — Tools
                </p>
                <p className="text-sm font-medium">
                  "Proficiency with CI/CD pipelines and containerized
                  deployments."
                </p>
              </div>
              <div className="p-4 border-b">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Resume Proof
                  </p>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                    Partial
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  "Used GitHub Actions for automated testing" — mentions CI but
                  not CD or containers.
                </p>
              </div>
              <div className="p-4 border-b bg-amber-50/50">
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 mb-1">
                  Fix
                </p>
                <p className="text-sm">
                  Expand the bullet to include deployment steps and any Docker
                  usage.
                </p>
              </div>
              <div className="p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">
                  Rewrite Options
                </p>
                <div className="space-y-2">
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                    <p className="text-xs font-semibold text-primary mb-1">
                      Option A
                    </p>
                    <p className="text-sm">
                      "Built GitHub Actions CI/CD pipeline with Docker-based
                      staging deployments, reducing release time from 2 hours to
                      15 minutes."
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                    <p className="text-xs font-semibold text-primary mb-1">
                      Option B
                    </p>
                    <p className="text-sm">
                      "Configured automated test and deploy workflows using
                      GitHub Actions and Docker Compose for consistent staging
                      environments."
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: Explainable Score */}
      <section className="py-16">
        <div className="container">
          <div className="max-w-3xl mx-auto flex flex-col md:flex-row items-start gap-8">
            <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight mb-3">
                A score you can understand
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-5">
                Resupify breaks the score into four parts so you can improve it
                on purpose.
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  "Keyword coverage",
                  "Evidence strength",
                  "Formatting safety",
                  "Role fit",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-2.5 p-3 rounded-lg bg-muted/40"
                  >
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 5: Follow-through */}
      <section className="py-16 bg-muted/30">
        <div className="container">
          <div className="max-w-3xl mx-auto flex flex-col md:flex-row items-start gap-8">
            <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <CalendarCheck className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight mb-3">
                Follow-ups become automatic
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Set a follow-up date and Resupify creates the task tied to that
                job. When you mark a card as "Applied," a follow-up task appears
                in 5 business days. No more forgetting.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-bold tracking-tight mb-4">
              Ready to try it?
            </h2>
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
