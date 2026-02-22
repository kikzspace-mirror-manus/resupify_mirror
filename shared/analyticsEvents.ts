/**
 * V2 Phase 1B.2 — Canonical Analytics Event Names
 *
 * All event names used by logAnalyticsEvent() must come from this file.
 * This prevents typos and makes it easy to find all instrumentation points.
 *
 * Rules:
 * - snake_case, max 64 chars (matches analytics_events.eventName column)
 * - Do NOT add events here unless they are actively instrumented
 * - Do NOT store PII in props; use internal IDs only
 */

// ─── Acquisition ─────────────────────────────────────────────────────────────
/** User completed OAuth signup for the first time. */
export const EVT_SIGNUP_COMPLETED = "signup_completed";

// ─── Activation / Funnel ─────────────────────────────────────────────────────
/** User created or imported a new job card. */
export const EVT_JOB_CARD_CREATED = "job_card_created";

/** User ran Evidence+ATS (Quick Match) on a job card. */
export const EVT_QUICK_MATCH_RUN = "quick_match_run";

/** User generated a cover letter (via Application Kit). */
export const EVT_COVER_LETTER_GENERATED = "cover_letter_generated";

/** User generated an outreach pack (recruiter email + LinkedIn DM + follow-ups). */
export const EVT_OUTREACH_GENERATED = "outreach_generated";

/** User completed a mock interview session. (Placeholder — feature not yet built.) */
export const EVT_MOCK_INTERVIEW_COMPLETED = "mock_interview_completed";

// ─── Monetization ────────────────────────────────────────────────────────────
/** User viewed the paywall / credits purchase page. */
export const EVT_PAYWALL_VIEWED = "paywall_viewed";

/** User completed a credit pack purchase via Stripe. */
export const EVT_PURCHASE_COMPLETED = "purchase_completed";

// ─── Quality / Performance ───────────────────────────────────────────────────
/**
 * An AI run completed.
 * props: { run_type: "evidence" | "kit" | "outreach", latency_ms: number, provider: string }
 */
export const EVT_AI_RUN_COMPLETED = "ai_run_completed";

// ─── Moat ────────────────────────────────────────────────────────────────────
/**
 * User applied a suggestion (bullet rewrite, cover letter edit, etc.).
 * props: { suggestion_type: "bullet_rewrite" | "cover_letter" | "outreach" }
 */
export const EVT_SUGGESTION_APPLIED = "suggestion_applied";

/**
 * User reported a job outcome.
 * props: { outcome: "interview" | "offer" }
 */
export const EVT_OUTCOME_REPORTED = "outcome_reported";

// ─── All event names (for validation) ────────────────────────────────────────
export const ALL_EVENT_NAMES = [
  EVT_SIGNUP_COMPLETED,
  EVT_JOB_CARD_CREATED,
  EVT_QUICK_MATCH_RUN,
  EVT_COVER_LETTER_GENERATED,
  EVT_OUTREACH_GENERATED,
  EVT_MOCK_INTERVIEW_COMPLETED,
  EVT_PAYWALL_VIEWED,
  EVT_PURCHASE_COMPLETED,
  EVT_AI_RUN_COMPLETED,
  EVT_SUGGESTION_APPLIED,
  EVT_OUTCOME_REPORTED,
] as const;

export type AnalyticsEventName = (typeof ALL_EVENT_NAMES)[number];

// ─── Funnel steps (ordered) ───────────────────────────────────────────────────
/** Core activation funnel steps in order. Used for funnel completion % KPI. */
export const FUNNEL_STEPS = [
  EVT_SIGNUP_COMPLETED,
  EVT_JOB_CARD_CREATED,
  EVT_QUICK_MATCH_RUN,
  EVT_COVER_LETTER_GENERATED,
  EVT_OUTREACH_GENERATED,
] as const;

export type FunnelStep = (typeof FUNNEL_STEPS)[number];
