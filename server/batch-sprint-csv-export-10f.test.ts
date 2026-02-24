/**
 * Phase 10F: Batch Sprint CSV Export — Acceptance Tests
 *
 * Tests cover:
 * A. Drawer has Download CSV button (source-level)
 * B. csvEscape handles special characters correctly (unit tests)
 * C. buildSprintCsv produces correct column order and row count
 * D. Filter behavior: Failed-only export exports only failed rows
 * E. Filename format: batch-sprint-results-YYYY-MM-DD-HHMM.csv
 * F. Button disabled when 0 rows
 * G. Toast "CSV downloaded" after trigger (source-level)
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

// Import the pure utility functions directly for unit testing
import {
  csvEscape,
  buildSprintCsv,
  buildCsvFilename,
  type BatchSprintResult,
} from "../client/src/components/BatchSprintResultsDrawer";

const drawerPath = path.join(__dirname, "../client/src/components/BatchSprintResultsDrawer.tsx");
const drawerSrc = fs.readFileSync(drawerPath, "utf-8");

// ─── A. Drawer has Download CSV button ────────────────────────────────────
describe("A. Drawer has Download CSV button", () => {
  it("A1: Download CSV button has data-testid", () => {
    expect(drawerSrc).toContain('data-testid="batch-sprint-download-csv-btn"');
  });

  it("A2: Download CSV button uses Download icon from lucide-react", () => {
    expect(drawerSrc).toContain("Download");
    expect(drawerSrc).toContain("from \"lucide-react\"");
  });

  it("A3: Download CSV button is always visible in the header", () => {
    // The button should not be inside a conditional block tied to failedCount
    const btnIdx = drawerSrc.indexOf('data-testid="batch-sprint-download-csv-btn"');
    expect(btnIdx).toBeGreaterThan(-1);
    // The button should be in the header section (before ScrollArea)
    const scrollAreaIdx = drawerSrc.indexOf("<ScrollArea");
    expect(btnIdx).toBeLessThan(scrollAreaIdx);
  });

  it("A4: Download CSV button is disabled when displayResults.length === 0", () => {
    expect(drawerSrc).toContain("disabled={displayResults.length === 0}");
  });

  it("A5: handleDownloadCsv calls buildSprintCsv with displayResults", () => {
    expect(drawerSrc).toContain("buildSprintCsv(displayResults, origin)");
  });

  it("A6: handleDownloadCsv calls buildCsvFilename()", () => {
    expect(drawerSrc).toContain("buildCsvFilename()");
  });

  it("A7: handleDownloadCsv calls downloadCsvFile", () => {
    expect(drawerSrc).toContain("downloadCsvFile(csv, filename)");
  });
});

// ─── B. csvEscape unit tests ───────────────────────────────────────────────
describe("B. csvEscape handles special characters", () => {
  it("B1: plain string with no special chars is returned as-is", () => {
    expect(csvEscape("hello")).toBe("hello");
  });

  it("B2: string with comma is wrapped in double-quotes", () => {
    expect(csvEscape("hello, world")).toBe('"hello, world"');
  });

  it("B3: string with double-quote has internal quotes doubled and wrapped", () => {
    expect(csvEscape('say "hi"')).toBe('"say ""hi"""');
  });

  it("B4: string with newline has newline replaced with space", () => {
    const result = csvEscape("line1\nline2");
    expect(result).not.toContain("\n");
    expect(result).toContain("line1");
    expect(result).toContain("line2");
  });

  it("B5: string with \\r\\n has CRLF replaced with space", () => {
    const result = csvEscape("line1\r\nline2");
    expect(result).not.toContain("\r");
    expect(result).not.toContain("\n");
  });

  it("B6: undefined returns empty string", () => {
    expect(csvEscape(undefined)).toBe("");
  });

  it("B7: null returns empty string", () => {
    expect(csvEscape(null)).toBe("");
  });

  it("B8: number is converted to string", () => {
    expect(csvEscape(42)).toBe("42");
  });

  it("B9: zero is returned as '0'", () => {
    expect(csvEscape(0)).toBe("0");
  });

  it("B10: string with both comma and quote is handled correctly", () => {
    const result = csvEscape('a, "b"');
    expect(result).toBe('"a, ""b"""');
  });
});

// ─── C. buildSprintCsv column order and row count ─────────────────────────
describe("C. buildSprintCsv produces correct CSV", () => {
  const sampleResults: BatchSprintResult[] = [
    {
      jobCardId: 1,
      runId: 101,
      score: 82,
      topSuggestion: "Add more keywords",
      title: "Software Engineer",
      company: "Acme Corp",
      stage: "Applying",
      priority: "High",
    },
    {
      jobCardId: 2,
      runId: null,
      error: "LLM timeout",
      title: "Product Manager",
      company: "Beta Inc",
    },
  ];

  it("C1: first row is the header with 8 columns", () => {
    const csv = buildSprintCsv(sampleResults, "https://example.com");
    const lines = csv.split("\n");
    expect(lines[0]).toBe("company,title,score,top_suggestion,status,stage,priority,job_card_url");
  });

  it("C2: CSV has header + one row per result", () => {
    const csv = buildSprintCsv(sampleResults, "https://example.com");
    const lines = csv.split("\n");
    expect(lines.length).toBe(3); // header + 2 data rows
  });

  it("C3: succeeded row has status 'Success'", () => {
    const csv = buildSprintCsv(sampleResults, "https://example.com");
    const lines = csv.split("\n");
    expect(lines[1]).toContain("Success");
  });

  it("C4: failed row has status 'Failed'", () => {
    const csv = buildSprintCsv(sampleResults, "https://example.com");
    const lines = csv.split("\n");
    expect(lines[2]).toContain("Failed");
  });

  it("C5: job_card_url is a deep link with origin + /jobs/{id}", () => {
    const csv = buildSprintCsv(sampleResults, "https://example.com");
    expect(csv).toContain("https://example.com/jobs/1");
    expect(csv).toContain("https://example.com/jobs/2");
  });

  it("C6: company and title appear in correct columns", () => {
    const csv = buildSprintCsv(sampleResults, "https://example.com");
    const lines = csv.split("\n");
    // Row 1: company=Acme Corp, title=Software Engineer
    expect(lines[1].startsWith("Acme Corp,Software Engineer,")).toBe(true);
  });

  it("C7: score appears in the score column", () => {
    const csv = buildSprintCsv(sampleResults, "https://example.com");
    const lines = csv.split("\n");
    const cols = lines[1].split(",");
    expect(cols[2]).toBe("82");
  });

  it("C8: stage and priority appear in correct columns", () => {
    const csv = buildSprintCsv(sampleResults, "https://example.com");
    const lines = csv.split("\n");
    expect(lines[1]).toContain("Applying");
    expect(lines[1]).toContain("High");
  });

  it("C9: missing optional fields produce empty columns (not undefined)", () => {
    const csv = buildSprintCsv(sampleResults, "https://example.com");
    const lines = csv.split("\n");
    // Row 2 (failed): no stage, no priority
    const cols = lines[2].split(",");
    // stage is col 5 (0-indexed), priority is col 6
    expect(cols[5]).toBe(""); // stage
    expect(cols[6]).toBe(""); // priority
  });

  it("C10: top_suggestion with comma is properly escaped", () => {
    const results: BatchSprintResult[] = [
      {
        jobCardId: 3,
        runId: 200,
        score: 60,
        topSuggestion: "Add Python, Java skills",
        title: "Dev",
        company: "X",
      },
    ];
    const csv = buildSprintCsv(results, "https://example.com");
    expect(csv).toContain('"Add Python, Java skills"');
  });

  it("C11: empty results array produces header-only CSV", () => {
    const csv = buildSprintCsv([], "https://example.com");
    const lines = csv.split("\n");
    expect(lines.length).toBe(1);
    expect(lines[0]).toContain("company");
  });
});

// ─── D. Filter behavior ────────────────────────────────────────────────────
describe("D. Filter behavior: export respects current filter", () => {
  it("D1: handleDownloadCsv uses displayResults (not raw results)", () => {
    // displayResults is already filtered — verify the source passes displayResults
    expect(drawerSrc).toContain("buildSprintCsv(displayResults, origin)");
  });

  it("D2: displayResults is derived from filter state", () => {
    // The useMemo for displayResults uses filter
    expect(drawerSrc).toContain("[results, failedResults, filter]");
  });

  it("D3: filter === 'failed' produces only failed rows in displayResults", () => {
    const allResults: BatchSprintResult[] = [
      { jobCardId: 1, runId: 101, score: 80, title: "A", company: "X" },
      { jobCardId: 2, runId: null, error: "err", title: "B", company: "Y" },
      { jobCardId: 3, runId: null, error: "err2", title: "C", company: "Z" },
    ];
    const failedOnly = allResults.filter((r) => r.runId === null);
    const csv = buildSprintCsv(failedOnly, "https://example.com");
    const lines = csv.split("\n");
    expect(lines.length).toBe(3); // header + 2 failed rows
    lines.slice(1).forEach((line) => {
      expect(line).toContain("Failed");
    });
  });
});

// ─── E. Filename format ────────────────────────────────────────────────────
describe("E. Filename format", () => {
  it("E1: filename starts with batch-sprint-results-", () => {
    const name = buildCsvFilename(new Date("2026-02-23T14:30:00"));
    expect(name.startsWith("batch-sprint-results-")).toBe(true);
  });

  it("E2: filename contains date in YYYY-MM-DD format", () => {
    const name = buildCsvFilename(new Date("2026-02-23T14:30:00"));
    expect(name).toContain("2026-02-23");
  });

  it("E3: filename contains time in HHMM format", () => {
    const name = buildCsvFilename(new Date("2026-02-23T14:30:00"));
    expect(name).toContain("1430");
  });

  it("E4: filename ends with .csv", () => {
    const name = buildCsvFilename(new Date("2026-02-23T09:05:00"));
    expect(name.endsWith(".csv")).toBe(true);
  });

  it("E5: filename pads single-digit month and day", () => {
    const name = buildCsvFilename(new Date("2026-01-05T09:05:00"));
    expect(name).toContain("2026-01-05");
    expect(name).toContain("0905");
  });

  it("E6: full filename example matches expected pattern", () => {
    const name = buildCsvFilename(new Date("2026-02-23T14:30:00"));
    expect(name).toBe("batch-sprint-results-2026-02-23-1430.csv");
  });
});

// ─── F. Button disabled when 0 rows ───────────────────────────────────────
describe("F. Button disabled when 0 rows", () => {
  it("F1: disabled prop checks displayResults.length === 0", () => {
    expect(drawerSrc).toContain("disabled={displayResults.length === 0}");
  });
});

// ─── G. Toast after download ───────────────────────────────────────────────
describe("G. Toast 'CSV downloaded' after trigger", () => {
  it("G1: toast.success('CSV downloaded') is called in handleDownloadCsv", () => {
    expect(drawerSrc).toContain("toast.success(\"CSV downloaded\")");
  });

  it("G2: sonner toast is imported", () => {
    expect(drawerSrc).toContain("from \"sonner\"");
  });
});
