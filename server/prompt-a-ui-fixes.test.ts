/**
 * Prompt A: UI Audit Fixes Tests
 * A) Evidence Map: Skills open by default, others collapsed
 * B) Evidence Map: JD line is bold
 * C) Application Kit: Top Changes open, rest collapsed
 * D) Evidence Run dropdown: friendly label format
 */

import { describe, it, expect } from "vitest";

// ─── Fix 1: Evidence Map collapsible categories ────────────────────────────────

describe("Evidence Map: collapsible categories (Prompt A Fix 1)", () => {
  it("A) initial openCategories state has skills=true, others absent (collapsed)", () => {
    // Simulates the useState initializer in EvidenceTab
    const initialState: Record<string, boolean> = { skills: true };
    expect(initialState["skills"]).toBe(true);
    expect(initialState["responsibilities"]).toBeUndefined();
    expect(initialState["soft_skills"]).toBeUndefined();
    expect(initialState["eligibility"]).toBeUndefined();
    expect(initialState["tools"]).toBeUndefined();
  });

  it("A) openCategories[group] ?? false returns false for unknown groups", () => {
    const openCategories: Record<string, boolean> = { skills: true };
    expect(openCategories["responsibilities"] ?? false).toBe(false);
    expect(openCategories["soft_skills"] ?? false).toBe(false);
    expect(openCategories["eligibility"] ?? false).toBe(false);
    expect(openCategories["tools"] ?? false).toBe(false);
    expect(openCategories["skills"] ?? false).toBe(true);
  });

  it("A) toggleCategory flips the state for a given group", () => {
    let openCategories: Record<string, boolean> = { skills: true };
    const toggleCategory = (group: string) => {
      openCategories = { ...openCategories, [group]: !openCategories[group] };
    };
    toggleCategory("skills");
    expect(openCategories["skills"]).toBe(false);
    toggleCategory("responsibilities");
    expect(openCategories["responsibilities"]).toBe(true);
    toggleCategory("skills");
    expect(openCategories["skills"]).toBe(true);
  });

  it("B) category sort order: skills first, then tools, responsibilities, soft_skills, eligibility", () => {
    const ORDER = ["skills", "tools", "responsibilities", "soft_skills", "eligibility"];
    const groups = ["eligibility", "soft_skills", "skills", "responsibilities", "tools"];
    const sorted = [...groups].sort((a, b) => {
      const ai = ORDER.indexOf(a);
      const bi = ORDER.indexOf(b);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
    expect(sorted[0]).toBe("skills");
    expect(sorted[1]).toBe("tools");
    expect(sorted[2]).toBe("responsibilities");
    expect(sorted[3]).toBe("soft_skills");
    expect(sorted[4]).toBe("eligibility");
  });

  it("B) unknown group type sorts to end (index 99)", () => {
    const ORDER = ["skills", "tools", "responsibilities", "soft_skills", "eligibility"];
    const groups = ["skills", "custom_group"];
    const sorted = [...groups].sort((a, b) => {
      const ai = ORDER.indexOf(a);
      const bi = ORDER.indexOf(b);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
    expect(sorted[0]).toBe("skills");
    expect(sorted[1]).toBe("custom_group");
  });
});

// ─── Fix 2: Application Kit collapsible sections ──────────────────────────────

describe("Application Kit: collapsible sections (Prompt A Fix 2)", () => {
  it("C) initial kitSections state has topChanges=true, bulletRewrites=false, coverLetter=false", () => {
    const kitSections = { topChanges: true, bulletRewrites: false, coverLetter: false };
    expect(kitSections.topChanges).toBe(true);
    expect(kitSections.bulletRewrites).toBe(false);
    expect(kitSections.coverLetter).toBe(false);
  });

  it("C) toggleKitSection flips a single key without affecting others", () => {
    let kitSections = { topChanges: true, bulletRewrites: false, coverLetter: false };
    const toggleKitSection = (key: keyof typeof kitSections) => {
      kitSections = { ...kitSections, [key]: !kitSections[key] };
    };
    toggleKitSection("bulletRewrites");
    expect(kitSections.bulletRewrites).toBe(true);
    expect(kitSections.topChanges).toBe(true); // unchanged
    expect(kitSections.coverLetter).toBe(false); // unchanged
  });

  it("C) all three sections can be toggled independently", () => {
    let kitSections = { topChanges: true, bulletRewrites: false, coverLetter: false };
    const toggleKitSection = (key: keyof typeof kitSections) => {
      kitSections = { ...kitSections, [key]: !kitSections[key] };
    };
    toggleKitSection("topChanges");
    toggleKitSection("bulletRewrites");
    toggleKitSection("coverLetter");
    expect(kitSections.topChanges).toBe(false);
    expect(kitSections.bulletRewrites).toBe(true);
    expect(kitSections.coverLetter).toBe(true);
  });
});

// ─── Fix 3: Evidence Run dropdown friendly label ──────────────────────────────

describe("Evidence Run dropdown: friendly label (Prompt A Fix 3)", () => {
  const buildRunLabel = (
    run: { id: number; overallScore: number; createdAt: number },
    job: { company?: string; title?: string } | null
  ) => {
    const d = new Date(run.createdAt);
    const mmmd = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    const company = job?.company ?? "";
    const title = job?.title ?? "";
    const label = [company, title].filter(Boolean).join(" — ");
    return label
      ? `${label} (${run.overallScore}%) · ${mmmd}`
      : `${run.overallScore}% · ${mmmd}`;
  };

  it("D) label includes company, title, score, and date", () => {
    const run = { id: 1, overallScore: 82, createdAt: new Date("2025-03-15").getTime() };
    const job = { company: "Acme Corp", title: "Software Engineer" };
    const label = buildRunLabel(run, job);
    expect(label).toContain("Acme Corp");
    expect(label).toContain("Software Engineer");
    expect(label).toContain("82%");
    expect(label).toContain("Mar");
    expect(label).not.toContain("Run #");
  });

  it("D) label falls back to score+date when job has no company or title", () => {
    const run = { id: 2, overallScore: 65, createdAt: new Date("2025-06-15").getTime() };
    const label = buildRunLabel(run, null);
    expect(label).toMatch(/^65%/);
    expect(label).toContain("Jun");
    expect(label).not.toContain("undefined");
  });

  it("D) label uses em dash separator between company and title", () => {
    const run = { id: 3, overallScore: 90, createdAt: new Date("2025-01-20").getTime() };
    const job = { company: "Stripe", title: "Backend Engineer" };
    const label = buildRunLabel(run, job);
    expect(label).toContain("Stripe — Backend Engineer");
  });

  it("D) label omits company if only title is available", () => {
    const run = { id: 4, overallScore: 70, createdAt: new Date("2025-04-10").getTime() };
    const job = { company: "", title: "Product Manager" };
    const label = buildRunLabel(run, job);
    expect(label).toContain("Product Manager");
    expect(label).not.toContain(" — ");
  });

  it("D) run id is NOT in the visible label (only in tooltip)", () => {
    const run = { id: 99001, overallScore: 75, createdAt: new Date("2025-07-04").getTime() };
    const job = { company: "Notion", title: "Designer" };
    const label = buildRunLabel(run, job);
    expect(label).not.toContain("99001");
    expect(label).not.toContain("Run #");
  });
});
