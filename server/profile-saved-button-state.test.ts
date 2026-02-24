/**
 * profile-saved-button-state.test.ts
 *
 * Tests for the "Saved" button state pattern on Profile.tsx save buttons.
 *
 * Coverage:
 * A) State variables: eduSavedAt, workAuthSavedAt, contactSavedAt, packSavedAt, trackSavedAt
 * B) lastSaveCard ref for distinguishing Education vs Contact Info upsertProfile calls
 * C) savedAt set on mutation onSuccess for each card
 * D) savedAt reset on field changes for each card
 * E) Button rendering: CheckCircle + "Saved" text + green class when isSaved
 * F) data-testids present for all 5 save buttons
 * G) Regression: all existing testids still present
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const src = readFileSync(
  join(__dirname, "../client/src/pages/Profile.tsx"),
  "utf-8"
);

// ─── A) savedAt state variables ───────────────────────────────────────────────

describe("A: savedAt state variables declared", () => {
  it("A1: eduSavedAt state is declared", () => {
    expect(src).toContain("eduSavedAt");
    expect(src).toContain("setEduSavedAt");
  });

  it("A2: workAuthSavedAt state is declared", () => {
    expect(src).toContain("workAuthSavedAt");
    expect(src).toContain("setWorkAuthSavedAt");
  });

  it("A3: contactSavedAt state is declared", () => {
    expect(src).toContain("contactSavedAt");
    expect(src).toContain("setContactSavedAt");
  });

  it("A4: packSavedAt state is declared", () => {
    expect(src).toContain("packSavedAt");
    expect(src).toContain("setPackSavedAt");
  });

  it("A5: trackSavedAt state is declared", () => {
    expect(src).toContain("trackSavedAt");
    expect(src).toContain("setTrackSavedAt");
  });

  it("A6: SAVED_MS constant is declared", () => {
    expect(src).toContain("const SAVED_MS = 2000");
  });
});

// ─── B) lastSaveCard ref ──────────────────────────────────────────────────────

describe("B: lastSaveCard ref for Education vs Contact Info disambiguation", () => {
  it("B1: lastSaveCard ref is declared with useRef", () => {
    expect(src).toContain("lastSaveCard");
    expect(src).toContain("useRef");
  });

  it("B2: lastSaveCard is set to \"education\" before Education save", () => {
    expect(src).toContain('lastSaveCard.current = "education"');
  });

  it("B3: lastSaveCard is set to \"contact\" before Contact Info save", () => {
    expect(src).toContain('lastSaveCard.current = "contact"');
  });

  it("B4: lastSaveCard is reset to null after onSuccess", () => {
    expect(src).toContain("lastSaveCard.current = null");
  });
});

// ─── C) savedAt set on mutation onSuccess ────────────────────────────────────

describe("C: savedAt set on mutation onSuccess", () => {
  it("C1: setEduSavedAt(Date.now()) called in upsertProfile onSuccess", () => {
    expect(src).toContain("setEduSavedAt(Date.now())");
  });

  it("C2: setContactSavedAt(Date.now()) called in upsertProfile onSuccess", () => {
    expect(src).toContain("setContactSavedAt(Date.now())");
  });

  it("C3: setWorkAuthSavedAt(Date.now()) called in updateWorkStatus onSuccess", () => {
    expect(src).toContain("setWorkAuthSavedAt(Date.now())");
  });

  it("C4: setTrackSavedAt(Date.now()) called in saveTrack onSuccess", () => {
    expect(src).toContain("setTrackSavedAt(Date.now())");
  });

  it("C5: setPackSavedAt(Date.now()) called in setCountryPack onSuccess", () => {
    expect(src).toContain("setPackSavedAt(Date.now())");
  });
});

// ─── D) savedAt reset on field changes ───────────────────────────────────────

describe("D: savedAt reset to null on field changes", () => {
  it("D1: setEduSavedAt(null) called on school input change", () => {
    expect(src).toContain("setSchool(e.target.value); setEduSavedAt(null)");
  });

  it("D2: setEduSavedAt(null) called on program input change", () => {
    expect(src).toContain("setProgram(e.target.value); setEduSavedAt(null)");
  });

  it("D3: setEduSavedAt(null) called on graduationDate input change", () => {
    expect(src).toContain("setGraduationDate(e.target.value); setEduSavedAt(null)");
  });

  it("D4: setEduSavedAt(null) called on highestEducationLevel change", () => {
    expect(src).toContain("setHighestEducationLevel(e.target.value); setEduSavedAt(null)");
  });

  it("D5: setWorkAuthSavedAt(null) called on workStatus change", () => {
    expect(src).toContain("setWorkStatus(v as any); setWorkAuthSavedAt(null)");
  });

  it("D6: setWorkAuthSavedAt(null) called on needsSponsorship change", () => {
    expect(src).toContain("setNeedsSponsorship(v as any); setWorkAuthSavedAt(null)");
  });

  it("D7: setWorkAuthSavedAt(null) called on countryOfResidence change", () => {
    expect(src).toContain("setCountryOfResidence(e.target.value); setWorkAuthSavedAt(null)");
  });

  it("D8: setWorkAuthSavedAt(null) called on willingToRelocate change", () => {
    expect(src).toContain("setWillingToRelocate(v); setWorkAuthSavedAt(null)");
  });

  it("D9: setContactSavedAt(null) called on phone change", () => {
    expect(src).toContain("setPhone(e.target.value); setContactSavedAt(null)");
  });

  it("D10: setContactSavedAt(null) called on linkedinUrl change", () => {
    expect(src).toContain("setLinkedinUrl(e.target.value); setContactSavedAt(null)");
  });
});

// ─── E) Button rendering: CheckCircle + "Saved" + green class ────────────────

describe("E: Button saved-state rendering", () => {
  it("E1: CheckCircle is imported from lucide-react", () => {
    expect(src).toContain("CheckCircle");
    expect(src).toContain("from \"lucide-react\"");
  });

  it("E2: CheckCircle is used in button content", () => {
    expect(src).toContain("<CheckCircle");
  });

  it("E3: bg-green-600 class is applied when isSaved", () => {
    expect(src).toContain("bg-green-600");
  });

  it("E4: hover:bg-green-700 is applied when isSaved", () => {
    expect(src).toContain("hover:bg-green-700");
  });

  it("E5: \"Saved\" text is rendered when isSaved", () => {
    // The pattern is: isSaved ? (<><CheckCircle ... />Saved</>) : "Save ..."
    expect(src).toContain(">Saved<");
  });

  it("E6: isSaved is computed from savedAt and SAVED_MS", () => {
    expect(src).toContain("Date.now() - eduSavedAt < SAVED_MS");
    expect(src).toContain("Date.now() - workAuthSavedAt < SAVED_MS");
    expect(src).toContain("Date.now() - contactSavedAt < SAVED_MS");
  });
});

// ─── F) data-testids for all 5 save buttons ──────────────────────────────────

describe("F: data-testids for save buttons", () => {
  it("F1: profile-save-education-btn testid present", () => {
    expect(src).toContain('data-testid="profile-save-education-btn"');
  });

  it("F2: profile-save-workauth-btn testid present", () => {
    expect(src).toContain('data-testid="profile-save-workauth-btn"');
  });

  it("F3: profile-save-contact-btn testid present", () => {
    expect(src).toContain('data-testid="profile-save-contact-btn"');
  });

  it("F4: save-track-btn testid present", () => {
    expect(src).toContain('data-testid="save-track-btn"');
  });

  it("F5: save-country-pack-btn testid present", () => {
    expect(src).toContain('data-testid="save-country-pack-btn"');
  });
});

// ─── G) Regression: existing testids still present ───────────────────────────

describe("G: Regression — existing testids and structure", () => {
  it("G1: profile-education-card testid still present", () => {
    expect(src).toContain('data-testid="profile-education-card"');
  });

  it("G2: profile-school-input testid still present", () => {
    expect(src).toContain('data-testid="profile-school-input"');
  });

  it("G3: profile-field-of-study-input testid still present", () => {
    expect(src).toContain('data-testid="profile-field-of-study-input"');
  });

  it("G4: profile-education-level-select testid still present", () => {
    expect(src).toContain('data-testid="profile-education-level-select"');
  });

  it("G5: profile-currently-enrolled-switch testid still present", () => {
    expect(src).toContain('data-testid="profile-currently-enrolled-switch"');
  });

  it("G6: profile-track-card testid still present", () => {
    expect(src).toContain('data-testid="profile-track-card"');
  });

  it("G7: Loader2 is still imported for loading state", () => {
    expect(src).toContain("Loader2");
  });

  it("G8: useRef is imported from react", () => {
    expect(src).toContain("useRef");
  });
});
