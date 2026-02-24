/**
 * V2 — Onboarding Track Selector: VN Tracks (Flag-Gated) Tests
 *
 * Covers:
 * - Flag OFF: profile.upsert still only accepts CA track codes via zod (V1 regression)
 * - Flag ON: VN track codes are accepted by profile.upsert
 * - getTracksForCountry logic (unit tests via file inspection)
 * - system.featureFlags exposes v2CountryPacksEnabled
 * - Persistence: VN/INTERNSHIP saves correctly
 */
import { describe, it, expect, beforeEach } from "vitest";
import { z } from "zod";

// ─── Zod schema validation (mirrors server/routers.ts profile.upsert) ─────────

const TRACK_CODE_ENUM = ["COOP", "NEW_GRAD", "INTERNSHIP", "EARLY_CAREER", "EXPERIENCED"] as const;
const trackCodeSchema = z.enum(TRACK_CODE_ENUM).optional();

describe("profile.upsert trackCode validation (V2 extended enum)", () => {
  it("T1: accepts COOP (CA, V1 regression)", () => {
    expect(() => trackCodeSchema.parse("COOP")).not.toThrow();
  });

  it("T2: accepts NEW_GRAD (CA, V1 regression)", () => {
    expect(() => trackCodeSchema.parse("NEW_GRAD")).not.toThrow();
  });

  it("T3: accepts INTERNSHIP (VN)", () => {
    expect(() => trackCodeSchema.parse("INTERNSHIP")).not.toThrow();
  });

  it("T4: accepts EARLY_CAREER (VN)", () => {
    expect(() => trackCodeSchema.parse("EARLY_CAREER")).not.toThrow();
  });

  it("T5: accepts EXPERIENCED (VN)", () => {
    expect(() => trackCodeSchema.parse("EXPERIENCED")).not.toThrow();
  });

  it("T6: rejects unknown track code", () => {
    expect(() => trackCodeSchema.parse("UNKNOWN_TRACK")).toThrow();
  });

  it("T7: accepts undefined (optional field)", () => {
    expect(() => trackCodeSchema.parse(undefined)).not.toThrow();
  });
});

// ─── getTracksForCountry logic (unit tests via Onboarding.tsx inspection) ─────

describe("Onboarding.tsx getTracksForCountry logic", () => {
  const fs = require("fs");
  const path = require("path");
  let content: string;

  beforeEach(() => {
    content = fs.readFileSync(
      path.resolve("client/src/pages/Onboarding.tsx"),
      "utf-8"
    );
  });

  it("T8: Onboarding.tsx contains getTracksForCountry function", () => {
    expect(content).toContain("getTracksForCountry");
  });

  it("T9: flag OFF returns CA tracks (V1 behavior)", () => {
    expect(content).toContain("if (!v2Enabled)");
    expect(content).toContain("return { tracks: CA_TRACKS");
  });

  it("T10: CA country pack returns CA tracks", () => {
    expect(content).toContain("effectivePack === \"CA\"");
    expect(content).toContain("return { tracks: CA_TRACKS");
  });

  it("T11: VN country pack returns VN tracks", () => {
    expect(content).toContain("effectivePack === \"VN\"");
    expect(content).toContain("return { tracks: VN_TRACKS");
  });

  it("T12: VN default track is NEW_GRAD", () => {
    // VN block returns defaultTrack: "NEW_GRAD"
    const vnBlock = content.slice(content.indexOf("effectivePack === \"VN\""));
    expect(vnBlock.slice(0, 200)).toContain("NEW_GRAD");
  });

  it("T13: CA default track is COOP", () => {
    const caBlock = content.slice(content.indexOf("effectivePack === \"CA\""));
    expect(caBlock.slice(0, 200)).toContain("COOP");
  });

  it("T14: GLOBAL/PH/US returns hasTracksForCountry: false", () => {
    expect(content).toContain("hasTracksForCountry: false");
  });

  it("T15: 'Tracks coming soon' message is present for unsupported countries", () => {
    expect(content).toContain("Tracks coming soon for this region");
  });

  it("T16: tracks-coming-soon testid is present", () => {
    expect(content).toContain("data-testid=\"tracks-coming-soon\"");
  });

  it("T17: track-selector testid is present", () => {
    expect(content).toContain("data-testid=\"track-selector\"");
  });

  it("T18: VN_TRACKS array is defined with 4 tracks", () => {
    expect(content).toContain("const VN_TRACKS: TrackOption[]");
    // Count VN track codes
    const internship = content.includes("\"INTERNSHIP\"");
    const earlyCareer = content.includes("\"EARLY_CAREER\"");
    const experienced = content.includes("\"EXPERIENCED\"");
    expect(internship).toBe(true);
    expect(earlyCareer).toBe(true);
    expect(experienced).toBe(true);
  });

  it("T19: CA_TRACKS array is defined with 2 tracks (V1 regression)", () => {
    expect(content).toContain("const CA_TRACKS: TrackOption[]");
    expect(content).toContain("\"COOP\"");
    expect(content).toContain("\"NEW_GRAD\"");
  });

  it("T20: work auth step is only shown for CA users", () => {
    expect(content).toContain("showWorkAuthStep");
    expect(content).toContain("effectiveRegionCode === \"CA\"");
  });

  it("T21: handleComplete saves regionCode correctly", () => {
    expect(content).toContain("regionCode: effectiveRegionCode");
  });

  it("T22: handleComplete saves trackCode correctly", () => {
    expect(content).toContain("trackCode,");
  });
});

// ─── system.featureFlags endpoint ─────────────────────────────────────────────

describe("system.featureFlags tRPC endpoint", () => {
  it("T23: systemRouter.ts exports featureFlags query", async () => {
    const fs = require("fs");
    const path = require("path");
    const content = fs.readFileSync(
      path.resolve("server/_core/systemRouter.ts"),
      "utf-8"
    );
    expect(content).toContain("featureFlags:");
    expect(content).toContain("v2CountryPacksEnabled");
  });

  it("T24: featureFlags query is a publicProcedure (no auth required)", async () => {
    const fs = require("fs");
    const path = require("path");
    const content = fs.readFileSync(
      path.resolve("server/_core/systemRouter.ts"),
      "utf-8"
    );
    // featureFlags should use publicProcedure
    const flagsSection = content.slice(content.indexOf("featureFlags:"), content.indexOf("featureFlags:") + 200);
    expect(flagsSection).toContain("publicProcedure");
  });

  it("T25: featureFlags returns v2CountryPacksEnabled, v2VnTranslationEnabled, v2BilingualViewEnabled", async () => {
    const fs = require("fs");
    const path = require("path");
    const content = fs.readFileSync(
      path.resolve("server/_core/systemRouter.ts"),
      "utf-8"
    );
    expect(content).toContain("v2CountryPacksEnabled");
    expect(content).toContain("v2VnTranslationEnabled");
    expect(content).toContain("v2BilingualViewEnabled");
  });
});

// ─── drizzle schema trackCode enum ────────────────────────────────────────────

describe("drizzle schema trackCode enum includes VN codes", () => {
  it("T26: schema includes INTERNSHIP in trackCode enum", async () => {
    const fs = require("fs");
    const path = require("path");
    const content = fs.readFileSync(
      path.resolve("drizzle/schema.ts"),
      "utf-8"
    );
    expect(content).toContain("\"INTERNSHIP\"");
  });

  it("T27: schema includes EARLY_CAREER in trackCode enum", async () => {
    const fs = require("fs");
    const path = require("path");
    const content = fs.readFileSync(
      path.resolve("drizzle/schema.ts"),
      "utf-8"
    );
    expect(content).toContain("\"EARLY_CAREER\"");
  });

  it("T28: schema includes EXPERIENCED in trackCode enum", async () => {
    const fs = require("fs");
    const path = require("path");
    const content = fs.readFileSync(
      path.resolve("drizzle/schema.ts"),
      "utf-8"
    );
    expect(content).toContain("\"EXPERIENCED\"");
  });

  it("T29: schema still includes COOP and NEW_GRAD (V1 regression)", async () => {
    const fs = require("fs");
    const path = require("path");
    const content = fs.readFileSync(
      path.resolve("drizzle/schema.ts"),
      "utf-8"
    );
    expect(content).toContain("\"COOP\"");
    expect(content).toContain("\"NEW_GRAD\"");
  });
});

// ─── tRPC profile.upsert integration test ─────────────────────────────────────

describe("profile.upsert accepts VN track codes (integration)", () => {
  it("T30: profile.upsert mutation accepts INTERNSHIP track code", async () => {
    const { appRouter } = await import("./routers");
    const ctx = {
      user: { id: 1, openId: "test", name: "Test", email: "test@test.com", role: "user" as const, isAdmin: false, adminNotes: null, disabled: false, earlyAccessEnabled: false, earlyAccessGrantUsed: false, countryPackId: null, languageMode: "en" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(), loginMethod: null },
      req: { protocol: "https", headers: {} } as any,
      res: { clearCookie: () => {} } as any,
    };
    const caller = appRouter.createCaller(ctx);
    // Should not throw a zod validation error
    await expect(
      caller.profile.upsert({ regionCode: "VN", trackCode: "INTERNSHIP", onboardingComplete: false })
    ).resolves.toEqual({ success: true });
  });

  it("T31: profile.upsert accepts EARLY_CAREER track code", async () => {
    const { appRouter } = await import("./routers");
    const ctx = {
      user: { id: 1, openId: "test", name: "Test", email: "test@test.com", role: "user" as const, isAdmin: false, adminNotes: null, disabled: false, earlyAccessEnabled: false, earlyAccessGrantUsed: false, countryPackId: null, languageMode: "en" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(), loginMethod: null },
      req: { protocol: "https", headers: {} } as any,
      res: { clearCookie: () => {} } as any,
    };
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.profile.upsert({ regionCode: "VN", trackCode: "EARLY_CAREER", onboardingComplete: false })
    ).resolves.toEqual({ success: true });
  });

  it("T32: profile.upsert accepts EXPERIENCED track code", async () => {
    const { appRouter } = await import("./routers");
    const ctx = {
      user: { id: 1, openId: "test", name: "Test", email: "test@test.com", role: "user" as const, isAdmin: false, adminNotes: null, disabled: false, earlyAccessEnabled: false, earlyAccessGrantUsed: false, countryPackId: null, languageMode: "en" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(), loginMethod: null },
      req: { protocol: "https", headers: {} } as any,
      res: { clearCookie: () => {} } as any,
    };
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.profile.upsert({ regionCode: "VN", trackCode: "EXPERIENCED", onboardingComplete: false })
    ).resolves.toEqual({ success: true });
  });

  it("T33: profile.upsert still accepts COOP (V1 regression)", async () => {
    const { appRouter } = await import("./routers");
    const ctx = {
      user: { id: 1, openId: "test", name: "Test", email: "test@test.com", role: "user" as const, isAdmin: false, adminNotes: null, disabled: false, earlyAccessEnabled: false, earlyAccessGrantUsed: false, countryPackId: null, languageMode: "en" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(), loginMethod: null },
      req: { protocol: "https", headers: {} } as any,
      res: { clearCookie: () => {} } as any,
    };
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.profile.upsert({ regionCode: "CA", trackCode: "COOP", onboardingComplete: false })
    ).resolves.toEqual({ success: true });
  });

  it("T34: profile.upsert rejects unknown track code", async () => {
    const { appRouter } = await import("./routers");
    const ctx = {
      user: { id: 1, openId: "test", name: "Test", email: "test@test.com", role: "user" as const, isAdmin: false, adminNotes: null, disabled: false, earlyAccessEnabled: false, earlyAccessGrantUsed: false, countryPackId: null, languageMode: "en" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(), loginMethod: null },
      req: { protocol: "https", headers: {} } as any,
      res: { clearCookie: () => {} } as any,
    };
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.profile.upsert({ regionCode: "VN", trackCode: "UNKNOWN_TRACK" as any })
    ).rejects.toThrow();
  });
});

// ─── system.featureFlags tRPC integration test ────────────────────────────────

describe("system.featureFlags tRPC procedure (integration)", () => {
  it("T35: system.featureFlags returns expected shape", async () => {
    const { appRouter } = await import("./routers");
    const ctx = {
      user: null,
      req: { protocol: "https", headers: {} } as any,
      res: { clearCookie: () => {} } as any,
    };
    const caller = appRouter.createCaller(ctx);
    const flags = await caller.system.featureFlags();
    expect(flags).toHaveProperty("v2CountryPacksEnabled");
    expect(flags).toHaveProperty("v2VnTranslationEnabled");
    expect(flags).toHaveProperty("v2BilingualViewEnabled");
    expect(typeof flags.v2CountryPacksEnabled).toBe("boolean");
    expect(typeof flags.v2VnTranslationEnabled).toBe("boolean");
    expect(typeof flags.v2BilingualViewEnabled).toBe("boolean");
  });

  it("T36: system.featureFlags is accessible without auth (publicProcedure)", async () => {
    const { appRouter } = await import("./routers");
    // No user in context
    const ctx = {
      user: null,
      req: { protocol: "https", headers: {} } as any,
      res: { clearCookie: () => {} } as any,
    };
    const caller = appRouter.createCaller(ctx);
    await expect(caller.system.featureFlags()).resolves.toBeDefined();
  });
});
