/**
 * Shared outreach helpers — salutation computation and post-process guards.
 * These are pure functions with no external dependencies so they can be
 * imported from both server-side procedures and tests.
 */

/**
 * Extract the first name from a full name string.
 * "Jane Smith" → "Jane"
 * "Jane" → "Jane"
 * "" | null | undefined → null
 */
export function extractFirstName(fullName: string | null | undefined): string | null {
  if (!fullName) return null;
  const trimmed = fullName.trim();
  if (!trimmed) return null;
  return trimmed.split(/\s+/)[0] ?? null;
}

/**
 * Compute the deterministic salutation for an outreach message.
 *
 * @param contactName - Full name of the contact (may be null/undefined)
 * @param type        - "email" | "linkedin"
 * @returns           - e.g. "Dear Jane," or "Dear Hiring Manager," or "Hi Jane," or "Hi there,"
 */
export function computeSalutation(
  contactName: string | null | undefined,
  type: "email" | "linkedin"
): string {
  const firstName = extractFirstName(contactName);
  if (type === "linkedin") {
    return firstName ? `Hi ${firstName},` : "Hi there,";
  }
  // email (and follow-ups)
  return firstName ? `Dear ${firstName},` : "Dear Hiring Manager,";
}

// ─── Personalization Sources ─────────────────────────────────────────────────

/** Minimal shape needed from job_card_personalization_sources rows */
export interface PersonalizationSourceRow {
  sourceType: string;
  url?: string | null;
  pastedText?: string | null;
}

/**
 * Build the === PERSONALIZATION CONTEXT === block to inject into the LLM user message.
 * Returns an empty string when sources is empty (no injection).
 *
 * @param sources - Up to 3 most-recent sources (caller is responsible for slicing)
 * @param maxExcerptChars - Max chars per excerpt (default 800)
 */
export function buildPersonalizationBlock(
  sources: PersonalizationSourceRow[],
  maxExcerptChars = 800
): string {
  if (!sources || sources.length === 0) return "";

  const lines: string[] = [
    "=== PERSONALIZATION CONTEXT (USER-PROVIDED) ===",
    "Use ONLY this information for personalization. Do not invent details.",
    "If the context is too vague or unclear, skip personalization entirely.",
    "Never mention 'I saw your LinkedIn' unless the source type is linkedin_post or linkedin_about, or the URL is a LinkedIn URL.",
    "Never include private or personal details. Use only professional topics.",
    "Insert personalization in: recruiter email (max 1 sentence after greeting) and LinkedIn DM (max 1 sentence after greeting). Do NOT add personalization to follow-ups.",
  ];

  sources.forEach((src, i) => {
    lines.push(`Source ${i + 1} (${src.sourceType}):`);
    if (src.url) lines.push(`  URL: ${src.url}`);
    if (src.pastedText) {
      const excerpt = src.pastedText.trim().slice(0, maxExcerptChars);
      lines.push(`  Excerpt: "${excerpt}"`);
    }
  });

  lines.push("=== END PERSONALIZATION CONTEXT ===");
  return lines.join("\n");
}

/**
 * Post-process guard for personalization:
 * - Ensures personalization appears at most once in recruiter email and DM.
 * - Ensures follow-ups contain no personalization references.
 *
 * This is a lightweight heuristic guard. The LLM is the primary enforcement.
 * We detect "personalization sentences" as lines that contain phrases like
 * "I noticed", "I saw", "I read", "I came across", "I was impressed",
 * "your recent post", "your article", "your news", "your announcement".
 */
const PERSONALIZATION_SIGNALS = [
  /\bI noticed\b/i,
  /\bI saw\b/i,
  /\bI read\b/i,
  /\bI came across\b/i,
  /\bI was impressed\b/i,
  /\byour recent post\b/i,
  /\byour article\b/i,
  /\byour news\b/i,
  /\byour announcement\b/i,
  /\byour LinkedIn post\b/i,
  /\byour LinkedIn article\b/i,
];

function hasPersonalizationSignal(sentence: string): boolean {
  return PERSONALIZATION_SIGNALS.some((re) => re.test(sentence));
}

/**
 * Remove all personalization sentences from a text block.
 * Used for follow-ups.
 */
export function stripPersonalizationFromFollowUp(text: string): string {
  if (!text) return text;
  const sentences = text.split(/((?<=[.!?])\s+)/);
  return sentences.filter((s) => !hasPersonalizationSignal(s)).join("").trim();
}

// ─── Contact Email ───────────────────────────────────────────────────────────

/** Regex patterns for bracket placeholder variants of recruiter email */
const RECRUITER_EMAIL_PLACEHOLDERS = [
  /\[Recruiter Email\]/gi,
  /\[recruiter email\]/gi,
  /\[Recruiter's Email\]/gi,
  /\[recruiter's email\]/gi,
  /\[Email\]/gi,
  /^Recruiter Email:\s*.*/gim,
];

/**
 * Build the contact email instruction block for the LLM prompt.
 * Returns empty string when no email is provided.
 */
export function buildContactEmailBlock(contactEmail: string | null | undefined): string {
  if (!contactEmail || !contactEmail.trim()) return "";
  return [
    `Contact email: ${contactEmail.trim()}`,
    `For the recruiter_email field ONLY: add a "To: ${contactEmail.trim()}" line as the very first line, before the Subject line.`,
    "Do NOT add a To: line to linkedin_dm, follow_up_1, or follow_up_2.",
    "Never invent or guess an email address. Use only the one provided above.",
    "Never output bracket placeholders like [Recruiter Email] — omit entirely if no email is provided.",
  ].join("\n");
}

/**
 * Post-process the recruiter_email field:
 * 1. Strip all [Recruiter Email] bracket placeholders.
 * 2. If contactEmail is provided and a To: line is missing, prepend it.
 */
export function fixContactEmail(text: string, contactEmail?: string | null): string {
  if (!text) return text;
  let result = text;
  // 1. Strip bracket placeholders
  for (const re of RECRUITER_EMAIL_PLACEHOLDERS) {
    result = result.replace(re, "");
  }
  // Collapse multiple blank lines left by removals
  result = result.replace(/\n{3,}/g, "\n\n").trim();
  // 2. If email provided and To: line is missing, prepend it
  if (contactEmail && contactEmail.trim()) {
    const email = contactEmail.trim();
    if (!result.match(/^To:\s/im)) {
      result = `To: ${email}\n${result}`;
    }
  }
  return result;
}

// ─── LinkedIn URL ────────────────────────────────────────────────────────────

/** Regex patterns for bracket placeholder variants of LinkedIn profile URL */
const LINKEDIN_URL_PLACEHOLDERS = [
  /\[LinkedIn Profile URL\]/gi,
  /\[linkedin profile url\]/gi,
  /\[LinkedIn URL\]/gi,
  /\[linkedin url\]/gi,
  /\[Your LinkedIn Profile URL\]/gi,
  /\[your linkedin profile url\]/gi,
  /^LinkedIn Profile URL:\s*.*/gim,
  /^LinkedIn:\s*\[.*?\]/gim,
];

/**
 * Build the LinkedIn URL instruction block for the LLM prompt.
 * Returns empty string when no URL is provided.
 */
export function buildLinkedInBlock(linkedinUrl: string | null | undefined): string {
  if (!linkedinUrl || !linkedinUrl.trim()) return "";
  const url = linkedinUrl.trim();
  return [
    `Contact LinkedIn URL: ${url}`,
    `For the linkedin_dm field ONLY: add a "LinkedIn: ${url}" line as the very first line of the DM, before the greeting.`,
    "Do NOT add a LinkedIn: line to recruiter_email, follow_up_1, or follow_up_2.",
    "Never invent or guess a LinkedIn URL. Use only the one provided above.",
    "Never output bracket placeholders like [LinkedIn Profile URL] \u2014 omit entirely if no URL is provided.",
  ].join("\n");
}

/**
 * Post-process the linkedin_dm field:
 * 1. Strip all [LinkedIn Profile URL] bracket placeholders.
 * 2. If linkedinUrl is provided and a LinkedIn: line is missing, prepend it.
 * 3. Ensure the LinkedIn: line appears at most once.
 */
export function fixLinkedInUrl(text: string, linkedinUrl?: string | null): string {
  if (!text) return text;
  let result = text;

  // 1. Strip bracket placeholders
  for (const re of LINKEDIN_URL_PLACEHOLDERS) {
    result = result.replace(re, "");
  }
  // Collapse multiple blank lines left by removals
  result = result.replace(/\n{3,}/g, "\n\n").trim();

  // 2. If URL provided, ensure exactly one LinkedIn: line at the top
  if (linkedinUrl && linkedinUrl.trim()) {
    const url = linkedinUrl.trim();
    // Remove any existing LinkedIn: lines (to avoid duplication)
    result = result.replace(/^LinkedIn:\s*.*$/gim, "").replace(/\n{3,}/g, "\n\n").trim();
    // Prepend the canonical LinkedIn: line
    result = `LinkedIn: ${url}\n${result}`;
  }

  return result;
}

/**
 * Post-process guard: replace any "Dear ," or "Dear," patterns left by the LLM
 * with the correct fallback salutation.
 * Also fixes "Hi ," / "Hi," patterns for LinkedIn DMs.
 */
export function fixSalutation(text: string, type: "email" | "linkedin"): string {
  if (type === "linkedin") {
    // "Hi ," or "Hi," → "Hi there,"
    return text
      .replace(/^Hi\s*,/m, "Hi there,")
      .replace(/Hi\s*,\s*\n/g, "Hi there,\n");
  }
  // email: "Dear ," or "Dear," → "Dear Hiring Manager,"
  return text
    .replace(/^Dear\s*,/m, "Dear Hiring Manager,")
    .replace(/Dear\s*,\s*\n/g, "Dear Hiring Manager,\n");
}
