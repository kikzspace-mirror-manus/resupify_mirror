/**
 * Phase 12E.1: Admin Ops Status endpoint + minimal admin page
 *
 * Acceptance tests covering:
 * E1:  ops_status table exists in schema.ts
 * E2:  ops_status table has required columns: id, lastStripeWebhookSuccessAt, lastStripeWebhookFailureAt, lastStripeWebhookEventId, lastStripeWebhookEventType, updatedAt
 * E3:  getOpsStatus DB helper is exported from server/db.ts
 * E4:  upsertOpsStatus DB helper is exported from server/db.ts
 * E5:  upsertOpsStatus accepts lastStripeWebhookSuccessAt, lastStripeWebhookFailureAt, lastStripeWebhookEventId, lastStripeWebhookEventType
 * E6:  admin.ops.getStatus tRPC procedure exists in admin router
 * E7:  admin.ops.getStatus uses adminProcedure (non-admin blocked)
 * E8:  admin.ops.getStatus returns null-safe response (handles empty table)
 * E9:  admin.ops.getStatus response includes required keys: lastStripeWebhookSuccessAt, lastStripeWebhookFailureAt, lastStripeWebhookEventId, lastStripeWebhookEventType, updatedAt
 * E10: /admin/ops route exists in App.tsx
 * E11: AdminOps page component exists
 * E12: AdminOps page uses trpc.admin.ops.getStatus
 * E13: AdminOps page shows a "Stripe Webhooks" section
 * E14: AdminOps page shows "Last success" label
 * E15: AdminOps page shows "Last failure" label
 * E16: AdminOps page shows "No data yet" state when status is null
 * E17: AdminOps page auto-refreshes (refetchInterval)
 * E18: AdminLayout nav includes Ops Status item pointing to /admin/ops
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");
const SCHEMA_FILE = path.join(ROOT, "drizzle/schema.ts");
const DB_FILE = path.join(ROOT, "server/db.ts");
const ADMIN_ROUTER = path.join(ROOT, "server/routers/admin.ts");
const APP_FILE = path.join(ROOT, "client/src/App.tsx");
const ADMIN_OPS_PAGE = path.join(ROOT, "client/src/pages/admin/AdminOps.tsx");
const ADMIN_LAYOUT = path.join(ROOT, "client/src/components/AdminLayout.tsx");

const schema = fs.readFileSync(SCHEMA_FILE, "utf-8");
const dbFile = fs.readFileSync(DB_FILE, "utf-8");
const adminRouter = fs.readFileSync(ADMIN_ROUTER, "utf-8");
const appFile = fs.readFileSync(APP_FILE, "utf-8");
const adminOpsPage = fs.readFileSync(ADMIN_OPS_PAGE, "utf-8");
const adminLayout = fs.readFileSync(ADMIN_LAYOUT, "utf-8");

// ─── E1-E2: Schema ────────────────────────────────────────────────────────────
describe("E1-E2: ops_status schema", () => {
  it("E1: ops_status table is defined in schema.ts", () => {
    expect(schema).toContain("ops_status");
  });

  it("E2: ops_status has all required columns", () => {
    const opsIdx = schema.indexOf("ops_status");
    const block = schema.slice(opsIdx, opsIdx + 800);
    expect(block).toContain("lastStripeWebhookSuccessAt");
    expect(block).toContain("lastStripeWebhookFailureAt");
    expect(block).toContain("lastStripeWebhookEventId");
    expect(block).toContain("lastStripeWebhookEventType");
    expect(block).toContain("updatedAt");
  });
});

// ─── E3-E5: DB helpers ────────────────────────────────────────────────────────
describe("E3-E5: DB helpers", () => {
  it("E3: getOpsStatus is exported from server/db.ts", () => {
    expect(dbFile).toContain("export async function getOpsStatus");
  });

  it("E4: upsertOpsStatus is exported from server/db.ts", () => {
    expect(dbFile).toContain("export async function upsertOpsStatus");
  });

  it("E5: upsertOpsStatus accepts all required patch fields", () => {
    const fnIdx = dbFile.indexOf("export async function upsertOpsStatus");
    const body = dbFile.slice(fnIdx, fnIdx + 400);
    expect(body).toContain("lastStripeWebhookSuccessAt");
    expect(body).toContain("lastStripeWebhookFailureAt");
    expect(body).toContain("lastStripeWebhookEventId");
    expect(body).toContain("lastStripeWebhookEventType");
  });
});

// ─── E6-E9: tRPC procedure ────────────────────────────────────────────────────
describe("E6-E9: admin.ops.getStatus tRPC procedure", () => {
  it("E6: admin.ops router exists in admin router", () => {
    expect(adminRouter).toContain("ops: router(");
  });

  it("E7: getStatus uses adminProcedure (non-admin blocked)", () => {
    const opsIdx = adminRouter.indexOf("ops: router(");
    const block = adminRouter.slice(opsIdx, opsIdx + 400);
    expect(block).toContain("adminProcedure");
    expect(block).toContain("getStatus");
  });

  it("E8: getStatus handles null/empty table (returns null)", () => {
    const opsIdx = adminRouter.indexOf("ops: router(");
    const block = adminRouter.slice(opsIdx, opsIdx + 600);
    expect(block).toMatch(/if\s*\(!row\)\s*return\s*null/);
  });

  it("E9: getStatus response includes all required keys", () => {
    const opsIdx = adminRouter.indexOf("ops: router(");
    const block = adminRouter.slice(opsIdx, opsIdx + 800);
    expect(block).toContain("lastStripeWebhookSuccessAt");
    expect(block).toContain("lastStripeWebhookFailureAt");
    expect(block).toContain("lastStripeWebhookEventId");
    expect(block).toContain("lastStripeWebhookEventType");
    expect(block).toContain("updatedAt");
  });
});

// ─── E10-E11: Routing ─────────────────────────────────────────────────────────
describe("E10-E11: Routing", () => {
  it("E10: /admin/ops route exists in App.tsx", () => {
    expect(appFile).toContain("/admin/ops");
    expect(appFile).toContain("AdminOps");
  });

  it("E11: AdminOps page component file exists", () => {
    expect(fs.existsSync(ADMIN_OPS_PAGE)).toBe(true);
  });
});

// ─── E12-E17: AdminOps page ───────────────────────────────────────────────────
describe("E12-E17: AdminOps page UI", () => {
  it("E12: AdminOps page calls trpc.admin.ops.getStatus", () => {
    expect(adminOpsPage).toContain("trpc.admin.ops.getStatus");
  });

  it("E13: AdminOps page has a Stripe Webhooks section", () => {
    expect(adminOpsPage).toContain("Stripe Webhooks");
  });

  it("E14: AdminOps page shows Last success label", () => {
    expect(adminOpsPage).toContain("Last success");
  });

  it("E15: AdminOps page shows Last failure label", () => {
    expect(adminOpsPage).toContain("Last failure");
  });

  it("E16: AdminOps page handles null status (no data yet)", () => {
    expect(adminOpsPage).toMatch(/status\s*===\s*null/);
    expect(adminOpsPage).toContain("No webhook events");
  });

  it("E17: AdminOps page uses refetchInterval for auto-refresh", () => {
    expect(adminOpsPage).toContain("refetchInterval");
  });
});

// ─── E18: Admin nav ───────────────────────────────────────────────────────────
describe("E18: AdminLayout nav", () => {
  it("E18: AdminLayout nav includes Ops Status item pointing to /admin/ops", () => {
    expect(adminLayout).toContain("/admin/ops");
    expect(adminLayout).toContain("Ops Status");
  });
});
