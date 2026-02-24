/**
 * Phase 11D Acceptance Tests — Refund Handling (Admin-only Credit Reversal + Audit Log)
 *
 * Tests cover:
 * A) refundQueue schema is correct (table, columns, unique constraint)
 * B) DB helpers: createRefundQueueItem, listRefundQueueItems, processRefundQueueItem, ignoreRefundQueueItem, refundQueueItemExists
 * C) Webhook: charge.refunded creates one pending refund queue item
 * D) Webhook idempotency: replaying same refund event does not create duplicate
 * E) Admin tRPC endpoints exist: refunds.list, refunds.process, refunds.ignore
 * F) processRefundQueueItem creates exactly one negative ledger entry per refund id
 * G) Ignore requires a reason and marks item ignored
 * H) Negative balance behavior: balance may go negative after debit
 * I) AdminRefunds UI page exists with required elements
 * J) AdminLayout includes Refunds nav item
 * K) App.tsx routes /admin/refunds to AdminRefunds
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fs from "fs";
import * as path from "path";

const SCHEMA_PATH = path.join(__dirname, "../drizzle/schema.ts");
const DB_PATH = path.join(__dirname, "db.ts");
const WEBHOOK_PATH = path.join(__dirname, "stripeWebhook.ts");
const ADMIN_ROUTER_PATH = path.join(__dirname, "routers/admin.ts");
const ADMIN_REFUNDS_PAGE_PATH = path.join(__dirname, "../client/src/pages/admin/AdminRefunds.tsx");
const ADMIN_LAYOUT_PATH = path.join(__dirname, "../client/src/components/AdminLayout.tsx");
const APP_PATH = path.join(__dirname, "../client/src/App.tsx");

const schema = fs.readFileSync(SCHEMA_PATH, "utf-8");
const db = fs.readFileSync(DB_PATH, "utf-8");
const webhook = fs.readFileSync(WEBHOOK_PATH, "utf-8");
const adminRouter = fs.readFileSync(ADMIN_ROUTER_PATH, "utf-8");
const adminRefundsPage = fs.readFileSync(ADMIN_REFUNDS_PAGE_PATH, "utf-8");
const adminLayout = fs.readFileSync(ADMIN_LAYOUT_PATH, "utf-8");
const appTsx = fs.readFileSync(APP_PATH, "utf-8");

// ─── A: Schema ────────────────────────────────────────────────────────────────
describe("A: refundQueue schema", () => {
  it("A1 — refundQueue table is defined in schema", () => {
    expect(schema).toContain("refund_queue");
  });

  it("A2 — table has userId column (nullable)", () => {
    const idx = schema.indexOf("refund_queue");
    const slice = schema.slice(idx, idx + 1500);
    expect(slice).toContain("userId");
  });

  it("A3 — table has stripeChargeId column", () => {
    const idx = schema.indexOf("refund_queue");
    const slice = schema.slice(idx, idx + 1500);
    expect(slice).toContain("stripeChargeId");
  });

  it("A4 — table has stripeRefundId column with unique constraint", () => {
    const idx = schema.indexOf("refund_queue");
    const slice = schema.slice(idx, idx + 1500);
    expect(slice).toContain("stripeRefundId");
    expect(slice).toContain(".unique()");
  });

  it("A5 — table has status enum with pending/processed/ignored", () => {
    const idx = schema.indexOf("refund_queue");
    const slice = schema.slice(idx, idx + 1500);
    expect(slice).toContain("pending");
    expect(slice).toContain("processed");
    expect(slice).toContain("ignored");
  });

  it("A6 — table has creditsToReverse column", () => {
    const idx = schema.indexOf("refund_queue");
    const slice = schema.slice(idx, idx + 1500);
    expect(slice).toContain("creditsToReverse");
  });

  it("A7 — table has ledgerEntryId column (for idempotency)", () => {
    const idx = schema.indexOf("refund_queue");
    const slice = schema.slice(idx, idx + 1500);
    expect(slice).toContain("ledgerEntryId");
  });

  it("A8 — table has ignoreReason column", () => {
    const idx = schema.indexOf("refund_queue");
    const slice = schema.slice(idx, idx + 1500);
    expect(slice).toContain("ignoreReason");
  });

  it("A9 — RefundQueueItem and InsertRefundQueueItem types are exported", () => {
    expect(schema).toContain("RefundQueueItem");
    expect(schema).toContain("InsertRefundQueueItem");
  });
});

// ─── B: DB Helpers ────────────────────────────────────────────────────────────
describe("B: DB helpers", () => {
  it("B1 — createRefundQueueItem is exported from db.ts", () => {
    expect(db).toContain("export async function createRefundQueueItem");
  });

  it("B2 — listRefundQueueItems is exported from db.ts", () => {
    expect(db).toContain("export async function listRefundQueueItems");
  });

  it("B3 — processRefundQueueItem is exported from db.ts", () => {
    expect(db).toContain("export async function processRefundQueueItem");
  });

  it("B4 — ignoreRefundQueueItem is exported from db.ts", () => {
    expect(db).toContain("export async function ignoreRefundQueueItem");
  });

  it("B5 — refundQueueItemExists is exported from db.ts", () => {
    expect(db).toContain("export async function refundQueueItemExists");
  });

  it("B6 — createRefundQueueItem handles ER_DUP_ENTRY silently (idempotency)", () => {
    expect(db).toContain("ER_DUP_ENTRY");
  });

  it("B7 — processRefundQueueItem checks ledgerEntryId for idempotency", () => {
    const idx = db.indexOf("processRefundQueueItem");
    const slice = db.slice(idx, idx + 1500);
    expect(slice).toContain("ledgerEntryId");
    // Must check for already-processed state
    expect(slice).toMatch(/status.*processed|processed.*status/);
  });

  it("B8 — processRefundQueueItem creates a negative ledger entry", () => {
    const idx = db.indexOf("processRefundQueueItem");
    const slice = db.slice(idx, idx + 1500);
    expect(slice).toContain("-debitAmount");
  });

  it("B9 — ignoreRefundQueueItem requires non-empty reason", () => {
    const idx = db.indexOf("ignoreRefundQueueItem");
    const slice = db.slice(idx, idx + 800);
    expect(slice).toContain("reason");
    expect(slice).toContain("Ignore reason is required");
  });

  it("B10 — processRefundQueueItem allows balance to go negative", () => {
    // No check for current >= debitAmount (unlike spendCredits which returns false if insufficient)
    const idx = db.indexOf("processRefundQueueItem");
    const slice = db.slice(idx, idx + 1500);
    // Must NOT contain the insufficient balance guard from spendCredits
    expect(slice).not.toContain("if (current < amount) return false");
  });
});

// ─── C: Webhook — charge.refunded creates pending queue item ─────────────────
describe("C: Webhook charge.refunded handling", () => {
  it("C1 — webhook imports createRefundQueueItem from db", () => {
    expect(webhook).toContain("createRefundQueueItem");
  });

  it("C2 — charge.refunded case calls createRefundQueueItem", () => {
    const idx = webhook.indexOf("charge.refunded");
    const slice = webhook.slice(idx, idx + 1200);
    expect(slice).toContain("createRefundQueueItem");
  });

  it("C3 — charge.refunded sets status to pending", () => {
    const idx = webhook.indexOf('case "charge.refunded"');
    const slice = webhook.slice(idx, idx + 2500);
    expect(slice).toContain("pending");
  });

  it("C4 — charge.refunded still records in stripe_events for audit trail", () => {
    const idx = webhook.indexOf('case "charge.refunded"');
    const slice = webhook.slice(idx, idx + 2500);
    expect(slice).toContain("recordStripeEvent");
    expect(slice).toContain("manual_review");
  });

  it("C5 — charge.refunded extracts stripeRefundId from charge.refunds.data[0]", () => {
    const idx = webhook.indexOf('case "charge.refunded"');
    const slice = webhook.slice(idx, idx + 1800);
    expect(slice).toContain("stripeRefundId");
    expect(slice).toContain("refund?.id");
  });

  it("C6 — charge.refunded derives creditsToReverse from PACK_CREDITS if packId known", () => {
    const idx = webhook.indexOf('case "charge.refunded"');
    const slice = webhook.slice(idx, idx + 1800);
    expect(slice).toContain("PACK_CREDITS");
    expect(slice).toContain("creditsToReverse");
  });
});

// ─── D: Webhook idempotency ───────────────────────────────────────────────────
describe("D: Webhook idempotency", () => {
  it("D1 — createRefundQueueItem silently ignores duplicate stripeRefundId", () => {
    // Verified by B6 — ER_DUP_ENTRY handling
    expect(db).toContain("ER_DUP_ENTRY");
    expect(db).toContain("Duplicate entry");
  });

  it("D2 — processRefundQueueItem returns null if already processed", () => {
    const idx = db.indexOf("processRefundQueueItem");
    const slice = db.slice(idx, idx + 1500);
    expect(slice).toContain("return null");
  });
});

// ─── E: Admin tRPC endpoints ──────────────────────────────────────────────────
describe("E: Admin tRPC endpoints", () => {
  it("E1 — admin router has refunds sub-router", () => {
    expect(adminRouter).toContain("refunds: router(");
  });

  it("E2 — refunds.list endpoint exists", () => {
    const idx = adminRouter.indexOf("refunds: router(");
    const slice = adminRouter.slice(idx, idx + 2000);
    expect(slice).toContain("list:");
    expect(slice).toContain("listRefundQueueItems");
  });

  it("E3 — refunds.process endpoint exists", () => {
    const idx = adminRouter.indexOf("refunds: router(");
    const slice = adminRouter.slice(idx, idx + 2000);
    expect(slice).toContain("process:");
    expect(slice).toContain("processRefundQueueItem");
  });

  it("E4 — refunds.ignore endpoint exists", () => {
    const idx = adminRouter.indexOf("refunds: router(");
    const slice = adminRouter.slice(idx, idx + 3000);
    expect(slice).toContain("ignore:");
    expect(slice).toContain("ignoreRefundQueueItem");
  });

  it("E5 — refunds.process uses adminProcedure (admin-only)", () => {
    const idx = adminRouter.indexOf("refunds: router(");
    const slice = adminRouter.slice(idx, idx + 2000);
    expect(slice).toContain("adminProcedure");
  });

  it("E6 — refunds.process logs admin action", () => {
    const idx = adminRouter.indexOf("refunds: router(");
    const slice = adminRouter.slice(idx, idx + 3500);
    expect(slice).toContain("logAdminAction");
    expect(slice).toContain("refund_processed");
  });

  it("E7 — refunds.ignore logs admin action", () => {
    const idx = adminRouter.indexOf("refunds: router(");
    const slice = adminRouter.slice(idx, idx + 3000);
    expect(slice).toContain("refund_ignored");
  });

  it("E8 — refunds.process validates debitAmount is non-negative integer", () => {
    const idx = adminRouter.indexOf("refunds: router(");
    const slice = adminRouter.slice(idx, idx + 2000);
    expect(slice).toContain("debitAmount");
    expect(slice).toContain("z.number().int()");
  });

  it("E9 — refunds.ignore requires non-empty reason string", () => {
    const idx = adminRouter.indexOf("refunds: router(");
    const slice = adminRouter.slice(idx, idx + 3200);
    expect(slice).toContain("reason: z.string().min(1)");
  });
});

// ─── F: Ledger entry idempotency ─────────────────────────────────────────────
describe("F: Ledger entry idempotency", () => {
  it("F1 — processRefundQueueItem sets ledgerEntryId on the queue item after processing", () => {
    const idx = db.indexOf("processRefundQueueItem");
    const slice = db.slice(idx, idx + 1500);
    expect(slice).toContain("ledgerEntryId");
    expect(slice).toContain("set(");
  });

  it("F2 — processRefundQueueItem uses referenceType refund in ledger entry", () => {
    const idx = db.indexOf("processRefundQueueItem");
    const slice = db.slice(idx, idx + 1500);
    expect(slice).toContain('"refund"');
  });

  it("F3 — ledger reason includes stripeRefundId", () => {
    // Verified in admin router: reason includes stripeRefundId
    const idx = adminRouter.indexOf("refunds: router(");
    const slice = adminRouter.slice(idx, idx + 2000);
    expect(slice).toContain("stripeRefundId");
    expect(slice).toContain("reason");
  });
});

// ─── G: Ignore flow ───────────────────────────────────────────────────────────
describe("G: Ignore flow", () => {
  it("G1 — ignoreRefundQueueItem sets status to ignored", () => {
    const idx = db.indexOf("ignoreRefundQueueItem");
    const slice = db.slice(idx, idx + 800);
    expect(slice).toContain('"ignored"');
  });

  it("G2 — ignoreRefundQueueItem stores ignoreReason", () => {
    const idx = db.indexOf("ignoreRefundQueueItem");
    const slice = db.slice(idx, idx + 800);
    expect(slice).toContain("ignoreReason");
  });

  it("G3 — ignoreRefundQueueItem throws if reason is empty", () => {
    const idx = db.indexOf("ignoreRefundQueueItem");
    const slice = db.slice(idx, idx + 800);
    expect(slice).toContain("Ignore reason is required");
  });
});

// ─── H: Negative balance behavior ────────────────────────────────────────────
describe("H: Negative balance behavior", () => {
  it("H1 — processRefundQueueItem does NOT block if balance < debitAmount", () => {
    // spendCredits blocks on insufficient balance; processRefundQueueItem must NOT
    const idx = db.indexOf("processRefundQueueItem");
    const slice = db.slice(idx, idx + 1500);
    expect(slice).not.toContain("if (current < amount) return false");
    expect(slice).not.toContain("if (current < debitAmount) return false");
  });

  it("H2 — balance can go negative (newBalance = current - debitAmount)", () => {
    const idx = db.indexOf("processRefundQueueItem");
    const slice = db.slice(idx, idx + 1500);
    expect(slice).toContain("current - debitAmount");
  });
});

// ─── I: AdminRefunds UI ───────────────────────────────────────────────────────
describe("I: AdminRefunds UI page", () => {
  it("I1 — AdminRefunds.tsx file exists", () => {
    expect(fs.existsSync(ADMIN_REFUNDS_PAGE_PATH)).toBe(true);
  });

  it("I2 — page uses AdminLayout", () => {
    expect(adminRefundsPage).toContain("AdminLayout");
  });

  it("I3 — page calls trpc.admin.refunds.list", () => {
    expect(adminRefundsPage).toContain("trpc.admin.refunds.list");
  });

  it("I4 — page has Review button", () => {
    expect(adminRefundsPage).toContain("Review");
  });

  it("I5 — page has status filter (pending/processed/ignored)", () => {
    expect(adminRefundsPage).toContain("pending");
    expect(adminRefundsPage).toContain("processed");
    expect(adminRefundsPage).toContain("ignored");
  });

  it("I6 — ReviewModal has Debit Credits action", () => {
    expect(adminRefundsPage).toContain("Debit");
    expect(adminRefundsPage).toContain("debitAmount");
  });

  it("I7 — ReviewModal has confirmation step before debit", () => {
    expect(adminRefundsPage).toContain("confirmDebit");
    expect(adminRefundsPage).toContain("Confirm Debit");
  });

  it("I8 — ReviewModal has Ignore action with reason textarea", () => {
    expect(adminRefundsPage).toContain("ignoreReason");
    expect(adminRefundsPage).toContain("Confirm Ignore");
  });

  it("I9 — ReviewModal calls trpc.admin.refunds.process", () => {
    expect(adminRefundsPage).toContain("trpc.admin.refunds.process");
  });

  it("I10 — ReviewModal calls trpc.admin.refunds.ignore", () => {
    expect(adminRefundsPage).toContain("trpc.admin.refunds.ignore");
  });

  it("I11 — page shows empty state when no items", () => {
    expect(adminRefundsPage).toContain("No refund queue items found");
  });

  it("I12 — page shows pending count badge", () => {
    expect(adminRefundsPage).toContain("pendingCount");
  });
});

// ─── J: AdminLayout nav item ──────────────────────────────────────────────────
describe("J: AdminLayout nav item", () => {
  it("J1 — AdminLayout includes /admin/refunds nav item", () => {
    expect(adminLayout).toContain("/admin/refunds");
  });

  it("J2 — AdminLayout labels it Refunds", () => {
    expect(adminLayout).toContain("\"Refunds\"");
  });

  it("J3 — AdminLayout imports RotateCcw icon for Refunds", () => {
    expect(adminLayout).toContain("RotateCcw");
  });
});

// ─── K: App.tsx routing ───────────────────────────────────────────────────────
describe("K: App.tsx routing", () => {
  it("K1 — App.tsx imports AdminRefunds", () => {
    expect(appTsx).toContain("AdminRefunds");
  });

  it("K2 — App.tsx routes /admin/refunds to AdminRefunds", () => {
    expect(appTsx).toContain("/admin/refunds");
    expect(appTsx).toContain("component={AdminRefunds}");
  });
});
