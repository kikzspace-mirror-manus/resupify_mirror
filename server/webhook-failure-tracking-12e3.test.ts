/**
 * Phase 12E.3: Webhook failure tracking — ops_status write on error
 *
 * Acceptance tests covering:
 * E3_1: The processing catch block calls upsertOpsStatus in stripeWebhook.ts
 * E3_2: The failure write is in the processing catch (not the signature-verification catch)
 * E3_3: The failure write uses lastStripeWebhookFailureAt: new Date()
 * E3_4: The failure write is wrapped in .catch() so it never throws
 * E3_5: The original res.status(500) is still returned after the failure write
 * E3_6: The signature-verification catch does NOT call upsertOpsStatus
 * E3_7: upsertOpsStatus is still imported in stripeWebhook.ts (not removed)
 * E3_8: Success path (upsertOpsStatus on success) is still present and unchanged
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");
const WEBHOOK_FILE = path.join(ROOT, "server/stripeWebhook.ts");
const src = fs.readFileSync(WEBHOOK_FILE, "utf-8");

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Extract the processing try/catch block (the one around handleWebhookEvent) */
function getProcessingCatchBlock(): string {
  const tryIdx = src.indexOf("await handleWebhookEvent(event)");
  expect(tryIdx).toBeGreaterThan(-1);
  // Grab 650 chars from the try statement to cover the full catch block
  const tryStart = src.lastIndexOf("try {", tryIdx);
  return src.slice(tryStart, tryStart + 650);
}

/** Extract the signature-verification catch block */
function getSigVerifyCatchBlock(): string {
  const sigIdx = src.indexOf("Webhook signature verification failed");
  expect(sigIdx).toBeGreaterThan(-1);
  const catchStart = src.lastIndexOf("} catch (", sigIdx);
  return src.slice(catchStart, catchStart + 300);
}

// ─── E3_1: failure write is present in the processing catch ──────────────────
describe("E3_1: upsertOpsStatus called in processing catch block", () => {
  it("E3_1: processing catch block contains upsertOpsStatus call", () => {
    const block = getProcessingCatchBlock();
    expect(block).toContain("upsertOpsStatus");
  });
});

// ─── E3_2: failure write is in processing catch, not sig-verify catch ────────
describe("E3_2: failure write is in the processing catch (not sig-verify catch)", () => {
  it("E3_2: signature-verification catch does NOT call upsertOpsStatus", () => {
    const sigBlock = getSigVerifyCatchBlock();
    expect(sigBlock).not.toContain("upsertOpsStatus");
  });

  it("E3_2b: processing catch DOES call upsertOpsStatus", () => {
    const procBlock = getProcessingCatchBlock();
    expect(procBlock).toContain("upsertOpsStatus");
  });
});

// ─── E3_3: correct field name ─────────────────────────────────────────────────
describe("E3_3: failure write uses lastStripeWebhookFailureAt", () => {
  it("E3_3: upsertOpsStatus call in catch uses lastStripeWebhookFailureAt: new Date()", () => {
    const block = getProcessingCatchBlock();
    const upsertIdx = block.indexOf("upsertOpsStatus");
    const callBlock = block.slice(upsertIdx, upsertIdx + 100);
    expect(callBlock).toContain("lastStripeWebhookFailureAt");
    expect(callBlock).toContain("new Date()");
  });
});

// ─── E3_4: wrapped in .catch() ────────────────────────────────────────────────
describe("E3_4: failure write is fire-and-forget (wrapped in .catch)", () => {
  it("E3_4: upsertOpsStatus call is followed by .catch() to prevent crashes", () => {
    const block = getProcessingCatchBlock();
    const upsertIdx = block.indexOf("upsertOpsStatus");
    const afterUpsert = block.slice(upsertIdx, upsertIdx + 200);
    expect(afterUpsert).toContain(".catch(");
  });
});

// ─── E3_5: original 500 response still returned ───────────────────────────────
describe("E3_5: original 500 response is still returned", () => {
  it("E3_5: processing catch block still returns res.status(500)", () => {
    const block = getProcessingCatchBlock();
    expect(block).toContain("res.status(500)");
    expect(block).toContain("Webhook processing failed");
  });
});

// ─── E3_6: sig-verify catch unchanged ────────────────────────────────────────
describe("E3_6: signature-verification catch is unchanged", () => {
  it("E3_6: sig-verify catch still returns res.status(400)", () => {
    const sigBlock = getSigVerifyCatchBlock();
    expect(sigBlock).toContain("res.status(400)");
  });
});

// ─── E3_7: import still present ──────────────────────────────────────────────
describe("E3_7: upsertOpsStatus import is still present", () => {
  it("E3_7: stripeWebhook.ts still imports upsertOpsStatus from ./db", () => {
    const importLine = src.split("\n").find(l => l.includes("import") && l.includes("upsertOpsStatus"));
    expect(importLine).toBeTruthy();
    expect(importLine).toContain("./db");
  });
});

// ─── E3_8: success path unchanged ────────────────────────────────────────────
describe("E3_8: success path (Phase 12E.2) is still present and unchanged", () => {
  it("E3_8: upsertOpsStatus with lastStripeWebhookSuccessAt still exists in success path", () => {
    const checkoutCaseIdx = src.indexOf('case "checkout.session.completed"');
    expect(checkoutCaseIdx).toBeGreaterThan(-1);
    const body = src.slice(checkoutCaseIdx, checkoutCaseIdx + 4200);
    expect(body).toContain("lastStripeWebhookSuccessAt");
    expect(body).toContain("lastStripeWebhookEventId");
    expect(body).toContain("lastStripeWebhookEventType");
  });
});
