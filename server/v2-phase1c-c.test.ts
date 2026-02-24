/**
 * V2 Phase 1C-C Tests — Pack-Aware Generation
 *
 * Tests for resolvePackContextForGeneration helper and prompt prefix injection.
 * All tests are pure unit tests — no DB, no LLM, no network.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { featureFlags } from "../shared/featureFlags";
import { countryPackRegistry, DEFAULT_COUNTRY_PACK_ID } from "../shared/countryPacks";

// ── Helpers ──────────────────────────────────────────────────────────────────

function withFlag(flag: keyof typeof featureFlags, value: boolean, fn: () => void) {
  const original = featureFlags[flag];
  (featureFlags as any)[flag] = value;
  try { fn(); } finally { (featureFlags as any)[flag] = original; }
}

// ── A: countryPackRegistry completeness ──────────────────────────────────────

describe("A: countryPackRegistry completeness", () => {
  it("A1: GLOBAL pack exists with templateStyleKey global_english", () => {
    expect(countryPackRegistry["GLOBAL"].templateStyleKey).toBe("global_english");
  });

  it("A2: CA pack exists with templateStyleKey ca_english", () => {
    expect(countryPackRegistry["CA"].templateStyleKey).toBe("ca_english");
  });

  it("A3: VN pack exists with translationEnabled true", () => {
    expect(countryPackRegistry["VN"].translationEnabled).toBe(true);
  });

  it("A4: PH pack exists with translationEnabled false", () => {
    expect(countryPackRegistry["PH"].translationEnabled).toBe(false);
  });

  it("A5: US pack exists with templateStyleKey us_english", () => {
    expect(countryPackRegistry["US"].templateStyleKey).toBe("us_english");
  });

  it("A6: DEFAULT_COUNTRY_PACK_ID is GLOBAL", () => {
    expect(DEFAULT_COUNTRY_PACK_ID).toBe("GLOBAL");
  });

  it("A7: All packs have defaultLanguageMode set", () => {
    for (const [id, pack] of Object.entries(countryPackRegistry)) {
      expect(pack.defaultLanguageMode, `Pack ${id} missing defaultLanguageMode`).toBeDefined();
    }
  });
});

// ── B: resolvePackContextForGeneration — flag OFF ────────────────────────────

describe("B: resolvePackContextForGeneration — flag OFF", () => {
  beforeEach(() => { (featureFlags as any).v2CountryPacksEnabled = false; });
  afterEach(() => { (featureFlags as any).v2CountryPacksEnabled = false; });

  it("B1: returns GLOBAL when flag is OFF regardless of userId", async () => {
    // Dynamically import to avoid circular issues
    const { resolvePackContextForGeneration } = await import("./v2PackContext");
    const ctx = await resolvePackContextForGeneration({ userId: 1 });
    expect(ctx.countryPackId).toBe("GLOBAL");
  });

  it("B2: packPromptPrefix is empty string when flag is OFF", async () => {
    const { resolvePackContextForGeneration } = await import("./v2PackContext");
    const ctx = await resolvePackContextForGeneration({ userId: 1 });
    expect(ctx.packPromptPrefix).toBe("");
  });

  it("B3: templateStyleKey is global_english when flag is OFF", async () => {
    const { resolvePackContextForGeneration } = await import("./v2PackContext");
    const ctx = await resolvePackContextForGeneration({ userId: 1 });
    expect(ctx.templateStyleKey).toBe("global_english");
  });

  it("B4: languageMode defaults to en when flag is OFF", async () => {
    const { resolvePackContextForGeneration } = await import("./v2PackContext");
    const ctx = await resolvePackContextForGeneration({ userId: 1 });
    expect(ctx.languageMode).toBe("en");
  });
});

// ── C: resolvePackContextForGeneration — direct override ─────────────────────

describe("C: resolvePackContextForGeneration — direct override", () => {
  beforeEach(() => { (featureFlags as any).v2CountryPacksEnabled = true; });
  afterEach(() => { (featureFlags as any).v2CountryPacksEnabled = false; });

  it("C1: overrideCountryPackId=CA returns CA pack", async () => {
    const { resolvePackContextForGeneration } = await import("./v2PackContext");
    const ctx = await resolvePackContextForGeneration({
      userId: 1,
      overrideCountryPackId: "CA",
    });
    expect(ctx.countryPackId).toBe("CA");
    expect(ctx.templateStyleKey).toBe("ca_english");
  });

  it("C2: CA packPromptPrefix contains 'Canadian'", async () => {
    const { resolvePackContextForGeneration } = await import("./v2PackContext");
    const ctx = await resolvePackContextForGeneration({
      userId: 1,
      overrideCountryPackId: "CA",
    });
    expect(ctx.packPromptPrefix).toContain("Canadian");
  });

  it("C3: overrideCountryPackId=VN returns VN pack", async () => {
    const { resolvePackContextForGeneration } = await import("./v2PackContext");
    const ctx = await resolvePackContextForGeneration({
      userId: 1,
      overrideCountryPackId: "VN",
    });
    expect(ctx.countryPackId).toBe("VN");
    expect(ctx.packPromptPrefix).toContain("Vietnamese");
  });

  it("C4: overrideCountryPackId=GLOBAL returns empty packPromptPrefix", async () => {
    const { resolvePackContextForGeneration } = await import("./v2PackContext");
    const ctx = await resolvePackContextForGeneration({
      userId: 1,
      overrideCountryPackId: "GLOBAL",
    });
    expect(ctx.packPromptPrefix).toBe("");
  });

  it("C5: invalid overrideCountryPackId falls back to GLOBAL", async () => {
    const { resolvePackContextForGeneration } = await import("./v2PackContext");
    const ctx = await resolvePackContextForGeneration({
      userId: 1,
      overrideCountryPackId: "INVALID" as any,
    });
    expect(ctx.countryPackId).toBe("GLOBAL");
  });

  it("C6: userLanguageMode is passed through correctly", async () => {
    const { resolvePackContextForGeneration } = await import("./v2PackContext");
    const ctx = await resolvePackContextForGeneration({
      userId: 1,
      overrideCountryPackId: "VN",
      userLanguageMode: "vi",
    });
    expect(ctx.languageMode).toBe("vi");
  });

  it("C7: userLanguageMode defaults to en when not provided", async () => {
    const { resolvePackContextForGeneration } = await import("./v2PackContext");
    const ctx = await resolvePackContextForGeneration({
      userId: 1,
      overrideCountryPackId: "CA",
    });
    expect(ctx.languageMode).toBe("en");
  });
});

// ── D: PACK_PROMPT_PREFIXES content checks ───────────────────────────────────

describe("D: Pack prompt prefix content", () => {
  beforeEach(() => { (featureFlags as any).v2CountryPacksEnabled = true; });
  afterEach(() => { (featureFlags as any).v2CountryPacksEnabled = false; });

  it("D1: CA prefix mentions Canadian English spelling", async () => {
    const { resolvePackContextForGeneration } = await import("./v2PackContext");
    const ctx = await resolvePackContextForGeneration({ userId: 1, overrideCountryPackId: "CA" });
    expect(ctx.packPromptPrefix).toContain("Canadian English");
  });

  it("D2: US prefix mentions United States", async () => {
    const { resolvePackContextForGeneration } = await import("./v2PackContext");
    const ctx = await resolvePackContextForGeneration({ userId: 1, overrideCountryPackId: "US" });
    expect(ctx.packPromptPrefix).toContain("United States");
  });

  it("D3: PH prefix mentions Philippine", async () => {
    const { resolvePackContextForGeneration } = await import("./v2PackContext");
    const ctx = await resolvePackContextForGeneration({ userId: 1, overrideCountryPackId: "PH" });
    expect(ctx.packPromptPrefix).toContain("Philippine");
  });

  it("D4: GLOBAL prefix is empty (no country-specific injection)", async () => {
    const { resolvePackContextForGeneration } = await import("./v2PackContext");
    const ctx = await resolvePackContextForGeneration({ userId: 1, overrideCountryPackId: "GLOBAL" });
    expect(ctx.packPromptPrefix).toBe("");
  });
});

// ── E: Prompt injection pattern (structural) ─────────────────────────────────

describe("E: Prompt injection pattern in routers.ts", () => {
  it("E1: Evidence Scan prompt injection uses v2PackCtx.packPromptPrefix spread", () => {
    const fs = require("fs");
    const src = fs.readFileSync("server/routers.ts", "utf-8");
    // Find the evidence.run section and check for the spread pattern
    const evidenceIdx = src.indexOf("evidence: router(");
    const evidenceSection = src.slice(evidenceIdx, evidenceIdx + 6000);
    expect(evidenceSection).toContain("v2PackCtx.packPromptPrefix");
    expect(evidenceSection).toContain("resolvePackContextForGeneration");
  });

  it("E2: Application Kit prompt injection uses v2PackCtx.packPromptPrefix spread", () => {
    const fs = require("fs");
    const src = fs.readFileSync("server/routers.ts", "utf-8");
    // Find the applicationKits.generate section
    const kitIdx = src.indexOf("applicationKits: router(");
    const kitSection = src.slice(kitIdx, kitIdx + 6000);
    expect(kitSection).toContain("v2PackCtx.packPromptPrefix");
    expect(kitSection).toContain("resolvePackContextForGeneration");
  });

  it("E3: resolvePackContextForGeneration is imported in routers.ts", () => {
    const fs = require("fs");
    const src = fs.readFileSync("server/routers.ts", "utf-8");
    expect(src).toContain("import { resolvePackContextForGeneration } from \"./v2PackContext\"");
  });

  it("E4: v2PackContext.ts exists and exports resolvePackContextForGeneration", () => {
    const fs = require("fs");
    const src = fs.readFileSync("server/v2PackContext.ts", "utf-8");
    expect(src).toContain("export async function resolvePackContextForGeneration");
  });

  it("E5: Flag OFF guard is first check in resolvePackContextForGeneration", () => {
    const fs = require("fs");
    const src = fs.readFileSync("server/v2PackContext.ts", "utf-8");
    const fnIdx = src.indexOf("export async function resolvePackContextForGeneration");
    const fnBody = src.slice(fnIdx, fnIdx + 500);
    expect(fnBody).toContain("v2CountryPacksEnabled");
    expect(fnBody).toContain("GLOBAL");
  });
});

// ── F: V1 behavior preservation ──────────────────────────────────────────────

describe("F: V1 behavior preservation", () => {
  it("F1: flag OFF → packPromptPrefix is empty string (no prompt change)", async () => {
    (featureFlags as any).v2CountryPacksEnabled = false;
    const { resolvePackContextForGeneration } = await import("./v2PackContext");
    const ctx = await resolvePackContextForGeneration({ userId: 999 });
    expect(ctx.packPromptPrefix).toBe("");
    (featureFlags as any).v2CountryPacksEnabled = false;
  });

  it("F2: spreading empty packPromptPrefix array adds nothing to prompt", () => {
    const prefix = "";
    const promptLines = [
      ...(prefix ? [prefix, ""] : []),
      "You are an expert ATS resume analyzer.",
    ];
    expect(promptLines[0]).toBe("You are an expert ATS resume analyzer.");
    expect(promptLines.length).toBe(1);
  });

  it("F3: spreading non-empty packPromptPrefix adds 2 lines before main prompt", () => {
    const prefix = "This is a Canadian job market position.";
    const promptLines = [
      ...(prefix ? [prefix, ""] : []),
      "You are an expert ATS resume analyzer.",
    ];
    expect(promptLines[0]).toBe(prefix);
    expect(promptLines[1]).toBe("");
    expect(promptLines[2]).toBe("You are an expert ATS resume analyzer.");
    expect(promptLines.length).toBe(3);
  });
});
