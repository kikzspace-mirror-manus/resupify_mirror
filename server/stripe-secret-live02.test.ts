/**
 * Phase LIVE-02: Validate STRIPE_WEBHOOK_SECRET_V2 is set and well-formed
 *
 * Tests:
 * L1: STRIPE_WEBHOOK_SECRET_V2 env var is set
 * L2: STRIPE_WEBHOOK_SECRET_V2 starts with whsec_
 * L3: STRIPE_WEBHOOK_SECRET_V2 has a reasonable length (>= 30 chars)
 * L4: Server webhook handler reads STRIPE_WEBHOOK_SECRET_V2 (not any other secret name)
 * L5: Server webhook handler does not fall back to STRIPE_WEBHOOK_SECRET
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");
const WEBHOOK_FILE = path.join(ROOT, "server/stripeWebhook.ts");
const webhookContent = fs.readFileSync(WEBHOOK_FILE, "utf-8");

describe("L1-L3: STRIPE_WEBHOOK_SECRET_V2 env var", () => {
  it("L1: STRIPE_WEBHOOK_SECRET_V2 is set in the environment", () => {
    expect(process.env.STRIPE_WEBHOOK_SECRET_V2).toBeTruthy();
  });

  it("L2: STRIPE_WEBHOOK_SECRET_V2 starts with whsec_", () => {
    expect(process.env.STRIPE_WEBHOOK_SECRET_V2).toMatch(/^whsec_/);
  });

  it("L3: STRIPE_WEBHOOK_SECRET_V2 has a reasonable length (>= 30 chars)", () => {
    expect((process.env.STRIPE_WEBHOOK_SECRET_V2 ?? "").length).toBeGreaterThanOrEqual(30);
  });
});

describe("L4-L5: Webhook handler uses STRIPE_WEBHOOK_SECRET_V2 exclusively", () => {
  it("L4: Webhook handler reads STRIPE_WEBHOOK_SECRET_V2", () => {
    expect(webhookContent).toContain("STRIPE_WEBHOOK_SECRET_V2");
  });

  it("L5: Webhook handler does not fall back to STRIPE_WEBHOOK_SECRET (without _V2)", () => {
    // The handler should NOT use the old STRIPE_WEBHOOK_SECRET env var
    // (only STRIPE_WEBHOOK_SECRET_V2 is allowed)
    const lines = webhookContent.split("\n");
    const badLines = lines.filter(
      (line) =>
        line.includes("STRIPE_WEBHOOK_SECRET") &&
        !line.includes("STRIPE_WEBHOOK_SECRET_V2") &&
        !line.trim().startsWith("//")
    );
    expect(badLines).toHaveLength(0);
  });
});
