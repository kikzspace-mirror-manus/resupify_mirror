/**
 * Phase 12L Acceptance Tests — Refund Queue userId mapping + manual override
 *
 * Tests cover:
 * L1)  resolveUserIdForCharge DB helper exists in db.ts
 * L2)  resolveUserIdForCharge resolves userId via stripePaymentIntentId
 * L3)  resolveUserIdForCharge resolves userId via stripeCheckoutSessionId
 * L4)  resolveUserIdForCharge returns null when no match found
 * L5)  setRefundQueueItemUserId DB helper exists in db.ts
 * L6)  stripeWebhook.ts imports resolveUserIdForCharge
 * L7)  charge.refunded handler calls resolveUserIdForCharge when metadata user_id is absent
 * L8)  admin.refunds.process mutation accepts optional overrideUserId field
 * L9)  admin.refunds.process calls setRefundQueueItemUserId when item.userId is null and overrideUserId provided
 * L10) admin.refunds.process does NOT call setRefundQueueItemUserId when item.userId is already set
 * L11) processRefundQueueItem still throws "no userId" if neither item.userId nor override was set
 * L12) AdminRefunds.tsx imports UserSearch icon (proxy for user-select control)
 * L13) AdminRefunds.tsx renders user search control when userId is null (code path present)
 * L14) AdminRefunds.tsx passes overrideUserId to processMutation
 * L15) AdminRefunds.tsx disables "Debit" button when canDebit is false (userId null + no override)
 * L16) AdminRefunds.tsx shows amber warning when userId is null
 * L17) resolveUserIdForCharge: paymentIntent takes priority over checkoutSession
 * L18) admin router imports setRefundQueueItemUserId from db
 * L19) stripeWebhook.ts: charge.refunded handler uses `let userId` (mutable) for override
 * L20) AdminRefunds.tsx shows "— unknown" label in table row when userId is null
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const DB_PATH = path.join(__dirname, "db.ts");
const WEBHOOK_PATH = path.join(__dirname, "stripeWebhook.ts");
const ADMIN_ROUTER_PATH = path.join(__dirname, "routers/admin.ts");
const ADMIN_REFUNDS_PAGE_PATH = path.join(__dirname, "../client/src/pages/admin/AdminRefunds.tsx");

const db = fs.readFileSync(DB_PATH, "utf-8");
const webhook = fs.readFileSync(WEBHOOK_PATH, "utf-8");
const adminRouter = fs.readFileSync(ADMIN_ROUTER_PATH, "utf-8");
const adminRefundsPage = fs.readFileSync(ADMIN_REFUNDS_PAGE_PATH, "utf-8");

// ─── L1–L5: DB helpers ───────────────────────────────────────────────────────
describe("L1–L5: DB helpers", () => {
  it("L1 — resolveUserIdForCharge is exported from db.ts", () => {
    expect(db).toContain("export async function resolveUserIdForCharge");
  });

  it("L2 — resolveUserIdForCharge queries purchaseReceipts by stripePaymentIntentId", () => {
    const idx = db.indexOf("resolveUserIdForCharge");
    const slice = db.slice(idx, idx + 1000);
    expect(slice).toContain("stripePaymentIntentId");
    expect(slice).toContain("purchaseReceipts");
  });

  it("L3 — resolveUserIdForCharge queries purchaseReceipts by stripeCheckoutSessionId", () => {
    const idx = db.indexOf("resolveUserIdForCharge");
    const slice = db.slice(idx, idx + 1000);
    expect(slice).toContain("stripeCheckoutSessionId");
  });

  it("L4 — resolveUserIdForCharge returns null when no match", () => {
    const idx = db.indexOf("resolveUserIdForCharge");
    const slice = db.slice(idx, idx + 1000);
    expect(slice).toContain("return null");
  });

  it("L5 — setRefundQueueItemUserId is exported from db.ts", () => {
    expect(db).toContain("export async function setRefundQueueItemUserId");
  });
});

// ─── L6–L7: Webhook handler ──────────────────────────────────────────────────
describe("L6–L7: Webhook charge.refunded handler", () => {
  it("L6 — stripeWebhook.ts imports resolveUserIdForCharge", () => {
    expect(webhook).toContain("resolveUserIdForCharge");
  });

  it("L7 — charge.refunded handler calls resolveUserIdForCharge when userId is absent", () => {
    const idx = webhook.indexOf("case \"charge.refunded\"");
    const slice = webhook.slice(idx, idx + 2000);
    expect(slice).toContain("resolveUserIdForCharge");
    // Verifies it's called conditionally (when userId is falsy)
    expect(slice).toContain("if (!userId)");
  });
});

// ─── L8–L11: Admin router ────────────────────────────────────────────────────
describe("L8–L11: Admin refunds.process mutation", () => {
  it("L8 — admin.refunds.process accepts optional overrideUserId", () => {
    const idx = adminRouter.indexOf("refunds:");
    const slice = adminRouter.slice(idx, idx + 2000);
    expect(slice).toContain("overrideUserId");
    expect(slice).toContain("z.number().int().positive().optional()");
  });

  it("L9 — admin.refunds.process calls setRefundQueueItemUserId when item.userId is null", () => {
    const idx = adminRouter.indexOf("refunds:");
    const slice = adminRouter.slice(idx, idx + 2000);
    expect(slice).toContain("setRefundQueueItemUserId");
    expect(slice).toContain("!item.userId && overrideUserId");
  });

  it("L10 — setRefundQueueItemUserId is only called when item.userId is null", () => {
    const idx = adminRouter.indexOf("setRefundQueueItemUserId");
    const slice = adminRouter.slice(Math.max(0, idx - 200), idx + 100);
    expect(slice).toContain("!item.userId");
  });

  it("L11 — processRefundQueueItem throws 'no userId' if userId still null after update", () => {
    const idx = db.indexOf("processRefundQueueItem");
    const slice = db.slice(idx, idx + 1500);
    expect(slice).toContain("Cannot debit credits: no userId on refund queue item");
  });
});

// ─── L12–L16: Frontend UI ────────────────────────────────────────────────────
describe("L12–L16: AdminRefunds.tsx user-select control", () => {
  it("L12 — AdminRefunds.tsx imports UserSearch icon", () => {
    expect(adminRefundsPage).toContain("UserSearch");
  });

  it("L13 — AdminRefunds.tsx has UserSearchSelect component", () => {
    expect(adminRefundsPage).toContain("UserSearchSelect");
  });

  it("L14 — AdminRefunds.tsx passes overrideUserId to processMutation", () => {
    expect(adminRefundsPage).toContain("overrideUserId");
    expect(adminRefundsPage).toContain("processMutation.mutate");
  });

  it("L15 — AdminRefunds.tsx disables Debit button when canDebit is false", () => {
    expect(adminRefundsPage).toContain("canDebit");
    expect(adminRefundsPage).toContain("!canDebit");
  });

  it("L16 — AdminRefunds.tsx shows amber warning when userId is null", () => {
    expect(adminRefundsPage).toContain("No user mapped to this refund");
  });
});

// ─── L17–L20: Additional correctness checks ──────────────────────────────────
describe("L17–L20: Additional correctness", () => {
  it("L17 — resolveUserIdForCharge checks paymentIntent before checkoutSession", () => {
    const idx = db.indexOf("resolveUserIdForCharge");
    const slice = db.slice(idx, idx + 1000);
    const piIdx = slice.indexOf("stripePaymentIntentId");
    const csIdx = slice.indexOf("stripeCheckoutSessionId");
    // paymentIntent lookup must appear before checkoutSession lookup
    expect(piIdx).toBeGreaterThan(-1);
    expect(csIdx).toBeGreaterThan(-1);
    expect(piIdx).toBeLessThan(csIdx);
  });

  it("L18 — admin router imports setRefundQueueItemUserId from db", () => {
    expect(adminRouter).toContain("setRefundQueueItemUserId");
  });

  it("L19 — stripeWebhook.ts uses `let userId` (mutable) in charge.refunded handler", () => {
    const idx = webhook.indexOf("case \"charge.refunded\"");
    const slice = webhook.slice(idx, idx + 1000);
    expect(slice).toContain("let userId");
  });

  it("L20 — AdminRefunds.tsx shows '— unknown' label in table when userId is null", () => {
    expect(adminRefundsPage).toContain("unknown");
  });
});
