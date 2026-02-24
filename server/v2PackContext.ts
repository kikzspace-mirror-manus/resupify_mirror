/**
 * V2 Phase 1C-C — Pack Context for Generation
 *
 * Provides a single helper used by Evidence Scan and Application Kit
 * generation to resolve the effective country pack and build a prompt prefix.
 *
 * Rules:
 * - If featureFlags.v2CountryPacksEnabled == false → always return GLOBAL (V1 behavior)
 * - Precedence: job card override → user → DEFAULT (GLOBAL)
 * - Unknown/missing pack → fallback to GLOBAL (no crash)
 */

import { featureFlags } from "../shared/featureFlags";
import {
  countryPackRegistry,
  DEFAULT_COUNTRY_PACK_ID,
  type CountryPackId,
} from "../shared/countryPacks";
import { resolveCountryPack } from "./db";

export interface PackContextForGeneration {
  /** The final resolved country pack ID. */
  countryPackId: CountryPackId;
  /** The registry config for the resolved pack. */
  countryPack: typeof countryPackRegistry[CountryPackId];
  /** Template style key (e.g. "ca_english", "global_english"). */
  templateStyleKey: string;
  /** Language mode from the user record (only meaningful for VN). */
  languageMode: "en" | "vi" | "bilingual";
  /**
   * A short string injected into LLM prompts to provide country-specific context.
   * Empty string when flag is OFF or pack is GLOBAL (preserves V1 behavior exactly).
   */
  packPromptPrefix: string;
}

/** Per-pack prompt prefix strings. GLOBAL and unknown packs return "". */
const PACK_PROMPT_PREFIXES: Record<CountryPackId, string> = {
  GLOBAL: "",
  CA: "This application is for a Canadian job market position. Use Canadian English spelling (e.g. 'colour', 'centre', 'programme' where appropriate), reference Canadian norms (e.g. ATS-friendly formatting common in Canada, Canadian co-op/internship culture), and keep guidance relevant to the Canadian job market.",
  VN: "This application is for the Vietnamese job market. Be mindful of Vietnamese professional norms and formatting conventions.",
  PH: "This application is for the Philippine job market. Use Philippine English conventions and local professional norms where relevant.",
  US: "This application is for the United States job market. Use American English spelling and US professional norms.",
};

/**
 * Resolves the effective country pack context for LLM generation.
 *
 * @param params.userId - The authenticated user's ID (required).
 * @param params.jobCardId - Optional job card ID for job-level pack override.
 * @param params.overrideCountryPackId - Optional direct override (bypasses DB lookup).
 * @param params.userLanguageMode - The user's languageMode from their profile row (optional, defaults to "en").
 *
 * @returns PackContextForGeneration — always safe to use; never throws.
 */
export async function resolvePackContextForGeneration(params: {
  userId: number;
  jobCardId?: number | null;
  overrideCountryPackId?: CountryPackId | null;
  userLanguageMode?: "en" | "vi" | "bilingual" | null;
}): Promise<PackContextForGeneration> {
  const { userId, jobCardId, overrideCountryPackId, userLanguageMode } = params;

  // Flag OFF → always return GLOBAL (V1 behavior unchanged)
  if (!featureFlags.v2CountryPacksEnabled) {
    return buildContext("GLOBAL", userLanguageMode ?? "en");
  }

  // Direct override (e.g. from test or admin)
  if (overrideCountryPackId != null) {
    const safeId = isValidPackId(overrideCountryPackId) ? overrideCountryPackId : DEFAULT_COUNTRY_PACK_ID;
    return buildContext(safeId, userLanguageMode ?? "en");
  }

  // Resolve via DB (job card → user → default)
  try {
    const resolved = await resolveCountryPack({ userId, jobCardId });
    const safeId = isValidPackId(resolved.effectiveCountryPackId)
      ? resolved.effectiveCountryPackId
      : DEFAULT_COUNTRY_PACK_ID;
    return buildContext(safeId, userLanguageMode ?? "en");
  } catch {
    // On any error, fall back to GLOBAL safely
    return buildContext(DEFAULT_COUNTRY_PACK_ID, userLanguageMode ?? "en");
  }
}

function isValidPackId(id: unknown): id is CountryPackId {
  return typeof id === "string" && id in countryPackRegistry;
}

function buildContext(
  packId: CountryPackId,
  languageMode: "en" | "vi" | "bilingual"
): PackContextForGeneration {
  const pack = countryPackRegistry[packId] ?? countryPackRegistry[DEFAULT_COUNTRY_PACK_ID];
  return {
    countryPackId: packId,
    countryPack: pack,
    templateStyleKey: pack.templateStyleKey,
    languageMode,
    packPromptPrefix: PACK_PROMPT_PREFIXES[packId] ?? "",
  };
}
