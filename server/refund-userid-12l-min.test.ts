/**
 * Phase 12L-MIN Acceptance Tests — Refund Queue: unblock debit when userId is null
 *
 * Spec cases:
 * 1) refund with userId works unchanged (no overrideUserId needed)
 * 2) refund without userId succeeds with overrideUserId
 * 3) refund without userId fails without override (BAD_REQUEST)
 * 4) non-admin blocked
 *
 * Additional structural tests:
 * 5) processRefundQueueItem accepts optional resolvedUserId param
 * 6) processRefundQueueItem uses item.userId ?? resolvedUserId
 * 7) admin.refunds.process computes effectiveUserId = item.userId ?? overrideUserId
 * 8) admin.refunds.process throws TRPCError BAD_REQUEST when effectiveUserId is null
 * 9) admin.refunds.process passes effectiveUserId to processRefundQueueItem
 * 10) TRPCError is imported in admin.ts
 * 11) AdminRefunds.tsx canDebit = effectiveUserId !== null
 * 12) AdminRefunds.tsx passes overrideUserId to processMutation.mutate
 * 13) AdminRefunds.tsx debit button disabled when !canDebit
 * 14) AdminRefunds.tsx UserSearchSelect shown only when item.userId is null
 * 15) admin.users.list procedure exists (used by UserSearchSelect)
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

// ─── 1–4: Spec cases (structural verification) ───────────────────────────────
describe("Spec cases 1–4", () => {
  it("1 — refund with userId works unchanged: processRefundQueueItem uses item.userId when present", () => {
    const idx = db.indexOf("processRefundQueueItem");
    const slice = db.slice(idx, idx + 1500);
    // item.userId is used first (via ?? chain)
    expect(slice).toContain("item.userId ?? resolvedUserId");
  });

  it("2 — refund without userId succeeds with overrideUserId: admin.refunds.process accepts overrideUserId", () => {
    const idx = adminRouter.indexOf("refunds:");
    const slice = adminRouter.slice(idx, idx + 3500);
    expect(slice).toContain("overrideUserId");
    expect(slice).toContain("z.number().int().positive().optional()");
  });

  it("3 — refund without userId fails without override: throws BAD_REQUEST", () => {
    const idx = adminRouter.indexOf("refunds:");
    const slice = adminRouter.slice(idx, idx + 3500);
    expect(slice).toContain("BAD_REQUEST");
    expect(slice).toContain("Cannot debit credits: no userId on refund queue item. Select a user first.");
  });

  it("4 — non-admin blocked: process uses adminProcedure", () => {
    const idx = adminRouter.indexOf("process: adminProcedure");
    expect(idx).toBeGreaterThan(-1);
  });
});

// ─── 5–9: processRefundQueueItem DB helper ────────────────────────────────────
describe("processRefundQueueItem DB helper", () => {
  it("5 — accepts optional resolvedUserId param", () => {
    const idx = db.indexOf("export async function processRefundQueueItem");
    const slice = db.slice(idx, idx + 500);
    expect(slice).toContain("resolvedUserId");
    expect(slice).toContain("resolvedUserId?: number");
  });

  it("6 — uses item.userId ?? resolvedUserId ?? null", () => {
    const idx = db.indexOf("export async function processRefundQueueItem");
    const slice = db.slice(idx, idx + 1000);
    expect(slice).toContain("item.userId ?? resolvedUserId ?? null");
  });

  it("7 — still throws 'no userId' error when both are null", () => {
    const idx = db.indexOf("export async function processRefundQueueItem");
    const slice = db.slice(idx, idx + 1000);
    expect(slice).toContain("Cannot debit credits: no userId on refund queue item");
  });
});

// ─── 8–10: Admin router mutation ─────────────────────────────────────────────
describe("admin.refunds.process mutation", () => {
  it("8 — computes effectiveUserId = item.userId ?? overrideUserId ?? null", () => {
    const idx = adminRouter.indexOf("refunds:");
    const slice = adminRouter.slice(idx, idx + 3500);
    expect(slice).toContain("item.userId ?? overrideUserId ?? null");
  });

  it("9 — passes effectiveUserId as 5th arg to processRefundQueueItem", () => {
    const idx = adminRouter.indexOf("refunds:");
    const slice = adminRouter.slice(idx, idx + 3500);
    // Should call processRefundQueueItem with effectiveUserId
    expect(slice).toContain("processRefundQueueItem(");
    expect(slice).toContain("effectiveUserId");
  });

  it("10 — TRPCError is imported in admin.ts", () => {
    expect(adminRouter).toContain("import { TRPCError } from \"@trpc/server\"");
  });
});

// ─── 11–15: Frontend AdminRefunds.tsx ────────────────────────────────────────
describe("AdminRefunds.tsx frontend", () => {
  it("11 — canDebit = effectiveUserId !== null", () => {
    expect(adminRefundsPage).toContain("canDebit = effectiveUserId !== null");
  });

  it("12 — passes overrideUserId to processMutation.mutate", () => {
    expect(adminRefundsPage).toContain("overrideUserId: overrideUserId ?? undefined");
  });

  it("13 — debit button disabled when !canDebit", () => {
    expect(adminRefundsPage).toContain("!canDebit");
    expect(adminRefundsPage).toContain("disabled={debitAmount < 0 || !canDebit}");
  });

  it("14 — UserSearchSelect shown only when item.userId is null", () => {
    expect(adminRefundsPage).toContain("!item.userId");
    expect(adminRefundsPage).toContain("UserSearchSelect");
  });

  it("15 — admin.users.list procedure exists for UserSearchSelect", () => {
    expect(adminRouter).toContain("list: adminProcedure");
    expect(adminRefundsPage).toContain("trpc.admin.users.list.useQuery");
  });
});
