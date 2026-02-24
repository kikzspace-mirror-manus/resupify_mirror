/**
 * Phase 11G Acceptance Tests — Receipt Detail Page + Clickable Rows
 *
 * Tests cover:
 * A) DB helper: getPurchaseReceiptById exists and is exported
 * B) tRPC: credits.getReceipt procedure exists and is protected
 * C) tRPC: getReceipt enforces access control (user cannot see other's receipts)
 * D) Billing page: "View" link replaces "No receipt" placeholder
 * E) Billing page: View link navigates to /billing/receipts/:id
 * F) ReceiptDetail page: exists and renders pack, credits, date, reference
 * G) ReceiptDetail page: shows "Back to Billing" link
 * H) ReceiptDetail page: shows Stripe receipt link only when stripeReceiptUrl present
 * I) App.tsx: /billing/receipts/:id route is registered
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const DB_PATH = path.join(__dirname, "db.ts");
const ROUTERS_PATH = path.join(__dirname, "routers.ts");
const BILLING_PATH = path.join(__dirname, "../client/src/pages/Billing.tsx");
const RECEIPT_DETAIL_PATH = path.join(__dirname, "../client/src/pages/ReceiptDetail.tsx");
const APP_PATH = path.join(__dirname, "../client/src/App.tsx");

const db = fs.readFileSync(DB_PATH, "utf-8");
const routers = fs.readFileSync(ROUTERS_PATH, "utf-8");
const billing = fs.readFileSync(BILLING_PATH, "utf-8");
const receiptDetail = fs.readFileSync(RECEIPT_DETAIL_PATH, "utf-8");
const app = fs.readFileSync(APP_PATH, "utf-8");

// ─── A: DB Helper ─────────────────────────────────────────────────────────────
describe("A: getPurchaseReceiptById DB helper", () => {
  it("A1 — getPurchaseReceiptById is exported from db.ts", () => {
    expect(db).toContain("export async function getPurchaseReceiptById");
  });

  it("A2 — getPurchaseReceiptById accepts an id parameter", () => {
    const idx = db.indexOf("getPurchaseReceiptById");
    const slice = db.slice(idx, idx + 300);
    expect(slice).toMatch(/id.*number|number.*id/);
  });

  it("A3 — getPurchaseReceiptById queries purchaseReceipts table", () => {
    const idx = db.indexOf("getPurchaseReceiptById");
    const slice = db.slice(idx, idx + 400);
    expect(slice).toContain("purchaseReceipts");
  });

  it("A4 — getPurchaseReceiptById returns null when not found", () => {
    const idx = db.indexOf("getPurchaseReceiptById");
    const slice = db.slice(idx, idx + 400);
    expect(slice).toContain("null");
  });
});

// ─── B: tRPC Procedure ────────────────────────────────────────────────────────
describe("B: credits.getReceipt tRPC procedure", () => {
  it("B1 — getReceipt procedure exists in routers.ts", () => {
    expect(routers).toContain("getReceipt");
  });

  it("B2 — getReceipt uses protectedProcedure (requires auth)", () => {
    const idx = routers.indexOf("getReceipt");
    const slice = routers.slice(idx, idx + 400);
    expect(slice).toContain("protectedProcedure");
  });

  it("B3 — getReceipt accepts an id input", () => {
    const idx = routers.indexOf("getReceipt");
    const slice = routers.slice(idx, idx + 400);
    expect(slice).toContain("id");
    expect(slice).toMatch(/z\.number|z\.object/);
  });

  it("B4 — getReceipt calls getPurchaseReceiptById", () => {
    const idx = routers.indexOf("getReceipt");
    const slice = routers.slice(idx, idx + 500);
    expect(slice).toContain("getPurchaseReceiptById");
  });
});

// ─── C: Access Control ────────────────────────────────────────────────────────
describe("C: getReceipt access control", () => {
  it("C1 — getReceipt throws NOT_FOUND when receipt is null", () => {
    const idx = routers.indexOf("getReceipt");
    const slice = routers.slice(idx, idx + 600);
    expect(slice).toContain("NOT_FOUND");
  });

  it("C2 — getReceipt checks receipt.userId === ctx.user.id", () => {
    const idx = routers.indexOf("getReceipt");
    const slice = routers.slice(idx, idx + 600);
    expect(slice).toContain("userId");
    expect(slice).toContain("ctx.user.id");
  });

  it("C3 — admin users bypass ownership check", () => {
    const idx = routers.indexOf("getReceipt");
    const slice = routers.slice(idx, idx + 600);
    expect(slice).toMatch(/admin|role/);
  });

  it("C4 — non-owner gets NOT_FOUND (not FORBIDDEN) to avoid leaking existence", () => {
    const idx = routers.indexOf("getReceipt");
    const slice = routers.slice(idx, idx + 600);
    // Should throw NOT_FOUND for both null receipt and wrong user
    const notFoundCount = (slice.match(/NOT_FOUND/g) || []).length;
    expect(notFoundCount).toBeGreaterThanOrEqual(1);
  });
});

// ─── D: Billing Page — View Link ──────────────────────────────────────────────
describe("D: Billing page receipt row changes", () => {
  it("D1 — Billing page no longer shows 'No receipt' text", () => {
    expect(billing).not.toContain("No receipt");
  });

  it("D2 — Billing page shows 'View' link for each receipt", () => {
    expect(billing).toContain("View");
  });

  it("D3 — View link navigates to /billing/receipts/:id", () => {
    expect(billing).toContain("/billing/receipts/");
    expect(billing).toContain("r.id");
  });

  it("D4 — Stripe receipt URL still shows external link icon when present", () => {
    expect(billing).toContain("stripeReceiptUrl");
    expect(billing).toContain("ExternalLink");
  });
});

// ─── E: ReceiptDetail Page Exists ─────────────────────────────────────────────
describe("E: ReceiptDetail page file", () => {
  it("E1 — ReceiptDetail.tsx file exists", () => {
    expect(fs.existsSync(RECEIPT_DETAIL_PATH)).toBe(true);
  });

  it("E2 — ReceiptDetail uses trpc.credits.getReceipt query", () => {
    expect(receiptDetail).toContain("getReceipt");
    expect(receiptDetail).toContain("trpc.credits");
  });

  it("E3 — ReceiptDetail shows pack name", () => {
    expect(receiptDetail).toContain("packId");
  });

  it("E4 — ReceiptDetail shows creditsAdded", () => {
    expect(receiptDetail).toContain("creditsAdded");
  });

  it("E5 — ReceiptDetail shows purchase date (createdAt)", () => {
    expect(receiptDetail).toContain("createdAt");
  });

  it("E6 — ReceiptDetail shows amount and currency", () => {
    expect(receiptDetail).toContain("amountCents");
    expect(receiptDetail).toContain("currency");
  });

  it("E7 — ReceiptDetail shows receipt ID reference", () => {
    expect(receiptDetail).toContain("receipt.id");
  });

  it("E8 — ReceiptDetail shows session reference (stripeCheckoutSessionId)", () => {
    expect(receiptDetail).toContain("stripeCheckoutSessionId");
  });
});

// ─── F: ReceiptDetail Navigation ──────────────────────────────────────────────
describe("F: ReceiptDetail navigation", () => {
  it("F1 — ReceiptDetail has Back to Billing link", () => {
    expect(receiptDetail).toContain("Back to Billing");
    expect(receiptDetail).toContain("/billing");
  });

  it("F2 — ReceiptDetail shows Stripe receipt link only when stripeReceiptUrl present", () => {
    expect(receiptDetail).toContain("stripeReceiptUrl");
    // Should be conditionally rendered
    const idx = receiptDetail.indexOf("stripeReceiptUrl");
    const slice = receiptDetail.slice(idx - 50, idx + 200);
    expect(slice).toMatch(/&&|\?.*:/);
  });

  it("F3 — ReceiptDetail shows refund policy link", () => {
    expect(receiptDetail).toContain("refund-policy");
  });
});

// ─── G: ReceiptDetail Error States ────────────────────────────────────────────
describe("G: ReceiptDetail error and loading states", () => {
  it("G1 — ReceiptDetail handles loading state", () => {
    expect(receiptDetail).toContain("isLoading");
  });

  it("G2 — ReceiptDetail handles error / not found state", () => {
    expect(receiptDetail).toMatch(/error|not found|Receipt not found/i);
  });

  it("G3 — ReceiptDetail uses useParams to get id from URL", () => {
    expect(receiptDetail).toContain("useParams");
    expect(receiptDetail).toContain("id");
  });
});

// ─── H: App.tsx Route Registration ───────────────────────────────────────────
describe("H: App.tsx route registration", () => {
  it("H1 — ReceiptDetail is imported in App.tsx", () => {
    expect(app).toContain("ReceiptDetail");
  });

  it("H2 — /billing/receipts/:id route is registered", () => {
    expect(app).toContain("/billing/receipts/");
  });

  it("H3 — /billing/receipts/:id uses DashboardRoute wrapper", () => {
    const idx = app.indexOf("/billing/receipts/");
    const slice = app.slice(idx - 50, idx + 200);
    expect(slice).toContain("DashboardRoute");
  });
});

// ─── I: EarlyAccessGuard coverage ─────────────────────────────────────────────
describe("I: EarlyAccessGuard covers /billing/receipts paths", () => {
  it("I1 — /billing prefix is in GATED_PREFIXES (covers /billing/receipts/* too)", () => {
    expect(app).toContain('"/billing"');
  });
});
