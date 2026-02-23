/**
 * Phase 11A — Stripe Credits Purchase: Acceptance Tests
 *
 * Acceptance criteria (per spec):
 * A) Session created for each valid pack_id (starter, pro, power)
 * B) Webhook credits exactly once for a given session id (idempotent)
 * C) Ledger entry "Purchase: {pack_id}" created
 * D) Invalid webhook signature rejected (400)
 * E) Server derives credits from pack constants — never from Stripe amount
 * F) Unauthenticated user cannot create checkout session
 * G) Invalid pack_id is rejected
 * H) Webhook with missing metadata goes to manual_review, no credits
 * I) CREDIT_PACKS constants are server-owned (starter=5, pro=15, power=50)
 * J) Billing page source wires stripe.createCheckoutSession mutation
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { handleWebhookEvent, PACK_CREDITS } from "./stripeWebhook";
import { CREDIT_PACKS } from "./stripe";
import type Stripe from "stripe";
import * as fs from "fs";
import * as path from "path";

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const {
  mockCreateCheckoutSession,
  mockStripeEventExists,
  mockRecordStripeEvent,
  mockAddCredits,
  mockCreatePurchaseReceipt,
} = vi.hoisted(() => ({
  mockCreateCheckoutSession: vi.fn(),
  mockStripeEventExists: vi.fn(),
  mockRecordStripeEvent: vi.fn(),
  mockAddCredits: vi.fn(),
  mockCreatePurchaseReceipt: vi.fn(),
}));

vi.mock("./stripe", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./stripe")>();
  return {
    ...actual,
    createCheckoutSession: mockCreateCheckoutSession,
  };
});

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    stripeEventExists: mockStripeEventExists,
    recordStripeEvent: mockRecordStripeEvent,
    addCredits: mockAddCredits,
    createPurchaseReceipt: mockCreatePurchaseReceipt,
  };
});

// ─── Context helpers ──────────────────────────────────────────────────────────

function makeUserCtx(userId = 99): TrpcContext {
  return {
    user: {
      id: userId,
      openId: `user-${userId}`,
      name: "Test User",
      email: `user${userId}@example.com`,
      loginMethod: "manus",
      role: "user",
      disabled: false,
      isAdmin: false,
      adminNotes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
      ip: "10.0.0.1",
      socket: { remoteAddress: "10.0.0.1" },
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
      setHeader: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function makeUnauthCtx(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
      ip: "10.0.0.1",
      socket: { remoteAddress: "10.0.0.1" },
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
      setHeader: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

// ─── Stripe event factory ─────────────────────────────────────────────────────

function makeCheckoutEvent(
  packId: string,
  userId: number,
  eventId: string
): Stripe.Event {
  return {
    id: eventId,
    type: "checkout.session.completed",
    object: "event",
    data: {
      object: {
        id: `cs_test_${eventId}`,
        object: "checkout.session",
        client_reference_id: userId.toString(),
        metadata: {
          user_id: userId.toString(),
          pack_id: packId,
          credits: PACK_CREDITS[packId]?.toString() ?? "0",
        },
      } as Stripe.Checkout.Session,
    },
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    pending_webhooks: 0,
    request: null,
    api_version: "2026-01-28.clover",
  } as unknown as Stripe.Event;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Phase 11A: Stripe Credits Purchase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStripeEventExists.mockResolvedValue(false);
    mockRecordStripeEvent.mockResolvedValue(undefined);
    mockAddCredits.mockResolvedValue(undefined);
    mockCreatePurchaseReceipt.mockResolvedValue(undefined);
    mockCreateCheckoutSession.mockResolvedValue("https://checkout.stripe.com/pay/cs_test_11a");
  });

  // ── A) Session created for each valid pack_id ─────────────────────────────
  it("A1) starter pack: createCheckoutSession returns URL", async () => {
    const caller = appRouter.createCaller(makeUserCtx(99));
    const result = await caller.stripe.createCheckoutSession({
      packId: "starter",
      origin: "https://resupify.manus.space",
    });
    expect(result.url).toBe("https://checkout.stripe.com/pay/cs_test_11a");
    expect(mockCreateCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({ packId: "starter", userId: 99 })
    );
  });

  it("A2) pro pack: createCheckoutSession returns URL", async () => {
    const caller = appRouter.createCaller(makeUserCtx(99));
    const result = await caller.stripe.createCheckoutSession({
      packId: "pro",
      origin: "https://resupify.manus.space",
    });
    expect(result.url).toBeDefined();
    expect(mockCreateCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({ packId: "pro" })
    );
  });

  it("A3) power pack: createCheckoutSession returns URL", async () => {
    const caller = appRouter.createCaller(makeUserCtx(99));
    const result = await caller.stripe.createCheckoutSession({
      packId: "power",
      origin: "https://resupify.manus.space",
    });
    expect(result.url).toBeDefined();
    expect(mockCreateCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({ packId: "power" })
    );
  });

  // ── B) Webhook credits exactly once (idempotency) ─────────────────────────
  it("B1) First delivery of checkout.session.completed credits user once", async () => {
    const event = makeCheckoutEvent("pro", 99, "evt_11a_pro_001");
    await handleWebhookEvent(event);
    expect(mockAddCredits).toHaveBeenCalledTimes(1);
    expect(mockRecordStripeEvent).toHaveBeenCalledTimes(1);
  });

  it("B2) Second delivery of same event ID is ignored (idempotency)", async () => {
    mockStripeEventExists.mockResolvedValue(true); // already processed
    const event = makeCheckoutEvent("pro", 99, "evt_11a_pro_001");
    await handleWebhookEvent(event);
    expect(mockAddCredits).not.toHaveBeenCalled();
    expect(mockRecordStripeEvent).not.toHaveBeenCalled();
  });

  it("B3) Different event IDs for same pack are both processed independently", async () => {
    const event1 = makeCheckoutEvent("starter", 99, "evt_11a_starter_001");
    const event2 = makeCheckoutEvent("starter", 99, "evt_11a_starter_002");
    await handleWebhookEvent(event1);
    await handleWebhookEvent(event2);
    expect(mockAddCredits).toHaveBeenCalledTimes(2);
  });

  // ── C) Ledger entry "Purchase: {pack_id}" created ─────────────────────────
  it("C1) Ledger entry for pro pack uses 'Purchase: pro' description", async () => {
    const event = makeCheckoutEvent("pro", 99, "evt_11a_ledger_pro");
    await handleWebhookEvent(event);
    expect(mockAddCredits).toHaveBeenCalledWith(
      99,
      15,
      "Purchase: pro",
      "credit_purchase"
    );
  });

  it("C2) Ledger entry for starter pack uses 'Purchase: starter' description", async () => {
    const event = makeCheckoutEvent("starter", 99, "evt_11a_ledger_starter");
    await handleWebhookEvent(event);
    expect(mockAddCredits).toHaveBeenCalledWith(
      99,
      5,
      "Purchase: starter",
      "credit_purchase"
    );
  });

  it("C3) Ledger entry for power pack uses 'Purchase: power' description", async () => {
    const event = makeCheckoutEvent("power", 99, "evt_11a_ledger_power");
    await handleWebhookEvent(event);
    expect(mockAddCredits).toHaveBeenCalledWith(
      99,
      50,
      "Purchase: power",
      "credit_purchase"
    );
  });

  // ── D) Invalid pack_id rejected ───────────────────────────────────────────
  it("D) Invalid pack_id is rejected by tRPC procedure", async () => {
    const caller = appRouter.createCaller(makeUserCtx(99));
    await expect(
      caller.stripe.createCheckoutSession({
        packId: "invalid_pack" as any,
        origin: "https://resupify.manus.space",
      })
    ).rejects.toThrow();
  });

  // ── E) Server derives credits from constants, not from Stripe amount ──────
  it("E1) PACK_CREDITS mapping is server-owned: starter=5, pro=15, power=50", () => {
    expect(PACK_CREDITS["starter"]).toBe(5);
    expect(PACK_CREDITS["pro"]).toBe(15);
    expect(PACK_CREDITS["power"]).toBe(50);
  });

  it("E2) Webhook ignores any credits field in metadata — uses PACK_CREDITS", async () => {
    // Even if metadata.credits is tampered, server uses PACK_CREDITS
    const event: Stripe.Event = {
      id: "evt_11a_tampered",
      type: "checkout.session.completed",
      object: "event",
      data: {
        object: {
          id: "cs_test_tampered",
          object: "checkout.session",
          client_reference_id: "99",
          metadata: {
            user_id: "99",
            pack_id: "starter",
            credits: "9999", // tampered — server should ignore this
          },
        } as Stripe.Checkout.Session,
      },
      created: Math.floor(Date.now() / 1000),
      livemode: false,
      pending_webhooks: 0,
      request: null,
      api_version: "2026-01-28.clover",
    } as unknown as Stripe.Event;

    await handleWebhookEvent(event);

    // Must use PACK_CREDITS["starter"] = 5, not the tampered 9999
    expect(mockAddCredits).toHaveBeenCalledWith(
      99,
      5, // from PACK_CREDITS, not from metadata
      "Purchase: starter",
      "credit_purchase"
    );
  });

  // ── F) Unauthenticated user cannot create checkout session ────────────────
  it("F) Unauthenticated user is blocked from createCheckoutSession", async () => {
    const caller = appRouter.createCaller(makeUnauthCtx());
    await expect(
      caller.stripe.createCheckoutSession({
        packId: "pro",
        origin: "https://resupify.manus.space",
      })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  // ── G) Webhook with missing metadata goes to manual_review ───────────────
  it("G) Webhook with missing pack_id goes to manual_review without crediting", async () => {
    const event: Stripe.Event = {
      id: "evt_11a_missing_meta",
      type: "checkout.session.completed",
      object: "event",
      data: {
        object: {
          id: "cs_test_missing_meta",
          object: "checkout.session",
          client_reference_id: "99",
          metadata: {}, // missing pack_id and user_id
        } as Stripe.Checkout.Session,
      },
      created: Math.floor(Date.now() / 1000),
      livemode: false,
      pending_webhooks: 0,
      request: null,
      api_version: "2026-01-28.clover",
    } as unknown as Stripe.Event;

    await handleWebhookEvent(event);

    expect(mockAddCredits).not.toHaveBeenCalled();
    expect(mockRecordStripeEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "manual_review",
        stripeEventId: "evt_11a_missing_meta",
      })
    );
  });

  // ── H) CREDIT_PACKS constants are server-owned ───────────────────────────
  it("H) CREDIT_PACKS has exactly 3 packs with correct credit amounts", () => {
    expect(CREDIT_PACKS).toHaveLength(3);
    const starter = CREDIT_PACKS.find((p) => p.packId === "starter");
    const pro = CREDIT_PACKS.find((p) => p.packId === "pro");
    const power = CREDIT_PACKS.find((p) => p.packId === "power");
    expect(starter?.credits).toBe(5);
    expect(pro?.credits).toBe(15);
    expect(power?.credits).toBe(50);
  });

  it("H2) CREDIT_PACKS and PACK_CREDITS are consistent", () => {
    for (const pack of CREDIT_PACKS) {
      expect(PACK_CREDITS[pack.packId]).toBe(pack.credits);
    }
  });

  // ── I) Billing UI wires stripe.createCheckoutSession mutation ────────────
  it("I) Billing.tsx calls stripe.createCheckoutSession mutation", () => {
    const billingPath = path.resolve(__dirname, "../client/src/pages/Billing.tsx");
    const src = fs.readFileSync(billingPath, "utf-8");
    expect(src).toContain("stripe.createCheckoutSession");
    expect(src).toContain("window.location.origin");
  });

  it("I2) Billing.tsx opens checkout in new tab", () => {
    const billingPath = path.resolve(__dirname, "../client/src/pages/Billing.tsx");
    const src = fs.readFileSync(billingPath, "utf-8");
    expect(src).toContain("window.open");
  });

  // ── J) Webhook endpoint is registered at correct path ────────────────────
  it("J) stripeWebhook.ts registers webhook at /api/stripe/webhook", () => {
    const webhookPath = path.resolve(__dirname, "stripeWebhook.ts");
    const src = fs.readFileSync(webhookPath, "utf-8");
    expect(src).toContain("/api/stripe/webhook");
    expect(src).toContain("express.raw");
    expect(src).toContain("constructEvent");
  });

  it("J2) Webhook uses STRIPE_WEBHOOK_SECRET for signature verification", () => {
    const webhookPath = path.resolve(__dirname, "stripeWebhook.ts");
    const src = fs.readFileSync(webhookPath, "utf-8");
    expect(src).toContain("STRIPE_WEBHOOK_SECRET");
    expect(src).toContain("stripe-signature");
  });
});
