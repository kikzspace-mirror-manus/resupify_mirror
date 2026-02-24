/**
 * PATCH: Stripe Webhook Raw Body — Acceptance Tests
 *
 * Verifies that /api/stripe/webhook correctly receives a raw Buffer and
 * passes it to stripe.webhooks.constructEvent() for signature verification.
 *
 * Key insight: supertest's .send(string) sends the raw string bytes; express.raw()
 * captures those bytes as a Buffer. Do NOT pass a Buffer to .send() — supertest
 * serializes it as {"type":"Buffer","data":[...]} which breaks the signature.
 *
 * Acceptance criteria:
 * A) express.raw({ type: () => true }) is used (accepts any Content-Type)
 * B) A real Stripe-signed payload with Content-Type: application/json returns 200
 * C) A real Stripe-signed payload with Content-Type: application/json; charset=utf-8 returns 200
 * D) A tampered payload (body modified after signing) returns 400
 * E) A missing stripe-signature header returns 400
 * F) A valid signed payload for checkout.session.completed returns { received: true }
 * G) A test event (evt_test_*) returns { verified: true }
 * H) req.body is a Buffer (not a parsed object) when constructEvent is called
 * I) stripeWebhook.ts uses express.raw({ type: () => true }) (source check)
 * J) registerStripeWebhook is called before app.use(express.json()) in server/_core/index.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import Stripe from "stripe";
import { registerStripeWebhook } from "./stripeWebhook";
import fs from "fs";
import path from "path";

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const {
  mockStripeEventExists,
  mockRecordStripeEvent,
  mockAddCredits,
  mockCreatePurchaseReceipt,
  mockCreateRefundQueueItem,
  mockGetPurchaseReceiptBySessionId,
  mockMarkReceiptEmailSent,
  mockMarkReceiptEmailError,
  mockGetUserById,
  mockGetCreditsBalance,
} = vi.hoisted(() => ({
  mockStripeEventExists: vi.fn(),
  mockRecordStripeEvent: vi.fn(),
  mockAddCredits: vi.fn(),
  mockCreatePurchaseReceipt: vi.fn(),
  mockCreateRefundQueueItem: vi.fn(),
  mockGetPurchaseReceiptBySessionId: vi.fn(),
  mockMarkReceiptEmailSent: vi.fn(),
  mockMarkReceiptEmailError: vi.fn(),
  mockGetUserById: vi.fn(),
  mockGetCreditsBalance: vi.fn(),
}));

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    stripeEventExists: mockStripeEventExists,
    recordStripeEvent: mockRecordStripeEvent,
    addCredits: mockAddCredits,
    createPurchaseReceipt: mockCreatePurchaseReceipt,
    createRefundQueueItem: mockCreateRefundQueueItem,
    getPurchaseReceiptBySessionId: mockGetPurchaseReceiptBySessionId,
    markReceiptEmailSent: mockMarkReceiptEmailSent,
    markReceiptEmailError: mockMarkReceiptEmailError,
    getUserById: mockGetUserById,
    getCreditsBalance: mockGetCreditsBalance,
  };
});

vi.mock("./email", () => ({
  sendPurchaseConfirmationEmail: vi.fn().mockResolvedValue({ sent: false, error: "mocked" }),
}));

// ─── Runtime webhook secret ───────────────────────────────────────────────────
// Use the actual secret already in the environment (injected by the platform).
// Both the test (generateTestHeaderString) and the handler (constructEvent) use
// the same secret, so signatures always match regardless of environment.
const RUNTIME_WEBHOOK_SECRET =
  process.env.STRIPE_WEBHOOK_SECRET_V2 ||
  process.env.STRIPE_WEBHOOK_SECRET ||
  "whsec_test_fallback_for_ci_only";

// ─── Stripe instance for generating test headers ──────────────────────────────
const stripeInstance = new Stripe("sk_test_dummy_key_for_header_generation");

// ─── Build a signed Stripe event fixture using Stripe's own algorithm ─────────
// Returns bodyStr (the raw JSON string) and the matching signature header.
// IMPORTANT: pass bodyStr (not a Buffer) to supertest's .send() so the exact
// bytes are preserved. express.raw() will capture them as a Buffer on the server.

function buildSignedPayload(
  payload: object,
  secret: string
): { bodyStr: string; signature: string } {
  const bodyStr = JSON.stringify(payload);
  const signature = stripeInstance.webhooks.generateTestHeaderString({
    payload: bodyStr,
    secret,
  });
  return { bodyStr, signature };
}

// ─── Sample checkout.session.completed event ──────────────────────────────────

const checkoutEvent = {
  id: "evt_prod_rawbody_001",
  object: "event",
  type: "checkout.session.completed",
  created: Math.floor(Date.now() / 1000),
  livemode: false,
  pending_webhooks: 1,
  request: null,
  api_version: "2026-01-28.clover",
  data: {
    object: {
      id: "cs_test_rawbody_session_001",
      object: "checkout.session",
      client_reference_id: "42",
      metadata: { user_id: "42", pack_id: "pro", credits: "15" },
      amount_total: 999,
      currency: "usd",
      payment_intent: "pi_test_rawbody_001",
      payment_status: "paid",
    },
  },
};

// ─── Build test Express app ───────────────────────────────────────────────────

function buildTestApp() {
  const app = express();
  // Register webhook BEFORE global json middleware (mirrors production setup)
  registerStripeWebhook(app);
  app.use(express.json());
  return app;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("PATCH: Stripe Webhook Raw Body Signature Verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStripeEventExists.mockResolvedValue(false);
    mockRecordStripeEvent.mockResolvedValue(undefined);
    mockAddCredits.mockResolvedValue(undefined);
    mockCreatePurchaseReceipt.mockResolvedValue(undefined);
    mockCreateRefundQueueItem.mockResolvedValue(undefined);
    mockGetPurchaseReceiptBySessionId.mockResolvedValue(null);
    mockMarkReceiptEmailSent.mockResolvedValue(undefined);
    mockMarkReceiptEmailError.mockResolvedValue(undefined);
    mockGetUserById.mockResolvedValue(null);
    mockGetCreditsBalance.mockResolvedValue(0);
  });

  // ── A) Source uses express.raw({ type: () => true }) ─────────────────────
  it("A) stripeWebhook.ts uses express.raw({ type: () => true })", () => {
    const webhookSrc = fs.readFileSync(
      path.join(__dirname, "stripeWebhook.ts"),
      "utf-8"
    );
    expect(webhookSrc).toContain("type: () => true");
    // Should NOT use the narrow string form that misses charset variants
    expect(webhookSrc).not.toContain('type: "application/json"');
  });

  // ── B) Valid signed payload with application/json returns 200 ────────────
  it("B) Valid signed payload with Content-Type: application/json returns 200 { received: true }", async () => {
    const app = buildTestApp();
    const { bodyStr, signature } = buildSignedPayload(checkoutEvent, RUNTIME_WEBHOOK_SECRET);

    const res = await request(app)
      .post("/api/stripe/webhook")
      .set("Content-Type", "application/json")
      .set("stripe-signature", signature)
      .send(bodyStr);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: true });
  });

  // ── C) Valid signed payload with charset variant returns 200 ─────────────
  it("C) Valid signed payload with Content-Type: application/json; charset=utf-8 returns 200", async () => {
    const app = buildTestApp();
    const { bodyStr, signature } = buildSignedPayload(checkoutEvent, RUNTIME_WEBHOOK_SECRET);

    const res = await request(app)
      .post("/api/stripe/webhook")
      .set("Content-Type", "application/json; charset=utf-8")
      .set("stripe-signature", signature)
      .send(bodyStr);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: true });
  });

  // ── D) Tampered payload returns 400 ──────────────────────────────────────
  it("D) Tampered payload (body modified after signing) returns 400", async () => {
    const app = buildTestApp();
    const { signature } = buildSignedPayload(checkoutEvent, RUNTIME_WEBHOOK_SECRET);
    // Send a different body than what was signed
    const tamperedBody = JSON.stringify({ ...checkoutEvent, id: "evt_tampered" });

    const res = await request(app)
      .post("/api/stripe/webhook")
      .set("Content-Type", "application/json")
      .set("stripe-signature", signature)
      .send(tamperedBody);

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("Webhook Error");
    expect(res.body.debug).toBeUndefined();
  });

  // ── E) Missing stripe-signature header returns 400 ────────────────────────
  it("E) Missing stripe-signature header returns 400", async () => {
    const app = buildTestApp();
    const { bodyStr } = buildSignedPayload(checkoutEvent, RUNTIME_WEBHOOK_SECRET);

    const res = await request(app)
      .post("/api/stripe/webhook")
      .set("Content-Type", "application/json")
      // No stripe-signature header
      .send(bodyStr);

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("Webhook Error");
    expect(res.body.debug).toBeUndefined();
  });

  // ── F) Valid checkout.session.completed returns { received: true } ────────
  it("F) Valid checkout.session.completed event returns { received: true } and grants credits", async () => {
    const app = buildTestApp();
    const { bodyStr, signature } = buildSignedPayload(checkoutEvent, RUNTIME_WEBHOOK_SECRET);

    const res = await request(app)
      .post("/api/stripe/webhook")
      .set("Content-Type", "application/json")
      .set("stripe-signature", signature)
      .send(bodyStr);

    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
    expect(mockAddCredits).toHaveBeenCalledWith(42, 15, "Purchase: pro", "credit_purchase");
  });

  // ── G) Test event (evt_test_*) returns { verified: true } ─────────────────
  it("G) Test event (evt_test_*) returns 200 { verified: true }", async () => {
    const app = buildTestApp();
    const testEvent = { ...checkoutEvent, id: "evt_test_rawbody_001" };
    const { bodyStr, signature } = buildSignedPayload(testEvent, RUNTIME_WEBHOOK_SECRET);

    const res = await request(app)
      .post("/api/stripe/webhook")
      .set("Content-Type", "application/json")
      .set("stripe-signature", signature)
      .send(bodyStr);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ verified: true });
  });

  // ── H) req.body is a Buffer — proven by successful signature verification ──
  it("H) req.body is a Buffer (not a parsed object) — proven by successful signature verification", async () => {
    // If req.body were a parsed JS object (not a Buffer), constructEvent would throw
    // "No signatures found matching the expected signature for payload".
    // A successful 200 response proves req.body was a raw Buffer.
    const app = buildTestApp();
    const { bodyStr, signature } = buildSignedPayload(checkoutEvent, RUNTIME_WEBHOOK_SECRET);

    const res = await request(app)
      .post("/api/stripe/webhook")
      .set("Content-Type", "application/json")
      .set("stripe-signature", signature)
      .send(bodyStr);

    // 200 = constructEvent succeeded = body was a Buffer
    expect(res.status).toBe(200);
  });

  // ── I) Source check: express.raw type is () => true ───────────────────────
  it("I) stripeWebhook.ts does not use the narrow type: 'application/json' string for express.raw", () => {
    const webhookSrc = fs.readFileSync(
      path.join(__dirname, "stripeWebhook.ts"),
      "utf-8"
    );
    const rawCallMatch = webhookSrc.match(/express\.raw\(\{[^}]+\}\)/);
    expect(rawCallMatch).not.toBeNull();
    expect(rawCallMatch![0]).toContain("() => true");
  });

  // ── J) server/_core/index.ts registers webhook before app.use(express.json()) ──
  it("J) server/_core/index.ts calls registerStripeWebhook before app.use(express.json())", () => {
    const indexSrc = fs.readFileSync(
      path.join(__dirname, "_core/index.ts"),
      "utf-8"
    );
    const webhookPos = indexSrc.indexOf("registerStripeWebhook(app)");
    // Use "app.use(express.json(" to skip comments that also contain "express.json("
    const jsonPos = indexSrc.indexOf("app.use(express.json(");
    expect(webhookPos).toBeGreaterThan(-1);
    expect(jsonPos).toBeGreaterThan(-1);
    expect(webhookPos).toBeLessThan(jsonPos);
  });
});
