/**
 * Patch 8A — Score Trend: Resume Selector Dropdown
 *
 * Tests for the resume-selector logic that drives ScoreTrendCard.
 * These are pure unit tests for the derivation logic (no React rendering needed).
 *
 * Logic under test (extracted from ScoreTrendCard):
 *   - Build selectable resume list from resumes prop + run resumeIds
 *   - showDropdown = selectableResumes.length > 1
 *   - defaultId = selectableResumes[0]?.id
 *   - Empty state message differs when showDropdown is true
 */
import { describe, it, expect } from "vitest";

// ─── Pure logic helpers (mirrors ScoreTrendCard internals) ────────────────────

type Resume = { id: number; title: string };
type Run = { resumeId: number; status: string };

function buildSelectableResumes(resumes: Resume[], evidenceRuns: Run[]) {
  const runResumeIds = Array.from(new Set(evidenceRuns.map((r) => r.resumeId)));
  const resumeMap = new Map(resumes.map((r) => [r.id, r.title]));
  const allIds = Array.from(new Set([...resumes.map((r) => r.id), ...runResumeIds]));
  return allIds.map((id) => ({
    id,
    title: resumeMap.get(id) ?? `Resume ${id}`,
  }));
}

function getDefaultId(selectableResumes: { id: number }[]) {
  return selectableResumes[0]?.id;
}

function shouldShowDropdown(selectableResumes: { id: number }[]) {
  return selectableResumes.length > 1;
}

function getEmptyStateMessage(showDropdown: boolean) {
  return showDropdown
    ? "No runs yet for this resume. Run Evidence+ATS to start a trend."
    : "Run Evidence+ATS to see your score trend.";
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Patch 8A: Score Trend Resume Selector", () => {
  // ─── Test A: One resume → dropdown hidden ──────────────────────────────────
  it("A) One resume with runs: dropdown hidden (showDropdown = false)", () => {
    const resumes: Resume[] = [{ id: 1, title: "Software Dev Resume" }];
    const runs: Run[] = [
      { resumeId: 1, status: "completed" },
      { resumeId: 1, status: "completed" },
    ];
    const selectable = buildSelectableResumes(resumes, runs);
    expect(selectable).toHaveLength(1);
    expect(shouldShowDropdown(selectable)).toBe(false);
  });

  // ─── Test A2: One resume, no runs → dropdown still hidden ─────────────────
  it("A2) One resume, no runs: dropdown hidden", () => {
    const resumes: Resume[] = [{ id: 1, title: "Software Dev Resume" }];
    const runs: Run[] = [];
    const selectable = buildSelectableResumes(resumes, runs);
    expect(selectable).toHaveLength(1);
    expect(shouldShowDropdown(selectable)).toBe(false);
  });

  // ─── Test B: Multiple resumes → dropdown shown ────────────────────────────
  it("B) Multiple resumes: dropdown shown (showDropdown = true)", () => {
    const resumes: Resume[] = [
      { id: 1, title: "Software Dev Resume" },
      { id: 2, title: "Data Analyst Resume" },
    ];
    const runs: Run[] = [
      { resumeId: 1, status: "completed" },
      { resumeId: 2, status: "completed" },
    ];
    const selectable = buildSelectableResumes(resumes, runs);
    expect(selectable).toHaveLength(2);
    expect(shouldShowDropdown(selectable)).toBe(true);
  });

  // ─── Test B2: Orphaned run resume ID included in selectable list ──────────
  it("B2) Run with resumeId not in resumes prop is included with fallback title", () => {
    const resumes: Resume[] = [{ id: 1, title: "Software Dev Resume" }];
    const runs: Run[] = [
      { resumeId: 1, status: "completed" },
      { resumeId: 99, status: "completed" }, // orphaned
    ];
    const selectable = buildSelectableResumes(resumes, runs);
    expect(selectable).toHaveLength(2);
    const orphaned = selectable.find((r) => r.id === 99);
    expect(orphaned?.title).toBe("Resume 99");
    expect(shouldShowDropdown(selectable)).toBe(true);
  });

  // ─── Test C: Resume with no runs → empty state message ───────────────────
  it("C) Resume with no runs shows correct empty state message", () => {
    // showDropdown = true (multiple resumes), but selected resume has 0 runs
    const msg = getEmptyStateMessage(true);
    expect(msg).toBe("No runs yet for this resume. Run Evidence+ATS to start a trend.");
  });

  it("C2) Single resume with no runs shows generic empty state message", () => {
    const msg = getEmptyStateMessage(false);
    expect(msg).toBe("Run Evidence+ATS to see your score trend.");
  });

  // ─── Test D: Default selection is primary resume (first in list) ──────────
  it("D) Default selection is first resume in selectable list (primary)", () => {
    const resumes: Resume[] = [
      { id: 5, title: "Primary Resume" },
      { id: 6, title: "Secondary Resume" },
    ];
    const runs: Run[] = [];
    const selectable = buildSelectableResumes(resumes, runs);
    expect(getDefaultId(selectable)).toBe(5);
  });

  // ─── Test D2: No resumes in prop but runs exist → first run's resumeId ────
  it("D2) No resumes prop but runs exist: first run resumeId is default", () => {
    const resumes: Resume[] = [];
    const runs: Run[] = [
      { resumeId: 10, status: "completed" },
      { resumeId: 11, status: "completed" },
    ];
    const selectable = buildSelectableResumes(resumes, runs);
    expect(selectable[0].id).toBe(10);
    expect(getDefaultId(selectable)).toBe(10);
  });

  // ─── Test E: Deduplication — same resumeId in multiple runs ──────────────
  it("E) Same resumeId appearing in multiple runs is deduplicated", () => {
    const resumes: Resume[] = [{ id: 1, title: "Main Resume" }];
    const runs: Run[] = [
      { resumeId: 1, status: "completed" },
      { resumeId: 1, status: "completed" },
      { resumeId: 1, status: "completed" },
    ];
    const selectable = buildSelectableResumes(resumes, runs);
    expect(selectable).toHaveLength(1);
    expect(shouldShowDropdown(selectable)).toBe(false);
  });

  // ─── Test F: Resume names are correctly mapped ────────────────────────────
  it("F) Resume titles are correctly mapped from resumes prop", () => {
    const resumes: Resume[] = [
      { id: 1, title: "Backend Engineer" },
      { id: 2, title: "Full Stack Dev" },
    ];
    const runs: Run[] = [
      { resumeId: 1, status: "completed" },
      { resumeId: 2, status: "completed" },
    ];
    const selectable = buildSelectableResumes(resumes, runs);
    expect(selectable.find((r) => r.id === 1)?.title).toBe("Backend Engineer");
    expect(selectable.find((r) => r.id === 2)?.title).toBe("Full Stack Dev");
  });

  // ─── Test G: Empty resumes and empty runs → no selectable resumes ─────────
  it("G) Empty resumes and empty runs: no selectable resumes, no dropdown", () => {
    const selectable = buildSelectableResumes([], []);
    expect(selectable).toHaveLength(0);
    expect(shouldShowDropdown(selectable)).toBe(false);
    expect(getDefaultId(selectable)).toBeUndefined();
  });
});
