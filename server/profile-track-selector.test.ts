/**
 * V2 — Profile: Country-aware Track Selector Tests
 *
 * Covers:
 * - shared/trackOptions.ts: getTracksForCountry logic for all country packs
 * - Profile.tsx: reuses shared module, shows correct tracks per country
 * - Onboarding.tsx: still imports from shared module (no duplication)
 * - Persistence: profile.upsert accepts VN track codes (regression)
 * - Work auth card: only shown for CA users
 */
import { describe, it, expect, beforeAll } from "vitest";
import { getTracksForCountry, CA_TRACKS, VN_TRACKS } from "../shared/trackOptions";
import type { CountryPackId } from "../shared/countryPacks";

// ─── Unit tests: getTracksForCountry ─────────────────────────────────────────

describe("getTracksForCountry — flag OFF (V1 regression)", () => {
  it("T1: flag OFF + CA → CA tracks, defaultTrack=COOP, regionCode=CA", () => {
    const result = getTracksForCountry("CA", false);
    expect(result.tracks).toEqual(CA_TRACKS);
    expect(result.defaultTrack).toBe("COOP");
    expect(result.hasTracksForCountry).toBe(true);
    expect(result.regionCode).toBe("CA");
  });

  it("T2: flag OFF + VN → still returns CA tracks (V1 unchanged)", () => {
    const result = getTracksForCountry("VN", false);
    expect(result.tracks).toEqual(CA_TRACKS);
    expect(result.defaultTrack).toBe("COOP");
    expect(result.hasTracksForCountry).toBe(true);
    expect(result.regionCode).toBe("CA");
  });

  it("T3: flag OFF + null → CA tracks (V1 unchanged)", () => {
    const result = getTracksForCountry(null, false);
    expect(result.tracks).toEqual(CA_TRACKS);
    expect(result.defaultTrack).toBe("COOP");
    expect(result.hasTracksForCountry).toBe(true);
    expect(result.regionCode).toBe("CA");
  });

  it("T4: flag OFF + GLOBAL → CA tracks (V1 unchanged)", () => {
    const result = getTracksForCountry("GLOBAL", false);
    expect(result.tracks).toEqual(CA_TRACKS);
    expect(result.defaultTrack).toBe("COOP");
    expect(result.regionCode).toBe("CA");
  });
});

describe("getTracksForCountry — flag ON, CA", () => {
  it("T5: flag ON + CA → CA tracks, defaultTrack=COOP, regionCode=CA", () => {
    const result = getTracksForCountry("CA", true);
    expect(result.tracks).toEqual(CA_TRACKS);
    expect(result.defaultTrack).toBe("COOP");
    expect(result.hasTracksForCountry).toBe(true);
    expect(result.regionCode).toBe("CA");
  });

  it("T6: CA_TRACKS has exactly 2 tracks: COOP and NEW_GRAD", () => {
    expect(CA_TRACKS).toHaveLength(2);
    expect(CA_TRACKS.map((t) => t.code)).toEqual(["COOP", "NEW_GRAD"]);
  });

  it("T7: CA tracks have regionCode=CA", () => {
    for (const t of CA_TRACKS) {
      expect(t.regionCode).toBe("CA");
    }
  });
});

describe("getTracksForCountry — flag ON, VN", () => {
  it("T8: flag ON + VN → VN tracks, defaultTrack=NEW_GRAD, regionCode=VN", () => {
    const result = getTracksForCountry("VN", true);
    expect(result.tracks).toEqual(VN_TRACKS);
    expect(result.defaultTrack).toBe("NEW_GRAD");
    expect(result.hasTracksForCountry).toBe(true);
    expect(result.regionCode).toBe("VN");
  });

  it("T9: VN_TRACKS has exactly 4 tracks", () => {
    expect(VN_TRACKS).toHaveLength(4);
  });

  it("T10: VN_TRACKS codes are INTERNSHIP, NEW_GRAD, EARLY_CAREER, EXPERIENCED", () => {
    expect(VN_TRACKS.map((t) => t.code)).toEqual([
      "INTERNSHIP",
      "NEW_GRAD",
      "EARLY_CAREER",
      "EXPERIENCED",
    ]);
  });

  it("T11: VN tracks have regionCode=VN", () => {
    for (const t of VN_TRACKS) {
      expect(t.regionCode).toBe("VN");
    }
  });

  it("T12: VN tracks all have non-empty label and sublabel", () => {
    for (const t of VN_TRACKS) {
      expect(t.label.length).toBeGreaterThan(0);
      expect(t.sublabel.length).toBeGreaterThan(0);
    }
  });
});

describe("getTracksForCountry — flag ON, GLOBAL/PH/US", () => {
  const unsupportedPacks: (CountryPackId | null | undefined)[] = [
    "GLOBAL",

    "US",
    null,
    undefined,
  ];

  for (const pack of unsupportedPacks) {
    it(`T13-${pack ?? "null"}: flag ON + ${pack ?? "null"} → empty tracks, hasTracksForCountry=false`, () => {
      const result = getTracksForCountry(pack, true);
      expect(result.tracks).toHaveLength(0);
      expect(result.hasTracksForCountry).toBe(false);
    });
  }
});

// ─── Structural tests: shared/trackOptions.ts ────────────────────────────────

describe("shared/trackOptions.ts exports", () => {
  it("T18: exports getTracksForCountry function", () => {
    expect(typeof getTracksForCountry).toBe("function");
  });

  it("T19: exports CA_TRACKS array", () => {
    expect(Array.isArray(CA_TRACKS)).toBe(true);
  });

  it("T20: exports VN_TRACKS array", () => {
    expect(Array.isArray(VN_TRACKS)).toBe(true);
  });

  it("T21: TrackSelectionResult includes regionCode field", () => {
    const result = getTracksForCountry("CA", true);
    expect(result).toHaveProperty("regionCode");
    expect(result).toHaveProperty("tracks");
    expect(result).toHaveProperty("defaultTrack");
    expect(result).toHaveProperty("hasTracksForCountry");
  });
});

// ─── Structural tests: Profile.tsx imports from shared module ─────────────────

describe("Profile.tsx uses shared/trackOptions.ts (no duplication)", () => {
  const fs = require("fs");
  const path = require("path");
  let profileContent: string;

  beforeAll(() => {
    profileContent = fs.readFileSync(
      path.resolve("client/src/pages/Profile.tsx"),
      "utf-8"
    );
  });

  it("T22: Profile.tsx imports getTracksForCountry from @shared/trackOptions", () => {
    expect(profileContent).toContain("from \"@shared/trackOptions\"");
    expect(profileContent).toContain("getTracksForCountry");
  });

  it("T23: Profile.tsx does NOT define its own CA_TRACKS or VN_TRACKS", () => {
    expect(profileContent).not.toContain("const CA_TRACKS");
    expect(profileContent).not.toContain("const VN_TRACKS");
  });

  it("T24: Profile.tsx does NOT define its own getTracksForCountry", () => {
    expect(profileContent).not.toContain("function getTracksForCountry");
  });

  it("T25: Profile.tsx has profile-track-card testid", () => {
    expect(profileContent).toContain("data-testid=\"profile-track-card\"");
  });

  it("T26: Profile.tsx has track-select testid", () => {
    expect(profileContent).toContain("data-testid=\"track-select\"");
  });

  it("T27: Profile.tsx has save-track-btn testid", () => {
    expect(profileContent).toContain("data-testid=\"save-track-btn\"");
  });

  it("T28: Profile.tsx has tracks-coming-soon testid", () => {
    expect(profileContent).toContain("data-testid=\"tracks-coming-soon\"");
  });

  it("T29: Profile.tsx uses effectiveRegionCode when saving track", () => {
    expect(profileContent).toContain("regionCode: effectiveRegionCode");
  });

  it("T30: Profile.tsx uses trackCode when saving track", () => {
    expect(profileContent).toContain("trackCode,");
  });

  it("T31: Work auth card is gated behind showWorkAuthCard (CA only)", () => {
    expect(profileContent).toContain("showWorkAuthCard");
    expect(profileContent).toContain("effectiveRegionCode === \"CA\"");
  });

  it("T32: Profile.tsx queries system.featureFlags", () => {
    expect(profileContent).toContain("trpc.system.featureFlags.useQuery");
  });

  it("T33: Profile.tsx reads userCountryPackId from auth.me user", () => {
    expect(profileContent).toContain("countryPackId");
    expect(profileContent).toContain("useAuth");
  });
});

// ─── Structural tests: Onboarding.tsx imports from shared module ──────────────

describe("Onboarding.tsx uses shared/trackOptions.ts (no duplication)", () => {
  const fs = require("fs");
  const path = require("path");
  let onboardingContent: string;

  beforeAll(() => {
    onboardingContent = fs.readFileSync(
      path.resolve("client/src/pages/Onboarding.tsx"),
      "utf-8"
    );
  });

  it("T34: Onboarding.tsx imports getTracksForCountry from @shared/trackOptions", () => {
    expect(onboardingContent).toContain("from \"@shared/trackOptions\"");
    expect(onboardingContent).toContain("getTracksForCountry");
  });

  it("T35: Onboarding.tsx does NOT define its own CA_TRACKS or VN_TRACKS", () => {
    expect(onboardingContent).not.toContain("const CA_TRACKS");
    expect(onboardingContent).not.toContain("const VN_TRACKS");
  });

  it("T36: Onboarding.tsx does NOT define its own getTracksForCountry", () => {
    expect(onboardingContent).not.toContain("function getTracksForCountry");
  });
});

// ─── Integration tests: profile.upsert accepts VN track codes ────────────────

describe("profile.upsert accepts VN track codes (regression)", () => {
  const makeCtx = () => ({
    user: {
      id: 1, openId: "test", name: "Test", email: "test@test.com",
      role: "user" as const, isAdmin: false, adminNotes: null,
      disabled: false, earlyAccessEnabled: false, earlyAccessGrantUsed: false,
      countryPackId: null, languageMode: "en" as const,
      createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
      loginMethod: null,
    },
    req: { protocol: "https", headers: {} } as any,
    res: { clearCookie: () => {} } as any,
  });

  it("T37: INTERNSHIP track code accepted", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.profile.upsert({ regionCode: "VN", trackCode: "INTERNSHIP" })
    ).resolves.toEqual({ success: true });
  });

  it("T38: EARLY_CAREER track code accepted", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.profile.upsert({ regionCode: "VN", trackCode: "EARLY_CAREER" })
    ).resolves.toEqual({ success: true });
  });

  it("T39: EXPERIENCED track code accepted", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.profile.upsert({ regionCode: "VN", trackCode: "EXPERIENCED" })
    ).resolves.toEqual({ success: true });
  });

  it("T40: COOP still accepted (V1 regression)", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.profile.upsert({ regionCode: "CA", trackCode: "COOP" })
    ).resolves.toEqual({ success: true });
  });

  it("T41: NEW_GRAD still accepted (V1 regression)", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.profile.upsert({ regionCode: "CA", trackCode: "NEW_GRAD" })
    ).resolves.toEqual({ success: true });
  });

  it("T42: unknown track code rejected", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.profile.upsert({ regionCode: "VN", trackCode: "BOGUS_TRACK" as any })
    ).rejects.toThrow();
  });
});
