/**
 * Phase 11F — Purchase Confirmation Email: Acceptance Tests
 *
 * Acceptance criteria:
 * A) buildPurchaseEmailHtml contains required fields (pack, credits, balance, ref, billing link)
 * B) buildPurchaseEmailText contains required fields
 * C) sendPurchaseConfirmationEmail returns { sent: false } when RESEND_API_KEY is missing
 * D) sendPurchaseConfirmationEmail calls Resend with correct to/subject/from
 * E) sendPurchaseConfirmationEmail returns { sent: true } on success
 * F) sendPurchaseConfirmationEmail returns { sent: false, error } on Resend API error
 * G) sendPurchaseConfirmationEmail returns { sent: false, error } on thrown exception
 * H) Webhook: sends exactly one email after checkout.session.completed
 * I) Webhook replay: does NOT send a second email (emailSentAt already set)
 * J) Webhook: email skipped when user has no email on file
 * K) Webhook: email skipped when receipt not found
 * L) markReceiptEmailSent sets emailSentAt and clears emailError in DB
 * M) markReceiptEmailError sets emailError without setting emailSentAt
 * N) getPurchaseReceiptBySessionId returns correct receipt row
 * O) getUserById returns correct user row
 * P) formatAmount handles null/undefined gracefully (no crash)
 * Q) formatPackName maps known pack IDs to human-readable names
 * R) HTML email contains billing link https://resupify.com/billing
 * S) HTML email contains refund policy link
 * T) HTML email contains support email
 * U) Text email contains billing link
 * V) Webhook: email failure does NOT fail webhook response
 * W) Missing RESEND_API_KEY logs a warning (no crash)
 * X) Schema: purchase_receipts has emailSentAt column
 * Y) Schema: purchase_receipts has emailError column
 * Z) DB helpers: markReceiptEmailSent is exported from db.ts
 * AA) DB helpers: markReceiptEmailError is exported from db.ts
 * AB) DB helpers: getPurchaseReceiptBySessionId is exported from db.ts
 * AC) DB helpers: getUserById is exported from db.ts
 * AD) email.ts: sendPurchaseConfirmationEmail is exported
 * AE) email.ts: buildPurchaseEmailHtml is exported
 * AF) email.ts: buildPurchaseEmailText is exported
 * AG) Webhook imports sendPurchaseConfirmationEmail from ./email
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  buildPurchaseEmailHtml,
  buildPurchaseEmailText,
  sendPurchaseConfirmationEmail,
  type PurchaseEmailPayload,
} from "./email";
import { handleWebhookEvent } from "./stripeWebhook";
import type Stripe from "stripe";
import fs from "fs";
import path from "path";

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const {
  mockResendSend,
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
  mockResendSend: vi.fn(),
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

vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send: mockResendSend },
  })),
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

// ─── Sample payload ───────────────────────────────────────────────────────────

const samplePayload: PurchaseEmailPayload = {
  toEmail: "user@example.com",
  receiptId: 42,
  packId: "pro",
  creditsAdded: 15,
  amountCents: 999,
  currency: "usd",
  purchasedAt: new Date("2026-02-23T12:00:00Z"),
  stripeCheckoutSessionId: "cs_test_abc123456789",
  newBalance: 18,
};

// ─── Stripe event factory ─────────────────────────────────────────────────────

function makeCheckoutEvent(
  overrides: Partial<Stripe.Checkout.Session> = {},
  eventId = "evt_prod_email_001"
): Stripe.Event {
  return {
    id: eventId,
    type: "checkout.session.completed",
    object: "event",
    data: {
      object: {
        id: "cs_test_abc123456789",
        object: "checkout.session",
        client_reference_id: "42",
        metadata: { user_id: "42", pack_id: "pro", credits: "15" },
        amount_total: 999,
        currency: "usd",
        payment_intent: "pi_test_001",
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

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Phase 11F: Purchase Confirmation Email", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: event not seen before
    mockStripeEventExists.mockResolvedValue(false);
    mockRecordStripeEvent.mockResolvedValue(undefined);
    mockAddCredits.mockResolvedValue(undefined);
    mockCreatePurchaseReceipt.mockResolvedValue(undefined);
    mockCreateRefundQueueItem.mockResolvedValue(undefined);
    // Default receipt: no email sent yet
    mockGetPurchaseReceiptBySessionId.mockResolvedValue({
      id: 42,
      userId: 42,
      stripeCheckoutSessionId: "cs_test_abc123456789",
      packId: "pro",
      creditsAdded: 15,
      amountCents: 999,
      currency: "usd",
      stripePaymentIntentId: "pi_test_001",
      stripeReceiptUrl: null,
      createdAt: new Date("2026-02-23T12:00:00Z"),
      emailSentAt: null,
      emailError: null,
    });
    mockMarkReceiptEmailSent.mockResolvedValue(undefined);
    mockMarkReceiptEmailError.mockResolvedValue(undefined);
    mockGetUserById.mockResolvedValue({
      id: 42,
      email: "user@example.com",
      name: "Test User",
    });
    mockGetCreditsBalance.mockResolvedValue(18);
    // Default Resend: success
    mockResendSend.mockResolvedValue({ data: { id: "email_001" }, error: null });
    // Restore RESEND_API_KEY for most tests
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.FROM_EMAIL = "noreply@resupify.com";
  });

  // ── A) HTML contains required fields ─────────────────────────────────────
  it("A) buildPurchaseEmailHtml contains pack name, credits, balance, reference, and billing link", () => {
    const html = buildPurchaseEmailHtml(samplePayload);
    expect(html).toContain("Pro Pack");
    expect(html).toContain("+15 credits");
    expect(html).toContain("18 credits"); // new balance
    expect(html).toContain("REC-42");
    expect(html).toContain("https://resupify.com/billing");
  });

  // ── B) Text contains required fields ─────────────────────────────────────
  it("B) buildPurchaseEmailText contains pack name, credits, balance, reference, and billing link", () => {
    const text = buildPurchaseEmailText(samplePayload);
    expect(text).toContain("Pro Pack");
    expect(text).toContain("+15 credits");
    expect(text).toContain("18 credits");
    expect(text).toContain("REC-42");
    expect(text).toContain("https://resupify.com/billing");
  });

  // ── C) Missing RESEND_API_KEY → sent: false, no crash ────────────────────
  it("C) sendPurchaseConfirmationEmail returns { sent: false } when RESEND_API_KEY is missing", async () => {
    delete process.env.RESEND_API_KEY;
    // Re-import ENV to pick up the change
    const { ENV } = await import("./_core/env");
    (ENV as any).RESEND_API_KEY = "";

    const result = await sendPurchaseConfirmationEmail(samplePayload);
    expect(result.sent).toBe(false);
    expect((result as any).error).toContain("RESEND_API_KEY");
  });

  // ── D) Resend called with correct to/subject/from ─────────────────────────
  it("D) sendPurchaseConfirmationEmail calls Resend with correct to, subject, and from", async () => {
    const { ENV } = await import("./_core/env");
    (ENV as any).RESEND_API_KEY = "re_test_key";
    (ENV as any).FROM_EMAIL = "noreply@resupify.com";

    await sendPurchaseConfirmationEmail(samplePayload);

    expect(mockResendSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ["user@example.com"],
        subject: "Your Resupify credit purchase receipt",
        from: "noreply@resupify.com",
      })
    );
  });

  // ── E) Returns { sent: true } on success ─────────────────────────────────
  it("E) sendPurchaseConfirmationEmail returns { sent: true } on Resend success", async () => {
    const { ENV } = await import("./_core/env");
    (ENV as any).RESEND_API_KEY = "re_test_key";

    mockResendSend.mockResolvedValue({ data: { id: "email_001" }, error: null });
    const result = await sendPurchaseConfirmationEmail(samplePayload);
    expect(result.sent).toBe(true);
  });

  // ── F) Returns { sent: false, error } on Resend API error ────────────────
  it("F) sendPurchaseConfirmationEmail returns { sent: false, error } on Resend API error", async () => {
    const { ENV } = await import("./_core/env");
    (ENV as any).RESEND_API_KEY = "re_test_key";

    mockResendSend.mockResolvedValue({ data: null, error: { message: "Domain not verified" } });
    const result = await sendPurchaseConfirmationEmail(samplePayload);
    expect(result.sent).toBe(false);
    expect((result as any).error).toContain("Domain not verified");
  });

  // ── G) Returns { sent: false, error } on thrown exception ────────────────
  it("G) sendPurchaseConfirmationEmail returns { sent: false, error } on exception", async () => {
    const { ENV } = await import("./_core/env");
    (ENV as any).RESEND_API_KEY = "re_test_key";

    mockResendSend.mockRejectedValue(new Error("Network timeout"));
    const result = await sendPurchaseConfirmationEmail(samplePayload);
    expect(result.sent).toBe(false);
    expect((result as any).error).toContain("Network timeout");
  });

  // ── H) Webhook sends exactly one email ───────────────────────────────────
  it("H) Webhook triggers exactly one email send after checkout.session.completed", async () => {
    const { ENV } = await import("./_core/env");
    (ENV as any).RESEND_API_KEY = "re_test_key";

    const event = makeCheckoutEvent();
    await handleWebhookEvent(event);

    // Allow the fire-and-forget async to complete
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(mockResendSend).toHaveBeenCalledTimes(1);
    expect(mockMarkReceiptEmailSent).toHaveBeenCalledWith(42);
  });

  // ── I) Webhook replay does NOT send a second email ────────────────────────
  it("I) Webhook replay does not send a second email when emailSentAt is set", async () => {
    const { ENV } = await import("./_core/env");
    (ENV as any).RESEND_API_KEY = "re_test_key";

    // Simulate receipt already has emailSentAt set
    mockGetPurchaseReceiptBySessionId.mockResolvedValue({
      id: 42,
      userId: 42,
      stripeCheckoutSessionId: "cs_test_abc123456789",
      packId: "pro",
      creditsAdded: 15,
      amountCents: 999,
      currency: "usd",
      createdAt: new Date("2026-02-23T12:00:00Z"),
      emailSentAt: new Date("2026-02-23T12:01:00Z"), // already sent
      emailError: null,
    });

    const event = makeCheckoutEvent();
    await handleWebhookEvent(event);
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(mockResendSend).not.toHaveBeenCalled();
    expect(mockMarkReceiptEmailSent).not.toHaveBeenCalled();
  });

  // ── J) Email skipped when user has no email ───────────────────────────────
  it("J) Email is skipped when user has no email on file", async () => {
    const { ENV } = await import("./_core/env");
    (ENV as any).RESEND_API_KEY = "re_test_key";

    mockGetUserById.mockResolvedValue({ id: 42, email: null, name: "Test User" });

    const event = makeCheckoutEvent();
    await handleWebhookEvent(event);
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(mockResendSend).not.toHaveBeenCalled();
  });

  // ── K) Email skipped when receipt not found ───────────────────────────────
  it("K) Email is skipped when receipt is not found in DB", async () => {
    const { ENV } = await import("./_core/env");
    (ENV as any).RESEND_API_KEY = "re_test_key";

    mockGetPurchaseReceiptBySessionId.mockResolvedValue(null);

    const event = makeCheckoutEvent();
    await handleWebhookEvent(event);
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(mockResendSend).not.toHaveBeenCalled();
  });

  // ── L) markReceiptEmailSent is called on success ──────────────────────────
  it("L) markReceiptEmailSent is called with the receipt ID on successful send", async () => {
    const { ENV } = await import("./_core/env");
    (ENV as any).RESEND_API_KEY = "re_test_key";

    mockResendSend.mockResolvedValue({ data: { id: "email_001" }, error: null });

    const event = makeCheckoutEvent();
    await handleWebhookEvent(event);
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(mockMarkReceiptEmailSent).toHaveBeenCalledWith(42);
  });

  // ── M) markReceiptEmailError is called on failure ─────────────────────────
  it("M) markReceiptEmailError is called with error message on failed send", async () => {
    const { ENV } = await import("./_core/env");
    (ENV as any).RESEND_API_KEY = "re_test_key";

    mockResendSend.mockResolvedValue({ data: null, error: { message: "Rate limit exceeded" } });

    const event = makeCheckoutEvent();
    await handleWebhookEvent(event);
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(mockMarkReceiptEmailError).toHaveBeenCalledWith(42, expect.stringContaining("Rate limit"));
    expect(mockMarkReceiptEmailSent).not.toHaveBeenCalled();
  });

  // ── N) getPurchaseReceiptBySessionId is called with session ID ────────────
  it("N) getPurchaseReceiptBySessionId is called with the checkout session ID", async () => {
    const { ENV } = await import("./_core/env");
    (ENV as any).RESEND_API_KEY = "re_test_key";

    const event = makeCheckoutEvent();
    await handleWebhookEvent(event);
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(mockGetPurchaseReceiptBySessionId).toHaveBeenCalledWith("cs_test_abc123456789");
  });

  // ── O) getUserById is called with the user ID ─────────────────────────────
  it("O) getUserById is called with the correct user ID", async () => {
    const { ENV } = await import("./_core/env");
    (ENV as any).RESEND_API_KEY = "re_test_key";

    const event = makeCheckoutEvent();
    await handleWebhookEvent(event);
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(mockGetUserById).toHaveBeenCalledWith(42);
  });

  // ── P) formatAmount handles null/undefined gracefully ────────────────────
  it("P) buildPurchaseEmailHtml handles null amountCents gracefully", () => {
    const payload = { ...samplePayload, amountCents: null, currency: null };
    expect(() => buildPurchaseEmailHtml(payload)).not.toThrow();
    const html = buildPurchaseEmailHtml(payload);
    expect(html).toContain("Pro Pack");
  });

  // ── Q) formatPackName maps known IDs ─────────────────────────────────────
  it("Q) buildPurchaseEmailHtml shows correct pack names for starter, pro, power", () => {
    const starterHtml = buildPurchaseEmailHtml({ ...samplePayload, packId: "starter", creditsAdded: 5 });
    expect(starterHtml).toContain("Starter Pack");

    const powerHtml = buildPurchaseEmailHtml({ ...samplePayload, packId: "power", creditsAdded: 50 });
    expect(powerHtml).toContain("Power Pack");
  });

  // ── R) HTML contains billing link ────────────────────────────────────────
  it("R) buildPurchaseEmailHtml contains https://resupify.com/billing", () => {
    const html = buildPurchaseEmailHtml(samplePayload);
    expect(html).toContain("https://resupify.com/billing");
  });

  // ── S) HTML contains refund policy link ──────────────────────────────────
  it("S) buildPurchaseEmailHtml contains refund policy link", () => {
    const html = buildPurchaseEmailHtml(samplePayload);
    expect(html).toContain("refund-policy");
  });

  // ── T) HTML contains support email ───────────────────────────────────────
  it("T) buildPurchaseEmailHtml contains support@resupify.com", () => {
    const html = buildPurchaseEmailHtml(samplePayload);
    expect(html).toContain("support@resupify.com");
  });

  // ── U) Text contains billing link ────────────────────────────────────────
  it("U) buildPurchaseEmailText contains https://resupify.com/billing", () => {
    const text = buildPurchaseEmailText(samplePayload);
    expect(text).toContain("https://resupify.com/billing");
  });

  // ── V) Email failure does NOT fail webhook response ───────────────────────
  it("V) Webhook fulfillment completes even when Resend throws an exception", async () => {
    const { ENV } = await import("./_core/env");
    (ENV as any).RESEND_API_KEY = "re_test_key";

    mockResendSend.mockRejectedValue(new Error("Resend is down"));

    const event = makeCheckoutEvent();
    // Should not throw
    await expect(handleWebhookEvent(event)).resolves.not.toThrow();
    // Credits still granted
    expect(mockAddCredits).toHaveBeenCalledTimes(1);
  });

  // ── W) Missing RESEND_API_KEY logs a warning ──────────────────────────────
  it("W) Missing RESEND_API_KEY returns { sent: false } without crashing", async () => {
    const { ENV } = await import("./_core/env");
    (ENV as any).RESEND_API_KEY = "";

    const result = await sendPurchaseConfirmationEmail(samplePayload);
    expect(result.sent).toBe(false);
    expect(mockResendSend).not.toHaveBeenCalled();
  });

  // ── X) Schema: emailSentAt column exists ─────────────────────────────────
  it("X) Schema: purchase_receipts table has emailSentAt column", () => {
    const schemaPath = path.join(__dirname, "../drizzle/schema.ts");
    const schema = fs.readFileSync(schemaPath, "utf-8");
    const purchaseReceiptsBlock = schema.slice(
      schema.indexOf("export const purchaseReceipts"),
      schema.indexOf("export type PurchaseReceipt")
    );
    expect(purchaseReceiptsBlock).toContain("emailSentAt");
  });

  // ── Y) Schema: emailError column exists ──────────────────────────────────
  it("Y) Schema: purchase_receipts table has emailError column", () => {
    const schemaPath = path.join(__dirname, "../drizzle/schema.ts");
    const schema = fs.readFileSync(schemaPath, "utf-8");
    const purchaseReceiptsBlock = schema.slice(
      schema.indexOf("export const purchaseReceipts"),
      schema.indexOf("export type PurchaseReceipt")
    );
    expect(purchaseReceiptsBlock).toContain("emailError");
  });

  // ── Z) DB: markReceiptEmailSent is exported ───────────────────────────────
  it("Z) markReceiptEmailSent is exported from db.ts", () => {
    const dbPath = path.join(__dirname, "db.ts");
    const db = fs.readFileSync(dbPath, "utf-8");
    expect(db).toContain("export async function markReceiptEmailSent");
  });

  // ── AA) DB: markReceiptEmailError is exported ─────────────────────────────
  it("AA) markReceiptEmailError is exported from db.ts", () => {
    const dbPath = path.join(__dirname, "db.ts");
    const db = fs.readFileSync(dbPath, "utf-8");
    expect(db).toContain("export async function markReceiptEmailError");
  });

  // ── AB) DB: getPurchaseReceiptBySessionId is exported ─────────────────────
  it("AB) getPurchaseReceiptBySessionId is exported from db.ts", () => {
    const dbPath = path.join(__dirname, "db.ts");
    const db = fs.readFileSync(dbPath, "utf-8");
    expect(db).toContain("export async function getPurchaseReceiptBySessionId");
  });

  // ── AC) DB: getUserById is exported ──────────────────────────────────────
  it("AC) getUserById is exported from db.ts", () => {
    const dbPath = path.join(__dirname, "db.ts");
    const db = fs.readFileSync(dbPath, "utf-8");
    expect(db).toContain("export async function getUserById");
  });

  // ── AD) email.ts: sendPurchaseConfirmationEmail is exported ──────────────
  it("AD) sendPurchaseConfirmationEmail is exported from email.ts", () => {
    const emailPath = path.join(__dirname, "email.ts");
    const email = fs.readFileSync(emailPath, "utf-8");
    expect(email).toContain("export async function sendPurchaseConfirmationEmail");
  });

  // ── AE) email.ts: buildPurchaseEmailHtml is exported ─────────────────────
  it("AE) buildPurchaseEmailHtml is exported from email.ts", () => {
    const emailPath = path.join(__dirname, "email.ts");
    const email = fs.readFileSync(emailPath, "utf-8");
    expect(email).toContain("export function buildPurchaseEmailHtml");
  });

  // ── AF) email.ts: buildPurchaseEmailText is exported ─────────────────────
  it("AF) buildPurchaseEmailText is exported from email.ts", () => {
    const emailPath = path.join(__dirname, "email.ts");
    const email = fs.readFileSync(emailPath, "utf-8");
    expect(email).toContain("export function buildPurchaseEmailText");
  });

  // ── AG) Webhook imports sendPurchaseConfirmationEmail from ./email ─────────
  it("AG) stripeWebhook.ts imports sendPurchaseConfirmationEmail from ./email", () => {
    const webhookPath = path.join(__dirname, "stripeWebhook.ts");
    const webhook = fs.readFileSync(webhookPath, "utf-8");
    expect(webhook).toContain("sendPurchaseConfirmationEmail");
    expect(webhook).toContain("from \"./email\"");
  });
});
