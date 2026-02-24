/**
 * V2 Translation Utilities — Vietnamese only, Phase 1B
 *
 * This module is NOT wired into any V1 generation flows and is NOT exposed
 * as a public API endpoint. It is only used by V2 procedures (gated behind
 * feature flags) and in tests.
 *
 * Three public exports:
 *   1. shouldTranslateToVietnamese(params) → boolean
 *   2. translateEnToVi(canonicalText, options?) → Promise<string | null>
 *   3. prepareLocalizedFieldsForApplicationKit(params) → Promise<LocalizedFields>
 */

import { featureFlags, type FeatureFlags } from "../shared/featureFlags";
import { type CountryPackId } from "../shared/countryPacks";
import { invokeLLM } from "./_core/llm";

// ─── Types ────────────────────────────────────────────────────────────────────

export type LanguageMode = "en" | "vi" | "bilingual";

export interface ShouldTranslateParams {
  effectiveCountryPackId: CountryPackId;
  languageMode: LanguageMode;
  /** Pass explicit flags for testability; defaults to the module-level featureFlags. */
  flags?: Pick<FeatureFlags, "v2CountryPacksEnabled" | "v2VnTranslationEnabled">;
}

export interface TranslateOptions {
  /** If true, the LLM is instructed not to add any new facts. Default: true. */
  strictNoNewFacts?: boolean;
  /** If true, numbers in the source must be preserved exactly. Default: true. */
  preserveNumbers?: boolean;
  /** If true, named entities (people, companies) must not be altered. Default: true. */
  preserveNamedEntities?: boolean;
}

export interface LocalizedFields {
  localizedLanguage: "vi";
  localizedText: string | null;
  translationMeta: {
    provider: string;
    model: string;
    created_at: string;
    rules_version: string;
  } | null;
}

// ─── Translation rules version ────────────────────────────────────────────────
const TRANSLATION_RULES_VERSION = "1.0.0";

// ─── 1. shouldTranslateToVietnamese ──────────────────────────────────────────

/**
 * Returns true only when ALL of the following conditions are met:
 *   - featureFlags.v2CountryPacksEnabled is true
 *   - featureFlags.v2VnTranslationEnabled is true
 *   - effectiveCountryPackId is "VN"
 *   - languageMode is "vi" or "bilingual"
 *
 * Any flag being OFF → false (V1 behavior unchanged).
 */
export function shouldTranslateToVietnamese(params: ShouldTranslateParams): boolean {
  const flags = params.flags ?? featureFlags;
  if (!flags.v2CountryPacksEnabled) return false;
  if (!flags.v2VnTranslationEnabled) return false;
  if (params.effectiveCountryPackId !== "VN") return false;
  if (params.languageMode !== "vi" && params.languageMode !== "bilingual") return false;
  return true;
}

// ─── 2. translateEnToVi ───────────────────────────────────────────────────────

/**
 * Translate canonical English text to Vietnamese using the LLM.
 *
 * Safety rules enforced via system prompt:
 *   - Do NOT add new facts, tools, skills, metrics, or numbers not in the source.
 *   - Preserve all numbers exactly as they appear.
 *   - Preserve named entities (people, companies, product names).
 *   - Translate meaning faithfully; do not paraphrase or embellish.
 *
 * Returns:
 *   - The translated Vietnamese string on success.
 *   - null on error or empty input (caller falls back to English).
 */
export async function translateEnToVi(
  canonicalText: string,
  options: TranslateOptions = {}
): Promise<string | null> {
  const {
    strictNoNewFacts = true,
    preserveNumbers = true,
    preserveNamedEntities = true,
  } = options;

  // Guard: empty input → empty output
  if (!canonicalText || canonicalText.trim().length === 0) return "";

  // Build safety constraints for the system prompt
  const constraints: string[] = [];
  if (strictNoNewFacts) {
    constraints.push("- Do NOT add any new facts, skills, tools, metrics, or achievements not present in the source text.");
  }
  if (preserveNumbers) {
    constraints.push("- Preserve ALL numbers exactly as they appear in the source. Do not invent, change, or omit any number.");
  }
  if (preserveNamedEntities) {
    constraints.push("- Preserve all named entities (person names, company names, product names, brand names) exactly as written.");
  }

  const systemPrompt = [
    "You are a professional Vietnamese translator specializing in career documents (resumes, cover letters, outreach emails).",
    "Translate the following English text to Vietnamese.",
    "",
    "STRICT RULES:",
    ...constraints,
    "- Translate meaning faithfully. Do not paraphrase, embellish, or add commentary.",
    "- Output ONLY the translated Vietnamese text. Do not include the original English, explanations, or any other content.",
  ].join("\n");

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: canonicalText },
      ],
    });

    const translated = response?.choices?.[0]?.message?.content;
    if (typeof translated !== "string" || translated.trim().length === 0) return null;
    return translated.trim();
  } catch {
    // Translation failure → caller falls back to English
    return null;
  }
}

// ─── 3. prepareLocalizedFieldsForApplicationKit ───────────────────────────────

/**
 * Prepare the localized fields for an application kit without writing to the DB.
 *
 * This function only prepares data. The caller is responsible for persisting
 * the returned fields to the application_kits table.
 *
 * Currently supports targetLanguage = "vi" only.
 *
 * Returns LocalizedFields with localizedText=null if translation fails or
 * is not applicable (caller should fall back to English).
 */
export async function prepareLocalizedFieldsForApplicationKit(params: {
  kitId: number;
  canonicalText: string;
  targetLanguage: "vi";
  options?: TranslateOptions;
}): Promise<LocalizedFields> {
  const { canonicalText, options } = params;

  const localizedText = await translateEnToVi(canonicalText, options);

  if (localizedText === null) {
    return {
      localizedLanguage: "vi",
      localizedText: null,
      translationMeta: null,
    };
  }

  return {
    localizedLanguage: "vi",
    localizedText,
    translationMeta: {
      provider: "manus_llm",
      model: "default",
      created_at: new Date().toISOString(),
      rules_version: TRANSLATION_RULES_VERSION,
    },
  };
}
