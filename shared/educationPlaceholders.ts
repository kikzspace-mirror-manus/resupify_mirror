/**
 * educationPlaceholders.ts
 *
 * Pack-aware placeholder strings for Education form fields.
 * Used in both Onboarding and Profile so the copy is consistent.
 *
 * Rules:
 * - schoolPlaceholder: institution name that is recognisable in the user's market.
 * - fieldPlaceholder: always generic (not market-specific).
 * - No PII is stored or logged here; these are UI strings only.
 */

import type { CountryPackId } from "./countryPacks";

export interface EducationPlaceholders {
  schoolPlaceholder: string;
  fieldPlaceholder: string;
}

const FIELD_PLACEHOLDER = "e.g., Computer Science / Business / Marketing";

const SCHOOL_PLACEHOLDERS: Record<CountryPackId, string> = {
  CA: "e.g., University of Waterloo",
  US: "e.g., University of California, Berkeley",
  PH: "e.g., University of the Philippines",
  VN: "e.g., Vietnam National University",
  GLOBAL: "e.g., Your university",
};

/**
 * Returns pack-aware placeholder strings for Education form fields.
 * Falls back to GLOBAL placeholders for unknown or null packIds.
 */
export function getEducationPlaceholders(
  countryPackId: CountryPackId | string | null | undefined
): EducationPlaceholders {
  const key = (countryPackId ?? "GLOBAL") as CountryPackId;
  const schoolPlaceholder = SCHOOL_PLACEHOLDERS[key] ?? SCHOOL_PLACEHOLDERS["GLOBAL"];
  return {
    schoolPlaceholder,
    fieldPlaceholder: FIELD_PLACEHOLDER,
  };
}
