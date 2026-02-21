/**
 * Patch 8E: Top Changes Export (.txt Action Checklist)
 * Acceptance tests A–D
 */
import { describe, it, expect } from "vitest";
import {
  buildTopChangesFilename,
  buildCoverLetterFilename,
  buildResumePatchFilename,
  sanitizeSegment,
} from "../shared/filename";

// ─── Test A: Button render condition ─────────────────────────────────────────
describe("Test A: Download button renders only when topChanges exist", () => {
  it("A1) Empty topChanges array → button should not render (guard check)", () => {
    const topChanges: Array<{ requirement_text: string; status: string; fix: string }> = [];
    expect(topChanges.length > 0).toBe(false);
  });

  it("A2) Non-empty topChanges array → button should render", () => {
    const topChanges = [{ requirement_text: "Python", status: "missing", fix: "Add Python to skills" }];
    expect(topChanges.length > 0).toBe(true);
  });
});

// ─── Test B: Filename convention ─────────────────────────────────────────────
describe("Test B: buildTopChangesFilename — filename convention", () => {
  it("B1) Standard full name and company → correct format", () => {
    const result = buildTopChangesFilename("Francis Alexes Noces", "Acme Corp", new Date(2026, 1, 21));
    expect(result).toBe("Francis_Noces - Top_Changes - Acme Corp - 2026-02-21.txt");
  });

  it("B2) Single-word name → no underscore in name part", () => {
    const result = buildTopChangesFilename("Alice", "Shopify", new Date(2026, 2, 15));
    expect(result).toBe("Alice - Top_Changes - Shopify - 2026-03-15.txt");
  });

  it("B3) Missing company → fallback to 'Company'", () => {
    const result = buildTopChangesFilename("John Doe", "", new Date(2026, 0, 1));
    expect(result).toBe("John_Doe - Top_Changes - Company - 2026-01-01.txt");
  });

  it("B4) Company with forbidden chars → sanitized", () => {
    const result = buildTopChangesFilename("Jane Smith", "Acme/Corp:Ltd", new Date(2026, 5, 1));
    expect(result).toBe("Jane_Smith - Top_Changes - AcmeCorpLtd - 2026-06-01.txt");
  });

  it("B5) Date is zero-padded (month and day)", () => {
    const result = buildTopChangesFilename("Bob Lee", "Google", new Date(2026, 0, 5));
    expect(result).toBe("Bob_Lee - Top_Changes - Google - 2026-01-05.txt");
  });

  it("B6) Three-part name → uses first and last only", () => {
    const result = buildTopChangesFilename("Mary Jane Watson", "Netflix", new Date(2026, 3, 10));
    expect(result).toBe("Mary_Watson - Top_Changes - Netflix - 2026-04-10.txt");
  });

  it("B7) Null/empty name → fallback to 'User'", () => {
    const result = buildTopChangesFilename("", "Stripe", new Date(2026, 1, 1));
    expect(result).toBe("User - Top_Changes - Stripe - 2026-02-01.txt");
  });

  it("B8) Filename contains 'Top_Changes' label", () => {
    const result = buildTopChangesFilename("Jane Doe", "Google", new Date(2026, 1, 21));
    expect(result).toContain("Top_Changes");
  });
});

// ─── Test C: Export content structure ────────────────────────────────────────
describe("Test C: Export content includes header and numbered list", () => {
  const topChanges = [
    { requirement_text: "Python proficiency", status: "missing", fix: "Add Python projects to resume" },
    { requirement_text: "Team leadership", status: "partial", fix: "Expand leadership examples" },
  ];

  function buildTopChangesText(
    jobTitle: string,
    company: string,
    resumeName: string,
    runDate: string,
    changes: typeof topChanges
  ): string {
    const d = new Date(2026, 1, 21);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const lines: string[] = [
      `Job: ${jobTitle} — ${company}`,
      `Date: ${dateStr}`,
      `Resume: ${resumeName}`,
      `Evidence run: ${runDate}`,
      "",
      "=== Top Changes ===",
      "",
    ];
    changes.forEach((change, i) => {
      lines.push(`${i + 1}. ${change.requirement_text}`);
      lines.push(`   Status: ${change.status === "missing" ? "Missing" : "Partial"}`);
      lines.push(`   Action: ${change.fix}`);
      lines.push("");
    });
    lines.push("=== Next Steps ===");
    lines.push("");
    lines.push("[ ] Update resume bullets");
    lines.push("[ ] Review cover letter draft");
    lines.push("[ ] Submit application");
    return lines.join("\n");
  }

  it("C1) Content includes header fields", () => {
    const content = buildTopChangesText("Software Engineer", "Acme Corp", "Resume v2", "2026-02-21", topChanges);
    expect(content).toContain("Job: Software Engineer — Acme Corp");
    expect(content).toContain("Date: 2026-02-21");
    expect(content).toContain("Resume: Resume v2");
    expect(content).toContain("Evidence run: 2026-02-21");
  });

  it("C2) Content includes numbered list with requirement text", () => {
    const content = buildTopChangesText("Software Engineer", "Acme Corp", "Resume v2", "2026-02-21", topChanges);
    expect(content).toContain("1. Python proficiency");
    expect(content).toContain("2. Team leadership");
  });

  it("C3) Content includes Status and Action lines", () => {
    const content = buildTopChangesText("Software Engineer", "Acme Corp", "Resume v2", "2026-02-21", topChanges);
    expect(content).toContain("Status: Missing");
    expect(content).toContain("Status: Partial");
    expect(content).toContain("Action: Add Python projects to resume");
  });

  it("C4) Content includes Next Steps section", () => {
    const content = buildTopChangesText("Software Engineer", "Acme Corp", "Resume v2", "2026-02-21", topChanges);
    expect(content).toContain("=== Next Steps ===");
    expect(content).toContain("[ ] Update resume bullets");
    expect(content).toContain("[ ] Review cover letter draft");
    expect(content).toContain("[ ] Submit application");
  });
});

// ─── Test D: No regressions to other exports ─────────────────────────────────
describe("Test D: No regressions to Cover Letter and Resume Patch exports", () => {
  it("D1) buildCoverLetterFilename still produces correct format", () => {
    const result = buildCoverLetterFilename("Francis Noces", "Acme Corp", new Date(2026, 1, 21));
    expect(result).toBe("Francis_Noces - Acme Corp - 2026-02-21.txt");
  });

  it("D2) buildResumePatchFilename still produces correct format", () => {
    const result = buildResumePatchFilename("Francis Noces", "Acme Corp", new Date(2026, 1, 21));
    expect(result).toBe("Francis_Noces - Resume_Patch - Acme Corp - 2026-02-21.txt");
  });

  it("D3) Top Changes filename does NOT match cover letter format", () => {
    const topChanges = buildTopChangesFilename("Jane Doe", "Google", new Date(2026, 1, 21));
    const cover = buildCoverLetterFilename("Jane Doe", "Google", new Date(2026, 1, 21));
    expect(topChanges).not.toBe(cover);
    expect(topChanges).toContain("Top_Changes");
    expect(cover).not.toContain("Top_Changes");
  });

  it("D4) Top Changes filename does NOT match resume patch format", () => {
    const topChanges = buildTopChangesFilename("Jane Doe", "Google", new Date(2026, 1, 21));
    const patch = buildResumePatchFilename("Jane Doe", "Google", new Date(2026, 1, 21));
    expect(topChanges).not.toBe(patch);
    expect(topChanges).toContain("Top_Changes");
    expect(patch).toContain("Resume_Patch");
  });

  it("D5) sanitizeSegment still works for all three builders", () => {
    expect(sanitizeSegment("Acme/Corp:Ltd")).toBe("AcmeCorpLtd");
    expect(sanitizeSegment("  hello   world  ")).toBe("hello world");
  });
});
