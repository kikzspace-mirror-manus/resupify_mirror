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
