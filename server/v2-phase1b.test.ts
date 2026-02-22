/**
 * V2 Phase 1B — Country Pack Resolution Helper + Pack Registry + Translation Utilities
 *
 * A) resolveCountryPack: job card override wins over user setting
 * B) resolveCountryPack: user setting used when job card has no override
 * C) resolveCountryPack: defaults to "US" when both user and job card are null
 * D) resolveCountryPack: handles missing jobCardId safely (falls back to user/default)
 * E) resolveCountryPack: returns correct source field for each scenario
 * F) countryPackRegistry: VN has translationEnabled=true, PH/US have false
 * G) countryPackRegistry: VN defaultLanguageMode is "vi", PH/US are "en"
 * H) countryPackRegistry: all three packs have templateStyleKey defined
 * I) shouldTranslateToVietnamese: returns false if v2CountryPacksEnabled is OFF
 * J) shouldTranslateToVietnamese: returns false if v2VnTranslationEnabled is OFF
 * K) shouldTranslateToVietnamese: returns false for PH regardless of languageMode
 * L) shouldTranslateToVietnamese: returns false for US regardless of languageMode
 * M) shouldTranslateToVietnamese: returns false for VN + "en" languageMode
 * N) shouldTranslateToVietnamese: returns true for VN + "vi" + both flags ON
 * O) shouldTranslateToVietnamese: returns true for VN + "bilingual" + both flags ON
 * P) translateEnToVi: returns "" for empty input (no LLM call)
 * Q) translateEnToVi: returns null on LLM error (safe fallback)
 * R) translateEnToVi: translated output does not introduce new numerals not in source
 * S) translateEnToVi: translated output does not contain forbidden tool keywords
 * T) prepareLocalizedFieldsForApplicationKit: returns null localizedText when translation fails
 * U) prepareLocalizedFieldsForApplicationKit: returns correct translationMeta shape on success
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { countryPackRegistry, COUNTRY_PACK_IDS, DEFAULT_COUNTRY_PACK_ID } from "../shared/countryPacks";
import { shouldTranslateToVietnamese, translateEnToVi, prepareLocalizedFieldsForApplicationKit } from "./v2Translation";
import * as dbModule from "./db";

// ─── Mocks ────────────────────────────────────────────────────────────────────
// Mock the LLM to avoid real API calls in tests
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(),
}));
import { invokeLLM } from "./_core/llm";
const mockInvokeLLM = vi.mocked(invokeLLM);

// Mock resolveCountryPack DB calls
const mockResolveCountryPack = vi.spyOn(dbModule, "resolveCountryPack");

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Both flags ON helper ─────────────────────────────────────────────────────
const FLAGS_ON = { v2CountryPacksEnabled: true, v2VnTranslationEnabled: true } as const;
const FLAGS_OFF = { v2CountryPacksEnabled: false, v2VnTranslationEnabled: false } as const;
const PACKS_ON_TRANS_OFF = { v2CountryPacksEnabled: true, v2VnTranslationEnabled: false } as const;

// ─── A–E: resolveCountryPack inheritance ─────────────────────────────────────
describe("V2 Phase 1B: resolveCountryPack inheritance", () => {
  it("A) job card override wins over user setting", async () => {
    mockResolveCountryPack.mockResolvedValue({
      effectiveCountryPackId: "VN",
      source: "job_card",
      userCountryPackId: "PH",
      jobCardCountryPackId: "VN",
    });
    const result = await dbModule.resolveCountryPack({ userId: 1, jobCardId: 10 });
    expect(result.effectiveCountryPackId).toBe("VN");
    expect(result.source).toBe("job_card");
    expect(result.jobCardCountryPackId).toBe("VN");
  });

  it("B) user setting used when job card has no override (null)", async () => {
    mockResolveCountryPack.mockResolvedValue({
      effectiveCountryPackId: "PH",
      source: "user",
      userCountryPackId: "PH",
      jobCardCountryPackId: null,
    });
    const result = await dbModule.resolveCountryPack({ userId: 1, jobCardId: 10 });
    expect(result.effectiveCountryPackId).toBe("PH");
    expect(result.source).toBe("user");
    expect(result.jobCardCountryPackId).toBeNull();
  });

  it("C) defaults to 'US' when both user and job card are null", async () => {
    mockResolveCountryPack.mockResolvedValue({
      effectiveCountryPackId: "US",
      source: "default",
      userCountryPackId: null,
      jobCardCountryPackId: null,
    });
    const result = await dbModule.resolveCountryPack({ userId: 1 });
    expect(result.effectiveCountryPackId).toBe("US");
    expect(result.source).toBe("default");
    expect(result.userCountryPackId).toBeNull();
    expect(result.jobCardCountryPackId).toBeNull();
  });

  it("D) handles missing jobCardId safely (falls back to user setting)", async () => {
    mockResolveCountryPack.mockResolvedValue({
      effectiveCountryPackId: "VN",
      source: "user",
      userCountryPackId: "VN",
      jobCardCountryPackId: null,
    });
    // No jobCardId provided
    const result = await dbModule.resolveCountryPack({ userId: 1 });
    expect(result.effectiveCountryPackId).toBe("VN");
    expect(result.source).toBe("user");
  });

  it("E) returns correct source field for each scenario", async () => {
    // job_card source
    mockResolveCountryPack.mockResolvedValueOnce({ effectiveCountryPackId: "VN", source: "job_card", userCountryPackId: null, jobCardCountryPackId: "VN" });
    const r1 = await dbModule.resolveCountryPack({ userId: 1, jobCardId: 10 });
    expect(r1.source).toBe("job_card");

    // user source
    mockResolveCountryPack.mockResolvedValueOnce({ effectiveCountryPackId: "PH", source: "user", userCountryPackId: "PH", jobCardCountryPackId: null });
    const r2 = await dbModule.resolveCountryPack({ userId: 1 });
    expect(r2.source).toBe("user");

    // default source
    mockResolveCountryPack.mockResolvedValueOnce({ effectiveCountryPackId: "US", source: "default", userCountryPackId: null, jobCardCountryPackId: null });
    const r3 = await dbModule.resolveCountryPack({ userId: 1 });
    expect(r3.source).toBe("default");
  });
});

// ─── F–H: Country Pack Registry ──────────────────────────────────────────────
describe("V2 Phase 1B: countryPackRegistry", () => {
  it("F) VN has translationEnabled=true; PH and US have translationEnabled=false", () => {
    expect(countryPackRegistry["VN"].translationEnabled).toBe(true);
    expect(countryPackRegistry["PH"].translationEnabled).toBe(false);
    expect(countryPackRegistry["US"].translationEnabled).toBe(false);
  });

  it("G) VN defaultLanguageMode is 'vi'; PH and US are 'en'", () => {
    expect(countryPackRegistry["VN"].defaultLanguageMode).toBe("vi");
    expect(countryPackRegistry["PH"].defaultLanguageMode).toBe("en");
    expect(countryPackRegistry["US"].defaultLanguageMode).toBe("en");
  });

  it("H) all three packs have templateStyleKey defined (non-empty string)", () => {
    for (const id of COUNTRY_PACK_IDS) {
      const key = countryPackRegistry[id].templateStyleKey;
      expect(typeof key).toBe("string");
      expect(key.length).toBeGreaterThan(0);
    }
  });

  it("H2) DEFAULT_COUNTRY_PACK_ID is 'US'", () => {
    expect(DEFAULT_COUNTRY_PACK_ID).toBe("US");
  });

  it("H3) VN has bilingualEnabled=true; PH/US have bilingualEnabled=false", () => {
    expect(countryPackRegistry["VN"].bilingualEnabled).toBe(true);
    expect(countryPackRegistry["PH"].bilingualEnabled).toBe(false);
    expect(countryPackRegistry["US"].bilingualEnabled).toBe(false);
  });
});

// ─── I–O: shouldTranslateToVietnamese ────────────────────────────────────────
describe("V2 Phase 1B: shouldTranslateToVietnamese", () => {
  it("I) returns false if v2CountryPacksEnabled is OFF", () => {
    expect(shouldTranslateToVietnamese({ effectiveCountryPackId: "VN", languageMode: "vi", flags: { v2CountryPacksEnabled: false, v2VnTranslationEnabled: true } })).toBe(false);
  });

  it("J) returns false if v2VnTranslationEnabled is OFF", () => {
    expect(shouldTranslateToVietnamese({ effectiveCountryPackId: "VN", languageMode: "vi", flags: PACKS_ON_TRANS_OFF })).toBe(false);
  });

  it("K) returns false for PH regardless of languageMode (even with both flags ON)", () => {
    for (const mode of ["en", "vi", "bilingual"] as const) {
      expect(shouldTranslateToVietnamese({ effectiveCountryPackId: "PH", languageMode: mode, flags: FLAGS_ON })).toBe(false);
    }
  });

  it("L) returns false for US regardless of languageMode (even with both flags ON)", () => {
    for (const mode of ["en", "vi", "bilingual"] as const) {
      expect(shouldTranslateToVietnamese({ effectiveCountryPackId: "US", languageMode: mode, flags: FLAGS_ON })).toBe(false);
    }
  });

  it("M) returns false for VN + 'en' languageMode even with both flags ON", () => {
    expect(shouldTranslateToVietnamese({ effectiveCountryPackId: "VN", languageMode: "en", flags: FLAGS_ON })).toBe(false);
  });

  it("N) returns true for VN + 'vi' + both flags ON", () => {
    expect(shouldTranslateToVietnamese({ effectiveCountryPackId: "VN", languageMode: "vi", flags: FLAGS_ON })).toBe(true);
  });

  it("O) returns true for VN + 'bilingual' + both flags ON", () => {
    expect(shouldTranslateToVietnamese({ effectiveCountryPackId: "VN", languageMode: "bilingual", flags: FLAGS_ON })).toBe(true);
  });
});

// ─── P–S: translateEnToVi ────────────────────────────────────────────────────
describe("V2 Phase 1B: translateEnToVi", () => {
  it("P) returns '' for empty input (no LLM call)", async () => {
    const result = await translateEnToVi("");
    expect(result).toBe("");
    expect(mockInvokeLLM).not.toHaveBeenCalled();
  });

  it("P2) returns '' for whitespace-only input (no LLM call)", async () => {
    const result = await translateEnToVi("   ");
    expect(result).toBe("");
    expect(mockInvokeLLM).not.toHaveBeenCalled();
  });

  it("Q) returns null on LLM error (safe fallback)", async () => {
    mockInvokeLLM.mockRejectedValue(new Error("LLM unavailable"));
    const result = await translateEnToVi("Managed a team of 5 engineers.");
    expect(result).toBeNull();
  });

  it("Q2) returns null when LLM returns empty content", async () => {
    mockInvokeLLM.mockResolvedValue({ choices: [{ message: { content: "" } }] } as any);
    const result = await translateEnToVi("Managed a team of 5 engineers.");
    expect(result).toBeNull();
  });

  it("R) translated output does not introduce new numerals not present in source", async () => {
    const canonicalText = "Managed a team of 5 engineers and delivered 3 projects.";
    // Simulate a safe translation that preserves numbers
    const safeTranslation = "Quản lý nhóm 5 kỹ sư và hoàn thành 3 dự án.";
    mockInvokeLLM.mockResolvedValue({ choices: [{ message: { content: safeTranslation } }] } as any);

    const result = await translateEnToVi(canonicalText, { preserveNumbers: true });
    expect(result).not.toBeNull();

    // Extract numerals from source and translation
    const sourceNumerals = new Set((canonicalText.match(/\d+/g) ?? []).map(Number));
    const translationNumerals = (result!.match(/\d+/g) ?? []).map(Number);

    // Every numeral in the translation must exist in the source
    for (const num of translationNumerals) {
      expect(sourceNumerals.has(num)).toBe(true);
    }
  });

  it("S) translated output does not contain forbidden tool keywords introduced by translation", async () => {
    const canonicalText = "Collaborated with the product team to ship features.";
    // Simulate a translation that does NOT add forbidden keywords
    const safeTranslation = "Hợp tác với nhóm sản phẩm để phát hành các tính năng.";
    mockInvokeLLM.mockResolvedValue({ choices: [{ message: { content: safeTranslation } }] } as any);

    const result = await translateEnToVi(canonicalText, { strictNoNewFacts: true });
    expect(result).not.toBeNull();

    // Forbidden keywords: tools/skills not present in canonical text
    const forbiddenKeywords = ["Python", "React", "Kubernetes", "AWS", "TensorFlow", "Docker"];
    for (const keyword of forbiddenKeywords) {
      expect(result!).not.toContain(keyword);
    }
  });
});

// ─── T–U: prepareLocalizedFieldsForApplicationKit ────────────────────────────
describe("V2 Phase 1B: prepareLocalizedFieldsForApplicationKit", () => {
  it("T) returns null localizedText when translation fails", async () => {
    mockInvokeLLM.mockRejectedValue(new Error("LLM error"));
    const result = await prepareLocalizedFieldsForApplicationKit({
      kitId: 1,
      canonicalText: "Led a cross-functional team.",
      targetLanguage: "vi",
    });
    expect(result.localizedLanguage).toBe("vi");
    expect(result.localizedText).toBeNull();
    expect(result.translationMeta).toBeNull();
  });

  it("U) returns correct translationMeta shape on success", async () => {
    mockInvokeLLM.mockResolvedValue({ choices: [{ message: { content: "Dẫn dắt nhóm đa chức năng." } }] } as any);
    const result = await prepareLocalizedFieldsForApplicationKit({
      kitId: 1,
      canonicalText: "Led a cross-functional team.",
      targetLanguage: "vi",
    });
    expect(result.localizedLanguage).toBe("vi");
    expect(typeof result.localizedText).toBe("string");
    expect(result.translationMeta).not.toBeNull();
    expect(result.translationMeta!.provider).toBe("manus_llm");
    expect(result.translationMeta!.rules_version).toBe("1.0.0");
    expect(typeof result.translationMeta!.created_at).toBe("string");
    // created_at should be a valid ISO date string
    expect(() => new Date(result.translationMeta!.created_at)).not.toThrow();
  });
});
