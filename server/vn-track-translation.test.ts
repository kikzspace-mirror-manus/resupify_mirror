/**
 * V2 — VN Track Label Translation Tests
 *
 * Covers:
 * - resolveLocale(): flag OFF → en, VN+vi → vi, CA → en, etc.
 * - getTracksForCountry(): flag OFF → EN labels, flag ON+VN+vi → VI labels, flag ON+CA → EN labels
 * - getTranslatedTrackStepCopy(): EN and VI variants
 * - VN_TRACKS_VI: all 4 tracks have correct Vietnamese labels/sublabels
 * - Onboarding.tsx: imports resolveLocale, getTranslatedTrackStepCopy, uses trackStepCopy
 * - Profile.tsx: imports resolveLocale, uses locale in getTracksForCountry
 */
import { describe, it, expect, beforeAll } from "vitest";
import {
  resolveLocale,
  getTracksForCountry,
  getTranslatedTrackStepCopy,
  VN_TRACKS,
  VN_TRACKS_VI,
  CA_TRACKS,
} from "../shared/trackOptions";

// ─── resolveLocale() ─────────────────────────────────────────────────────────

describe("resolveLocale()", () => {
  it("T1: flag OFF → always 'en' regardless of countryPackId", () => {
    expect(resolveLocale({ countryPackId: "VN", languageMode: "vi", v2VnTranslationEnabled: false })).toBe("en");
    expect(resolveLocale({ countryPackId: "VN", languageMode: null, v2VnTranslationEnabled: false })).toBe("en");
    expect(resolveLocale({ countryPackId: "CA", v2VnTranslationEnabled: false })).toBe("en");
  });

  it("T2: flag ON + countryPackId !== VN → always 'en'", () => {
    expect(resolveLocale({ countryPackId: "CA", languageMode: "vi", v2VnTranslationEnabled: true })).toBe("en");
    expect(resolveLocale({ countryPackId: "GLOBAL", languageMode: "vi", v2VnTranslationEnabled: true })).toBe("en");
    expect(resolveLocale({ countryPackId: "PH", languageMode: "vi", v2VnTranslationEnabled: true })).toBe("en");
    expect(resolveLocale({ countryPackId: "US", languageMode: "vi", v2VnTranslationEnabled: true })).toBe("en");
    expect(resolveLocale({ countryPackId: null, languageMode: "vi", v2VnTranslationEnabled: true })).toBe("en");
  });

  it("T3: flag ON + VN + languageMode=vi → 'vi'", () => {
    expect(resolveLocale({ countryPackId: "VN", languageMode: "vi", v2VnTranslationEnabled: true })).toBe("vi");
  });

  it("T4: flag ON + VN + browserLocale starts with 'vi' → 'vi'", () => {
    expect(resolveLocale({ countryPackId: "VN", languageMode: null, browserLocale: "vi-VN", v2VnTranslationEnabled: true })).toBe("vi");
    expect(resolveLocale({ countryPackId: "VN", languageMode: null, browserLocale: "vi", v2VnTranslationEnabled: true })).toBe("vi");
  });

  it("T5: flag ON + VN + no explicit languageMode/browserLocale → 'vi' (pack-based default)", () => {
    // VN pack users default to VI unless they've set languageMode=en
    expect(resolveLocale({ countryPackId: "VN", languageMode: null, v2VnTranslationEnabled: true })).toBe("vi");
    expect(resolveLocale({ countryPackId: "VN", languageMode: undefined, v2VnTranslationEnabled: true })).toBe("vi");
  });

  it("T6: flag ON + VN + languageMode=en → 'en'", () => {
    // Explicit English preference overrides pack default
    expect(resolveLocale({ countryPackId: "VN", languageMode: "en", v2VnTranslationEnabled: true })).toBe("en");
  });

  it("T7: flag ON + VN + browserLocale=en-US → 'vi' (pack-based default wins over non-vi locale)", () => {
    // Non-vi browser locale doesn't override the VN pack default
    expect(resolveLocale({ countryPackId: "VN", languageMode: null, browserLocale: "en-US", v2VnTranslationEnabled: true })).toBe("vi");
  });
});

// ─── getTracksForCountry() with locale ───────────────────────────────────────

describe("getTracksForCountry() with locale", () => {
  it("T8: flag OFF → EN CA tracks regardless of locale", () => {
    const result = getTracksForCountry("VN", false, "vi");
    expect(result.tracks).toEqual(CA_TRACKS);
    expect(result.tracks[0].label).toBe("Student / Co-op");
  });

  it("T9: flag ON + CA + vi locale → still EN CA tracks", () => {
    const result = getTracksForCountry("CA", true, "vi");
    expect(result.tracks).toEqual(CA_TRACKS);
    expect(result.tracks[0].label).toBe("Student / Co-op");
  });

  it("T10: flag ON + VN + en locale → EN VN tracks", () => {
    const result = getTracksForCountry("VN", true, "en");
    expect(result.tracks).toEqual(VN_TRACKS);
    expect(result.tracks[0].label).toBe("Internship / Student");
    expect(result.tracks[1].label).toBe("New Graduate");
    expect(result.tracks[2].label).toBe("Early Career (1–5 years)");
    expect(result.tracks[3].label).toBe("Experienced (5+ years)");
  });

  it("T11: flag ON + VN + vi locale → VI VN tracks", () => {
    const result = getTracksForCountry("VN", true, "vi");
    expect(result.tracks).toEqual(VN_TRACKS_VI);
    expect(result.tracks[0].label).toBe("Thực tập / Sinh viên");
    expect(result.tracks[1].label).toBe("Mới tốt nghiệp");
    expect(result.tracks[2].label).toBe("Đi làm (1–5 năm)");
    expect(result.tracks[3].label).toBe("Kinh nghiệm (5+ năm)");
  });

  it("T12: flag ON + VN + vi locale → VI sublabels", () => {
    const result = getTracksForCountry("VN", true, "vi");
    expect(result.tracks[0].sublabel).toBe("Phù hợp cho sinh viên ứng tuyển thực tập");
    expect(result.tracks[1].sublabel).toBe("Phù hợp cho 0–1 năm kinh nghiệm");
    expect(result.tracks[2].sublabel).toBe("Phù hợp cho người mới đi làm tích lũy kinh nghiệm");
    expect(result.tracks[3].sublabel).toBe("Phù hợp cho senior/manager");
  });

  it("T13: flag ON + VN + en locale → EN sublabels", () => {
    const result = getTracksForCountry("VN", true, "en");
    expect(result.tracks[0].sublabel).toBe("Best for students applying for internships");
    expect(result.tracks[1].sublabel).toBe("Best for 0–1 years experience");
    expect(result.tracks[2].sublabel).toBe("Best for early professionals building experience");
    expect(result.tracks[3].sublabel).toBe("Best for senior individual contributors or managers");
  });

  it("T14: locale defaults to 'en' when not provided", () => {
    const result = getTracksForCountry("VN", true);
    expect(result.tracks).toEqual(VN_TRACKS);
  });

  it("T15: GLOBAL/PH/US → no tracks regardless of locale", () => {
    expect(getTracksForCountry("GLOBAL", true, "vi").tracks).toHaveLength(0);
    // PH now has tracks — only GLOBAL and US have no tracks
    // expect(getTracksForCountry("PH", true, "vi").tracks).toHaveLength(0); // PH tracks added in V2
    expect(getTracksForCountry("US", true, "vi").tracks).toHaveLength(0);
  });
});

// ─── VN_TRACKS_VI structure ──────────────────────────────────────────────────

describe("VN_TRACKS_VI structure", () => {
  it("T16: VN_TRACKS_VI has exactly 4 tracks", () => {
    expect(VN_TRACKS_VI).toHaveLength(4);
  });

  it("T17: VN_TRACKS_VI track codes match VN_TRACKS codes", () => {
    const viCodes = VN_TRACKS_VI.map((t) => t.code);
    const enCodes = VN_TRACKS.map((t) => t.code);
    expect(viCodes).toEqual(enCodes);
  });

  it("T18: VN_TRACKS_VI all have regionCode VN", () => {
    VN_TRACKS_VI.forEach((t) => expect(t.regionCode).toBe("VN"));
  });

  it("T19: VN_TRACKS_VI INTERNSHIP has correct VI label", () => {
    const t = VN_TRACKS_VI.find((t) => t.code === "INTERNSHIP")!;
    expect(t.label).toBe("Thực tập / Sinh viên");
    expect(t.sublabel).toBe("Phù hợp cho sinh viên ứng tuyển thực tập");
  });

  it("T20: VN_TRACKS_VI NEW_GRAD has correct VI label", () => {
    const t = VN_TRACKS_VI.find((t) => t.code === "NEW_GRAD")!;
    expect(t.label).toBe("Mới tốt nghiệp");
    expect(t.sublabel).toBe("Phù hợp cho 0–1 năm kinh nghiệm");
  });

  it("T21: VN_TRACKS_VI EARLY_CAREER has correct VI label", () => {
    const t = VN_TRACKS_VI.find((t) => t.code === "EARLY_CAREER")!;
    expect(t.label).toBe("Đi làm (1–5 năm)");
    expect(t.sublabel).toBe("Phù hợp cho người mới đi làm tích lũy kinh nghiệm");
  });

  it("T22: VN_TRACKS_VI EXPERIENCED has correct VI label", () => {
    const t = VN_TRACKS_VI.find((t) => t.code === "EXPERIENCED")!;
    expect(t.label).toBe("Kinh nghiệm (5+ năm)");
    expect(t.sublabel).toBe("Phù hợp cho senior/manager");
  });
});

// ─── getTranslatedTrackStepCopy() ────────────────────────────────────────────

describe("getTranslatedTrackStepCopy()", () => {
  it("T23: EN locale → English header and helper", () => {
    const copy = getTranslatedTrackStepCopy("en");
    expect(copy.header).toBe("Choose your track");
    expect(copy.helper).toBe("This helps us tailor resume tips and eligibility checks for you.");
  });

  it("T24: VI locale → Vietnamese header and helper", () => {
    const copy = getTranslatedTrackStepCopy("vi");
    expect(copy.header).toBe("Chọn lộ trình hồ sơ");
    expect(copy.helper).toBe("Chọn theo giai đoạn nghề nghiệp của bạn");
  });
});

// ─── Structural tests: Onboarding.tsx ────────────────────────────────────────

describe("Onboarding.tsx VN translation wiring", () => {
  const fs = require("fs");
  const path = require("path");
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(
      path.resolve("client/src/pages/Onboarding.tsx"),
      "utf-8"
    );
  });

  it("T25: Onboarding.tsx imports resolveLocale from @shared/trackOptions", () => {
    expect(content).toContain("resolveLocale");
    expect(content).toContain("from \"@shared/trackOptions\"");
  });

  it("T26: Onboarding.tsx imports getTranslatedTrackStepCopy", () => {
    expect(content).toContain("getTranslatedTrackStepCopy");
  });

  it("T27: Onboarding.tsx reads v2VnTranslationEnabled from flags", () => {
    expect(content).toContain("v2VnTranslationEnabled");
  });

  it("T28: Onboarding.tsx calls resolveLocale with countryPackId and v2VnTranslationEnabled", () => {
    expect(content).toContain("resolveLocale(");
    expect(content).toContain("v2VnTranslationEnabled");
  });

  it("T29: Onboarding.tsx passes locale to getTracksForCountry", () => {
    expect(content).toContain("getTracksForCountry(effectiveCountryPackId, v2CountryPacksEnabled, locale)");
  });

  it("T30: Onboarding.tsx uses trackStepCopy.header in CardTitle", () => {
    expect(content).toContain("trackStepCopy.header");
  });

  it("T31: Onboarding.tsx uses trackStepCopy.helper in CardDescription", () => {
    expect(content).toContain("trackStepCopy.helper");
  });

  it("T32: Onboarding.tsx has track-step-header testid", () => {
    expect(content).toContain("data-testid=\"track-step-header\"");
  });

  it("T33: Onboarding.tsx has track-step-helper testid", () => {
    expect(content).toContain("data-testid=\"track-step-helper\"");
  });
});

// ─── Structural tests: Profile.tsx ───────────────────────────────────────────

describe("Profile.tsx VN translation wiring", () => {
  const fs = require("fs");
  const path = require("path");
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(
      path.resolve("client/src/pages/Profile.tsx"),
      "utf-8"
    );
  });

  it("T34: Profile.tsx imports resolveLocale from @shared/trackOptions", () => {
    expect(content).toContain("resolveLocale");
    expect(content).toContain("from \"@shared/trackOptions\"");
  });

  it("T35: Profile.tsx reads v2VnTranslationEnabled from flags", () => {
    expect(content).toContain("v2VnTranslationEnabled");
  });

  it("T36: Profile.tsx calls resolveLocale", () => {
    expect(content).toContain("resolveLocale(");
  });

  it("T37: Profile.tsx passes locale to getTracksForCountry", () => {
    expect(content).toContain("getTracksForCountry(userCountryPackId, v2CountryPacksEnabled, locale)");
  });
});

// ─── Structural tests: shared/trackOptions.ts exports ────────────────────────

describe("shared/trackOptions.ts exports", () => {
  it("T38: exports resolveLocale function", async () => {
    const m = await import("../shared/trackOptions");
    expect(typeof m.resolveLocale).toBe("function");
  });

  it("T39: exports getTranslatedTrackStepCopy function", async () => {
    const m = await import("../shared/trackOptions");
    expect(typeof m.getTranslatedTrackStepCopy).toBe("function");
  });

  it("T40: exports VN_TRACKS_VI array", async () => {
    const m = await import("../shared/trackOptions");
    expect(Array.isArray(m.VN_TRACKS_VI)).toBe(true);
  });

  it("T41: exports SupportedLocale type (via resolveLocale return type)", async () => {
    const m = await import("../shared/trackOptions");
    // Verify the function returns a valid SupportedLocale
    const locale = m.resolveLocale({ countryPackId: "VN", languageMode: "vi", v2VnTranslationEnabled: true });
    expect(["en", "vi"]).toContain(locale);
  });
});
