/**
 * Outreach Fix 4/4: buildOutreachCopyAllText
 *
 * Builds a clean, structured plain-text block for all 4 outreach messages.
 * Suitable for pasting directly into email clients and LinkedIn.
 */

export interface OutreachPack {
  recruiter_email?: string | null;
  linkedin_dm?: string | null;
  follow_up_1?: string | null;
  follow_up_2?: string | null;
}

/**
 * Builds a plain-text copy-all block from an outreach pack.
 * - Sections are separated by a blank line.
 * - Sections with empty/null content are omitted.
 * - No markdown, no HTML, no bullet symbols.
 * - Preserves "To:" and "LinkedIn:" lines if present (Fix 2/4 and Fix 3/4).
 */
export function buildOutreachCopyAllText(pack: OutreachPack): string {
  const sections: string[] = [];

  if (pack.recruiter_email?.trim()) {
    sections.push(`=== Recruiter Email ===\n${pack.recruiter_email.trim()}`);
  }

  if (pack.linkedin_dm?.trim()) {
    sections.push(`=== LinkedIn DM ===\n${pack.linkedin_dm.trim()}`);
  }

  if (pack.follow_up_1?.trim()) {
    sections.push(`=== Follow-up #1 ===\n${pack.follow_up_1.trim()}`);
  }

  if (pack.follow_up_2?.trim()) {
    sections.push(`=== Follow-up #2 ===\n${pack.follow_up_2.trim()}`);
  }

  return sections.join("\n\n");
}
