import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import PublicNav from "@/components/PublicNav";
import PublicFooter from "@/components/PublicFooter";
import { ArrowRight, FileSearch, AlertTriangle, BarChart3, FileText } from "lucide-react";

const PRINCIPLES = [
  {
    icon: FileSearch,
    title: "Evidence-first",
    body: "Every recommendation references the job description and your resume proof — or 'None found'. You always see the source.",
  },
  {
    icon: AlertTriangle,
    title: "No invented claims",
    body: "If a rewrite introduces a new claim, it's flagged for confirmation. You decide what stays.",
  },
  {
    icon: BarChart3,
    title: "Explainable scoring",
    body: "You can see how the score is calculated and what changes matter most. No black-box numbers.",
  },
  {
    icon: FileText,
    title: "Stable inputs",
    body: "Your JD Snapshot is saved. If the posting changes later, you can capture a new version on purpose.",
  },
];

export default function Trust() {
  return (
    <div className="min-h-screen bg-background">
      <PublicNav />

      {/* Header */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-5">
              Trust principles
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              This is designed to help you write what you can stand behind.
            </p>
          </div>
        </div>
      </section>

      {/* Principles */}
      <section className="pb-20">
        <div className="container">
          <div className="max-w-3xl mx-auto space-y-6">
            {PRINCIPLES.map((p, i) => (
              <div
                key={p.title}
                className="bg-card rounded-xl border p-7 shadow-sm flex flex-col md:flex-row items-start gap-6"
              >
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <p.icon className="h-5.5 w-5.5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold mb-2">{p.title}</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    {p.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-primary/5">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl font-bold tracking-tight mb-4">
              See it in action
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
