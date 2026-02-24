/**
 * onboarding-phase2-track-labels.test.ts
 *
 * V2 Onboarding Phase 2 — Track step: remove country name prefix from labels
 *
 * Tests:
 *   A) VN_TRACKS (EN) — no "Vietnam —" prefix
 *   B) VN_TRACKS_VI — no "Việt Nam —" prefix
 *   C) PH_TRACKS — no "Philippines —" prefix
 *   D) US_TRACKS — no "United States —" prefix
 *   E) CA_TRACKS — unchanged (no prefix was ever added)
 *   F) getTracksForCountry() returns clean labels for each country
 *   G) Sublabels are unchanged (no country text added/removed)
 *   H) Regression — codes, ordering, regionCodes, defaults unchanged
 */
import { describe, it, expect } from "vitest";
import {
  CA_TRACKS,
  VN_TRACKS,
  VN_TRACKS_VI,
  PH_TRACKS,
  US_TRACKS,
  getTracksForCountry,
} from "../shared/trackOptions";

// ── A: VN_TRACKS (EN) ─────────────────────────────────────────────────────

describe("A — VN_TRACKS (EN): no country prefix", () => {
  it("A1) No label starts with 'Vietnam'", () => {
    for (const t of VN_TRACKS) {
      expect(t.label).not.toMatch(/^Vietnam/i);
    }
  });

  it("A2) No label contains ' — '", () => {
    for (const t of VN_TRACKS) {
      expect(t.label).not.toContain(" — ");
    }
  });

  it("A3) INTERNSHIP label is 'Internship / Student'", () => {
    expect(VN_TRACKS.find(t => t.code === "INTERNSHIP")!.label).toBe("Internship / Student");
  });

  it("A4) NEW_GRAD label is 'New Graduate'", () => {
    expect(VN_TRACKS.find(t => t.code === "NEW_GRAD")!.label).toBe("New Graduate");
  });

  it("A5) EARLY_CAREER label is 'Early Career (1–5 years)'", () => {
    expect(VN_TRACKS.find(t => t.code === "EARLY_CAREER")!.label).toBe("Early Career (1–5 years)");
  });

  it("A6) EXPERIENCED label is 'Experienced (5+ years)'", () => {
    expect(VN_TRACKS.find(t => t.code === "EXPERIENCED")!.label).toBe("Experienced (5+ years)");
  });
});

// ── B: VN_TRACKS_VI ───────────────────────────────────────────────────────

describe("B — VN_TRACKS_VI: no country prefix", () => {
  it("B1) No label starts with 'Việt Nam'", () => {
    for (const t of VN_TRACKS_VI) {
      expect(t.label).not.toMatch(/^Việt Nam/);
    }
  });

  it("B2) No label contains ' — '", () => {
    for (const t of VN_TRACKS_VI) {
      expect(t.label).not.toContain(" — ");
    }
  });

  it("B3) INTERNSHIP VI label is 'Thực tập / Sinh viên'", () => {
    expect(VN_TRACKS_VI.find(t => t.code === "INTERNSHIP")!.label).toBe("Thực tập / Sinh viên");
  });

  it("B4) NEW_GRAD VI label is 'Mới tốt nghiệp'", () => {
    expect(VN_TRACKS_VI.find(t => t.code === "NEW_GRAD")!.label).toBe("Mới tốt nghiệp");
  });

  it("B5) EARLY_CAREER VI label is 'Đi làm (1–5 năm)'", () => {
    expect(VN_TRACKS_VI.find(t => t.code === "EARLY_CAREER")!.label).toBe("Đi làm (1–5 năm)");
  });

  it("B6) EXPERIENCED VI label is 'Kinh nghiệm (5+ năm)'", () => {
    expect(VN_TRACKS_VI.find(t => t.code === "EXPERIENCED")!.label).toBe("Kinh nghiệm (5+ năm)");
  });
});

// ── C: PH_TRACKS ──────────────────────────────────────────────────────────

describe("C — PH_TRACKS: no country prefix", () => {
  it("C1) No label starts with 'Philippines'", () => {
    for (const t of PH_TRACKS) {
      expect(t.label).not.toMatch(/^Philippines/i);
    }
  });

  it("C2) No label contains ' — '", () => {
    for (const t of PH_TRACKS) {
      expect(t.label).not.toContain(" — ");
    }
  });

  it("C3) INTERNSHIP label is 'Internship / Student'", () => {
    expect(PH_TRACKS.find(t => t.code === "INTERNSHIP")!.label).toBe("Internship / Student");
  });

  it("C4) NEW_GRAD label is 'New Graduate'", () => {
    expect(PH_TRACKS.find(t => t.code === "NEW_GRAD")!.label).toBe("New Graduate");
  });

  it("C5) EARLY_CAREER label is 'Early Career (1–5 years)'", () => {
    expect(PH_TRACKS.find(t => t.code === "EARLY_CAREER")!.label).toBe("Early Career (1–5 years)");
  });

  it("C6) EXPERIENCED label is 'Experienced (5+ years)'", () => {
    expect(PH_TRACKS.find(t => t.code === "EXPERIENCED")!.label).toBe("Experienced (5+ years)");
  });
});

// ── D: US_TRACKS ──────────────────────────────────────────────────────────

describe("D — US_TRACKS: no country prefix", () => {
  it("D1) No label starts with 'United States'", () => {
    for (const t of US_TRACKS) {
      expect(t.label).not.toMatch(/^United States/i);
    }
  });

  it("D2) No label contains ' — '", () => {
    for (const t of US_TRACKS) {
      expect(t.label).not.toContain(" — ");
    }
  });

  it("D3) INTERNSHIP label is 'Internship / Student'", () => {
    expect(US_TRACKS.find(t => t.code === "INTERNSHIP")!.label).toBe("Internship / Student");
  });

  it("D4) NEW_GRAD label is 'New Graduate'", () => {
    expect(US_TRACKS.find(t => t.code === "NEW_GRAD")!.label).toBe("New Graduate");
  });

  it("D5) EARLY_CAREER label is 'Early Career (1–5 years)'", () => {
    expect(US_TRACKS.find(t => t.code === "EARLY_CAREER")!.label).toBe("Early Career (1–5 years)");
  });

  it("D6) EXPERIENCED label is 'Experienced (5+ years)'", () => {
    expect(US_TRACKS.find(t => t.code === "EXPERIENCED")!.label).toBe("Experienced (5+ years)");
  });
});

// ── E: CA_TRACKS unchanged ────────────────────────────────────────────────

describe("E — CA_TRACKS: labels unchanged (no prefix was ever applied)", () => {
  it("E1) COOP label is 'Student / Co-op'", () => {
    expect(CA_TRACKS.find(t => t.code === "COOP")!.label).toBe("Student / Co-op");
  });

  it("E2) NEW_GRAD label is 'New Graduate'", () => {
    expect(CA_TRACKS.find(t => t.code === "NEW_GRAD")!.label).toBe("New Graduate");
  });

  it("E3) EARLY_CAREER label is 'Early Career'", () => {
    expect(CA_TRACKS.find(t => t.code === "EARLY_CAREER")!.label).toBe("Early Career");
  });

  it("E4) EXPERIENCED label is 'Experienced'", () => {
    expect(CA_TRACKS.find(t => t.code === "EXPERIENCED")!.label).toBe("Experienced");
  });
});

// ── F: getTracksForCountry() returns clean labels ─────────────────────────

describe("F — getTracksForCountry() returns clean labels", () => {
  it("F1) VN (en) tracks have no country prefix", () => {
    const { tracks } = getTracksForCountry("VN", true, "en");
    for (const t of tracks) {
      expect(t.label).not.toMatch(/^Vietnam/i);
      expect(t.label).not.toContain(" — ");
    }
  });

  it("F2) VN (vi) tracks have no country prefix", () => {
    const { tracks } = getTracksForCountry("VN", true, "vi");
    for (const t of tracks) {
      expect(t.label).not.toMatch(/^Việt Nam/);
      expect(t.label).not.toContain(" — ");
    }
  });

  it("F3) PH tracks have no country prefix", () => {
    const { tracks } = getTracksForCountry("PH", true, "en");
    for (const t of tracks) {
      expect(t.label).not.toMatch(/^Philippines/i);
      expect(t.label).not.toContain(" — ");
    }
  });

  it("F4) US tracks have no country prefix", () => {
    const { tracks } = getTracksForCountry("US", true, "en");
    for (const t of tracks) {
      expect(t.label).not.toMatch(/^United States/i);
      expect(t.label).not.toContain(" — ");
    }
  });

  it("F5) US tracks are locale-invariant (vi returns same labels as en)", () => {
    const en = getTracksForCountry("US", true, "en").tracks;
    const vi = getTracksForCountry("US", true, "vi").tracks;
    expect(en.map(t => t.label)).toEqual(vi.map(t => t.label));
  });
});

// ── G: Sublabels unchanged ────────────────────────────────────────────────

describe("G — Sublabels unchanged (no country text added/removed)", () => {
  it("G1) VN INTERNSHIP sublabel unchanged", () => {
    expect(VN_TRACKS.find(t => t.code === "INTERNSHIP")!.sublabel).toBe("Best for students applying for internships");
  });

  it("G2) VN EXPERIENCED sublabel unchanged", () => {
    expect(VN_TRACKS.find(t => t.code === "EXPERIENCED")!.sublabel).toBe("Best for senior individual contributors or managers");
  });

  it("G3) PH INTERNSHIP sublabel unchanged", () => {
    expect(PH_TRACKS.find(t => t.code === "INTERNSHIP")!.sublabel).toBe("Best for students applying for internships");
  });

  it("G4) US EXPERIENCED sublabel unchanged", () => {
    expect(US_TRACKS.find(t => t.code === "EXPERIENCED")!.sublabel).toBe("5+ years (senior IC/manager)");
  });

  it("G5) VN_TRACKS_VI INTERNSHIP sublabel unchanged", () => {
    expect(VN_TRACKS_VI.find(t => t.code === "INTERNSHIP")!.sublabel).toBe("Phù hợp cho sinh viên ứng tuyển thực tập");
  });
});

// ── H: Regression ─────────────────────────────────────────────────────────

describe("H — Regression: codes, ordering, regionCodes, defaults unchanged", () => {
  it("H1) VN_TRACKS codes in order: INTERNSHIP, NEW_GRAD, EARLY_CAREER, EXPERIENCED", () => {
    expect(VN_TRACKS.map(t => t.code)).toEqual(["INTERNSHIP", "NEW_GRAD", "EARLY_CAREER", "EXPERIENCED"]);
  });

  it("H2) PH_TRACKS codes in order: INTERNSHIP, NEW_GRAD, EARLY_CAREER, EXPERIENCED", () => {
    expect(PH_TRACKS.map(t => t.code)).toEqual(["INTERNSHIP", "NEW_GRAD", "EARLY_CAREER", "EXPERIENCED"]);
  });

  it("H3) US_TRACKS codes in order: INTERNSHIP, NEW_GRAD, EARLY_CAREER, EXPERIENCED", () => {
    expect(US_TRACKS.map(t => t.code)).toEqual(["INTERNSHIP", "NEW_GRAD", "EARLY_CAREER", "EXPERIENCED"]);
  });

  it("H4) All VN_TRACKS have regionCode 'VN'", () => {
    for (const t of VN_TRACKS) expect(t.regionCode).toBe("VN");
  });

  it("H5) All PH_TRACKS have regionCode 'PH'", () => {
    for (const t of PH_TRACKS) expect(t.regionCode).toBe("PH");
  });

  it("H6) All US_TRACKS have regionCode 'US'", () => {
    for (const t of US_TRACKS) expect(t.regionCode).toBe("US");
  });

  it("H7) VN defaultTrack is NEW_GRAD", () => {
    expect(getTracksForCountry("VN", true).defaultTrack).toBe("NEW_GRAD");
  });

  it("H8) PH defaultTrack is NEW_GRAD", () => {
    expect(getTracksForCountry("PH", true).defaultTrack).toBe("NEW_GRAD");
  });

  it("H9) US defaultTrack is INTERNSHIP", () => {
    expect(getTracksForCountry("US", true).defaultTrack).toBe("INTERNSHIP");
  });

  it("H10) Flag OFF (V1): always returns CA tracks regardless of country", () => {
    for (const country of ["VN", "PH", "US"] as const) {
      const result = getTracksForCountry(country, false);
      expect(result.regionCode).toBe("CA");
      expect(result.tracks.every(t => t.regionCode === "CA")).toBe(true);
    }
  });
});
