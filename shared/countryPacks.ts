/**
 * V2 Country Pack Registry
 *
 * Defines the supported country packs and their per-pack configuration.
 * This module is read-only and does NOT modify any templates or existing V1 behavior.
 *
 * Usage:
 *   import { countryPackRegistry, type CountryPackId } from "@shared/countryPacks";
 *   const pack = countryPackRegistry["VN"];
 */

/** Supported country pack identifiers. */
export type CountryPackId = "GLOBAL" | "CA" | "VN" | "PH" | "US";

/** All valid country pack IDs as a constant array (useful for validation). */
export const COUNTRY_PACK_IDS = ["GLOBAL", "CA", "VN", "PH", "US"] as const satisfies readonly CountryPackId[];

/** Per-pack configuration record. */
export interface CountryPackConfig {
  /** Default language mode for users in this country pack. */
  defaultLanguageMode: "en" | "vi" | "bilingual";
  /** Whether Vietnamese translation is supported for this pack. */
  translationEnabled: boolean;
  /** Whether bilingual side-by-side view is supported for this pack. */
  bilingualEnabled: boolean;
  /**
   * Template style key used by future V2 generation prompts.
   * Not used by any V1 code paths.
   */
  templateStyleKey: string;
}

/**
 * Country Pack Registry — read-only configuration for each supported pack.
 *
 * GLOBAL (default):
 *   - Safe, universal fallback used when no country pack is set.
 *   - English-only; translation and bilingual view disabled.
 *   - Used by all V1 users and any V2 user who has not selected a specific pack.
 *
 * VN (Vietnam):
 *   - Supports Vietnamese translation and bilingual view.
 *   - Default language mode is "vi".
 *
 * PH (Philippines):
 *   - English-only market; translation and bilingual view disabled.
 *
 * CA (Canada):
 *   - English-only market; initial promo market for Resupify.
 *   - Translation and bilingual view disabled.
 *
 * US (United States):
 *   - English-only market; translation and bilingual view disabled.
 */
export const countryPackRegistry: Readonly<Record<CountryPackId, CountryPackConfig>> = {
  GLOBAL: {
    defaultLanguageMode: "en",
    translationEnabled: false,
    bilingualEnabled: false,
    templateStyleKey: "global_english",
  },
  CA: {
    defaultLanguageMode: "en",
    translationEnabled: false,
    bilingualEnabled: false,
    templateStyleKey: "ca_english",
  },
  VN: {
    defaultLanguageMode: "vi",
    translationEnabled: true,
    bilingualEnabled: true,
    templateStyleKey: "vn_formal",
  },
  PH: {
    defaultLanguageMode: "en",
    translationEnabled: false,
    bilingualEnabled: false,
    templateStyleKey: "ph_english",
  },
  US: {
    defaultLanguageMode: "en",
    translationEnabled: false,
    bilingualEnabled: false,
    templateStyleKey: "us_english",
  },
} as const;

/** Default country pack ID used when neither user nor job card specifies one. */
export const DEFAULT_COUNTRY_PACK_ID: CountryPackId = "GLOBAL";
