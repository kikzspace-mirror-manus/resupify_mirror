/**
 * Phase 12G: Ops page freshness label + manual Refresh button
 *
 * Acceptance tests (static source analysis):
 * G1: AdminOps.tsx imports useState and useEffect from react
 * G2: lastRefreshedAt state is declared
 * G3: dataUpdatedAt is destructured from the useQuery result
 * G4: useEffect watches dataUpdatedAt and calls setLastRefreshedAt
 * G5: formatFreshness function is defined with "just now", "s ago", "m ago" branches
 * G6: freshness label element with data-testid="freshness-label" is rendered
 * G7: Refresh button with data-testid="refresh-button" is rendered
 * G8: Refresh button calls refetch on click
 * G9: Refresh button is disabled while isFetching
 * G10: RefreshCw icon has animate-spin class when isFetching
 * G11: 30s refetchInterval is still present (auto-refresh unchanged)
 * G12: no-data-message data-testid is present for the null state
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");
const ADMIN_OPS_FILE = path.join(ROOT, "client/src/pages/admin/AdminOps.tsx");
const src = fs.readFileSync(ADMIN_OPS_FILE, "utf-8");

// ─── G1: React hooks imported ────────────────────────────────────────────────
describe("G1: useState and useEffect are imported from react", () => {
  it("G1: imports useState from react", () => {
    expect(src).toContain("useState");
    const importLine = src.split("\n").find(l => l.includes("from \"react\"") || l.includes("from 'react'"));
    expect(importLine).toBeTruthy();
    expect(importLine).toContain("useState");
  });

  it("G1b: imports useEffect from react", () => {
    const importLine = src.split("\n").find(l => l.includes("from \"react\"") || l.includes("from 'react'"));
    expect(importLine).toContain("useEffect");
  });
});

// ─── G2: lastRefreshedAt state ────────────────────────────────────────────────
describe("G2: lastRefreshedAt state is declared", () => {
  it("G2: useState with lastRefreshedAt is present", () => {
    expect(src).toContain("lastRefreshedAt");
    expect(src).toContain("setLastRefreshedAt");
  });
});

// ─── G3: dataUpdatedAt destructured ──────────────────────────────────────────
describe("G3: dataUpdatedAt is destructured from useQuery", () => {
  it("G3: dataUpdatedAt appears in the useQuery destructuring", () => {
    expect(src).toContain("dataUpdatedAt");
    // Should be in the same block as the useQuery call
    const queryIdx = src.indexOf("useQuery(undefined");
    expect(queryIdx).toBeGreaterThan(-1);
    const queryBlock = src.slice(Math.max(0, queryIdx - 200), queryIdx + 50);
    expect(queryBlock).toContain("dataUpdatedAt");
  });
});

// ─── G4: useEffect watches dataUpdatedAt ─────────────────────────────────────
describe("G4: useEffect watches dataUpdatedAt and updates lastRefreshedAt", () => {
  it("G4: useEffect has dataUpdatedAt in dependency array", () => {
    expect(src).toContain("[dataUpdatedAt]");
  });

  it("G4b: useEffect calls setLastRefreshedAt inside", () => {
    const effectIdx = src.indexOf("[dataUpdatedAt]");
    expect(effectIdx).toBeGreaterThan(-1);
    const effectBlock = src.slice(Math.max(0, effectIdx - 300), effectIdx + 10);
    expect(effectBlock).toContain("setLastRefreshedAt");
  });
});

// ─── G5: formatFreshness function ────────────────────────────────────────────
describe("G5: formatFreshness function covers all three branches", () => {
  it("G5: formatFreshness is defined", () => {
    expect(src).toContain("formatFreshness");
  });

  it("G5b: has 'just now' branch (< 5s)", () => {
    const fnIdx = src.indexOf("function formatFreshness");
    expect(fnIdx).toBeGreaterThan(-1);
    const fnBody = src.slice(fnIdx, fnIdx + 400);
    expect(fnBody).toContain("just now");
  });

  it("G5c: has seconds branch (s ago)", () => {
    const fnIdx = src.indexOf("function formatFreshness");
    const fnBody = src.slice(fnIdx, fnIdx + 400);
    expect(fnBody).toContain("s ago");
  });

  it("G5d: has minutes branch (m ago)", () => {
    const fnIdx = src.indexOf("function formatFreshness");
    const fnBody = src.slice(fnIdx, fnIdx + 400);
    expect(fnBody).toContain("m ago");
  });
});

// ─── G6: freshness label element ─────────────────────────────────────────────
describe("G6: freshness label with data-testid is rendered", () => {
  it("G6: data-testid=freshness-label is present in JSX", () => {
    expect(src).toContain('data-testid="freshness-label"');
  });

  it("G6b: freshness label calls formatFreshness", () => {
    const labelIdx = src.indexOf('data-testid="freshness-label"');
    const labelBlock = src.slice(labelIdx, labelIdx + 150);
    expect(labelBlock).toContain("formatFreshness");
  });
});

// ─── G7: Refresh button ───────────────────────────────────────────────────────
describe("G7: Refresh button with data-testid is rendered", () => {
  it("G7: data-testid=refresh-button is present in JSX", () => {
    expect(src).toContain('data-testid="refresh-button"');
  });
});

// ─── G8: Refresh button calls refetch ────────────────────────────────────────
describe("G8: Refresh button calls refetch on click", () => {
  it("G8: handleRefresh function calls refetch", () => {
    // The button uses onClick={handleRefresh}; handleRefresh calls refetch()
    expect(src).toContain("handleRefresh");
    const fnIdx = src.indexOf("function handleRefresh");
    expect(fnIdx).toBeGreaterThan(-1);
    const fnBody = src.slice(fnIdx, fnIdx + 100);
    expect(fnBody).toContain("refetch");
  });

  it("G8b: Refresh button onClick references handleRefresh", () => {
    const btnIdx = src.indexOf('data-testid="refresh-button"');
    expect(btnIdx).toBeGreaterThan(-1);
    const btnBlock = src.slice(Math.max(0, btnIdx - 400), btnIdx + 50);
    expect(btnBlock).toContain("handleRefresh");
  });
});

// ─── G9: Refresh button disabled while fetching ───────────────────────────────
describe("G9: Refresh button is disabled while isFetching", () => {
  it("G9: button has disabled={isFetching}", () => {
    const btnIdx = src.indexOf('data-testid="refresh-button"');
    const btnBlock = src.slice(Math.max(0, btnIdx - 300), btnIdx + 100);
    expect(btnBlock).toContain("isFetching");
    expect(btnBlock).toContain("disabled");
  });
});

// ─── G10: RefreshCw icon spins while fetching ────────────────────────────────
describe("G10: RefreshCw icon has animate-spin when isFetching", () => {
  it("G10: RefreshCw className includes animate-spin when isFetching", () => {
    expect(src).toContain("animate-spin");
    expect(src).toContain("isFetching");
  });
});

// ─── G11: 30s auto-refresh unchanged ─────────────────────────────────────────
describe("G11: 30s refetchInterval is still present", () => {
  it("G11: refetchInterval: 30_000 is still in the useQuery options", () => {
    expect(src).toContain("refetchInterval: 30_000");
  });
});

// ─── G12: no-data-message testid ─────────────────────────────────────────────
describe("G12: no-data-message data-testid is present for null state", () => {
  it("G12: data-testid=no-data-message is present in JSX", () => {
    expect(src).toContain('data-testid="no-data-message"');
  });
});
