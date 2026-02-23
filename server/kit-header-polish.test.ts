/**
 * Phase 9E3: Application Kit Header Polish — Acceptance Tests
 *
 * A) All controls still exist and work: resume selector, run selector, tone selector, download, regenerate.
 * B) Tone note still appears only when selected tone differs from stored kit tone, rendered as helper text (not banner).
 * C) No layout overflow on narrow widths (no clipped buttons) — structural check.
 * D) No behavior changes to exports or regeneration.
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";

const SOURCE = fs.readFileSync(
  "client/src/pages/JobCardDetail.tsx",
  "utf-8"
);

// ── A: All controls exist ────────────────────────────────────────────────────
describe("A: All controls exist in the Application Kit header", () => {
  it("A1: Resume selector is present", () => {
    expect(SOURCE).toContain("Choose resume...");
  });

  it("A2: Evidence Run selector is present", () => {
    expect(SOURCE).toContain("Choose run...");
  });

  it("A3: Tone pills are rendered via TONES.map", () => {
    expect(SOURCE).toContain("TONES.map((t) =>");
  });

  it("A4: Download Kit (.zip) button is present", () => {
    expect(SOURCE).toContain("Download Kit (.zip)");
  });

  it("A5: Regenerate Kit / Generate Kit button is present", () => {
    expect(SOURCE).toContain("Regenerate Kit");
    expect(SOURCE).toContain("Generate Kit");
  });
});

// ── B: Tone note is helper text, not a banner ────────────────────────────────
describe("B: Tone mismatch note is rendered as helper text", () => {
  it("B1: tone-mismatch-note data-testid is present", () => {
    expect(SOURCE).toContain('data-testid="tone-mismatch-note"');
  });

  it("B2: tone note does NOT use a full-width banner background (no bg-amber-50 border-amber-200 on the note)", () => {
    // The old banner had bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5
    // The new helper text should NOT have bg-amber-50
    const noteIdx = SOURCE.indexOf('data-testid="tone-mismatch-note"');
    expect(noteIdx).toBeGreaterThan(-1);
    // Get 200 chars before the testid to check the className
    const context = SOURCE.slice(noteIdx - 200, noteIdx + 50);
    expect(context).not.toContain("bg-amber-50");
    expect(context).not.toContain("border-amber-200");
  });

  it("B3: tone note uses amber-600 text color (helper text style)", () => {
    const noteIdx = SOURCE.indexOf('data-testid="tone-mismatch-note"');
    const context = SOURCE.slice(noteIdx - 200, noteIdx + 50);
    expect(context).toContain("text-amber-600");
  });

  it("B4: tone note is conditionally rendered only when tone !== existingKit.tone", () => {
    expect(SOURCE).toContain("existingKit && tone !== existingKit.tone");
  });
});

// ── C: Layout structure — 2-row grouping ────────────────────────────────────
describe("C: 2-row layout structure is correct", () => {
  it("C1: Row 1 comment exists in the header", () => {
    expect(SOURCE).toContain("Row 1: Selectors (left) + Actions (right)");
  });

  it("C2: Row 2 comment exists for tone pills", () => {
    expect(SOURCE).toContain("Row 2: Tone pills");
  });

  it("C3: Selectors use flex-1 min-w for responsive wrapping", () => {
    expect(SOURCE).toContain("min-w-[140px] flex-1");
    expect(SOURCE).toContain("min-w-[160px] flex-1");
  });

  it("C4: Actions cluster uses shrink-0 to prevent clipping", () => {
    expect(SOURCE).toContain("shrink-0");
  });

  it("C5: Metadata line is present below tone section", () => {
    expect(SOURCE).toContain("Metadata line");
    expect(SOURCE).toContain("Included free with Evidence Scan");
  });

  it("C6: Metadata uses muted/dimmed text class (not full opacity)", () => {
    expect(SOURCE).toContain("text-muted-foreground/70");
  });
});

// ── D: No behavioral changes to exports or regeneration ─────────────────────
describe("D: Behavioral contracts are unchanged", () => {
  it("D1: Download button still calls buildCoverLetterFilename", () => {
    expect(SOURCE).toContain("buildCoverLetterFilename(");
  });

  it("D2: Download button still calls buildResumePatchFilename", () => {
    expect(SOURCE).toContain("buildResumePatchFilename(");
  });

  it("D3: Download button still calls buildTopChangesFilename", () => {
    expect(SOURCE).toContain("buildTopChangesFilename(");
  });

  it("D4: Download button still calls buildApplicationKitZipFilename", () => {
    expect(SOURCE).toContain("buildApplicationKitZipFilename(");
  });

  it("D5: Regeneration guard dialog (Patch 8H) is still present", () => {
    expect(SOURCE).toContain("Patch 8H: regeneration guard dialog");
    expect(SOURCE).toContain("Replace existing kit?");
  });

  it("D6: generateKit.mutate is still called with tone parameter", () => {
    expect(SOURCE).toContain("generateKit.mutate({ jobCardId, resumeId: selectedResumeId!, evidenceRunId: selectedRunId!, tone })");
  });

  it("D7: Download button still uses variant=outline (secondary styling)", () => {
    // Find the Download button context
    const downloadIdx = SOURCE.indexOf("Download Kit (.zip)");
    expect(downloadIdx).toBeGreaterThan(-1);
    const context = SOURCE.slice(downloadIdx - 5200, downloadIdx);
    expect(context).toContain('variant="outline"');
  });

  it("D8: Regenerate button does NOT use variant=outline (should be primary/default)", () => {
    // The regen button should NOT have variant="outline" — it should be default (primary)
    const regenIdx = SOURCE.indexOf("Regenerate Kit");
    expect(regenIdx).toBeGreaterThan(-1);
    // Get context around the regen button (the Button tag before "Regenerate Kit")
    const context = SOURCE.slice(regenIdx - 600, regenIdx);
    // The last Button before "Regenerate Kit" should not have variant="outline"
    const lastButtonIdx = context.lastIndexOf("<Button");
    const buttonContext = context.slice(lastButtonIdx);
    expect(buttonContext).not.toContain('variant="outline"');
  });
});
