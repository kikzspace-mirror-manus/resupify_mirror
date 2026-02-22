/**
 * OUTREACH_TONE_GUARDRAILS
 *
 * Foundation config for Phase 9C1.
 * Generation prompts will reference this in Phase 9C3.
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
  ],

  /**
   * Preferred phrasing examples to guide the LLM toward respectful, appreciative tone.
   */
  preferred_phrases: [
    "just checking in",
    "wanted to follow up",
    "appreciate your time",
    "if you have any update",
    "if there's any update you can share",
    "I'd love to learn more",
    "I'm genuinely excited about",
    "thank you for considering",
    "happy to provide any additional information",
    "looking forward to hearing from you",
    "no pressure at all",
  ],

  /**
   * Human-readable rule text to be injected verbatim into LLM system prompts.
   * Keep this concise — it will be part of every outreach generation call.
   */
  rule_text:
    "Always be appreciative and professional. Avoid demanding language. Never imply entitlement or pressure. Do not use guilt framing. Prefer soft, warm phrasing over assertive or repetitive language.",
} as const;

export type OutreachToneGuardrails = typeof OUTREACH_TONE_GUARDRAILS;
