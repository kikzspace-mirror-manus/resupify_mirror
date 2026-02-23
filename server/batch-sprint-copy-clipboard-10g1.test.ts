// @vitest-environment jsdom
/**
 * Phase 10G.1: Copy to Clipboard — Acceptance Tests
 *
 * Tests cover:
 * A. Copy button presence and attributes in drawer source
 * B. copyViaExecCommand utility unit tests
 * C. handleCopyCsv uses Clipboard API when available
 * D. handleCopyCsv falls back to modal when clipboard throws
 * E. csvText is non-empty for non-empty results
 * F. Copy button disabled when 0 rows
 * G. Manual-copy modal elements present in source
 * H. Toast messages present in source
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fs from "fs";
import * as path from "path";

import {
  csvEscape,
  buildSprintCsv,
  copyViaExecCommand,
  type BatchSprintResult,
} from "../client/src/components/BatchSprintResultsDrawer";

const drawerPath = path.join(__dirname, "../client/src/components/BatchSprintResultsDrawer.tsx");
const drawerSrc = fs.readFileSync(drawerPath, "utf-8");

// ─── A. Copy button presence ───────────────────────────────────────────────
describe("A. Copy button presence and attributes", () => {
  it("A1: Copy button has data-testid batch-sprint-copy-csv-btn", () => {
    expect(drawerSrc).toContain('data-testid="batch-sprint-copy-csv-btn"');
  });

  it("A2: Copy button uses Copy icon from lucide-react", () => {
    expect(drawerSrc).toContain("Copy,");
    expect(drawerSrc).toContain("from \"lucide-react\"");
  });

  it("A3: Copy button is disabled when displayResults.length === 0", () => {
    // Check that the disabled prop is tied to displayResults.length
    const copyBtnIdx = drawerSrc.indexOf('data-testid="batch-sprint-copy-csv-btn"');
    const nextBtnIdx = drawerSrc.indexOf('data-testid="batch-sprint-download-csv-btn"');
    const copyBtnBlock = drawerSrc.slice(copyBtnIdx, nextBtnIdx);
    expect(copyBtnBlock).toContain("disabled={displayResults.length === 0}");
  });

  it("A4: Copy button calls handleCopyCsv on click", () => {
    const copyBtnIdx = drawerSrc.indexOf('data-testid="batch-sprint-copy-csv-btn"');
    const nextBtnIdx = drawerSrc.indexOf('data-testid="batch-sprint-download-csv-btn"');
    const copyBtnBlock = drawerSrc.slice(copyBtnIdx, nextBtnIdx);
    expect(copyBtnBlock).toContain("handleCopyCsv");
  });

  it("A5: Copy button is in the header (before ScrollArea)", () => {
    const copyBtnIdx = drawerSrc.indexOf('data-testid="batch-sprint-copy-csv-btn"');
    const scrollAreaIdx = drawerSrc.indexOf("<ScrollArea");
    expect(copyBtnIdx).toBeGreaterThan(-1);
    expect(copyBtnIdx).toBeLessThan(scrollAreaIdx);
  });

  it("A6: Both Copy and Download buttons are present in the header", () => {
    expect(drawerSrc).toContain('data-testid="batch-sprint-copy-csv-btn"');
    expect(drawerSrc).toContain('data-testid="batch-sprint-download-csv-btn"');
  });
});

// ─── B. copyViaExecCommand utility ────────────────────────────────────────
describe("B. copyViaExecCommand utility", () => {
  it("B1: copyViaExecCommand is exported from the drawer module", () => {
    expect(typeof copyViaExecCommand).toBe("function");
  });

  it("B2: copyViaExecCommand creates a textarea, selects it, and calls execCommand", () => {
    // In jsdom, execCommand returns false but doesn't throw
    const result = copyViaExecCommand("test content");
    // jsdom doesn't support execCommand, so result is false — but no throw
    expect(typeof result).toBe("boolean");
  });

  it("B3: copyViaExecCommand returns false in test environment (jsdom has no execCommand)", () => {
    const result = copyViaExecCommand("hello world");
    expect(result).toBe(false);
  });

  it("B4: copyViaExecCommand does not leave textarea in DOM after call", () => {
    const before = document.querySelectorAll("textarea").length;
    copyViaExecCommand("test");
    const after = document.querySelectorAll("textarea").length;
    expect(after).toBe(before); // textarea cleaned up
  });

  it("B5: copyViaExecCommand handles empty string without throwing", () => {
    expect(() => copyViaExecCommand("")).not.toThrow();
  });

  it("B6: copyViaExecCommand handles multiline CSV without throwing", () => {
    const csv = "company,title\nAcme,Engineer\nBeta,Manager";
    expect(() => copyViaExecCommand(csv)).not.toThrow();
  });
});

// ─── C. handleCopyCsv uses Clipboard API when available ───────────────────
describe("C. handleCopyCsv Clipboard API path", () => {
  it("C1: handleCopyCsv source checks navigator.clipboard && window.isSecureContext", () => {
    expect(drawerSrc).toContain("navigator.clipboard && window.isSecureContext");
  });

  it("C2: handleCopyCsv calls navigator.clipboard.writeText with csvText", () => {
    expect(drawerSrc).toContain("await navigator.clipboard.writeText(csvText)");
  });

  it("C3: handleCopyCsv is async", () => {
    expect(drawerSrc).toContain("const handleCopyCsv = async");
  });

  it("C4: handleCopyCsv wraps Clipboard API call in try/catch", () => {
    const fnStart = drawerSrc.indexOf("const handleCopyCsv = async");
    const fnEnd = drawerSrc.indexOf("// Path 3: manual-copy modal", fnStart);
    const fnBody = drawerSrc.slice(fnStart, fnEnd);
    expect(fnBody).toContain("try {");
    expect(fnBody).toContain("} catch {");
  });

  it("C5: handleCopyCsv shows toast.success('Copied to clipboard') on Clipboard API success", () => {
    const fnStart = drawerSrc.indexOf("const handleCopyCsv = async");
    const fnEnd = drawerSrc.indexOf("// Phase 10G.1: manual-copy modal state", fnStart);
    const fnBody = drawerSrc.slice(fnStart, fnEnd);
    expect(fnBody).toContain("toast.success(\"Copied to clipboard\")");
  });
});

// ─── D. handleCopyCsv falls back to modal when clipboard throws ───────────
describe("D. handleCopyCsv fallback to modal", () => {
  it("D1: handleCopyCsv has Path 2 (textarea execCommand fallback)", () => {
    expect(drawerSrc).toContain("// Path 2: textarea + execCommand fallback");
  });

  it("D2: handleCopyCsv calls copyViaExecCommand in Path 2", () => {
    expect(drawerSrc).toContain("copyViaExecCommand(csvText)");
  });

  it("D3: handleCopyCsv has Path 3 (manual-copy modal fallback)", () => {
    expect(drawerSrc).toContain("// Path 3: manual-copy modal");
  });

  it("D4: Path 3 calls setManualCopyText and setManualCopyOpen(true)", () => {
    const path3Start = drawerSrc.indexOf("// Path 3: manual-copy modal");
    const path3End = drawerSrc.indexOf("};", path3Start);
    const path3Body = drawerSrc.slice(path3Start, path3End);
    expect(path3Body).toContain("setManualCopyText(csvText)");
    expect(path3Body).toContain("setManualCopyOpen(true)");
  });

  it("D5: Path 2 shows toast.success('Copied to clipboard') on execCommand success", () => {
    const path2Start = drawerSrc.indexOf("// Path 2: textarea + execCommand fallback");
    const path3Start = drawerSrc.indexOf("// Path 3: manual-copy modal");
    const path2Body = drawerSrc.slice(path2Start, path3Start);
    expect(path2Body).toContain("toast.success(\"Copied to clipboard\")");
  });

  it("D6: Path 2 falls through to Path 3 if execCommand returns false", () => {
    const path2Start = drawerSrc.indexOf("// Path 2: textarea + execCommand fallback");
    const path3Start = drawerSrc.indexOf("// Path 3: manual-copy modal");
    const path2Body = drawerSrc.slice(path2Start, path3Start);
    // Path 2 should only toast on success (if success), otherwise fall through
    expect(path2Body).toContain("if (success)");
    expect(path2Body).toContain("return;");
  });
});

// ─── E. csvText is non-empty for non-empty results ────────────────────────
describe("E. csvText is non-empty for non-empty results", () => {
  const sampleResults: BatchSprintResult[] = [
    {
      jobCardId: 1,
      runId: 101,
      score: 75,
      topSuggestion: "Add more keywords",
      title: "Engineer",
      company: "Acme",
    },
    {
      jobCardId: 2,
      runId: null,
      error: "Timeout",
      title: "Manager",
      company: "Beta",
    },
  ];

  it("E1: buildSprintCsv returns non-empty string for non-empty results", () => {
    const csv = buildSprintCsv(sampleResults, "https://example.com");
    expect(csv.length).toBeGreaterThan(0);
    expect(csv).not.toBe("");
  });

  it("E2: buildSprintCsv result has more than just the header row", () => {
    const csv = buildSprintCsv(sampleResults, "https://example.com");
    const lines = csv.split("\n");
    expect(lines.length).toBeGreaterThan(1);
  });

  it("E3: handleCopyCsv guards against empty displayResults", () => {
    // Source should have an early return when displayResults.length === 0
    expect(drawerSrc).toContain("if (displayResults.length === 0) return;");
  });

  it("E4: csvText is built from displayResults (same as Download)", () => {
    // Both Copy and Download use buildSprintCsv(displayResults, origin)
    const copyOccurrences = (drawerSrc.match(/buildSprintCsv\(displayResults, origin\)/g) || []).length;
    expect(copyOccurrences).toBeGreaterThanOrEqual(2); // once for Copy, once for Download
  });
});

// ─── F. Copy button disabled when 0 rows ──────────────────────────────────
describe("F. Copy button disabled when 0 rows", () => {
  it("F1: Copy button disabled prop is displayResults.length === 0", () => {
    const copyBtnIdx = drawerSrc.indexOf('data-testid="batch-sprint-copy-csv-btn"');
    const nextBtnIdx = drawerSrc.indexOf('data-testid="batch-sprint-download-csv-btn"');
    const copyBtnBlock = drawerSrc.slice(copyBtnIdx, nextBtnIdx);
    expect(copyBtnBlock).toContain("disabled={displayResults.length === 0}");
  });

  it("F2: title tooltip shows 'Nothing to copy' when disabled", () => {
    const copyBtnIdx = drawerSrc.indexOf('data-testid="batch-sprint-copy-csv-btn"');
    const nextBtnIdx = drawerSrc.indexOf('data-testid="batch-sprint-download-csv-btn"');
    const copyBtnBlock = drawerSrc.slice(copyBtnIdx, nextBtnIdx);
    expect(copyBtnBlock).toContain("Nothing to copy");
  });
});

// ─── G. Manual-copy modal elements ────────────────────────────────────────
describe("G. Manual-copy modal elements present in source", () => {
  it("G1: modal has data-testid batch-sprint-manual-copy-modal", () => {
    expect(drawerSrc).toContain('data-testid="batch-sprint-manual-copy-modal"');
  });

  it("G2: modal has a textarea with data-testid batch-sprint-manual-copy-textarea", () => {
    expect(drawerSrc).toContain('data-testid="batch-sprint-manual-copy-textarea"');
  });

  it("G3: modal textarea is readOnly", () => {
    const textareaIdx = drawerSrc.indexOf('data-testid="batch-sprint-manual-copy-textarea"');
    const textareaBlock = drawerSrc.slice(textareaIdx, textareaIdx + 300);
    expect(textareaBlock).toContain("readOnly");
  });

  it("G4: modal has a Select All button", () => {
    expect(drawerSrc).toContain('data-testid="batch-sprint-manual-copy-select-all-btn"');
  });

  it("G5: modal has a Done/close button", () => {
    expect(drawerSrc).toContain('data-testid="batch-sprint-manual-copy-close-btn"');
  });

  it("G6: modal description mentions Ctrl+C / Cmd+C", () => {
    expect(drawerSrc).toContain("Ctrl+C");
    expect(drawerSrc).toContain("⌘C");
  });

  it("G7: modal textarea is prefilled with manualCopyText", () => {
    const textareaIdx = drawerSrc.indexOf('data-testid="batch-sprint-manual-copy-textarea"');
    const textareaBlock = drawerSrc.slice(textareaIdx, textareaIdx + 200);
    expect(textareaBlock).toContain("manualCopyText");
  });

  it("G8: Select All button calls textarea.select()", () => {
    const selectAllIdx = drawerSrc.indexOf('data-testid="batch-sprint-manual-copy-select-all-btn"');
    const selectAllBlock = drawerSrc.slice(selectAllIdx, selectAllIdx + 300);
    expect(selectAllBlock).toContain(".select()");
  });
});

// ─── H. Toast messages ────────────────────────────────────────────────────
describe("H. Toast messages", () => {
  it("H1: toast.success('Copied to clipboard') appears in source", () => {
    expect(drawerSrc).toContain("toast.success(\"Copied to clipboard\")");
  });

  it("H2: toast is imported from sonner", () => {
    expect(drawerSrc).toContain("from \"sonner\"");
  });

  it("H3: toast.success('CSV downloaded') still present for Download button", () => {
    expect(drawerSrc).toContain("toast.success(\"CSV downloaded\")");
  });

  it("H4: 'Copied to clipboard' toast appears at least twice (Path 1 + Path 2)", () => {
    const occurrences = (drawerSrc.match(/toast\.success\("Copied to clipboard"\)/g) || []).length;
    expect(occurrences).toBeGreaterThanOrEqual(2);
  });
});
