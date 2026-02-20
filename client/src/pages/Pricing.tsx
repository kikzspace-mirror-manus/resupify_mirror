import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import PublicNav from "@/components/PublicNav";
import PublicFooter from "@/components/PublicFooter";
import { ArrowRight, CheckCircle2, Zap } from "lucide-react";
import { Link } from "wouter";

export default function Pricing() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <PublicNav />

      {/* Header */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-5">
              Simple pricing
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              The CRM is free. Credits cover Evidence + Score runs and outreach
              drafts.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-20">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Free Tier */}
            <div className="bg-card rounded-xl border p-8 shadow-sm">
              <h2 className="text-xl font-bold mb-1">Free</h2>
              <p className="text-muted-foreground text-sm mb-6">
                Everything you need to manage your search.
              </p>
              <div className="space-y-3 mb-8">
                {[
                  "Unlimited Job Cards",
                  "Pipeline + tasks + reminders",
                  "3 Evidence + Score runs (total)",
                  "Basic exports",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span className="text-sm">{item}</span>
                  </div>
                ))}
              </div>
              <Button
                className="w-full"
                onClick={() => (window.location.href = getLoginUrl())}
              >
                Start free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>

            {/* Credits */}
            <div className="bg-card rounded-xl border-2 border-primary/30 p-8 shadow-sm relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                  <Zap className="h-3 w-3" />
                  Pay as you go
                </span>
              </div>
              <h2 className="text-xl font-bold mb-1">Credits</h2>
              <p className="text-muted-foreground text-sm mb-6">
                Use when you're actively applying.
              </p>
              <div className="space-y-3 mb-8">
                {[
                  { text: "1 credit: Evidence + Score run (bundled)", bold: true },
                  { text: "1 credit: Outreach Pack (message drafts)", bold: false },
                  { text: "5 credits: Batch Sprint for up to 10 job cards", bold: false },
                ].map((item) => (
                  <div key={item.text} className="flex items-start gap-2.5">
                    <Zap className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span className={`text-sm ${item.bold ? "font-medium" : ""}`}>
                      {item.text}
                    </span>
                  </div>
                ))}
              </div>
              {isAuthenticated ? (
                <Link href="/billing">
                  <Button className="w-full" variant="outline">
                    Buy credits
                  </Button>
                </Link>
              ) : (
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => (window.location.href = getLoginUrl())}
                >
                  Buy credits
                </Button>
              )}
            </div>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-8 max-w-md mx-auto">
            Use credits when you're actively applying. Use the CRM anytime.
          </p>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
