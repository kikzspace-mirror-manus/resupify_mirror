/**
 * server/stripe.ts — Stripe client + credit pack definitions
 *
 * Phase 10C-1: Additive Stripe integration.
 * No changes to existing credits/ledger schema or mechanics.
 */
import Stripe from "stripe";
import { ENV } from "./_core/env";

// ─── Stripe client (lazy-initialised so tests can mock env) ──────────────────

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
    // Use the package's own constant to avoid version mismatch TS errors
    _stripe = new Stripe(key);
  }
  return _stripe;
}

// ─── Credit pack definitions ─────────────────────────────────────────────────
// These are the source of truth for pack names, credit amounts, and prices.
// The Billing UI reads from CREDIT_PACKS; the checkout procedure uses packId.

export const CREDIT_PACKS = [
  {
    packId: "starter",
    label: "Starter",
    credits: 5,
    desc: "5 Evidence+ATS scans",
    priceUsd: 499,          // cents
    priceDisplay: "$4.99",
    popular: false,
  },
  {
    packId: "pro",
    label: "Pro",
    credits: 15,
    desc: "15 scans + outreach packs",
    priceUsd: 1299,
    priceDisplay: "$12.99",
    popular: true,
  },
  {
    packId: "power",
    label: "Power",
    credits: 50,
    desc: "50 scans for heavy users",
    priceUsd: 3499,
    priceDisplay: "$34.99",
    popular: false,
  },
] as const;

export type PackId = (typeof CREDIT_PACKS)[number]["packId"];

export function getPackById(packId: PackId) {
  return CREDIT_PACKS.find((p) => p.packId === packId) ?? null;
}

// ─── Checkout session creator ─────────────────────────────────────────────────

export interface CreateCheckoutOptions {
  packId: PackId;
  userId: number;
  userEmail: string | null | undefined;
  origin: string;           // window.location.origin from the client
}

export async function createCheckoutSession(
  opts: CreateCheckoutOptions
): Promise<string> {
  const pack = getPackById(opts.packId);
  if (!pack) throw new Error(`Unknown pack: ${opts.packId}`);

  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: pack.priceUsd,
          product_data: {
            name: `Resupify ${pack.label} Pack — ${pack.credits} Credits`,
            description: pack.desc,
          },
        },
      },
    ],
    // Link this session back to the internal user (non-PII: integer ID only)
    client_reference_id: opts.userId.toString(),
    metadata: {
      user_id: opts.userId.toString(),
      pack_id: pack.packId,
      credits: pack.credits.toString(),
    },
    customer_email: opts.userEmail ?? undefined,
    allow_promotion_codes: true,
    success_url: `${opts.origin}/billing?checkout=success`,
    cancel_url: `${opts.origin}/billing?checkout=cancelled`,
  });

  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return session.url;
}
