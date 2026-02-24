/**
 * Phase 11E Acceptance Tests — Refund Policy Link + Policy Page
 *
 * Tests cover:
 * A) Billing page has a "Refund policy" link pointing to /refund-policy
 * B) RefundPolicy.tsx page exists and contains required policy sections
 * C) Policy content: 7-day window, used credits, billing errors, chargebacks, how to request
 * D) Policy includes "Last updated" date
 * E) Policy includes support email
 * F) App.tsx routes /refund-policy to RefundPolicy component
 * G) No backend changes — no new tRPC procedures, no schema changes
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const BILLING_PATH = path.join(__dirname, "../client/src/pages/Billing.tsx");
const REFUND_POLICY_PATH = path.join(__dirname, "../client/src/pages/RefundPolicy.tsx");
const APP_PATH = path.join(__dirname, "../client/src/App.tsx");
const SCHEMA_PATH = path.join(__dirname, "../drizzle/schema.ts");
const ROUTERS_PATH = path.join(__dirname, "routers.ts");
const ADMIN_ROUTER_PATH = path.join(__dirname, "routers/admin.ts");

const billing = fs.readFileSync(BILLING_PATH, "utf-8");
const refundPolicy = fs.readFileSync(REFUND_POLICY_PATH, "utf-8");
const appTsx = fs.readFileSync(APP_PATH, "utf-8");
const schema = fs.readFileSync(SCHEMA_PATH, "utf-8");
const routers = fs.readFileSync(ROUTERS_PATH, "utf-8");
const adminRouter = fs.readFileSync(ADMIN_ROUTER_PATH, "utf-8");

// ─── A: Billing page link ─────────────────────────────────────────────────────
describe("A: Billing page refund policy link", () => {
  it("A1 — Billing page imports Link from wouter", () => {
    expect(billing).toContain("Link");
    expect(billing).toContain("wouter");
  });

  it("A2 — Billing page has href /refund-policy", () => {
    expect(billing).toContain("/refund-policy");
  });

  it("A3 — Billing page link text is 'Refund policy'", () => {
    expect(billing).toContain("Refund policy");
  });

  it("A4 — Refund policy link is placed near the credit packs section", () => {
    // The link should appear after the packs grid and before the Transaction History section
    const packsIdx = billing.indexOf("Buy Credits");
    const linkIdx = billing.indexOf("/refund-policy");
    const txHistoryIdx = billing.indexOf("Transaction History");
    expect(packsIdx).toBeGreaterThan(-1);
    expect(linkIdx).toBeGreaterThan(packsIdx);
    expect(linkIdx).toBeLessThan(txHistoryIdx);
  });
});

// ─── B: RefundPolicy page exists ─────────────────────────────────────────────
describe("B: RefundPolicy page exists", () => {
  it("B1 — RefundPolicy.tsx file exists", () => {
    expect(fs.existsSync(REFUND_POLICY_PATH)).toBe(true);
  });

  it("B2 — RefundPolicy exports a default component", () => {
    expect(refundPolicy).toContain("export default function RefundPolicy");
  });

  it("B3 — RefundPolicy has a back link to /billing", () => {
    expect(refundPolicy).toContain("/billing");
  });

  it("B4 — RefundPolicy has a main heading 'Refund Policy'", () => {
    expect(refundPolicy).toContain("Refund Policy");
  });
});

// ─── C: Policy content sections ──────────────────────────────────────────────
describe("C: Policy content sections", () => {
  it("C1 — Policy mentions 7-day refund window", () => {
    expect(refundPolicy).toMatch(/7.day|7 day|seven.day/i);
  });

  it("C2 — Policy states unused credits are required for refund", () => {
    expect(refundPolicy).toMatch(/unused/i);
  });

  it("C3 — Policy states used credits are not refundable", () => {
    expect(refundPolicy).toMatch(/used credits|credits.*used|not refundable/i);
  });

  it("C4 — Policy mentions billing errors / service outages", () => {
    expect(refundPolicy).toMatch(/billing error|service outage|charged incorrectly/i);
  });

  it("C5 — Policy mentions courtesy adjustment for billing errors", () => {
    expect(refundPolicy).toMatch(/courtesy|one.time/i);
  });

  it("C6 — Policy mentions chargebacks and credit reversal", () => {
    expect(refundPolicy).toMatch(/chargeback/i);
  });

  it("C7 — Policy states balance may go negative after chargeback", () => {
    expect(refundPolicy).toMatch(/below zero|negative/i);
  });

  it("C8 — Policy has a 'How to request a refund' section", () => {
    expect(refundPolicy).toMatch(/how to request|request a refund/i);
  });

  it("C9 — Policy lists at least 3 steps for requesting a refund", () => {
    // Numbered list items
    const matches = refundPolicy.match(/<li>/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(3);
  });
});

// ─── D: Last updated date ─────────────────────────────────────────────────────
describe("D: Last updated date", () => {
  it("D1 — Policy includes 'Last updated' text", () => {
    expect(refundPolicy).toContain("Last updated");
  });

  it("D2 — Policy includes a year (2025 or 2026)", () => {
    expect(refundPolicy).toMatch(/202[56]/);
  });
});

// ─── E: Support email ─────────────────────────────────────────────────────────
describe("E: Support email", () => {
  it("E1 — Policy includes a support email address", () => {
    expect(refundPolicy).toMatch(/support@|@resupify\.com/);
  });

  it("E2 — Support email is a mailto link", () => {
    expect(refundPolicy).toContain("mailto:");
  });
});

// ─── F: App.tsx routing ───────────────────────────────────────────────────────
describe("F: App.tsx routing", () => {
  it("F1 — App.tsx imports RefundPolicy", () => {
    expect(appTsx).toContain("RefundPolicy");
  });

  it("F2 — App.tsx routes /refund-policy to RefundPolicy", () => {
    expect(appTsx).toContain("/refund-policy");
    expect(appTsx).toContain("component={RefundPolicy}");
  });

  it("F3 — /refund-policy route is outside EarlyAccessGuard gated prefixes", () => {
    // The gated prefixes are /dashboard, /today, /jobs, /resumes, /outreach, /analytics, /billing, /profile
    const gatedPrefixes = billing.includes("GATED_PREFIXES") ? billing : appTsx;
    // /refund-policy should NOT be in the GATED_PREFIXES array
    const gatedIdx = appTsx.indexOf("GATED_PREFIXES");
    if (gatedIdx > -1) {
      const gatedSlice = appTsx.slice(gatedIdx, gatedIdx + 400);
      expect(gatedSlice).not.toContain("/refund-policy");
    }
  });
});

// ─── G: No backend changes ────────────────────────────────────────────────────
describe("G: No backend changes (frontend-only)", () => {
  it("G1 — No new refundPolicy procedure added to routers.ts", () => {
    // The main routers.ts should not have a refundPolicy procedure
    expect(routers).not.toContain("refundPolicy");
  });

  it("G2 — No refund_policy table added to schema.ts", () => {
    expect(schema).not.toContain("refund_policy_");
  });

  it("G3 — Admin router not modified for this phase (no refundPolicy in admin)", () => {
    // Admin router should not have a new refundPolicy endpoint
    expect(adminRouter).not.toContain("refundPolicy:");
  });
});
