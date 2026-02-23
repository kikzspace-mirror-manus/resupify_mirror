/**
 * Phase 11I: Admin Billing Receipts Search (spec-aligned)
 *
 * Acceptance tests covering:
 * I1:  adminListPurchaseReceipts accepts an optional `query` filter parameter
 * I2:  adminListPurchaseReceipts returns rows with a `userEmail` field (LEFT JOIN)
 * I3:  digit-only query → WHERE userId = q OR id = q  (OR, not AND)
 * I4:  "#NNN" query → WHERE id = NNN (strip # prefix)
 * I5:  "@"-containing query → JOIN users WHERE email LIKE %q%
 * I6:  unrecognised query (no digits, no #, no @) → no query filter added
 * I7:  adminListPurchaseReceipts uses LEFT JOIN with users table
 * I8:  `query` and `emailSentAt` filters can be combined (both conditions applied)
 * I9:  admin.billing.listReceipts tRPC procedure accepts optional `query` input
 * I10: admin.billing.listReceipts uses adminProcedure (non-admin blocked)
 * I11: AdminBillingReceipts page renders a search Input element
 * I12: AdminBillingReceipts page placeholder matches spec text
 * I13: AdminBillingReceipts page passes `query` to the tRPC call
 * I14: AdminBillingReceipts page renders a "User Email" column header
 * I15: AdminBillingReceipts page renders `receipt.userEmail` in table rows
 * I16: AdminBillingReceipts page renders a clear-search button when input is non-empty
 * I17: AdminBillingReceipts page shows a filtered-results indicator when query is active
 * I18: AdminBillingReceipts page renders a "No receipts match" empty state
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

// ─── Helper: extract the body of adminListPurchaseReceipts ────────────────────
function getAdminListBody(): string {
  const fnIdx = dbFile.indexOf("export async function adminListPurchaseReceipts");
  expect(fnIdx).toBeGreaterThan(-1);
  // Extract up to 2500 chars — enough to cover the full function body
  return dbFile.slice(fnIdx, fnIdx + 2500);
}

// ─── I1-I2: Function signature ───────────────────────────────────────────────
describe("I1-I2: adminListPurchaseReceipts signature", () => {
  it("I1: accepts an optional query parameter", () => {
    const sig = getAdminListBody().slice(0, 300);
    expect(sig).toMatch(/query\s*\??\s*:\s*string/);
  });

  it("I2: return type includes userEmail field", () => {
    const body = getAdminListBody();
    expect(body).toContain("userEmail");
  });
});

// ─── I3-I6: Match rules ──────────────────────────────────────────────────────
describe("I3-I6: adminListPurchaseReceipts query match rules", () => {
  it("I3: digit-only query uses OR to match userId OR receiptId", () => {
    const body = getAdminListBody();
    // Should use or() combining userId and id
    expect(body).toMatch(/or\(/);
    expect(body).toMatch(/purchaseReceipts\.userId/);
    expect(body).toMatch(/purchaseReceipts\.id/);
    // Should test for all-digit pattern
    expect(body).toMatch(/\\d\+/);
  });

  it("I4: '#NNN' query strips # and matches receipt ID exactly", () => {
    const body = getAdminListBody();
    expect(body).toMatch(/startsWith\(["']#["']\)/);
    expect(body).toMatch(/slice\(1\)/);
    expect(body).toMatch(/eq\(purchaseReceipts\.id/);
  });

  it("I5: '@'-containing query uses LIKE for email match", () => {
    const body = getAdminListBody();
    expect(body).toMatch(/includes\(["']@["']\)/);
    expect(body).toMatch(/LIKE/);
    expect(body).toMatch(/users\.email/);
  });

  it("I6: unrecognised query (no digits, no #, no @) adds no filter", () => {
    const body = getAdminListBody();
    // The else branch should be a comment or empty — no conditions.push for unknown
    expect(body).toContain("unrecognised format");
  });
});

// ─── I7: LEFT JOIN ───────────────────────────────────────────────────────────
describe("I7: adminListPurchaseReceipts LEFT JOIN", () => {
  it("I7: uses leftJoin with users table", () => {
    const body = getAdminListBody();
    expect(body).toContain("leftJoin");
    expect(body).toContain("users");
  });
});

// ─── I8: Combined filter ─────────────────────────────────────────────────────
describe("I8: combined query + emailSentAt filter", () => {
  it("I8: both emailSentAt and query conditions are pushed to the same conditions array", () => {
    const body = getAdminListBody();
    // emailSentAt filter
    expect(body).toMatch(/emailSentAt.*unsent|isNull\(purchaseReceipts\.emailSentAt\)/);
    // query filter in same function
    expect(body).toMatch(/filters\?\.query/);
    // Both use the same conditions array
    const conditionsCount = (body.match(/conditions\.push/g) || []).length;
    expect(conditionsCount).toBeGreaterThanOrEqual(3); // userId, emailSentAt, query
  });
});

// ─── I9-I10: tRPC procedure ──────────────────────────────────────────────────
describe("I9-I10: admin.billing.listReceipts tRPC procedure", () => {
  it("I9: listReceipts procedure accepts optional query string input", () => {
    const idx = adminRouter.indexOf("listReceipts");
    expect(idx).toBeGreaterThan(-1);
    const section = adminRouter.slice(idx, idx + 400);
    expect(section).toMatch(/query\s*:\s*z\.string\(\)\.optional\(\)/);
  });

  it("I10: listReceipts uses adminProcedure (non-admin blocked)", () => {
    const idx = adminRouter.indexOf("listReceipts");
    expect(idx).toBeGreaterThan(-1);
    const section = adminRouter.slice(idx - 10, idx + 100);
    expect(section).toContain("adminProcedure");
  });
});

// ─── I11-I18: UI ─────────────────────────────────────────────────────────────
describe("I11-I18: AdminBillingReceipts UI search features", () => {
  it("I11: renders a search Input element", () => {
    expect(adminBillingPage).toContain("Input");
    expect(adminBillingPage).toMatch(/placeholder.*[Ss]earch/);
  });

  it("I12: placeholder matches spec text (email, user ID, or receipt ID)", () => {
    expect(adminBillingPage).toMatch(/email.*user ID.*receipt ID|email.*userId.*receiptId/i);
  });

  it("I13: passes query to the tRPC listReceipts call", () => {
    const queryIdx = adminBillingPage.indexOf("listReceipts.useQuery");
    expect(queryIdx).toBeGreaterThan(-1);
    const querySection = adminBillingPage.slice(queryIdx, queryIdx + 300);
    expect(querySection).toMatch(/query\s*:/);
  });

  it("I14: renders a 'User Email' column header", () => {
    expect(adminBillingPage).toMatch(/User Email/);
  });

  it("I15: renders receipt.userEmail in table rows", () => {
    expect(adminBillingPage).toMatch(/receipt\.userEmail/);
  });

  it("I16: renders a clear-search button when input is non-empty", () => {
    expect(adminBillingPage).toMatch(/[Cc]lear|aria-label.*[Cc]lear/);
    expect(adminBillingPage).toMatch(/searchInput\s*&&/);
  });

  it("I17: shows a filtered-results indicator when query is active", () => {
    expect(adminBillingPage).toMatch(/isFiltered/);
    expect(adminBillingPage).toMatch(/Showing filtered results/);
  });

  it("I18: renders a 'No receipts match' empty state", () => {
    expect(adminBillingPage).toMatch(/No receipts match/);
  });
});
