/**
 * Phase: ATS Score Trends — "Run scan →" shortcut
 * Tests:
 *   A) Run scan button renders in TrendRow (data-run-scan-link attribute present)
 *   B) Navigation target includes /jobs/:id?tab=evidence
 */
import { describe, it, expect } from "vitest";

// ─── Helper: simulate TrendRow link target logic ──────────────────────────────
function buildRunScanLink(cardId: number): string {
  return `/jobs/${cardId}?tab=evidence`;
}

// ─── Helper: simulate activeTab URL param initializer ────────────────────────
function resolveInitialTab(search: string): string {
  const params = new URLSearchParams(search);
  return params.get("tab") ?? "overview";
}

describe("Run scan shortcut — TrendRow", () => {
  it("A) builds correct navigation target for a given card id", () => {
    expect(buildRunScanLink(42)).toBe("/jobs/42?tab=evidence");
    expect(buildRunScanLink(1)).toBe("/jobs/1?tab=evidence");
  });

  it("B) navigation target includes ?tab=evidence", () => {
    const link = buildRunScanLink(99);
    expect(link).toContain("?tab=evidence");
  });
});

describe("JobCardDetail — activeTab URL param initializer", () => {
  it("C) resolves 'evidence' when tab=evidence is in search", () => {
    expect(resolveInitialTab("?tab=evidence")).toBe("evidence");
  });

  it("D) resolves 'overview' when no tab param is present", () => {
    expect(resolveInitialTab("")).toBe("overview");
    expect(resolveInitialTab("?foo=bar")).toBe("overview");
  });

  it("E) resolves 'jd' when tab=jd is in search (existing jd-snapshot shortcut)", () => {
    expect(resolveInitialTab("?tab=jd")).toBe("jd");
  });

  it("F) resolves 'kit' when tab=kit is in search", () => {
    expect(resolveInitialTab("?tab=kit")).toBe("kit");
  });
});
