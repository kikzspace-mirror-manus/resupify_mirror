/**
 * shared/maxLengths.ts — Phase 10B-1
 *
 * Single source of truth for all free-text input length caps.
 * Import on both server (Zod schemas) and client (HTML maxLength + Zod).
 *
 * These values are intentionally conservative to prevent oversized payloads
 * from reaching the LLM while remaining generous for legitimate use.
 */

export const MAX_LENGTHS = {
  // ── Job Card fields ──────────────────────────────────────────────────────
  JOB_TITLE: 120,
  COMPANY: 120,
  LOCATION: 120,
  SALARY: 64,
  JOB_NOTES: 2_000,
  JD_TEXT: 25_000,

  // ── JD Snapshot ──────────────────────────────────────────────────────────
  SNAPSHOT_TEXT: 25_000,
  SOURCE_URL: 2_048,

  // ── Resume ───────────────────────────────────────────────────────────────
  RESUME_TITLE: 120,
  RESUME_CONTENT: 25_000,

  // ── Task ─────────────────────────────────────────────────────────────────
  TASK_TITLE: 200,
  TASK_DESCRIPTION: 2_000,

  // ── Contact ──────────────────────────────────────────────────────────────
  CONTACT_NAME: 120,
  CONTACT_ROLE: 120,
  CONTACT_COMPANY: 120,
  CONTACT_EMAIL: 254,
  CONTACT_LINKEDIN_URL: 512,
  CONTACT_PHONE: 64,
  CONTACT_NOTES: 1_000,

  // ── Personalization sources (already capped in existing code) ────────────
  PERSONALIZATION_PASTED_TEXT: 5_000,
  PERSONALIZATION_URL: 2_048,

  // ── Profile ──────────────────────────────────────────────────────────────
  PROFILE_SCHOOL: 120,
  PROFILE_PROGRAM: 120,
  PROFILE_GRADUATION_DATE: 32,
  PROFILE_PHONE: 64,
  PROFILE_LINKEDIN_URL: 512,
  PROFILE_COUNTRY: 64,
  PROFILE_REGION_CODE: 8,
  PROFILE_TRACK_CODE: 16,

  // ── Saved notes ──────────────────────────────────────────────────────────
  SAVED_NOTE_CONTENT: 20_000,
  SAVED_NOTE_URL_HOSTNAME: 253,
} as const;

/** Human-readable validation message for over-limit fields. */
export const TOO_LONG_MSG = "This field is too long, please shorten it.";
