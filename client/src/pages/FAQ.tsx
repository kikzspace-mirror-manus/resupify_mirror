import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import PublicNav from "@/components/PublicNav";
import PublicFooter from "@/components/PublicFooter";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ArrowRight } from "lucide-react";

const FAQS = [
  {
    q: "Is Resupify a job board?",
    a: "No. You bring the job posting. Resupify helps you tailor your materials and follow up.",
  },
  {
    q: "Will this guarantee interviews?",
    a: "No tool can guarantee outcomes. Resupify helps you reduce avoidable misses, write clearer proof, and stay consistent across applications.",
  },
  {
    q: "Does it make up experience?",
    a: "No. Any rewrite that adds a new claim is flagged for confirmation. You always decide what stays on your resume.",
  },
  {
    q: "What does the score mean?",
    a: "It reflects keyword coverage, evidence strength, formatting safety, and role fit. You'll see the breakdown so you can improve it on purpose.",
  },
  {
    q: "Why credits?",
    a: "Evidence and scoring runs cost more than CRM features. Credits keep the free core available and make usage predictable.",
  },
  {
    q: "Can I use it in any country?",
    a: "Yes. The core workflow is global. Region Packs allow different norms without rebuilding the engine.",
  },
];

export default function FAQ() {
  return (
    <div className="min-h-screen bg-background">
      <PublicNav />

      {/* Header */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-5">
              FAQ
            </h1>
          </div>
        </div>
      </section>

      {/* Questions */}
      <section className="pb-20">
        <div className="container">
          <div className="max-w-2xl mx-auto">
            <Accordion type="single" collapsible className="space-y-3">
              {FAQS.map((faq, i) => (
                <AccordionItem
                  key={i}
                  value={`faq-${i}`}
                  className="bg-card rounded-xl border px-6 shadow-sm"
                >
                  <AccordionTrigger className="text-left text-base font-semibold py-5 hover:no-underline">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed pb-5">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-primary/5">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl font-bold tracking-tight mb-4">
              Still have questions?
            </h2>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                size="lg"
                onClick={() => (window.location.href = getLoginUrl())}
                className="text-base px-8"
              >
                Try free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <a href="/contact">
                <Button size="lg" variant="outline" className="text-base px-8">
                  Contact us
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
