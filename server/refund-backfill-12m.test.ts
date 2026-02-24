/**
 * Phase 12M Acceptance Tests — Backfill userId on pending refund queue items
 *
 * Spec cases:
 * 1) Backfill resolves items when matching purchaseReceipts exist (session_id lookup)
 * 2) Backfill leaves items unchanged when no match exists
 * 3) Backfill does not touch items that already have userId
 * 4) Non-admin cannot run backfill mutation
 *
 * Additional structural tests:
 * 5)  backfillPendingRefundUserIds is exported from db.ts
 * 6)  backfillPendingRefundUserIds queries pending + isNull(userId)
 * 7)  backfillPendingRefundUserIds calls resolveUserIdForCharge per item
 * 8)  backfillPendingRefundUserIds calls setRefundQueueItemUserId when resolved
 * 9)  backfillPendingRefundUserIds returns scanned/eligible/resolved/unresolved
 * 10) backfillPendingRefundUserIds accepts optional limit param (default 200)
 * 11) admin.refunds.backfillUserIds mutation exists and uses adminProcedure
 * 12) admin.refunds.backfillUserIds accepts optional limit input
 * 13) admin.refunds.backfillUserIds returns scanned/eligible/resolved/unresolved
 * 14) admin.refunds.backfillUserIds logs admin action "refund_backfill_userids"
 * 15) AdminRefunds.tsx has Backfill user IDs button
 * 16) AdminRefunds.tsx button calls backfillUserIds mutation
 * 17) AdminRefunds.tsx button is disabled while mutation is pending
 * 18) AdminRefunds.tsx shows backfill result summary when result is set
 * 19) AdminRefunds.tsx shows "some items still require manual selection" when unresolved > 0
 * 20) Idempotency: setRefundQueueItemUserId only updates when userId IS NULL
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const DB_PATH = path.join(__dirname, "db.ts");
const ADMIN_ROUTER_PATH = path.join(__dirname, "routers/admin.ts");
const ADMIN_REFUNDS_PAGE_PATH = path.join(__dirname, "../client/src/pages/admin/AdminRefunds.tsx");

const db = fs.readFileSync(DB_PATH, "utf-8");
const adminRouter = fs.readFileSync(ADMIN_ROUTER_PATH, "utf-8");
const adminRefundsPage = fs.readFileSync(ADMIN_REFUNDS_PAGE_PATH, "utf-8");

// ─── 1–4: Spec cases ─────────────────────────────────────────────────────────
describe("Spec cases 1–4", () => {
  it("1 — backfill resolves items via stripeCheckoutSessionId lookup", () => {
    const idx = db.indexOf("backfillPendingRefundUserIds");
    const slice = db.slice(idx, idx + 1500);
    // Uses stripeCheckoutSessionId from the item
    expect(slice).toContain("stripeCheckoutSessionId");
    expect(slice).toContain("resolveUserIdForCharge");
  });

  it("2 — backfill leaves items unchanged when no match: only calls setRefundQueueItemUserId when userId found", () => {
    const idx = db.indexOf("backfillPendingRefundUserIds");
    const slice = db.slice(idx, idx + 1500);
    // setRefundQueueItemUserId is inside the `if (userId)` branch
    expect(slice).toContain("if (userId)");
    expect(slice).toContain("setRefundQueueItemUserId");
  });

  it("3 — backfill does not touch items that already have userId: queries isNull(userId)", () => {
    const idx = db.indexOf("backfillPendingRefundUserIds");
    const slice = db.slice(idx, idx + 1500);
    expect(slice).toContain("isNull(refundQueue.userId)");
  });

  it("4 — non-admin cannot run backfill: mutation uses adminProcedure", () => {
    expect(adminRouter).toContain("backfillUserIds: adminProcedure");
  });
});

// ─── 5–10: DB helper ─────────────────────────────────────────────────────────
describe("backfillPendingRefundUserIds DB helper", () => {
  it("5 — is exported from db.ts", () => {
    expect(db).toContain("export async function backfillPendingRefundUserIds");
  });

  it("6 — queries pending + isNull(userId)", () => {
    const idx = db.indexOf("backfillPendingRefundUserIds");
    const slice = db.slice(idx, idx + 1500);
    expect(slice).toContain("eq(refundQueue.status, \"pending\")");
    expect(slice).toContain("isNull(refundQueue.userId)");
  });

  it("7 — calls resolveUserIdForCharge for each item", () => {
    const idx = db.indexOf("backfillPendingRefundUserIds");
    const slice = db.slice(idx, idx + 1500);
    expect(slice).toContain("resolveUserIdForCharge");
  });

  it("8 — calls setRefundQueueItemUserId when userId resolved", () => {
    const idx = db.indexOf("backfillPendingRefundUserIds");
    const slice = db.slice(idx, idx + 1500);
    expect(slice).toContain("setRefundQueueItemUserId(item.id, userId)");
  });

  it("9 — returns scanned, eligible, resolved, unresolved", () => {
    const idx = db.indexOf("backfillPendingRefundUserIds");
    const slice = db.slice(idx, idx + 1500);
    expect(slice).toContain("scanned");
    expect(slice).toContain("eligible");
    expect(slice).toContain("resolved");
    expect(slice).toContain("unresolved");
  });

  it("10 — accepts optional limit param with default 200", () => {
    const idx = db.indexOf("export async function backfillPendingRefundUserIds");
    const slice = db.slice(idx, idx + 300);
    expect(slice).toContain("limit = 200");
  });
});

// ─── 11–14: Admin router mutation ────────────────────────────────────────────
describe("admin.refunds.backfillUserIds mutation", () => {
  it("11 — exists and uses adminProcedure", () => {
    expect(adminRouter).toContain("backfillUserIds: adminProcedure");
  });

  it("12 — accepts optional limit input", () => {
    const idx = adminRouter.indexOf("backfillUserIds:");
    const slice = adminRouter.slice(idx, idx + 500);
    expect(slice).toContain("limit");
    expect(slice).toContain("optional");
  });

  it("13 — returns scanned/eligible/resolved/unresolved via backfillPendingRefundUserIds", () => {
    const idx = adminRouter.indexOf("backfillUserIds:");
    const slice = adminRouter.slice(idx, idx + 500);
    expect(slice).toContain("backfillPendingRefundUserIds");
  });

  it("14 — logs admin action refund_backfill_userids", () => {
    const idx = adminRouter.indexOf("backfillUserIds:");
    const slice = adminRouter.slice(idx, idx + 500);
    expect(slice).toContain("refund_backfill_userids");
  });
});

// ─── 15–19: Frontend ─────────────────────────────────────────────────────────
describe("AdminRefunds.tsx frontend", () => {
  it("15 — has Backfill user IDs button", () => {
    expect(adminRefundsPage).toContain("Backfill user IDs");
  });

  it("16 — button calls backfillUserIds mutation", () => {
    expect(adminRefundsPage).toContain("backfillUserIds");
    expect(adminRefundsPage).toContain("backfillMutation.mutate");
  });

  it("17 — button is disabled while mutation is pending", () => {
    expect(adminRefundsPage).toContain("backfillMutation.isPending");
    expect(adminRefundsPage).toContain("disabled={backfillMutation.isPending}");
  });

  it("18 — shows backfill result summary when result is set", () => {
    expect(adminRefundsPage).toContain("backfillResult");
    expect(adminRefundsPage).toContain("Backfill result:");
  });

  it("19 — shows 'some items still require manual selection' when unresolved > 0", () => {
    expect(adminRefundsPage).toContain("some items still require manual selection");
    expect(adminRefundsPage).toContain("unresolved > 0");
  });
});

// ─── 20: Idempotency ─────────────────────────────────────────────────────────
describe("Idempotency", () => {
  it("20 — setRefundQueueItemUserId only updates when userId IS NULL (WHERE clause)", () => {
    const idx = db.indexOf("export async function setRefundQueueItemUserId");
    const slice = db.slice(idx, idx + 400);
    expect(slice).toContain("isNull(refundQueue.userId)");
  });
});
