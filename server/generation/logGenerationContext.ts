/**
 * logGenerationContext.ts
 *
 * Structured, non-PII generation context logger.
 *
 * Called right before every LLM invocation in user-facing generation flows
 * (Evidence Scan, Batch Sprint, Outreach Pack, Application Kit / Cover Letter,
 * Translation). Logs a JSON record to the server console so that changing
 * Profile settings (Job market, Career stage, Language, Education, Work Auth)
 * can be verified in server logs without exposing any raw user-provided text.
 *
 * SAFETY CONTRACT — this module MUST NOT log:
 *   - Resume text, JD text, cover letter text, bullet rewrites
 *   - Email addresses, phone numbers, LinkedIn URLs
 *   - Full school names, full names, any free-text field
 *
 * Only safe, enumerable, non-PII fields are logged (IDs, enums, booleans,
 * counts, and the model/provider metadata).
 */

import { featureFlags } from "../../shared/featureFlags";

// ─── Flow identifiers ─────────────────────────────────────────────────────────

export type GenerationFlow =
  | "evidence_scan"
  | "batch_sprint"
  | "outreach_pack"
  | "application_kit"
  | "translation";

// ─── Input shape ──────────────────────────────────────────────────────────────

export interface GenerationContextInput {
  /** Which generation flow is being instrumented */
  flow: GenerationFlow;

  /** Server-side user ID (safe in server logs, never sent to frontend) */
  userId: number;

  /** Country pack the user is on (CA / VN / PH / US / GLOBAL) */
  countryPackId?: string | null;

  /** Career stage track code */
  trackCode?: string | null;

  /** Display language mode */
  languageMode?: string | null;

  /** Education fields — booleans only, no raw strings */
  education?: {
    highestEducationLevel?: string | null; // enum value, not PII
    hasSchool: boolean;
    hasFieldOfStudy: boolean;
    hasGraduationDate: boolean;
  };

  /** Work auth fields — only for CA/US users */
  workAuth?: {
    workStatus?: string | null; // enum value
    sponsorshipNeeded?: string | null; // enum value ("true"/"false"/"unknown")
    hasCountryOfResidence: boolean;
    willingToRelocate?: boolean | null;
  };

  /** Optional: how many country packs are enabled (admin-controlled) */
  enabledCountryPacksCount?: number;

  /** LLM / prompt metadata */
  promptMeta?: {
    model?: string | null;
    provider?: string | null;
    promptPrefixKey?: string | null;
    promptVersion?: string | null;
  };
}

// ─── Logged record shape (what actually appears in the log) ──────────────────

export interface GenerationContextRecord {
  event: "llm_generation_context";
  flow: GenerationFlow;
  userId: number;
  countryPackId: string;
  trackCode: string;
  languageMode: string;
  education: {
    highestEducationLevel: string;
    hasSchool: boolean;
    hasFieldOfStudy: boolean;
    hasGraduationDate: boolean;
  };
  workAuth: {
    workStatus: string;
    sponsorshipNeeded: string;
    hasCountryOfResidence: boolean;
    willingToRelocate: boolean | null;
  } | null;
  enabledCountryPacksCount: number | null;
  featureFlags: {
    v2CountryPacksEnabled: boolean;
    v2VnTranslationEnabled: boolean;
    v2BilingualViewEnabled: boolean;
    v2AnalyticsEnabled: boolean;
  };
  promptMeta: {
    model: string;
    provider: string;
    promptPrefixKey: string;
    promptVersion: string;
  };
  timestamp: string; // ISO 8601 UTC
}

// ─── Helper ───────────────────────────────────────────────────────────────────

/**
 * Build and emit a structured non-PII generation context log record.
 *
 * Guaranteed safe: the function only reads enumerable/boolean fields from
 * the input and never touches raw text fields.
 */
export function logGenerationContext(input: GenerationContextInput): GenerationContextRecord {
  const record: GenerationContextRecord = {
    event: "llm_generation_context",
    flow: input.flow,
    userId: input.userId,
    countryPackId: input.countryPackId ?? "GLOBAL",
    trackCode: input.trackCode ?? "unknown",
    languageMode: input.languageMode ?? "en",
    education: {
      highestEducationLevel: input.education?.highestEducationLevel ?? "unknown",
      hasSchool: input.education?.hasSchool ?? false,
      hasFieldOfStudy: input.education?.hasFieldOfStudy ?? false,
      hasGraduationDate: input.education?.hasGraduationDate ?? false,
    },
    workAuth: input.workAuth
      ? {
          workStatus: input.workAuth.workStatus ?? "unknown",
          sponsorshipNeeded: input.workAuth.sponsorshipNeeded ?? "unknown",
          hasCountryOfResidence: input.workAuth.hasCountryOfResidence,
          willingToRelocate: input.workAuth.willingToRelocate ?? null,
        }
      : null,
    enabledCountryPacksCount: input.enabledCountryPacksCount ?? null,
    featureFlags: {
      v2CountryPacksEnabled: featureFlags.v2CountryPacksEnabled,
      v2VnTranslationEnabled: featureFlags.v2VnTranslationEnabled,
      v2BilingualViewEnabled: featureFlags.v2BilingualViewEnabled,
      v2AnalyticsEnabled: featureFlags.v2AnalyticsEnabled,
    },
    promptMeta: {
      model: input.promptMeta?.model ?? "unknown",
      provider: input.promptMeta?.provider ?? "unknown",
      promptPrefixKey: input.promptMeta?.promptPrefixKey ?? "none",
      promptVersion: input.promptMeta?.promptVersion ?? "none",
    },
    timestamp: new Date().toISOString(),
  };

  // Emit as a single structured JSON line so it can be grep'd / parsed easily
  console.log(JSON.stringify(record));

  return record;
}

// ─── Profile → context builder ────────────────────────────────────────────────

/**
 * Build the education and workAuth sub-objects from a raw DB profile row.
 * Accepts `any` because profile rows are returned as Drizzle plain objects
 * with optional fields; callers should pass the result of db.getProfile().
 *
 * SAFETY: only reads boolean presence and enum values — never the raw strings
 * for school, fieldOfStudy, phone, linkedinUrl, etc.
 */
export function buildEducationContext(profile: any): GenerationContextInput["education"] {
  return {
    highestEducationLevel: profile?.highestEducationLevel ?? null,
    hasSchool: !!(profile?.school),
    hasFieldOfStudy: !!(profile?.program),
    hasGraduationDate: !!(profile?.graduationDate),
  };
}

export function buildWorkAuthContext(
  profile: any,
  countryPackId: string
): GenerationContextInput["workAuth"] | undefined {
  // Only include workAuth context for CA and US users
  if (countryPackId !== "CA" && countryPackId !== "US") return undefined;
  return {
    workStatus: profile?.workStatus ?? null,
    sponsorshipNeeded: profile?.needsSponsorship ?? null,
    hasCountryOfResidence: !!(profile?.countryOfResidence),
    willingToRelocate: profile?.willingToRelocate ?? null,
  };
}
