/**
 * generation-context-audit.test.ts
 *
 * Tests for the logGenerationContext helper and its integration into
 * generation flows. Verifies:
 *   1. No raw text fields are ever logged (PII safety contract)
 *   2. Boolean presence flags (hasSchool, hasFieldOfStudy, etc.) are correct
 *   3. Each flow logs the correct flow name and key context fields
 *   4. workAuth is only included for CA and US users
 *   5. featureFlags summary is always included
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  logGenerationContext,
  buildEducationContext,
  buildWorkAuthContext,
  type GenerationFlow,
  type GenerationContextRecord,
} from "./generation/logGenerationContext";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeProfile(overrides: Record<string, any> = {}) {
  return {
    regionCode: "CA",
    trackCode: "COOP",
    highestEducationLevel: "bachelors",
    school: null,
    program: null,
    graduationDate: null,
    workStatus: "citizen_pr",
    needsSponsorship: "false",
    countryOfResidence: null,
    willingToRelocate: null,
    ...overrides,
  };
}

// ─── Unit: logGenerationContext ───────────────────────────────────────────────

describe("logGenerationContext", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let capturedRecord: GenerationContextRecord | null = null;

  beforeEach(() => {
    capturedRecord = null;
    consoleSpy = vi.spyOn(console, "log").mockImplementation((msg: string) => {
      try {
        capturedRecord = JSON.parse(msg);
      } catch {
        // not a JSON log line
      }
    });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  // ── GCA-1: event field is always "llm_generation_context" ────────────────
  it("GCA-1: event field is always llm_generation_context", () => {
    const record = logGenerationContext({
      flow: "evidence_scan",
      userId: 42,
    });
    expect(record.event).toBe("llm_generation_context");
  });

  // ── GCA-2: flow name is preserved exactly ────────────────────────────────
  it.each([
    ["evidence_scan"],
    ["batch_sprint"],
    ["outreach_pack"],
    ["application_kit"],
    ["translation"],
  ] as [GenerationFlow][][])("GCA-2: flow=%s is preserved", (flow) => {
    const record = logGenerationContext({ flow, userId: 1 });
    expect(record.flow).toBe(flow);
  });

  // ── GCA-3: userId is included ─────────────────────────────────────────────
  it("GCA-3: userId is included in the record", () => {
    const record = logGenerationContext({ flow: "evidence_scan", userId: 99 });
    expect(record.userId).toBe(99);
  });

  // ── GCA-4: countryPackId defaults to GLOBAL when not provided ────────────
  it("GCA-4: countryPackId defaults to GLOBAL", () => {
    const record = logGenerationContext({ flow: "evidence_scan", userId: 1 });
    expect(record.countryPackId).toBe("GLOBAL");
  });

  // ── GCA-5: countryPackId is set correctly ────────────────────────────────
  it("GCA-5: countryPackId=CA is preserved", () => {
    const record = logGenerationContext({
      flow: "evidence_scan",
      userId: 1,
      countryPackId: "CA",
    });
    expect(record.countryPackId).toBe("CA");
  });

  // ── GCA-6: trackCode is set correctly ────────────────────────────────────
  it("GCA-6: trackCode=COOP is preserved", () => {
    const record = logGenerationContext({
      flow: "evidence_scan",
      userId: 1,
      trackCode: "COOP",
    });
    expect(record.trackCode).toBe("COOP");
  });

  // ── GCA-7: languageMode is set correctly ─────────────────────────────────
  it("GCA-7: languageMode=vi is preserved", () => {
    const record = logGenerationContext({
      flow: "evidence_scan",
      userId: 1,
      languageMode: "vi",
    });
    expect(record.languageMode).toBe("vi");
  });

  // ── GCA-8: featureFlags summary is always included ────────────────────────
  it("GCA-8: featureFlags summary is always included", () => {
    const record = logGenerationContext({ flow: "evidence_scan", userId: 1 });
    expect(record.featureFlags).toBeDefined();
    expect(typeof record.featureFlags.v2CountryPacksEnabled).toBe("boolean");
    expect(typeof record.featureFlags.v2VnTranslationEnabled).toBe("boolean");
    expect(typeof record.featureFlags.v2BilingualViewEnabled).toBe("boolean");
    expect(typeof record.featureFlags.v2AnalyticsEnabled).toBe("boolean");
  });

  // ── GCA-9: timestamp is ISO 8601 ─────────────────────────────────────────
  it("GCA-9: timestamp is a valid ISO 8601 string", () => {
    const record = logGenerationContext({ flow: "evidence_scan", userId: 1 });
    expect(() => new Date(record.timestamp)).not.toThrow();
    expect(new Date(record.timestamp).toISOString()).toBe(record.timestamp);
  });

  // ── GCA-10: promptMeta fields are included ────────────────────────────────
  it("GCA-10: promptMeta fields are included", () => {
    const record = logGenerationContext({
      flow: "evidence_scan",
      userId: 1,
      promptMeta: {
        model: "gpt-4.1",
        provider: "openai",
        promptPrefixKey: "ca_english",
        promptVersion: "evidence_scan_v2",
      },
    });
    expect(record.promptMeta.model).toBe("gpt-4.1");
    expect(record.promptMeta.provider).toBe("openai");
    expect(record.promptMeta.promptPrefixKey).toBe("ca_english");
    expect(record.promptMeta.promptVersion).toBe("evidence_scan_v2");
  });

  // ── GCA-11: record is emitted as JSON to console.log ─────────────────────
  it("GCA-11: record is emitted as JSON to console.log", () => {
    logGenerationContext({ flow: "evidence_scan", userId: 1 });
    expect(consoleSpy).toHaveBeenCalledOnce();
    expect(capturedRecord).not.toBeNull();
    expect((capturedRecord as any).event).toBe("llm_generation_context");
  });
});

// ─── PII Safety Contract ──────────────────────────────────────────────────────

describe("logGenerationContext — PII safety contract", () => {
  // ── GCA-12: raw text fields are never present in the record ──────────────
  it("GCA-12: raw text fields are never present in the record", () => {
    const record = logGenerationContext({
      flow: "evidence_scan",
      userId: 1,
      countryPackId: "CA",
      trackCode: "COOP",
      education: {
        highestEducationLevel: "bachelors",
        hasSchool: true,
        hasFieldOfStudy: true,
        hasGraduationDate: true,
      },
    });

    // Serialize the record and check that no raw text strings appear
    const json = JSON.stringify(record);

    // These keys must NOT appear in the output
    const forbiddenKeys = [
      "school", "program", "fieldOfStudy", "resumeText", "jdText",
      "coverLetterText", "email", "phone", "linkedinUrl", "name",
    ];
    for (const key of forbiddenKeys) {
      expect(json).not.toContain(`"${key}"`);
    }
  });

  // ── GCA-13: education object contains only safe fields ───────────────────
  it("GCA-13: education object contains only safe fields (no raw strings)", () => {
    const record = logGenerationContext({
      flow: "evidence_scan",
      userId: 1,
      education: {
        highestEducationLevel: "masters",
        hasSchool: true,
        hasFieldOfStudy: false,
        hasGraduationDate: true,
      },
    });

    const eduKeys = Object.keys(record.education);
    expect(eduKeys).toContain("highestEducationLevel");
    expect(eduKeys).toContain("hasSchool");
    expect(eduKeys).toContain("hasFieldOfStudy");
    expect(eduKeys).toContain("hasGraduationDate");
    // Must NOT contain raw school name, program name, graduation date string
    expect(eduKeys).not.toContain("school");
    expect(eduKeys).not.toContain("program");
    expect(eduKeys).not.toContain("graduationDate");
  });

  // ── GCA-14: workAuth object contains only safe fields ────────────────────
  it("GCA-14: workAuth object contains only safe fields (no raw strings)", () => {
    const record = logGenerationContext({
      flow: "evidence_scan",
      userId: 1,
      workAuth: {
        workStatus: "temporary_resident",
        sponsorshipNeeded: "true",
        hasCountryOfResidence: true,
        willingToRelocate: false,
      },
    });

    expect(record.workAuth).not.toBeNull();
    const waKeys = Object.keys(record.workAuth!);
    expect(waKeys).toContain("workStatus");
    expect(waKeys).toContain("sponsorshipNeeded");
    expect(waKeys).toContain("hasCountryOfResidence");
    expect(waKeys).toContain("willingToRelocate");
    // Must NOT contain raw country name string
    expect(waKeys).not.toContain("countryOfResidence");
  });
});

// ─── buildEducationContext ────────────────────────────────────────────────────

describe("buildEducationContext", () => {
  // ── GCA-15: hasSchool is true when school is non-empty ───────────────────
  it("GCA-15: hasSchool=true when profile.school is non-empty", () => {
    const ctx = buildEducationContext(makeProfile({ school: "University of Toronto" }));
    expect(ctx.hasSchool).toBe(true);
  });

  // ── GCA-16: hasSchool is false when school is null ───────────────────────
  it("GCA-16: hasSchool=false when profile.school is null", () => {
    const ctx = buildEducationContext(makeProfile({ school: null }));
    expect(ctx.hasSchool).toBe(false);
  });

  // ── GCA-17: hasFieldOfStudy is true when program is non-empty ────────────
  it("GCA-17: hasFieldOfStudy=true when profile.program is non-empty", () => {
    const ctx = buildEducationContext(makeProfile({ program: "Computer Science" }));
    expect(ctx.hasFieldOfStudy).toBe(true);
  });

  // ── GCA-18: hasFieldOfStudy is false when program is null ────────────────
  it("GCA-18: hasFieldOfStudy=false when profile.program is null", () => {
    const ctx = buildEducationContext(makeProfile({ program: null }));
    expect(ctx.hasFieldOfStudy).toBe(false);
  });

  // ── GCA-19: hasGraduationDate is true when graduationDate is non-empty ───
  it("GCA-19: hasGraduationDate=true when profile.graduationDate is non-empty", () => {
    const ctx = buildEducationContext(makeProfile({ graduationDate: "2025-04" }));
    expect(ctx.hasGraduationDate).toBe(true);
  });

  // ── GCA-20: hasGraduationDate is false when graduationDate is null ────────
  it("GCA-20: hasGraduationDate=false when profile.graduationDate is null", () => {
    const ctx = buildEducationContext(makeProfile({ graduationDate: null }));
    expect(ctx.hasGraduationDate).toBe(false);
  });

  // ── GCA-21: highestEducationLevel is passed through ──────────────────────
  it("GCA-21: highestEducationLevel is passed through as-is", () => {
    const ctx = buildEducationContext(makeProfile({ highestEducationLevel: "doctorate" }));
    expect(ctx.highestEducationLevel).toBe("doctorate");
  });

  // ── GCA-22: null profile returns all-false booleans ──────────────────────
  it("GCA-22: null profile returns all-false booleans and null level", () => {
    const ctx = buildEducationContext(null);
    expect(ctx.hasSchool).toBe(false);
    expect(ctx.hasFieldOfStudy).toBe(false);
    expect(ctx.hasGraduationDate).toBe(false);
    expect(ctx.highestEducationLevel).toBeNull();
  });
});

// ─── buildWorkAuthContext ─────────────────────────────────────────────────────

describe("buildWorkAuthContext", () => {
  // ── GCA-23: returns workAuth for CA users ────────────────────────────────
  it("GCA-23: returns workAuth object for CA users", () => {
    const ctx = buildWorkAuthContext(makeProfile(), "CA");
    expect(ctx).not.toBeUndefined();
    expect(ctx!.workStatus).toBe("citizen_pr");
  });

  // ── GCA-24: returns workAuth for US users ────────────────────────────────
  it("GCA-24: returns workAuth object for US users", () => {
    const ctx = buildWorkAuthContext(
      makeProfile({ workStatus: "temporary_resident", needsSponsorship: "true" }),
      "US"
    );
    expect(ctx).not.toBeUndefined();
    expect(ctx!.workStatus).toBe("temporary_resident");
    expect(ctx!.sponsorshipNeeded).toBe("true");
  });

  // ── GCA-25: returns undefined for VN users ───────────────────────────────
  it("GCA-25: returns undefined for VN users (work auth not relevant)", () => {
    const ctx = buildWorkAuthContext(makeProfile(), "VN");
    expect(ctx).toBeUndefined();
  });

  // ── GCA-26: returns undefined for PH users ───────────────────────────────
  it("GCA-26: returns undefined for PH users", () => {
    const ctx = buildWorkAuthContext(makeProfile(), "PH");
    expect(ctx).toBeUndefined();
  });

  // ── GCA-27: returns undefined for GLOBAL users ───────────────────────────
  it("GCA-27: returns undefined for GLOBAL users", () => {
    const ctx = buildWorkAuthContext(makeProfile(), "GLOBAL");
    expect(ctx).toBeUndefined();
  });

  // ── GCA-28: hasCountryOfResidence is true when countryOfResidence is set ─
  it("GCA-28: hasCountryOfResidence=true when countryOfResidence is set", () => {
    const ctx = buildWorkAuthContext(
      makeProfile({ countryOfResidence: "Canada" }),
      "CA"
    );
    expect(ctx!.hasCountryOfResidence).toBe(true);
  });

  // ── GCA-29: hasCountryOfResidence is false when countryOfResidence is null
  it("GCA-29: hasCountryOfResidence=false when countryOfResidence is null", () => {
    const ctx = buildWorkAuthContext(makeProfile({ countryOfResidence: null }), "CA");
    expect(ctx!.hasCountryOfResidence).toBe(false);
  });

  // ── GCA-30: willingToRelocate is passed through ───────────────────────────
  it("GCA-30: willingToRelocate=true is passed through", () => {
    const ctx = buildWorkAuthContext(makeProfile({ willingToRelocate: true }), "CA");
    expect(ctx!.willingToRelocate).toBe(true);
  });

  // ── GCA-31: raw countryOfResidence string is NOT present in output ────────
  it("GCA-31: raw countryOfResidence string is NOT in output keys", () => {
    const ctx = buildWorkAuthContext(
      makeProfile({ countryOfResidence: "Canada" }),
      "CA"
    );
    expect(ctx).not.toBeUndefined();
    expect(Object.keys(ctx!)).not.toContain("countryOfResidence");
  });
});

// ─── Flow integration: correct flow names and context fields ─────────────────

describe("logGenerationContext — flow integration", () => {
  // ── GCA-32: evidence_scan flow logs countryPackId and trackCode ──────────
  it("GCA-32: evidence_scan flow includes countryPackId=CA and trackCode=COOP", () => {
    const record = logGenerationContext({
      flow: "evidence_scan",
      userId: 10,
      countryPackId: "CA",
      trackCode: "COOP",
      languageMode: "en",
      education: buildEducationContext(makeProfile()),
      workAuth: buildWorkAuthContext(makeProfile(), "CA"),
    });
    expect(record.flow).toBe("evidence_scan");
    expect(record.countryPackId).toBe("CA");
    expect(record.trackCode).toBe("COOP");
  });

  // ── GCA-33: batch_sprint flow logs correctly ──────────────────────────────
  it("GCA-33: batch_sprint flow logs correct flow name", () => {
    const record = logGenerationContext({
      flow: "batch_sprint",
      userId: 10,
      countryPackId: "VN",
      trackCode: "EXPERIENCED",
      languageMode: "vi",
    });
    expect(record.flow).toBe("batch_sprint");
    expect(record.countryPackId).toBe("VN");
    expect(record.trackCode).toBe("EXPERIENCED");
    expect(record.languageMode).toBe("vi");
    // VN user: workAuth should be null (not provided)
    expect(record.workAuth).toBeNull();
  });

  // ── GCA-34: outreach_pack flow logs correctly ─────────────────────────────
  it("GCA-34: outreach_pack flow logs correct flow name", () => {
    const record = logGenerationContext({
      flow: "outreach_pack",
      userId: 20,
      countryPackId: "US",
      trackCode: "EARLY_CAREER",
      languageMode: "en",
      workAuth: buildWorkAuthContext(
        makeProfile({ workStatus: "temporary_resident", needsSponsorship: "true" }),
        "US"
      ),
    });
    expect(record.flow).toBe("outreach_pack");
    expect(record.countryPackId).toBe("US");
    expect(record.workAuth).not.toBeNull();
    expect(record.workAuth!.sponsorshipNeeded).toBe("true");
  });

  // ── GCA-35: application_kit flow logs correctly ───────────────────────────
  it("GCA-35: application_kit flow logs correct flow name", () => {
    const record = logGenerationContext({
      flow: "application_kit",
      userId: 30,
      countryPackId: "CA",
      trackCode: "NEW_GRAD",
      languageMode: "en",
      promptMeta: {
        promptPrefixKey: "ca_english",
        promptVersion: "application_kit",
        provider: "manus",
        model: "gemini-2.5-flash",
      },
    });
    expect(record.flow).toBe("application_kit");
    expect(record.promptMeta.promptPrefixKey).toBe("ca_english");
    expect(record.promptMeta.promptVersion).toBe("application_kit");
  });

  // ── GCA-36: translation flow logs correctly ───────────────────────────────
  it("GCA-36: translation flow logs correct flow name", () => {
    const record = logGenerationContext({
      flow: "translation",
      userId: 40,
      countryPackId: "VN",
      languageMode: "vi",
    });
    expect(record.flow).toBe("translation");
    expect(record.languageMode).toBe("vi");
  });

  // ── GCA-37: changing countryPackId from CA to VN changes the record ───────
  it("GCA-37: switching countryPackId from CA to VN changes the logged record", () => {
    const caRecord = logGenerationContext({
      flow: "evidence_scan",
      userId: 1,
      countryPackId: "CA",
      trackCode: "COOP",
    });
    const vnRecord = logGenerationContext({
      flow: "evidence_scan",
      userId: 1,
      countryPackId: "VN",
      trackCode: "EXPERIENCED",
    });
    expect(caRecord.countryPackId).toBe("CA");
    expect(vnRecord.countryPackId).toBe("VN");
    expect(caRecord.trackCode).toBe("COOP");
    expect(vnRecord.trackCode).toBe("EXPERIENCED");
  });

  // ── GCA-38: workAuth is null when not provided ────────────────────────────
  it("GCA-38: workAuth is null in the record when not provided", () => {
    const record = logGenerationContext({
      flow: "evidence_scan",
      userId: 1,
      countryPackId: "PH",
    });
    expect(record.workAuth).toBeNull();
  });
});

// ─── getProviderMeta (smoke test via import) ──────────────────────────────────

describe("getProviderMeta", () => {
  it("GCA-39: getProviderMeta returns provider and model strings", async () => {
    const { getProviderMeta } = await import("./llmProvider");
    const meta = getProviderMeta();
    expect(typeof meta.provider).toBe("string");
    expect(typeof meta.model).toBe("string");
    expect(meta.provider.length).toBeGreaterThan(0);
    expect(meta.model.length).toBeGreaterThan(0);
  });
});
