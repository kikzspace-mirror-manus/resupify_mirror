/**
 * /refund-policy — Public-facing Refund Policy page.
 *
 * Phase 11E: Linked from the Billing page credit packs section.
 * Accessible without login. Uses the public nav/footer layout.
 */
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

const LAST_UPDATED = "February 23, 2026";
const SUPPORT_EMAIL = "support@resupify.com";

export default function RefundPolicy() {
  return (
    <div className="min-h-screen bg-background">
      {/* Simple top bar with back link */}
      <div className="border-b">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/billing">
            <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
              <ChevronLeft className="h-4 w-4" />
              Back to Billing
            </Button>
          </Link>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-10 space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Refund Policy</h1>
          <p className="text-sm text-muted-foreground mt-2">Last updated: {LAST_UPDATED}</p>
        </div>

        <p className="text-muted-foreground leading-relaxed">
          Resupify sells non-transferable AI credits. This policy explains when refunds are
          available and how to request one.
        </p>

        {/* Section 1 */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">1. Unused credits — 7-day window</h2>
          <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
            <li>
              Credits purchased within the <strong className="text-foreground">last 7 calendar days</strong> are
              eligible for a full refund, provided <strong className="text-foreground">none of the purchased credits
              have been used</strong>.
            </li>
            <li>
              If any credits from the pack have been consumed (scans, outreach, etc.), the pack is
              no longer eligible for a refund.
            </li>
            <li>
              After 7 days, all sales are final regardless of usage.
            </li>
          </ul>
        </section>

        {/* Section 2 */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">2. Used credits</h2>
          <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
            <li>
              Credits that have been spent on AI runs are <strong className="text-foreground">not refundable</strong>,
              even within the 7-day window.
            </li>
            <li>
              This applies to partial usage: if you bought 50 credits and used 5, only the unused
              45 are potentially eligible (within the 7-day window).
            </li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">3. Billing errors and service outages</h2>
          <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
            <li>
              If you were charged incorrectly (duplicate charge, wrong amount, or a confirmed
              service outage prevented you from using credits), contact support within 14 days.
            </li>
            <li>
              Support may provide a <strong className="text-foreground">one-time courtesy credit adjustment</strong> at
              its discretion. This is not a guaranteed refund.
            </li>
          </ul>
        </section>

        {/* Section 4 */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">4. Chargebacks and fraud</h2>
          <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
            <li>
              If a chargeback or payment dispute is filed, the associated credits may be
              <strong className="text-foreground"> reversed immediately</strong>.
            </li>
            <li>
              A reversal can bring your credit balance <strong className="text-foreground">below zero</strong>.
              Access to paid features may be suspended until the balance is restored.
            </li>
            <li>
              Repeated chargebacks may result in account termination.
            </li>
          </ul>
        </section>

        {/* Section 5 */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">5. How to request a refund</h2>
          <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
            <li>
              Email{" "}
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="text-primary underline underline-offset-2"
              >
                {SUPPORT_EMAIL}
              </a>{" "}
              with the subject line <strong className="text-foreground">"Refund Request"</strong>.
            </li>
            <li>
              Include your account email and the approximate purchase date.
            </li>
            <li>
              We aim to respond within 2 business days.
            </li>
          </ol>
        </section>

        {/* Footer note */}
        <p className="text-xs text-muted-foreground border-t pt-6">
          This policy may be updated at any time. Continued use of Resupify after changes
          constitutes acceptance of the revised policy. For questions, contact{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="underline underline-offset-2">
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
      </main>
    </div>
  );
}
