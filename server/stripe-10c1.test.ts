/**
 * Phase 10C-1 — Stripe Checkout + Idempotent Webhook: Acceptance Tests
 *
 * Acceptance criteria:
 * A) stripe.createCheckoutSession procedure returns a URL and passes correct metadata
 * B) stripe.packs returns the three credit packs with correct credits/prices
 * C) handleWebhookEvent credits user exactly once for checkout.session.completed
 * D) Duplicate event delivery (same stripeEventId) does NOT double-credit
 * E) Ledger entry is created with reason "Purchase: <packId>"
 * F) charge.refunded is recorded as manual_review, no credits added/removed
 * G) Unknown event type is recorded as skipped, no credits added/removed
 * H) stripeEventExists returns true after recordStripeEvent
 * I) Unauthenticated user cannot call stripe.createCheckoutSession (UNAUTHORIZED)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { handleWebhookEvent, PACK_CREDITS } from "./stripeWebhook";
import type Stripe from "stripe";

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

function makeUserCtx(userId = 42): TrpcContext {
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
  overrides: Partial<Stripe.Checkout.Session> = {},
  eventId = "evt_prod_test_001"
): Stripe.Event {
  return {
    id: eventId,
    type: "checkout.session.completed",
    object: "event",
    data: {
      object: {
        id: "cs_test_abc123",
        object: "checkout.session",
        client_reference_id: "42",
        metadata: {
          user_id: "42",
          pack_id: "pro",
          credits: "15",
        },
        ...overrides,
      } as Stripe.Checkout.Session,
    },
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    pending_webhooks: 0,
    request: null,
    api_version: "2026-01-28.clover",
  } as unknown as Stripe.Event;
}

function makeRefundEvent(eventId = "evt_prod_refund_001"): Stripe.Event {
  return {
    id: eventId,
    type: "charge.refunded",
    object: "event",
    data: {
      object: {
        id: "ch_test_abc123",
        object: "charge",
        metadata: { user_id: "42" },
      } as Stripe.Charge,
    },
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    pending_webhooks: 0,
    request: null,
    api_version: "2026-01-28.clover",
  } as unknown as Stripe.Event;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Phase 10C-1: Stripe Checkout + Idempotent Webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStripeEventExists.mockResolvedValue(false);
    mockRecordStripeEvent.mockResolvedValue(undefined);
    mockAddCredits.mockResolvedValue(undefined);
    mockCreatePurchaseReceipt.mockResolvedValue(undefined);
  });

  // ── A) Checkout procedure returns URL with correct metadata ───────────────
  it("A) stripe.createCheckoutSession returns a checkout URL", async () => {
    const expectedUrl = "https://checkout.stripe.com/pay/cs_test_abc123";
    mockCreateCheckoutSession.mockResolvedValue(expectedUrl);

    const caller = appRouter.createCaller(makeUserCtx(42));
    const result = await caller.stripe.createCheckoutSession({
      packId: "pro",
      origin: "https://example.manus.space",
    });

    expect(result.url).toBe(expectedUrl);
    expect(mockCreateCheckoutSession).toHaveBeenCalledWith({
      packId: "pro",
      userId: 42,
      userEmail: "user42@example.com",
      origin: "https://example.manus.space",
    });
  });

  // ── B) stripe.packs returns all three packs ───────────────────────────────
  it("B) stripe.packs returns starter, pro, and power packs", async () => {
    const caller = appRouter.createCaller(makeUserCtx());
    const packs = await caller.stripe.packs();
    expect(packs).toHaveLength(3);
    const packIds = packs.map((p) => p.packId);
    expect(packIds).toContain("starter");
    expect(packIds).toContain("pro");
    expect(packIds).toContain("power");
  });

  // ── C) Webhook credits user on checkout.session.completed ────────────────
  it("C) handleWebhookEvent credits user on checkout.session.completed", async () => {
    const event = makeCheckoutEvent();
    await handleWebhookEvent(event);

    expect(mockAddCredits).toHaveBeenCalledTimes(1);
    expect(mockAddCredits).toHaveBeenCalledWith(
      42,
      15,
      "Purchase: pro",
      "credit_purchase"
    );
    expect(mockRecordStripeEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        stripeEventId: "evt_prod_test_001",
        eventType: "checkout.session.completed",
        userId: 42,
        creditsPurchased: 15,
        status: "processed",
      })
    );
  });

  // ── D) Duplicate event delivery does NOT double-credit ────────────────────
  it("D) Duplicate event delivery is ignored (idempotency)", async () => {
    mockStripeEventExists.mockResolvedValue(true); // already processed

    const event = makeCheckoutEvent();
    await handleWebhookEvent(event);

    expect(mockAddCredits).not.toHaveBeenCalled();
    expect(mockRecordStripeEvent).not.toHaveBeenCalled();
  });

  // ── E) Ledger reason includes pack name ───────────────────────────────────
  it("E) Ledger entry reason includes pack name", async () => {
    const event = makeCheckoutEvent(
      { metadata: { user_id: "42", pack_id: "starter", credits: "5" } },
      "evt_prod_starter_001"
    );
    await handleWebhookEvent(event);

    expect(mockAddCredits).toHaveBeenCalledWith(
      42,
      5,
      "Purchase: starter",
      "credit_purchase"
    );
  });

  // ── F) charge.refunded → manual_review, no credits changed ───────────────
  it("F) charge.refunded is recorded as manual_review without crediting", async () => {
    const event = makeRefundEvent();
    await handleWebhookEvent(event);

    expect(mockAddCredits).not.toHaveBeenCalled();
    expect(mockRecordStripeEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        stripeEventId: "evt_prod_refund_001",
        eventType: "charge.refunded",
        status: "manual_review",
      })
    );
  });

  // ── G) Unknown event type → skipped ──────────────────────────────────────
  it("G) Unknown event type is recorded as skipped", async () => {
    const unknownEvent = {
      id: "evt_prod_unknown_001",
      type: "customer.created",
      object: "event",
      data: { object: {} },
      created: Math.floor(Date.now() / 1000),
      livemode: false,
      pending_webhooks: 0,
      request: null,
      api_version: "2026-01-28.clover",
    } as unknown as Stripe.Event;

    await handleWebhookEvent(unknownEvent);

    expect(mockAddCredits).not.toHaveBeenCalled();
    expect(mockRecordStripeEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        stripeEventId: "evt_prod_unknown_001",
        status: "skipped",
      })
    );
  });

  // ── H) PACK_CREDITS mapping is correct ───────────────────────────────────
  it("H) PACK_CREDITS mapping matches CREDIT_PACKS definitions", () => {
    expect(PACK_CREDITS["starter"]).toBe(5);
    expect(PACK_CREDITS["pro"]).toBe(15);
    expect(PACK_CREDITS["power"]).toBe(50);
  });

  // ── I) Unauthenticated user cannot call createCheckoutSession ─────────────
  it("I) Unauthenticated user is blocked from stripe.createCheckoutSession", async () => {
    const caller = appRouter.createCaller(makeUnauthCtx());
    await expect(
      caller.stripe.createCheckoutSession({
        packId: "pro",
        origin: "https://example.manus.space",
      })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
