/**
 * Phase 11I: Admin Billing Receipts Search
 *
 * Acceptance tests covering:
 * I1: adminListPurchaseReceipts accepts an optional `query` filter parameter
 * I2: adminListPurchaseReceipts returns rows with a `userEmail` field (LEFT JOIN)
 * I3: adminListPurchaseReceipts with numeric query filters by receipt ID (eq)
 * I4: adminListPurchaseReceipts with text query filters by user email (LIKE)
 * I5: adminListPurchaseReceipts `query` and `emailSentAt` filters can be combined
 * I6: admin.billing.listReceipts tRPC procedure accepts optional `query` input
 * I7: AdminBillingReceipts page renders a search input element
 * I8: AdminBillingReceipts page passes `query` to the tRPC call
 * I9: AdminBillingReceipts page renders a "User Email" column header
 * I10: AdminBillingReceipts page renders `receipt.userEmail` in table rows
 * I11: AdminBillingReceipts page renders a clear-search button when input is non-empty
 * I12: AdminBillingReceipts page shows a filtered-results indicator when query is active
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");
const ADMIN_ROUTER = path.join(ROOT, "server/routers/admin.ts");
const DB_FILE = path.join(ROOT, "server/db.ts");
const ADMIN_BILLING_PAGE = path.join(ROOT, "client/src/pages/admin/AdminBillingReceipts.tsx");

const adminRouter = fs.readFileSync(ADMIN_ROUTER, "utf-8");
const dbFile = fs.readFileSync(DB_FILE, "utf-8");
const adminBillingPage = fs.readFileSync(ADMIN_BILLING_PAGE, "utf-8");

// ─── I1-I5: DB helper ────────────────────────────────────────────────────────
describe("I1-I5: adminListPurchaseReceipts query filter", () => {
  it("I1: adminListPurchaseReceipts accepts an optional query parameter", () => {
    // The function signature should include query?: string
    const fnIdx = dbFile.indexOf("export async function adminListPurchaseReceipts");
    expect(fnIdx).toBeGreaterThan(-1);
    const signature = dbFile.slice(fnIdx, fnIdx + 300);
    expect(signature).toMatch(/query\s*\??\s*:\s*string/);
  });

  it("I2: adminListPurchaseReceipts return type includes userEmail field", () => {
    const fnIdx = dbFile.indexOf("export async function adminListPurchaseReceipts");
    expect(fnIdx).toBeGreaterThan(-1);
    // The return type should include userEmail
    const section = dbFile.slice(fnIdx, fnIdx + 400);
    expect(section).toContain("userEmail");
  });

  it("I3: adminListPurchaseReceipts uses eq(purchaseReceipts.id) for numeric query", () => {
    const fnIdx = dbFile.indexOf("export async function adminListPurchaseReceipts");
    expect(fnIdx).toBeGreaterThan(-1);
    const body = dbFile.slice(fnIdx, fnIdx + 2000);
    // Should detect numeric query and use eq on receipt id
    expect(body).toMatch(/numericId|parseInt/);
    expect(body).toMatch(/eq\(purchaseReceipts\.id/);
  });

  it("I4: adminListPurchaseReceipts uses LIKE for email text query", () => {
    const fnIdx = dbFile.indexOf("export async function adminListPurchaseReceipts");
    expect(fnIdx).toBeGreaterThan(-1);
    const body = dbFile.slice(fnIdx, fnIdx + 2000);
    // Should use LIKE for email search
    expect(body).toMatch(/LIKE/);
    expect(body).toMatch(/users\.email/);
  });

  it("I5: adminListPurchaseReceipts uses LEFT JOIN with users table", () => {
    const fnIdx = dbFile.indexOf("export async function adminListPurchaseReceipts");
    expect(fnIdx).toBeGreaterThan(-1);
    const body = dbFile.slice(fnIdx, fnIdx + 2000);
    expect(body).toContain("leftJoin");
    expect(body).toContain("users");
  });
});

// ─── I6: tRPC procedure ──────────────────────────────────────────────────────
describe("I6: admin.billing.listReceipts tRPC procedure", () => {
  it("I6: listReceipts procedure accepts optional query string input", () => {
    const idx = adminRouter.indexOf("listReceipts");
    expect(idx).toBeGreaterThan(-1);
    // Find the input schema section
    const section = adminRouter.slice(idx, idx + 400);
    expect(section).toMatch(/query\s*:\s*z\.string\(\)\.optional\(\)/);
  });
});

// ─── I7-I12: UI ──────────────────────────────────────────────────────────────
describe("I7-I12: AdminBillingReceipts UI search features", () => {
  it("I7: AdminBillingReceipts renders a search Input element", () => {
    // Should import Input and render it
    expect(adminBillingPage).toContain("Input");
    expect(adminBillingPage).toMatch(/placeholder.*[Ss]earch/);
  });

  it("I8: AdminBillingReceipts passes query to the tRPC listReceipts call", () => {
    // The useQuery call should include a query param
    const queryIdx = adminBillingPage.indexOf("listReceipts.useQuery");
    expect(queryIdx).toBeGreaterThan(-1);
    const querySection = adminBillingPage.slice(queryIdx, queryIdx + 300);
    expect(querySection).toMatch(/query\s*:/);
  });

  it("I9: AdminBillingReceipts renders a 'User Email' column header", () => {
    expect(adminBillingPage).toMatch(/User Email/);
  });

  it("I10: AdminBillingReceipts renders receipt.userEmail in table rows", () => {
    expect(adminBillingPage).toMatch(/receipt\.userEmail/);
  });

  it("I11: AdminBillingReceipts renders a clear-search button when input is non-empty", () => {
    // Should have a clear button (X icon or aria-label clear)
    expect(adminBillingPage).toMatch(/[Cc]lear|clear.*search|aria-label.*[Cc]lear/);
    // Should conditionally render it based on searchInput
    expect(adminBillingPage).toMatch(/searchInput\s*&&/);
  });

  it("I12: AdminBillingReceipts shows a filtered-results indicator when query is active", () => {
    // Should have an isFiltered indicator
    expect(adminBillingPage).toMatch(/isFiltered/);
    expect(adminBillingPage).toMatch(/Showing filtered results/);
  });
});
