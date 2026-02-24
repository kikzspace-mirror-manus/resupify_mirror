/**
 * V2 — Onboarding Step 0: Country Pack Self-Selection Tests
 *
 * Covers:
 * - profile.setCountryPack mutation: accepts valid CountryPackId values, rejects invalid
 * - db.updateUserCountryPack: helper exists and is callable
 * - Onboarding.tsx: Step 0 UI elements present, flag-gated, sticky preselect, CA/VN flow
 * - Regression: flag OFF → no Step 0 rendered
 */
import { describe, it, expect, beforeAll } from "vitest";
import { COUNTRY_PACK_IDS } from "../shared/countryPacks";

// ─── Unit tests: COUNTRY_PACK_IDS ────────────────────────────────────────────

describe("COUNTRY_PACK_IDS enum", () => {
  it("T1: COUNTRY_PACK_IDS includes CA and VN", () => {
    expect(COUNTRY_PACK_IDS).toContain("CA");
    expect(COUNTRY_PACK_IDS).toContain("VN");
  });

  it("T2: COUNTRY_PACK_IDS includes GLOBAL, PH, US", () => {
    expect(COUNTRY_PACK_IDS).toContain("GLOBAL");
    expect(COUNTRY_PACK_IDS).toContain("PH");
    expect(COUNTRY_PACK_IDS).toContain("US");
  });

  it("T3: COUNTRY_PACK_IDS has exactly 5 entries", () => {
    expect(COUNTRY_PACK_IDS).toHaveLength(5);
  });
});

// ─── Integration tests: profile.setCountryPack mutation ──────────────────────

describe("profile.setCountryPack mutation", () => {
  const makeCtx = (countryPackId: string | null = null) => ({
    user: {
      id: 1, openId: "test", name: "Test", email: "test@test.com",
      role: "user" as const, isAdmin: false, adminNotes: null,
      disabled: false, earlyAccessEnabled: false, earlyAccessGrantUsed: false,
      countryPackId, languageMode: "en" as const,
      createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
      loginMethod: null,
    },
    req: { protocol: "https", headers: {} } as any,
    res: { clearCookie: () => {} } as any,
  });

  it("T4: setCountryPack accepts CA", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.profile.setCountryPack({ countryPackId: "CA" });
    expect(result.success).toBe(true);
    // languageModeSet is false for non-VN
    expect(result.languageModeSet).toBe(false);
  });

  it("T5: setCountryPack accepts VN", async () => {
    const { appRouter } = await import("./routers");
    // user has languageMode=en (already set) → languageModeSet should be false
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.profile.setCountryPack({ countryPackId: "VN" });
    expect(result.success).toBe(true);
    // languageModeSet is false because languageMode is already "en"
    expect(result.languageModeSet).toBe(false);
  });

  it("T6: setCountryPack accepts GLOBAL", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.profile.setCountryPack({ countryPackId: "GLOBAL" });
    expect(result.success).toBe(true);
    expect(result.languageModeSet).toBe(false);
  });

  it("T7: setCountryPack accepts PH", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.profile.setCountryPack({ countryPackId: "PH" });
    expect(result.success).toBe(true);
    expect(result.languageModeSet).toBe(false);
  });

  it("T8: setCountryPack accepts US", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.profile.setCountryPack({ countryPackId: "US" });
    expect(result.success).toBe(true);
    expect(result.languageModeSet).toBe(false);
  });

  it("T9: setCountryPack rejects invalid countryPackId", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.profile.setCountryPack({ countryPackId: "BOGUS" as any })
    ).rejects.toThrow();
  });

  it("T10: setCountryPack rejects empty string", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.profile.setCountryPack({ countryPackId: "" as any })
    ).rejects.toThrow();
  });

  it("T11: setCountryPack is a protected procedure (requires auth)", async () => {
    const { appRouter } = await import("./routers");
    // Unauthenticated context (no user)
    const unauthCtx = {
      user: null as any,
      req: { protocol: "https", headers: {} } as any,
      res: { clearCookie: () => {} } as any,
    };
    const caller = appRouter.createCaller(unauthCtx);
    await expect(
      caller.profile.setCountryPack({ countryPackId: "CA" })
    ).rejects.toThrow();
  });
});

// ─── Unit tests: db.updateUserCountryPack helper ─────────────────────────────

describe("db.updateUserCountryPack helper", () => {
  it("T12: updateUserCountryPack is exported from server/db.ts", async () => {
    const dbModule = await import("./db");
    expect(typeof (dbModule as any).updateUserCountryPack).toBe("function");
  });
});

// ─── Structural tests: Onboarding.tsx Step 0 UI ──────────────────────────────

describe("Onboarding.tsx Step 0 UI structure", () => {
  const fs = require("fs");
  const path = require("path");
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(
      path.resolve("client/src/pages/Onboarding.tsx"),
      "utf-8"
    );
  });

  it("T13: Onboarding.tsx has step0-country-card testid", () => {
    expect(content).toContain("data-testid=\"step0-country-card\"");
  });

  it("T14: Onboarding.tsx has country-selector testid", () => {
    expect(content).toContain("data-testid=\"country-selector\"");
  });

  it("T15: Onboarding.tsx has dynamic country-option testid", () => {
    // testid is rendered as a template literal: `country-option-${country.id}`
    expect(content).toContain("`country-option-${country.id}`");
  });

  it("T16: Onboarding.tsx maps over COUNTRY_OPTIONS to render country cards", () => {
    expect(content).toContain("COUNTRY_OPTIONS.filter");
  });

  it("T17: Onboarding.tsx has country-continue-btn testid", () => {
    expect(content).toContain("data-testid=\"country-continue-btn\"");
  });

  it("T18: Step 0 is gated behind v2CountryPacksEnabled flag", () => {
    // Step 0 card is only rendered when v2CountryPacksEnabled is true
    expect(content).toContain("step === 0 && v2CountryPacksEnabled");
  });

  it("T19: Step 0 initializes with existing countryPackId (sticky preselect)", () => {
    // useState initializer reads userCountryPackId
    expect(content).toContain("userCountryPackId");
    expect(content).toContain("selectedCountryPackId");
  });

  it("T20: Step 0 calls setCountryPack mutation on Continue", () => {
    expect(content).toContain("setCountryPack.mutateAsync");
    expect(content).toContain("selectedCountryPackId");
  });

  it("T21: COUNTRY_OPTIONS contains GLOBAL, CA, VN, PH, and US", () => {
    // COUNTRY_OPTIONS array now has 5 entries: GLOBAL (added Phase 4), CA, VN, PH, US
    expect(content).toContain("id: \"GLOBAL\""); // GLOBAL added in V2 Onboarding Phase 4
    expect(content).toContain("id: \"CA\"");
    expect(content).toContain("id: \"VN\"");
    expect(content).toContain("id: \"PH\""); // PH added in V2
    expect(content).toContain("id: \"US\""); // US added in V2 US Expansion Step 2
  });

  it("T22: Flag OFF → step starts at 1 (V1 regression)", () => {
    // useState initializer: v2CountryPacksEnabled ? 0 : 1
    expect(content).toContain("v2CountryPacksEnabled ? 0 : 1");
  });

  it("T23: Onboarding.tsx imports setCountryPack via trpc.profile.setCountryPack", () => {
    expect(content).toContain("trpc.profile.setCountryPack.useMutation");
  });

  it("T24: handleCountryPackContinue resets trackCode to new country default", () => {
    expect(content).toContain("handleCountryPackContinue");
    expect(content).toContain("newDefault");
    expect(content).toContain("setTrackCode(newDefault)");
  });

  it("T25: effectiveCountryPackId uses selectedCountryPackId when flag ON", () => {
    expect(content).toContain("effectiveCountryPackId");
    expect(content).toContain("v2CountryPacksEnabled ? selectedCountryPackId");
  });

  it("T26: Track step uses effectiveCountryPackId for getTracksForCountry", () => {
    expect(content).toContain("getTracksForCountry(effectiveCountryPackId");
  });

  it("T27: CA flag emoji is present in country options", () => {
    expect(content).toContain("🇨🇦");
  });

  it("T28: VN flag emoji is present in country options", () => {
    expect(content).toContain("🇻🇳");
  });

  it("T29: Back button on Track step goes to Step 0 when flag ON", () => {
    expect(content).toContain("setStep(0)");
  });

  it("T30: Onboarding.tsx imports from @shared/trackOptions (shared module)", () => {
    expect(content).toContain("from \"@shared/trackOptions\"");
  });

  it("T31: Onboarding.tsx imports CountryPackId from @shared/countryPacks", () => {
    expect(content).toContain("from \"@shared/countryPacks\"");
  });
});

// ─── Structural tests: routers.ts has setCountryPack procedure ────────────────

describe("routers.ts has setCountryPack procedure", () => {
  const fs = require("fs");
  const path = require("path");
  let routersContent: string;

  beforeAll(() => {
    routersContent = fs.readFileSync(
      path.resolve("server/routers.ts"),
      "utf-8"
    );
  });

  it("T32: routers.ts has setCountryPack procedure", () => {
    expect(routersContent).toContain("setCountryPack:");
  });

  it("T33: setCountryPack uses protectedProcedure", () => {
    const idx = routersContent.indexOf("setCountryPack:");
    const block = routersContent.slice(idx, idx + 300);
    expect(block).toContain("protectedProcedure");
  });

  it("T34: setCountryPack validates countryPackId with COUNTRY_PACK_IDS enum", () => {
    expect(routersContent).toContain("COUNTRY_PACK_IDS");
    // Uses spread to convert readonly tuple: z.enum([...COUNTRY_PACK_IDS] ...)
    expect(routersContent).toContain("COUNTRY_PACK_IDS]");
  });

  it("T35: setCountryPack calls db.updateUserCountryPack", () => {
    expect(routersContent).toContain("db.updateUserCountryPack");
  });

  it("T36: setCountryPack updates only the current user's record (ctx.user.id)", () => {
    const idx = routersContent.indexOf("setCountryPack:");
    const block = routersContent.slice(idx, idx + 400);
    expect(block).toContain("ctx.user.id");
  });
});

// ─── Structural tests: db.ts has updateUserCountryPack ───────────────────────

describe("db.ts has updateUserCountryPack helper", () => {
  const fs = require("fs");
  const path = require("path");
  let dbContent: string;

  beforeAll(() => {
    dbContent = fs.readFileSync(
      path.resolve("server/db.ts"),
      "utf-8"
    );
  });

  it("T37: db.ts exports updateUserCountryPack function", () => {
    expect(dbContent).toContain("export async function updateUserCountryPack");
  });

  it("T38: updateUserCountryPack updates users table", () => {
    const idx = dbContent.indexOf("export async function updateUserCountryPack");
    const block = dbContent.slice(idx, idx + 300);
    expect(block).toContain("update(users)");
  });

  it("T39: updateUserCountryPack filters by userId", () => {
    const idx = dbContent.indexOf("export async function updateUserCountryPack");
    const block = dbContent.slice(idx, idx + 300);
    expect(block).toContain("userId");
  });
});
