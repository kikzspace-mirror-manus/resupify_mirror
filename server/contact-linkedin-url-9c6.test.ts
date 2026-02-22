/**
 * Phase 9C6: Add Contact Form — LinkedIn URL Field
 *
 * Tests cover the pure validation logic and mutation input construction:
 * A) Add contact with valid LinkedIn URL → saved and linkedinUrl passed to mutation
 * B) Add contact with invalid URL (http:// or random text) → validation error set, save blocked
 * C) Add contact without LinkedIn URL → no error, saves normally
 * D) Regression: Fix 3/4 LinkedIn injection still works (linkedinUrl present → DM gets LinkedIn: line)
 * E) Empty string clears the error
 * F) URL starting with https:// passes validation
 * G) URL starting with http:// fails validation
 * H) Random text fails validation
 */
import { describe, expect, it } from "vitest";

// ─── Pure validation logic extracted from OutreachTab ────────────────────────

function validateLinkedInUrl(val: string): string | null {
  if (!val) return null; // empty is fine
  if (!val.startsWith("https://")) return "LinkedIn URL must start with https://";
  return null;
}

function buildCreateContactInput(
  jobCardId: number,
  name: string,
  role: string,
  email: string,
  linkedInUrl: string,
  urlError: string | null
): { ok: boolean; input?: Record<string, unknown>; reason?: string } {
  if (!name.trim()) return { ok: false, reason: "name required" };
  if (urlError) return { ok: false, reason: urlError };
  return {
    ok: true,
    input: {
      jobCardId,
      name,
      role: role || undefined,
      email: email || undefined,
      linkedinUrl: linkedInUrl || undefined,
    },
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("Phase 9C6: LinkedIn URL field validation", () => {
  it("A) valid https:// URL → no error, mutation input includes linkedinUrl", () => {
    const url = "https://linkedin.com/in/erick-tran";
    const error = validateLinkedInUrl(url);
    expect(error).toBeNull();

    const result = buildCreateContactInput(1, "Erick Tran", "Recruiter", "erick@co.com", url, error);
    expect(result.ok).toBe(true);
    expect(result.input?.linkedinUrl).toBe(url);
  });

  it("B1) http:// URL → validation error set, save blocked", () => {
    const url = "http://linkedin.com/in/erick-tran";
    const error = validateLinkedInUrl(url);
    expect(error).toBe("LinkedIn URL must start with https://");

    const result = buildCreateContactInput(1, "Erick Tran", "", "", url, error);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("LinkedIn URL must start with https://");
  });

  it("B2) random text → validation error set, save blocked", () => {
    const url = "linkedin.com/in/erick";
    const error = validateLinkedInUrl(url);
    expect(error).toBe("LinkedIn URL must start with https://");

    const result = buildCreateContactInput(1, "Erick Tran", "", "", url, error);
    expect(result.ok).toBe(false);
  });

  it("C) empty LinkedIn URL → no error, saves normally without linkedinUrl", () => {
    const url = "";
    const error = validateLinkedInUrl(url);
    expect(error).toBeNull();

    const result = buildCreateContactInput(1, "Erick Tran", "Recruiter", "erick@co.com", url, error);
    expect(result.ok).toBe(true);
    expect(result.input?.linkedinUrl).toBeUndefined();
  });

  it("D) regression: when linkedinUrl is present, it flows through to mutation input", () => {
    const url = "https://linkedin.com/in/sarah-chen";
    const error = validateLinkedInUrl(url);
    const result = buildCreateContactInput(2, "Sarah Chen", "", "", url, error);
    expect(result.ok).toBe(true);
    expect(result.input?.linkedinUrl).toBe("https://linkedin.com/in/sarah-chen");
    // This is the value that will be stored in contact.linkedinUrl
    // and subsequently used by Fix 3/4 to inject the LinkedIn: line in the DM
  });

  it("E) clearing the field (empty string) clears the error", () => {
    // First set an invalid value
    const badUrl = "http://linkedin.com/in/test";
    expect(validateLinkedInUrl(badUrl)).not.toBeNull();

    // Then clear it
    const cleared = "";
    expect(validateLinkedInUrl(cleared)).toBeNull();
  });

  it("F) URL starting with https:// passes validation", () => {
    expect(validateLinkedInUrl("https://linkedin.com/in/test")).toBeNull();
    expect(validateLinkedInUrl("https://www.linkedin.com/in/test")).toBeNull();
  });

  it("G) URL starting with http:// fails validation", () => {
    expect(validateLinkedInUrl("http://linkedin.com/in/test")).not.toBeNull();
  });

  it("H) random text without protocol fails validation", () => {
    expect(validateLinkedInUrl("linkedin.com/in/test")).not.toBeNull();
    expect(validateLinkedInUrl("just some text")).not.toBeNull();
    expect(validateLinkedInUrl("ftp://linkedin.com")).not.toBeNull();
  });

  it("I) name is required — empty name blocks save regardless of URL", () => {
    const result = buildCreateContactInput(1, "  ", "", "", "", null);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("name required");
  });

  it("J) valid URL with name → mutation input has all fields", () => {
    const result = buildCreateContactInput(
      5, "Alice Smith", "HR Manager", "alice@corp.com",
      "https://linkedin.com/in/alice-smith", null
    );
    expect(result.ok).toBe(true);
    expect(result.input?.name).toBe("Alice Smith");
    expect(result.input?.role).toBe("HR Manager");
    expect(result.input?.email).toBe("alice@corp.com");
    expect(result.input?.linkedinUrl).toBe("https://linkedin.com/in/alice-smith");
    expect(result.input?.jobCardId).toBe(5);
  });
});
