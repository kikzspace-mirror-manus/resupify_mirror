/**
 * OUTREACH_TONE_GUARDRAILS
 *
 * Phase 9C1: foundation config.
 * Phase 9C3: adds sanitizeTone() and buildToneSystemPrompt() helpers.
 * DO NOT change the shape of this object without updating dependent tests.
 */
export const OUTREACH_TONE_GUARDRAILS = {
  /**
   * Phrases that MUST NOT appear in generated outreach or cover letters.
   * The LLM prompt will include these as a negative list.
   */
  banned_phrases: [
    "reiterate",
    "once more",
    "final follow up",
    "final follow-up",
    "following my previous",
    "strong interest to reiterate",
    "I am writing again",
    "I'm writing again",
    "as I mentioned before",
    "as previously mentioned",
    "I wanted to reiterate",
    "I want to reiterate",
    "circling back once more",
    "reaching out once more",
    "I hope this doesn't come across",
    "I don't want to be a bother",
    "I know you're busy",
    "I understand you're busy",
    "urgent",
    "I would appreciate a reply",
    "I'm waiting",
    "I am waiting",
  ],

  /**
   * Preferred soft phrases — use these most in follow-ups.
   */
  preferred_phrases: [
    "Hope you're doing well. I wanted to share a quick note in case helpful",
    "No rush at all — just wanted to follow up briefly",
    "Whenever you have a moment, I'd appreciate any update you're able to share",
    "Totally understand if timing isn't right — I just wanted to keep this on your radar",
    "Thanks for your time — I appreciate it",
    "appreciate your time",
    "if there's any update you can share",
    "I'd love to learn more",
    "I'm genuinely excited about",
    "thank you for considering",
    "happy to provide any additional information",
    "looking forward to hearing from you",
    "no pressure at all",
  ],

  /**
   * Allowed but NOT preferred — avoid unless needed.
   */
  allowed_not_preferred: [
    "just checking in",
    "wanted to follow up",
  ],

  /**
   * Phrases that signal a "no-pressure" clause is present in a follow-up.
   * At least one must appear in each follow-up message.
   */
  no_pressure_markers: [
    "no rush",
    "no pressure",
    "whenever you have a moment",
    "totally understand if",
    "if you're able to share",
    "if there's any update",
    "if timing isn't right",
    "at your convenience",
    "whenever works for you",
  ],

  /**
   * Phrases that signal an appreciation clause is present.
   * At least one must appear in each follow-up message.
   */
  appreciation_markers: [
    "thank you",
    "thanks for",
    "appreciate",
    "grateful",
  ],

  /**
   * Human-readable rule text injected verbatim into LLM system prompts.
   */
  rule_text:
    "Always be appreciative and professional. Avoid demanding language. Never imply entitlement or pressure. Do not use guilt framing. Prefer soft, warm phrasing over assertive or repetitive language.",
} as const;

export type OutreachToneGuardrails = typeof OUTREACH_TONE_GUARDRAILS;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Build the tone guardrail block to inject into LLM system prompts.
 * Used by both production generatePack and admin sandbox generateOutreachTestMode.
 */
export function buildToneSystemPrompt(): string {
  const g = OUTREACH_TONE_GUARDRAILS;
  const bannedList = g.banned_phrases.map((p) => `- "${p}"`).join("\n");
  const preferredList = g.preferred_phrases.map((p) => `- "${p}"`).join("\n");
  const allowedList = g.allowed_not_preferred.map((p) => `- "${p}"`).join("\n");

  return `TONE GUARDRAILS (MANDATORY):
${g.rule_text}

Hard rules:
- Never use demanding language. Keep tone appreciative and low-pressure.
- Do not use any banned phrase. If you would, rewrite to a softer alternative.
- For follow-up messages (follow_up_1 and follow_up_2): MUST include (1) one no-pressure clause and (2) one appreciation phrase.
- Follow-up emails should be ~60–120 words, concise.

Banned phrases (never use):
${bannedList}

Preferred soft phrases (use these most):
${preferredList}

Allowed but NOT preferred (avoid unless needed):
${allowedList}`;
}

/**
 * Deterministic post-processing safety pass.
 *
 * - Removes/replaces banned phrases (case-insensitive).
 * - If isFollowUp=true and the message lacks a no-pressure clause OR appreciation phrase,
 *   appends a minimal fallback sentence.
 */
export function sanitizeTone(text: string, isFollowUp: boolean): string {
  if (!text) return text;

  let result = text;
  const g = OUTREACH_TONE_GUARDRAILS;

  // 1. Strip banned phrases
  for (const phrase of g.banned_phrases) {
    // Build a case-insensitive regex that matches the phrase as a word/phrase boundary
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(escaped, "gi");
    result = result.replace(re, "");
  }

  // 2. Collapse multiple spaces/newlines left by removals
  result = result.replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();

  if (!isFollowUp) return result;

  // 3. For follow-ups: ensure no-pressure clause + appreciation phrase
  const lower = result.toLowerCase();
  const hasNoPressure = (g.no_pressure_markers as readonly string[]).some((m) =>
    lower.includes(m.toLowerCase())
  );
  const hasAppreciation = (g.appreciation_markers as readonly string[]).some((m) =>
    lower.includes(m.toLowerCase())
  );

  if (!hasNoPressure || !hasAppreciation) {
    result = result.trimEnd() + "\n\nNo rush at all — thanks for your time.";
  }

  return result;
}
