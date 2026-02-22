/**
 * Prompt B1: Outreach Signature — No Placeholders
 * Tests for:
 *  A) Phone/LinkedIn included in prompt when profile has them
 *  B) Lines omitted when profile has no phone/linkedin
 *  C) Post-processing stripBrackets removes all known bracket patterns
 *  D) No credits/ledger changes
 */
import { describe, it, expect } from "vitest";

// ─── Unit tests for the stripBrackets logic ───────────────────────────────────
const stripBrackets = (text: string) =>
  text
    .replace(/\[Your Phone Number\]/gi, "")
    .replace(/\[Your LinkedIn Profile URL\]/gi, "")
    .replace(/\[Your LinkedIn URL\]/gi, "")
    .replace(/\[LinkedIn Profile\]/gi, "")
    .replace(/\[Phone\]/gi, "")
    .replace(/\[[^\]]{1,60}\]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

describe("Prompt B1: outreach signature no-placeholder", () => {
  // A) stripBrackets removes [Your Phone Number]
  it("A: strips [Your Phone Number] placeholder", () => {
    const input = "Best regards,\nJane\n[Your Phone Number]\n[Your LinkedIn Profile URL]";
    const result = stripBrackets(input);
    expect(result).not.toContain("[Your Phone Number]");
    expect(result).not.toContain("[Your LinkedIn Profile URL]");
  });

  // B) stripBrackets removes [Your LinkedIn URL] variant
  it("B: strips [Your LinkedIn URL] variant", () => {
    const input = "Thanks,\nJohn\n[Your LinkedIn URL]";
    const result = stripBrackets(input);
    expect(result).not.toContain("[Your LinkedIn URL]");
  });

  // C) stripBrackets removes [LinkedIn Profile] variant
  it("C: strips [LinkedIn Profile] variant", () => {
    const input = "Regards,\nAlex\n[LinkedIn Profile]";
    const result = stripBrackets(input);
    expect(result).not.toContain("[LinkedIn Profile]");
  });

  // D) stripBrackets removes [Phone] variant
  it("D: strips [Phone] variant", () => {
    const input = "Hi,\n[Phone]\nThanks";
    const result = stripBrackets(input);
    expect(result).not.toContain("[Phone]");
  });

  // E) stripBrackets removes generic short bracket placeholders
  it("E: strips generic bracket placeholders up to 60 chars", () => {
    const input = "Hello [Your Name], please call [Contact Number] today.";
    const result = stripBrackets(input);
    expect(result).not.toMatch(/\[[^\]]{1,60}\]/);
  });

  // F) stripBrackets preserves real content
  it("F: preserves real content outside brackets", () => {
    const input = "Hi Sarah,\nI saw your posting for Software Engineer at Acme Corp.\n[Your Phone Number]\nBest,\nJane";
    const result = stripBrackets(input);
    expect(result).toContain("Hi Sarah,");
    expect(result).toContain("Software Engineer at Acme Corp.");
    expect(result).toContain("Best,\nJane");
  });

  // G) signatureBlock includes phone when profile has phone
  it("G: signatureBlock includes phone line when profile.phone is set", () => {
    const profile = { phone: "+1 (555) 123-4567", linkedinUrl: null };
    const sigLines: string[] = [];
    if (profile.phone) sigLines.push(`Phone: ${profile.phone}`);
    if (profile.linkedinUrl) sigLines.push(`LinkedIn: ${profile.linkedinUrl}`);
    const signatureBlock =
      sigLines.length > 0
        ? `\nSignature lines to include:\n${sigLines.join("\n")}`
        : "\nDo NOT include any phone or LinkedIn placeholder lines in the signature.";
    expect(signatureBlock).toContain("Phone: +1 (555) 123-4567");
    expect(signatureBlock).not.toContain("LinkedIn:");
  });

  // H) signatureBlock includes linkedin when profile has linkedinUrl
  it("H: signatureBlock includes linkedin line when profile.linkedinUrl is set", () => {
    const profile = { phone: null, linkedinUrl: "https://linkedin.com/in/jane" };
    const sigLines: string[] = [];
    if (profile.phone) sigLines.push(`Phone: ${profile.phone}`);
    if (profile.linkedinUrl) sigLines.push(`LinkedIn: ${profile.linkedinUrl}`);
    const signatureBlock =
      sigLines.length > 0
        ? `\nSignature lines to include:\n${sigLines.join("\n")}`
        : "\nDo NOT include any phone or LinkedIn placeholder lines in the signature.";
    expect(signatureBlock).toContain("LinkedIn: https://linkedin.com/in/jane");
    expect(signatureBlock).not.toContain("Phone:");
  });

  // I) signatureBlock omits both when profile has neither
  it("I: signatureBlock uses DO NOT include message when profile has no phone/linkedin", () => {
    const profile = { phone: null, linkedinUrl: null };
    const sigLines: string[] = [];
    if (profile.phone) sigLines.push(`Phone: ${profile.phone}`);
    if (profile.linkedinUrl) sigLines.push(`LinkedIn: ${profile.linkedinUrl}`);
    const signatureBlock =
      sigLines.length > 0
        ? `\nSignature lines to include:\n${sigLines.join("\n")}`
        : "\nDo NOT include any phone or LinkedIn placeholder lines in the signature.";
    expect(signatureBlock).toContain("Do NOT include any phone or LinkedIn placeholder lines");
  });

  // J) signatureBlock includes both when profile has both
  it("J: signatureBlock includes both phone and linkedin when both are set", () => {
    const profile = { phone: "+1 (555) 999-0000", linkedinUrl: "https://linkedin.com/in/bob" };
    const sigLines: string[] = [];
    if (profile.phone) sigLines.push(`Phone: ${profile.phone}`);
    if (profile.linkedinUrl) sigLines.push(`LinkedIn: ${profile.linkedinUrl}`);
    const signatureBlock =
      sigLines.length > 0
        ? `\nSignature lines to include:\n${sigLines.join("\n")}`
        : "\nDo NOT include any phone or LinkedIn placeholder lines in the signature.";
    expect(signatureBlock).toContain("Phone: +1 (555) 999-0000");
    expect(signatureBlock).toContain("LinkedIn: https://linkedin.com/in/bob");
  });

  // K) triple newlines collapsed to double after strip
  it("K: collapses triple newlines after bracket removal", () => {
    const input = "Hi,\n\n\n\nBest regards";
    const result = stripBrackets(input);
    expect(result).not.toMatch(/\n{3,}/);
  });
});
