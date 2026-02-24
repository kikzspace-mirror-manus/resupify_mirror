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
import { createPurchaseReceipt, createRefundQueueItem, getPurchaseReceiptBySessionId, markReceiptEmailSent, markReceiptEmailError, upsertOpsStatus, resolveUserIdForCharge } from "./db";
import { sendPurchaseConfirmationEmail } from "./email";
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

      // ── Send purchase confirmation email (idempotent, fire-and-forget) ──────
      // Fetch the receipt to get the receipt ID and check emailSentAt.
      // If emailSentAt is already set (e.g. webhook replay), skip the send.
      void (async () => {
        try {
          const receipt = await getPurchaseReceiptBySessionId(session.id);
          if (!receipt) {
            console.warn(`[Email] Receipt not found for session ${session.id} — skipping email`);
            return;
          }
          if (receipt.emailSentAt) {
            console.log(`[Email] Confirmation already sent for receipt ${receipt.id} — skipping`);
            return;
          }
          // Fetch the user's email and current balance
          const user = await db.getUserById(userId);
          const balance = await db.getCreditsBalance(userId);
          if (!user?.email) {
            console.warn(`[Email] No email on file for user ${userId} — skipping confirmation`);
            return;
          }
          const result = await sendPurchaseConfirmationEmail({
            toEmail: user.email,
            receiptId: receipt.id,
            packId: packId!,
            creditsAdded: credits,
            amountCents: receipt.amountCents,
            currency: receipt.currency,
            purchasedAt: receipt.createdAt,
            stripeCheckoutSessionId: session.id,
            newBalance: balance,
          });
          if (result.sent) {
            await markReceiptEmailSent(receipt.id);
            console.log(`[Email] Purchase confirmation sent to ${user.email} (receipt ${receipt.id})`);
          } else {
            await markReceiptEmailError(receipt.id, result.error);
            console.error(`[Email] Failed to send confirmation for receipt ${receipt.id}: ${result.error}`);
          }
        } catch (emailErr) {
          const msg = emailErr instanceof Error ? emailErr.message : String(emailErr);
          console.error(`[Email] Unexpected error in purchase email flow: ${msg}`);
        }
      })();

      await db.recordStripeEvent({
        stripeEventId: event.id,
        eventType: event.type,
        userId,
        creditsPurchased: credits,
        status: "processed",
      });

      logAnalyticsEvent(EVT_PURCHASE_COMPLETED, userId, { pack_id: packId, credits });
      // Phase 12E.2: update ops_status with last successful webhook
      await upsertOpsStatus({
        lastStripeWebhookSuccessAt: new Date(),
        lastStripeWebhookEventId: event.id,
        lastStripeWebhookEventType: event.type,
      });
      console.log(`[Stripe] Credited ${credits} credits to user ${userId} (event ${event.id})`);
      break;
    }

    // ── charge.refunded ─────────────────────────────────────────────────────
    // Record into refund_queue for admin review. No automatic credit debit.
    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      const metadata = charge.metadata as Record<string, string> | undefined;
      const userIdStr = metadata?.user_id;
      // Try metadata first; if missing, resolve from purchase records
      let userId: number | null = userIdStr ? parseInt(userIdStr, 10) : null;

      // Extract refund details from the first refund object (most recent)
      const refund = charge.refunds?.data?.[0] as Stripe.Refund | undefined;
      const stripeRefundId = refund?.id ?? `refund_${event.id}`;
      const amountRefunded = refund?.amount ?? charge.amount_refunded ?? null;
      const currency = refund?.currency ?? charge.currency ?? null;

      // Derive pack info from payment_intent metadata if available
      const packId = metadata?.pack_id ?? null;
      const creditsToReverse = packId ? (PACK_CREDITS[packId] ?? null) : null;

      // Phase 12L: auto-map userId if not in metadata
      if (!userId) {
        const paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : null;
        const checkoutSessionId = metadata?.checkout_session_id ?? null;
        userId = await resolveUserIdForCharge({
          stripePaymentIntentId: paymentIntentId,
          stripeCheckoutSessionId: checkoutSessionId,
        });
        if (userId) {
          console.log(`[Stripe] charge.refunded: resolved userId=${userId} via purchase records (charge ${charge.id})`);
        }
      }

      // Record in refund queue for admin review (idempotent on stripeRefundId)
      await createRefundQueueItem({
        userId: userId ?? null,
        stripeChargeId: charge.id,
        stripeRefundId,
        stripeCheckoutSessionId: metadata?.checkout_session_id ?? null,
        amountRefunded: amountRefunded ?? null,
        currency: currency ?? null,
        packId: packId ?? null,
        creditsToReverse: creditsToReverse ?? null,
        status: "pending",
      });

      // Also record in stripe_events for audit trail
      await db.recordStripeEvent({
        stripeEventId: event.id,
        eventType: event.type,
        userId: userId ?? null,
        creditsPurchased: null,
        status: "manual_review",
      });

      console.log(`[Stripe] charge.refunded queued for admin review: ${event.id} (refund: ${stripeRefundId})`);
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
    // Use type: () => true to accept ANY Content-Type (including
    // 'application/json; charset=utf-8' that Stripe sometimes sends).
    // This guarantees req.body is always a raw Buffer before
    // stripe.webhooks.constructEvent() is called for signature verification.
    express.raw({ type: () => true }),
    async (req: Request, res: Response) => {
      const sig = req.headers["stripe-signature"];
      // Use ONLY process.env.STRIPE_WEBHOOK_SECRET_V2 — no ENV fallback — so the
      // Manus Secrets panel is the single source of truth and stale cached values
      // from ENV cannot cause signature mismatches.
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_V2;

      if (!webhookSecret) {
        console.error("[Stripe] STRIPE_WEBHOOK_SECRET_V2 is not configured");
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
        // Phase 12E.3: record failure timestamp in ops_status (fire-and-forget, never crashes)
        upsertOpsStatus({ lastStripeWebhookFailureAt: new Date() }).catch((opsErr: unknown) => {
          console.warn("[Stripe] ops_status failure write failed:", opsErr instanceof Error ? opsErr.message : String(opsErr));
        });
        return res.status(500).json({ error: "Webhook processing failed" });
      }
    }
  );
}

// Export for testing
export { handleWebhookEvent, PACK_CREDITS };
