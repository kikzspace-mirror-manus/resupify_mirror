/**
 * Phase 12E.2: Wire ops_status updates on webhook SUCCESS
 *
 * Acceptance tests covering:
 * E2_1: stripeWebhook.ts imports upsertOpsStatus from db
 * E2_2: upsertOpsStatus is called in the checkout.session.completed success path
 * E2_3: upsertOpsStatus is called AFTER recordStripeEvent with status "processed"
 * E2_4: upsertOpsStatus is NOT called in the manual_review (missing metadata) path
 * E2_5: upsertOpsStatus is NOT called in the charge.refunded path
 * E2_6: upsertOpsStatus is NOT called in the default/skipped path
 * E2_7: upsertOpsStatus call uses lastStripeWebhookSuccessAt = new Date()
 * E2_8: upsertOpsStatus call passes event.id as lastStripeWebhookEventId
 * E2_9: upsertOpsStatus call passes event.type as lastStripeWebhookEventType
 * E2_10: test event bypass (evt_test_*) does NOT reach upsertOpsStatus
 * E2_11: upsertOpsStatus is exported from server/db.ts
 * E2_12: upsertOpsStatus function in db.ts writes to ops_status table
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");
const WEBHOOK_FILE = path.join(ROOT, "server/stripeWebhook.ts");
const DB_FILE = path.join(ROOT, "server/db.ts");

const webhookSrc = fs.readFileSync(WEBHOOK_FILE, "utf-8");
const dbSrc = fs.readFileSync(DB_FILE, "utf-8");

// ─── Helper: extract checkout.session.completed case body ────────────────────
function getCheckoutSuccessBody(): string {
  const caseIdx = webhookSrc.indexOf('case "checkout.session.completed"');
  expect(caseIdx).toBeGreaterThan(-1);
  // Extract up to 4200 chars — enough to cover the full case body (email IIFE is ~2500 chars)
  return webhookSrc.slice(caseIdx, caseIdx + 4200);
}

// ─── Helper: extract charge.refunded case body ───────────────────────────────
function getChargeRefundedBody(): string {
  const caseIdx = webhookSrc.indexOf('case "charge.refunded"');
  expect(caseIdx).toBeGreaterThan(-1);
  return webhookSrc.slice(caseIdx, caseIdx + 1000);
}

// ─── Helper: extract default case body ──────────────────────────────────────
function getDefaultBody(): string {
  const caseIdx = webhookSrc.indexOf("default:");
  expect(caseIdx).toBeGreaterThan(-1);
  return webhookSrc.slice(caseIdx, caseIdx + 300);
}

// ─── E2_1-E2_2: Import and call presence ─────────────────────────────────────
describe("E2_1-E2_2: upsertOpsStatus import and call", () => {
  it("E2_1: stripeWebhook.ts imports upsertOpsStatus from db", () => {
    expect(webhookSrc).toContain("upsertOpsStatus");
    // Must be in the import statement
    const importLine = webhookSrc.split("\n").find(l => l.includes("import") && l.includes("upsertOpsStatus"));
    expect(importLine).toBeTruthy();
    expect(importLine).toContain("./db");
  });

  it("E2_2: upsertOpsStatus is called in the checkout.session.completed success path", () => {
    const body = getCheckoutSuccessBody();
    expect(body).toContain("upsertOpsStatus");
  });
});

// ─── E2_3: Ordering ──────────────────────────────────────────────────────────
describe("E2_3: upsertOpsStatus is called AFTER recordStripeEvent processed", () => {
  it("E2_3: upsertOpsStatus appears after recordStripeEvent with status: processed", () => {
    const body = getCheckoutSuccessBody();
    const recordIdx = body.indexOf('status: "processed"');
    const upsertIdx = body.indexOf("upsertOpsStatus");
    expect(recordIdx).toBeGreaterThan(-1);
    expect(upsertIdx).toBeGreaterThan(recordIdx);
  });
});

// ─── E2_4-E2_6: NOT called in other paths ────────────────────────────────────
describe("E2_4-E2_6: upsertOpsStatus NOT called in non-success paths", () => {
  it("E2_4: upsertOpsStatus NOT called in manual_review (missing metadata) path", () => {
    // The manual_review path breaks early before upsertOpsStatus
    const body = getCheckoutSuccessBody();
    const manualReviewIdx = body.indexOf('"manual_review"');
    const upsertIdx = body.indexOf("upsertOpsStatus");
    // manual_review block ends with `break;` before upsertOpsStatus
    const breakAfterManualReview = body.indexOf("break;", manualReviewIdx);
    expect(breakAfterManualReview).toBeLessThan(upsertIdx);
  });

  it("E2_5: upsertOpsStatus NOT called in charge.refunded path", () => {
    const body = getChargeRefundedBody();
    expect(body).not.toContain("upsertOpsStatus");
  });

  it("E2_6: upsertOpsStatus NOT called in default/skipped path", () => {
    const body = getDefaultBody();
    expect(body).not.toContain("upsertOpsStatus");
  });
});

// ─── E2_7-E2_9: Call arguments ───────────────────────────────────────────────
describe("E2_7-E2_9: upsertOpsStatus call arguments", () => {
  it("E2_7: upsertOpsStatus call includes lastStripeWebhookSuccessAt: new Date()", () => {
    const body = getCheckoutSuccessBody();
    const upsertIdx = body.indexOf("upsertOpsStatus");
    const callBlock = body.slice(upsertIdx, upsertIdx + 200);
    expect(callBlock).toContain("lastStripeWebhookSuccessAt");
    expect(callBlock).toContain("new Date()");
  });

  it("E2_8: upsertOpsStatus call passes event.id as lastStripeWebhookEventId", () => {
    const body = getCheckoutSuccessBody();
    const upsertIdx = body.indexOf("upsertOpsStatus");
    const callBlock = body.slice(upsertIdx, upsertIdx + 200);
    expect(callBlock).toContain("lastStripeWebhookEventId");
    expect(callBlock).toContain("event.id");
  });

  it("E2_9: upsertOpsStatus call passes event.type as lastStripeWebhookEventType", () => {
    const body = getCheckoutSuccessBody();
    const upsertIdx = body.indexOf("upsertOpsStatus");
    const callBlock = body.slice(upsertIdx, upsertIdx + 200);
    expect(callBlock).toContain("lastStripeWebhookEventType");
    expect(callBlock).toContain("event.type");
  });
});

// ─── E2_10: Test event bypass ─────────────────────────────────────────────────
describe("E2_10: test event bypass does not reach upsertOpsStatus", () => {
  it("E2_10: evt_test_ early return is before the switch statement", () => {
    const testBypassIdx = webhookSrc.indexOf('event.id.startsWith("evt_test_")');
    const switchIdx = webhookSrc.indexOf("switch (event.type)");
    expect(testBypassIdx).toBeGreaterThan(-1);
    expect(switchIdx).toBeGreaterThan(-1);
    // The test bypass must come before the switch
    expect(testBypassIdx).toBeLessThan(switchIdx);
  });
});

// ─── E2_11-E2_12: DB helper ──────────────────────────────────────────────────
describe("E2_11-E2_12: upsertOpsStatus DB helper", () => {
  it("E2_11: upsertOpsStatus is exported from server/db.ts", () => {
    expect(dbSrc).toContain("export async function upsertOpsStatus");
  });

  it("E2_12: upsertOpsStatus function writes to ops_status table", () => {
    const fnIdx = dbSrc.indexOf("export async function upsertOpsStatus");
    const body = dbSrc.slice(fnIdx, fnIdx + 600);
    // The function uses the drizzle table variable `opsStatus` (camelCase import)
    expect(body).toContain("opsStatus");
  });
});
