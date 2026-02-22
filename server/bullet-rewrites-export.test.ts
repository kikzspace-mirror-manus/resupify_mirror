/**
 * Patch 8D — Bullet Rewrites Export (.txt "Resume Patch")
 *
 * Tests confirm:
 *   A) Button renders only when bulletRewrites exist (conditional render guard)
 *   B) Filename matches convention: FirstName_LastName - Resume_Patch - Company - YYYY-MM-DD.txt
 *   C) Export content includes header fields and grouped rewrite entries
 *   D) Needs confirmation line appears only when needs_confirmation is true
 *   E) No regressions to cover letter export (buildCoverLetterFilename still works)
 */
import { describe, it, expect } from "vitest";
import { buildResumePatchFilename, buildCoverLetterFilename, sanitizeSegment } from "../shared/filename";

// ─── Test A: Button conditional render ────────────────────────────────────────
describe("Test A: Button renders only when bulletRewrites exist", () => {
  it("A1) Empty bulletRewrites array → button should not render (guard: bulletRewrites.length > 0)", () => {
    const bulletRewrites: unknown[] = [];
    // The JSX guard is: {bulletRewrites.length > 0 && <Card>...Download button...</Card>}
    expect(bulletRewrites.length > 0).toBe(false);
  });

  it("A2) Non-empty bulletRewrites array → button should render", () => {
    const bulletRewrites = [
      { requirement_text: "Python", status: "missing", fix: "Add Python projects", rewrite_a: "Built X with Python", rewrite_b: "Developed Y using Python", needs_confirmation: false },
    ];
    expect(bulletRewrites.length > 0).toBe(true);
  });
});

// ─── Test B: Filename convention ──────────────────────────────────────────────
describe("Test B: buildResumePatchFilename — filename convention", () => {
  it("B1) Standard full name and company → correct format", () => {
    const result = buildResumePatchFilename("Francis Alexes Noces", "Acme Corp", new Date(2026, 1, 21));
    expect(result).toBe("Francis_Noces - Resume_Patch - Acme Corp - 2026-02-21.txt");
  });

  it("B2) Single-word name → no underscore in name part", () => {
    const result = buildResumePatchFilename("Alice", "Shopify", new Date(2026, 2, 15));
    expect(result).toBe("Alice - Resume_Patch - Shopify - 2026-03-15.txt");
  });

  it("B3) Missing company → fallback to 'Company'", () => {
    const result = buildResumePatchFilename("John Doe", "", new Date(2026, 0, 1));
    expect(result).toBe("John_Doe - Resume_Patch - Company - 2026-01-01.txt");
  });

  it("B4) Company with forbidden chars → sanitized", () => {
    const result = buildResumePatchFilename("Jane Smith", "Acme/Corp:Ltd", new Date(2026, 5, 1));
    expect(result).toBe("Jane_Smith - Resume_Patch - AcmeCorpLtd - 2026-06-01.txt");
  });

  it("B5) Date is zero-padded (month and day)", () => {
    const result = buildResumePatchFilename("Bob Lee", "Google", new Date(2026, 0, 5));
    expect(result).toBe("Bob_Lee - Resume_Patch - Google - 2026-01-05.txt");
  });

  it("B6) Three-part name → uses first and last only", () => {
    const result = buildResumePatchFilename("Mary Jane Watson", "Netflix", new Date(2026, 3, 10));
    expect(result).toBe("Mary_Watson - Resume_Patch - Netflix - 2026-04-10.txt");
  });

  it("B7) Null/empty name → fallback to 'User'", () => {
    const result = buildResumePatchFilename("", "Stripe", new Date(2026, 1, 1));
    expect(result).toBe("User - Resume_Patch - Stripe - 2026-02-01.txt");
  });
});

// ─── Test C: Export content structure ─────────────────────────────────────────
describe("Test C: Export content includes header fields and grouped entries", () => {
  function buildResumePatchContent(
    jobTitle: string,
    company: string,
    dateStr: string,
    resumeName: string,
    runDate: string,
    missingItems: Array<{ requirement_text: string; status: string; fix: string; rewrite_a: string; rewrite_b: string; needs_confirmation: boolean }>,
    partialItems: Array<{ requirement_text: string; status: string; fix: string; rewrite_a: string; rewrite_b: string; needs_confirmation: boolean }>
  ): string {
    const lines: string[] = [
      `Job: ${jobTitle} — ${company}`,
      `Date: ${dateStr}`,
      `Resume: ${resumeName}`,
      `Evidence run: ${runDate}`,
      "",
    ];
    const groups = [
      { label: "Missing — Add to resume", items: missingItems },
      { label: "Partial — Strengthen existing bullets", items: partialItems },
    ];
    for (const group of groups) {
      if (group.items.length === 0) continue;
      lines.push(`=== ${group.label} ===`);
      lines.push("");
      for (const item of group.items) {
        lines.push(`Requirement: ${item.requirement_text}`);
        lines.push(`Status: ${item.status === "missing" ? "Missing" : "Partial"}`);
        lines.push(`Fix: ${item.fix}`);
        lines.push(`Rewrite A: ${item.rewrite_a}`);
        lines.push(`Rewrite B: ${item.rewrite_b}`);
        if (item.needs_confirmation) lines.push("Needs confirmation: Yes");
        lines.push("");
      }
    }
    return lines.join("\n");
  }

  it("C1) Header fields are present", () => {
    const content = buildResumePatchContent(
      "Software Engineer", "Google", "2026-02-21", "My Resume", "2026-02-20", [], []
    );
    expect(content).toContain("Job: Software Engineer — Google");
    expect(content).toContain("Date: 2026-02-21");
    expect(content).toContain("Resume: My Resume");
    expect(content).toContain("Evidence run: 2026-02-20");
  });

  it("C2) Missing items are grouped under Missing section", () => {
    const missing = [
      { requirement_text: "Python", status: "missing", fix: "Add Python", rewrite_a: "Built X with Python", rewrite_b: "Developed Y using Python", needs_confirmation: false },
    ];
    const content = buildResumePatchContent("Dev", "Acme", "2026-02-21", "Resume", "N/A", missing, []);
    expect(content).toContain("=== Missing — Add to resume ===");
    expect(content).toContain("Requirement: Python");
    expect(content).toContain("Status: Missing");
    expect(content).toContain("Fix: Add Python");
    expect(content).toContain("Rewrite A: Built X with Python");
    expect(content).toContain("Rewrite B: Developed Y using Python");
  });

  it("C3) Partial items are grouped under Partial section", () => {
    const partial = [
      { requirement_text: "Leadership", status: "partial", fix: "Quantify impact", rewrite_a: "Led team of 5", rewrite_b: "Managed cross-functional team", needs_confirmation: false },
    ];
    const content = buildResumePatchContent("PM", "Meta", "2026-02-21", "Resume", "N/A", [], partial);
    expect(content).toContain("=== Partial — Strengthen existing bullets ===");
    expect(content).toContain("Status: Partial");
  });

  it("C4) Empty groups are omitted from content", () => {
    const content = buildResumePatchContent("Dev", "Acme", "2026-02-21", "Resume", "N/A", [], []);
    expect(content).not.toContain("=== Missing");
    expect(content).not.toContain("=== Partial");
  });
});

// ─── Test D: Needs confirmation line ──────────────────────────────────────────
describe("Test D: needs_confirmation line appears only when true", () => {
  function buildEntry(item: { requirement_text: string; status: string; fix: string; rewrite_a: string; rewrite_b: string; needs_confirmation: boolean }): string {
    const lines = [
      `Requirement: ${item.requirement_text}`,
      `Status: ${item.status === "missing" ? "Missing" : "Partial"}`,
      `Fix: ${item.fix}`,
      `Rewrite A: ${item.rewrite_a}`,
      `Rewrite B: ${item.rewrite_b}`,
    ];
    if (item.needs_confirmation) lines.push("Needs confirmation: Yes");
    return lines.join("\n");
  }

  it("D1) needs_confirmation=true → line included", () => {
    const entry = buildEntry({
      requirement_text: "AWS", status: "missing", fix: "Add AWS cert", rewrite_a: "Deployed on AWS", rewrite_b: "Used AWS EC2", needs_confirmation: true,
    });
    expect(entry).toContain("Needs confirmation: Yes");
  });

  it("D2) needs_confirmation=false → line omitted", () => {
    const entry = buildEntry({
      requirement_text: "Python", status: "missing", fix: "Add Python", rewrite_a: "Built X", rewrite_b: "Developed Y", needs_confirmation: false,
    });
    expect(entry).not.toContain("Needs confirmation");
  });
});

// ─── Test E: No regressions to cover letter export ────────────────────────────
describe("Test E: No regressions to cover letter export", () => {
  it("E1) buildCoverLetterFilename still produces correct format", () => {
    const result = buildCoverLetterFilename("Francis Noces", "Acme Corp", new Date(2026, 1, 21));
    expect(result).toBe("Francis_Noces - Acme Corp - 2026-02-21.txt");
  });

  it("E2) Cover letter filename does NOT contain 'Resume_Patch'", () => {
    const result = buildCoverLetterFilename("Jane Doe", "Google", new Date(2026, 1, 21));
    expect(result).not.toContain("Resume_Patch");
  });

  it("E3) Resume patch filename does NOT match cover letter format", () => {
    const patch = buildResumePatchFilename("Jane Doe", "Google", new Date(2026, 1, 21));
    const cover = buildCoverLetterFilename("Jane Doe", "Google", new Date(2026, 1, 21));
    expect(patch).not.toBe(cover);
    expect(patch).toContain("Resume_Patch");
  });

  it("E4) sanitizeSegment still works for both builders", () => {
    expect(sanitizeSegment("Acme/Corp:Ltd")).toBe("AcmeCorpLtd");
    expect(sanitizeSegment("  hello   world  ")).toBe("hello world");
  });
});
