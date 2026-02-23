/**
 * Phase 12H: Stripe Event Audit Table on /admin/ops
 *
 * Acceptance tests covering:
 * H1:  getStripeEventsPage DB helper is exported from server/db.ts
 * H2:  getStripeEventsPage accepts limit and optional cursor params
 * H3:  getStripeEventsPage returns { items, nextCursor } shape
 * H4:  getStripeEventsPage uses stripeEvents table
 * H5:  getStripeEventsPage orders by id DESC (newest first)
 * H6:  getStripeEventsPage respects limit (capped at 50)
 * H7:  getStripeEventsPage uses cursor for pagination (lt condition)
 * H8:  admin.ops.listStripeEvents tRPC procedure exists in admin router
 * H9:  admin.ops.listStripeEvents uses adminProcedure (non-admin blocked)
 * H10: admin.ops.listStripeEvents accepts limit and cursor inputs
 * H11: admin.ops.listStripeEvents returns items with required fields: eventId, eventType, status, userId, creditsPurchased, createdAt
 * H12: admin.ops.listStripeEvents returns nextCursor
 * H13: AdminOps page imports listStripeEvents
 * H14: AdminOps page renders a "Recent Stripe Events" section
 * H15: AdminOps page renders a table with event columns (Event ID, Type, Status, User, Timestamp)
 * H16: AdminOps page renders pagination controls (prev/next buttons)
 * H17: AdminOps page renders "No events yet" when table is empty
 * H18: AdminOps page uses cursor-based pagination (cursorStack)
 * H19: AdminOps page uses data-testid="stripe-events-table"
 * H20: AdminOps page uses data-testid="pagination-controls"
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");
const DB_FILE = path.join(ROOT, "server/db.ts");
const ADMIN_ROUTER = path.join(ROOT, "server/routers/admin.ts");
const ADMIN_OPS_PAGE = path.join(ROOT, "client/src/pages/admin/AdminOps.tsx");

const dbFile = fs.readFileSync(DB_FILE, "utf-8");
const adminRouter = fs.readFileSync(ADMIN_ROUTER, "utf-8");
const adminOpsPage = fs.readFileSync(ADMIN_OPS_PAGE, "utf-8");

// ─── H1-H7: DB helper ─────────────────────────────────────────────────────────
describe("H1-H7: getStripeEventsPage DB helper", () => {
  it("H1: getStripeEventsPage is exported from server/db.ts", () => {
    expect(dbFile).toContain("export async function getStripeEventsPage");
  });

  it("H2: getStripeEventsPage accepts limit and optional cursor params", () => {
    const fnIdx = dbFile.indexOf("export async function getStripeEventsPage");
    const sig = dbFile.slice(fnIdx, fnIdx + 200);
    expect(sig).toContain("limit");
    expect(sig).toContain("cursor");
  });

  it("H3: getStripeEventsPage returns { items, nextCursor } shape", () => {
    const fnIdx = dbFile.indexOf("export async function getStripeEventsPage");
    const body = dbFile.slice(fnIdx, fnIdx + 600);
    expect(body).toContain("items");
    expect(body).toContain("nextCursor");
  });

  it("H4: getStripeEventsPage queries the stripeEvents table", () => {
    const fnIdx = dbFile.indexOf("export async function getStripeEventsPage");
    const body = dbFile.slice(fnIdx, fnIdx + 600);
    expect(body).toContain("stripeEvents");
  });

  it("H5: getStripeEventsPage orders by id DESC (newest first)", () => {
    const fnIdx = dbFile.indexOf("export async function getStripeEventsPage");
    const body = dbFile.slice(fnIdx, fnIdx + 600);
    expect(body).toContain("desc");
    expect(body).toContain("stripeEvents.id");
  });

  it("H6: getStripeEventsPage caps page size at 50", () => {
    const fnIdx = dbFile.indexOf("export async function getStripeEventsPage");
    const body = dbFile.slice(fnIdx, fnIdx + 400);
    expect(body).toContain("50");
  });

  it("H7: getStripeEventsPage uses cursor condition (lt) for pagination", () => {
    const fnIdx = dbFile.indexOf("export async function getStripeEventsPage");
    const body = dbFile.slice(fnIdx, fnIdx + 600);
    expect(body).toContain("lt(");
  });
});

// ─── H8-H12: tRPC procedure ───────────────────────────────────────────────────
describe("H8-H12: admin.ops.listStripeEvents tRPC procedure", () => {
  it("H8: admin.ops.listStripeEvents procedure exists in admin router", () => {
    expect(adminRouter).toContain("listStripeEvents");
  });

  it("H9: admin.ops.listStripeEvents uses adminProcedure", () => {
    const idx = adminRouter.indexOf("listStripeEvents");
    const block = adminRouter.slice(idx, idx + 200);
    expect(block).toContain("adminProcedure");
  });

  it("H10: admin.ops.listStripeEvents accepts limit and cursor inputs", () => {
    const idx = adminRouter.indexOf("listStripeEvents");
    const block = adminRouter.slice(idx, idx + 400);
    expect(block).toContain("limit");
    expect(block).toContain("cursor");
  });

  it("H11: admin.ops.listStripeEvents returns items with required fields", () => {
    const idx = adminRouter.indexOf("listStripeEvents");
    const block = adminRouter.slice(idx, idx + 600);
    expect(block).toContain("eventId");
    expect(block).toContain("eventType");
    expect(block).toContain("status");
    expect(block).toContain("userId");
    expect(block).toContain("creditsPurchased");
    expect(block).toContain("createdAt");
  });

  it("H12: admin.ops.listStripeEvents returns nextCursor", () => {
    const idx = adminRouter.indexOf("listStripeEvents");
    const block = adminRouter.slice(idx, idx + 600);
    expect(block).toContain("nextCursor");
  });
});

// ─── H13-H20: AdminOps UI ─────────────────────────────────────────────────────
describe("H13-H20: AdminOps page UI", () => {
  it("H13: AdminOps page calls trpc.admin.ops.listStripeEvents", () => {
    expect(adminOpsPage).toContain("listStripeEvents");
  });

  it("H14: AdminOps page renders a 'Recent Stripe Events' section", () => {
    expect(adminOpsPage).toContain("Recent Stripe Events");
  });

  it("H15: AdminOps page renders table columns: Event ID, Type, Status, User, Timestamp", () => {
    expect(adminOpsPage).toContain("Event ID");
    expect(adminOpsPage).toContain("Type");
    expect(adminOpsPage).toContain("Status");
    expect(adminOpsPage).toContain("User");
    expect(adminOpsPage).toContain("Timestamp");
  });

  it("H16: AdminOps page renders pagination controls (prev/next buttons)", () => {
    expect(adminOpsPage).toContain("prev-button");
    expect(adminOpsPage).toContain("next-button");
  });

  it("H17: AdminOps page renders 'No events yet' when table is empty", () => {
    expect(adminOpsPage).toContain("No events yet");
  });

  it("H18: AdminOps page uses cursor-based pagination with cursorStack", () => {
    expect(adminOpsPage).toContain("cursorStack");
    expect(adminOpsPage).toContain("cursor");
  });

  it("H19: AdminOps page uses data-testid='stripe-events-table'", () => {
    expect(adminOpsPage).toContain('data-testid="stripe-events-table"');
  });

  it("H20: AdminOps page uses data-testid='pagination-controls'", () => {
    expect(adminOpsPage).toContain('data-testid="pagination-controls"');
  });
});
