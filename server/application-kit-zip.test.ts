/**
 * Patch 8F — Download Kit (.zip) Acceptance Tests
 *
 * Tests cover:
 * A) buildApplicationKitZipFilename — convention and sanitization
 * B) Zip filename matches convention
 * C) Regression: existing three filename builders still work
 * D) Zip file naming with missing company/name fallbacks
 */

import { describe, it, expect } from "vitest";
import {
  buildApplicationKitZipFilename,
  buildCoverLetterFilename,
  buildResumePatchFilename,
  buildTopChangesFilename,
} from "../shared/filename";

// ─── Test A: buildApplicationKitZipFilename convention ───────────────────────

describe("buildApplicationKitZipFilename", () => {
  it("A1 — standard three-part name + company produces correct filename", () => {
    const d = new Date(2026, 1, 21); // Feb 21 2026 local
    const result = buildApplicationKitZipFilename("Francis Alexes Noces", "Acme Corp", d);
    expect(result).toBe("Francis_Noces - Application_Kit - Acme Corp - 2026-02-21.zip");
  });

  it("A2 — two-part name", () => {
    const d = new Date(2026, 1, 21);
    const result = buildApplicationKitZipFilename("Jane Doe", "Google", d);
    expect(result).toBe("Jane_Doe - Application_Kit - Google - 2026-02-21.zip");
  });

  it("A3 — single-word name uses name only (no underscore)", () => {
    const d = new Date(2026, 1, 21);
    const result = buildApplicationKitZipFilename("Alice", "Stripe", d);
    expect(result).toBe("Alice - Application_Kit - Stripe - 2026-02-21.zip");
  });

  it("A4 — missing company falls back to 'Company'", () => {
    const d = new Date(2026, 1, 21);
    const result = buildApplicationKitZipFilename("Jane Doe", "", d);
    expect(result).toBe("Jane_Doe - Application_Kit - Company - 2026-02-21.zip");
  });

  it("A5 — empty name falls back to 'User'", () => {
    const d = new Date(2026, 1, 21);
    const result = buildApplicationKitZipFilename("", "Shopify", d);
    expect(result).toBe("User - Application_Kit - Shopify - 2026-02-21.zip");
  });

  it("A6 — forbidden characters in company are sanitized", () => {
    const d = new Date(2026, 1, 21);
    const result = buildApplicationKitZipFilename("Jane Doe", "Acme/Corp:Inc", d);
    expect(result).not.toMatch(/[/:*?"<>|]/);
    expect(result).toContain("Application_Kit");
    expect(result).toContain(".zip");
  });

  it("A7 — date is zero-padded (month and day)", () => {
    const d = new Date(2026, 0, 5); // Jan 5 2026 local
    const result = buildApplicationKitZipFilename("Jane Doe", "Stripe", d);
    expect(result).toContain("2026-01-05");
  });

  it("A8 — output ends with .zip extension", () => {
    const d = new Date(2026, 1, 21);
    const result = buildApplicationKitZipFilename("Jane Doe", "Acme", d);
    expect(result.endsWith(".zip")).toBe(true);
  });
});

// ─── Test B: Zip filename matches convention ──────────────────────────────────

describe("Zip filename convention", () => {
  it("B1 — filename contains 'Application_Kit' label", () => {
    const d = new Date(2026, 1, 21);
    const result = buildApplicationKitZipFilename("Jane Doe", "Acme", d);
    expect(result).toContain("Application_Kit");
  });

  it("B2 — filename has exactly 3 ' - ' separators", () => {
    const d = new Date(2026, 1, 21);
    const result = buildApplicationKitZipFilename("Jane Doe", "Acme Corp", d);
    const parts = result.split(" - ");
    expect(parts).toHaveLength(4); // name, label, company, date+ext
  });
});

// ─── Test C: Regression — existing three filename builders still work ─────────

describe("Regression: existing filename builders", () => {
  it("C1 — buildCoverLetterFilename still produces .txt", () => {
    const d = new Date(2026, 1, 21);
    const result = buildCoverLetterFilename("Jane Doe", "Acme", d);
    expect(result.endsWith(".txt")).toBe(true);
    expect(result).not.toContain("Application_Kit");
  });

  it("C2 — buildResumePatchFilename still produces .txt", () => {
    const d = new Date(2026, 1, 21);
    const result = buildResumePatchFilename("Jane Doe", "Acme", d);
    expect(result.endsWith(".txt")).toBe(true);
    expect(result).toContain("Resume_Patch");
  });

  it("C3 — buildTopChangesFilename still produces .txt", () => {
    const d = new Date(2026, 1, 21);
    const result = buildTopChangesFilename("Jane Doe", "Acme", d);
    expect(result.endsWith(".txt")).toBe(true);
    expect(result).toContain("Top_Changes");
  });

  it("C4 — all four builders use same name-splitting logic", () => {
    const d = new Date(2026, 1, 21);
    const name = "Francis Alexes Noces";
    const company = "Acme";
    const cl = buildCoverLetterFilename(name, company, d);
    const rp = buildResumePatchFilename(name, company, d);
    const tc = buildTopChangesFilename(name, company, d);
    const ak = buildApplicationKitZipFilename(name, company, d);
    // All should start with Francis_Noces
    expect(cl.startsWith("Francis_Noces")).toBe(true);
    expect(rp.startsWith("Francis_Noces")).toBe(true);
    expect(tc.startsWith("Francis_Noces")).toBe(true);
    expect(ak.startsWith("Francis_Noces")).toBe(true);
  });
});

// ─── Test D: Fallback behavior ────────────────────────────────────────────────

describe("buildApplicationKitZipFilename fallbacks", () => {
  it("D1 — null-ish name string falls back to 'User'", () => {
    const d = new Date(Date.UTC(2026, 1, 21));
    const result = buildApplicationKitZipFilename("   ", "Acme", d);
    // Whitespace-only name → sanitizeSegment → empty → fallback to User
    expect(result).toContain("User");
  });

  it("D2 — null-ish company string falls back to 'Company'", () => {
    const d = new Date(Date.UTC(2026, 1, 21));
    const result = buildApplicationKitZipFilename("Jane Doe", "   ", d);
    expect(result).toContain("Company");
  });
});
