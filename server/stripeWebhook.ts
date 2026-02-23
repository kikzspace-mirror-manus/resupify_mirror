/**
 * server/stripeWebhook.ts — Stripe webhook handler
 *
 * Phase 10C-1: Additive Stripe webhook.
 * Registered at /api/stripe/webhook with express.raw() BEFORE express.json().
 * Handles:
 *   - checkout.session.completed → credit user idempotently
 *   - charge.refunded            → record as manual_review (no automatic debit)
 *
 * Idempotency: every processed event is recorded in stripe_events.
 * Duplicate deliveries (Stripe retries) are silently ignored.
 */
import type { Express, Request, Response } from "express";
import express from "express";
import Stripe from "stripe";
import { getStripe } from "./stripe";
import { ENV } from "./_core/env";
import * as db from "./db";
import { createPurchaseReceipt } from "./db";
import { logAnalyticsEvent } from "./analytics";
import { EVT_PURCHASE_COMPLETED } from "../shared/analyticsEvents";

// ─── Pack credits mapping (must match stripe.ts CREDIT_PACKS) ────────────────
const PACK_CREDITS: Record<string, number> = {
  starter: 5,
  pro: 15,
  power: 50,
};

// ─── Webhook handler ──────────────────────────────────────────────────────────

async function handleWebhookEvent(event: Stripe.Event): Promise<void> {
  // ── Test event bypass (Stripe test webhook verification) ─────────────────
  // Stripe sends test events with id starting 'evt_test_'; return early so
  // the caller can respond with { verified: true }.
  if (event.id.startsWith("evt_test_")) return;

  // ── Idempotency guard ─────────────────────────────────────────────────────
  if (await db.stripeEventExists(event.id)) {
    console.log(`[Stripe] Duplicate event ignored: ${event.id}`);
    return;
  }

  switch (event.type) {
    // ── checkout.session.completed ──────────────────────────────────────────
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userIdStr = session.metadata?.user_id ?? session.client_reference_id;
      const packId = session.metadata?.pack_id;
      const credits = packId ? PACK_CREDITS[packId] : undefined;
      const userId = userIdStr ? parseInt(userIdStr, 10) : null;

      if (!userId || isNaN(userId) || !credits) {
        console.warn(`[Stripe] checkout.session.completed missing metadata: ${event.id}`);
        await db.recordStripeEvent({
          stripeEventId: event.id,
          eventType: event.type,
          userId: userId ?? null,
          creditsPurchased: null,
          status: "manual_review",
        });
        break;
      }

      // Grant credits using the existing approved addCredits helper
      await db.addCredits(userId, credits, `Purchase: ${packId}`, "credit_purchase");
      // Record purchase receipt (idempotent — duplicate key silently ignored)
      await createPurchaseReceipt({
        userId,
        stripeCheckoutSessionId: session.id,
        packId: packId!,
        creditsAdded: credits,
        amountCents: session.amount_total ?? undefined,
        currency: session.currency ?? undefined,
        stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : undefined,
        stripeReceiptUrl: undefined,
      });

      await db.recordStripeEvent({
        stripeEventId: event.id,
        eventType: event.type,
        userId,
        creditsPurchased: credits,
        status: "processed",
      });

      logAnalyticsEvent(EVT_PURCHASE_COMPLETED, userId, { pack_id: packId, credits });
      console.log(`[Stripe] Credited ${credits} credits to user ${userId} (event ${event.id})`);
      break;
    }

    // ── charge.refunded ─────────────────────────────────────────────────────
    // We do NOT automatically debit credits on refund — this requires manual
    // review to avoid edge cases (partial refunds, disputed charges, etc.).
    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      const userIdStr = (charge.metadata as Record<string, string>)?.user_id;
      const userId = userIdStr ? parseInt(userIdStr, 10) : null;

      await db.recordStripeEvent({
        stripeEventId: event.id,
        eventType: event.type,
        userId: userId ?? null,
        creditsPurchased: null,
        status: "manual_review",
      });

      console.log(`[Stripe] charge.refunded recorded for manual review: ${event.id}`);
      break;
    }

    default:
      // Unhandled event types: record as skipped (no action needed)
      await db.recordStripeEvent({
        stripeEventId: event.id,
        eventType: event.type,
        userId: null,
        creditsPurchased: null,
        status: "skipped",
      });
      break;
  }
}

// ─── Express route registration ───────────────────────────────────────────────

export function registerStripeWebhook(app: Express): void {
  // MUST use express.raw() for this route — Stripe signature verification
  // requires the raw request body, not the parsed JSON.
  app.post(
    "/api/stripe/webhook",
    express.raw({ type: "application/json" }),
    async (req: Request, res: Response) => {
      const sig = req.headers["stripe-signature"];
      const webhookSecret = ENV.STRIPE_WEBHOOK_SECRET;

      if (!webhookSecret) {
        console.error("[Stripe] STRIPE_WEBHOOK_SECRET is not configured");
        return res.status(500).json({ error: "Webhook secret not configured" });
      }

      let event: Stripe.Event;
      try {
        event = getStripe().webhooks.constructEvent(
          req.body as Buffer,
          sig as string,
          webhookSecret
        );
      } catch (err: any) {
        console.error("[Stripe] Webhook signature verification failed:", err.message);
        return res.status(400).json({ error: `Webhook Error: ${err.message}` });
      }

      // Test event: return verification response immediately
      if (event.id.startsWith("evt_test_")) {
        console.log("[Stripe] Test event detected, returning verification response");
        return res.json({ verified: true });
      }

      try {
        await handleWebhookEvent(event);
        return res.json({ received: true });
      } catch (err: any) {
        console.error("[Stripe] Webhook processing error:", err.message);
        return res.status(500).json({ error: "Webhook processing failed" });
      }
    }
  );
}

// Export for testing
export { handleWebhookEvent, PACK_CREDITS };
