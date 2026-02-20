/**
 * Patch 6G — Cover Letter Export (.txt Download)
 *
 * Tests for buildCoverLetterFilename and sanitizeSegment utilities.
 * These are pure functions — no mocking required.
 */
import { describe, it, expect } from "vitest";
import {
  buildCoverLetterFilename,
  sanitizeSegment,
} from "../shared/filename";

describe("Patch 6G: Cover Letter Export", () => {
  // ─── sanitizeSegment ──────────────────────────────────────────────────
  describe("sanitizeSegment", () => {
    it("removes forbidden characters: / \\ : * ? \" < > |", () => {
      expect(sanitizeSegment('Acme/Corp:Inc*"<>|?')).toBe("AcmeCorpInc");
    });

    it("collapses multiple spaces to a single space", () => {
      expect(sanitizeSegment("Acme   Corp")).toBe("Acme Corp");
    });

    it("trims leading and trailing whitespace", () => {
      expect(sanitizeSegment("  Acme Corp  ")).toBe("Acme Corp");
    });

    it("handles empty string gracefully", () => {
      expect(sanitizeSegment("")).toBe("");
    });

    it("handles backslash in company name", () => {
      expect(sanitizeSegment("Acme\\Corp")).toBe("AcmeCorp");
    });
  });

  // ─── buildCoverLetterFilename ─────────────────────────────────────────
  describe("buildCoverLetterFilename", () => {
    const FIXED_DATE = new Date("2026-02-20T12:00:00");

    it("A) Standard name + company produces correct filename", () => {
      const result = buildCoverLetterFilename(
        "Francis Alexes Noces",
        "Acme Corp",
        FIXED_DATE
      );
      expect(result).toBe("Francis_Noces - Acme Corp - 2026-02-20.txt");
    });

    it("B) Single-word name uses first name only (no underscore)", () => {
      const result = buildCoverLetterFilename("Francis", "Acme Corp", FIXED_DATE);
      expect(result).toBe("Francis - Acme Corp - 2026-02-20.txt");
    });

    it("C) Missing company falls back to 'Company'", () => {
      const result = buildCoverLetterFilename("Francis Noces", "", FIXED_DATE);
      expect(result).toBe("Francis_Noces - Company - 2026-02-20.txt");
    });

    it("C2) Null/undefined company falls back to 'Company'", () => {
      const result = buildCoverLetterFilename(
        "Francis Noces",
        null as unknown as string,
        FIXED_DATE
      );
      expect(result).toBe("Francis_Noces - Company - 2026-02-20.txt");
    });

    it("D) Company name with forbidden chars is sanitized", () => {
      const result = buildCoverLetterFilename(
        "Francis Noces",
        "Acme/Corp: Inc",
        FIXED_DATE
      );
      // '/' and ':' are removed; whitespace is collapsed
      expect(result).toBe("Francis_Noces - AcmeCorp Inc - 2026-02-20.txt");
    });

    it("D2) Company name with slashes and quotes is sanitized", () => {
      const result = buildCoverLetterFilename(
        "Francis Noces",
        'Google "X" / Labs',
        FIXED_DATE
      );
      // quotes, slash removed; spaces collapsed
      expect(result).toBe("Francis_Noces - Google X Labs - 2026-02-20.txt");
    });

    it("E) Date is formatted as YYYY-MM-DD", () => {
      const result = buildCoverLetterFilename(
        "Jane Doe",
        "Shopify",
        new Date("2026-01-05T09:00:00")
      );
      expect(result).toMatch(/2026-01-05\.txt$/);
    });

    it("E2) Single-digit month and day are zero-padded", () => {
      const result = buildCoverLetterFilename(
        "Jane Doe",
        "Shopify",
        new Date("2026-03-07T09:00:00")
      );
      expect(result).toMatch(/2026-03-07\.txt$/);
    });

    it("F) Empty name falls back to 'User'", () => {
      const result = buildCoverLetterFilename("", "Shopify", FIXED_DATE);
      expect(result).toBe("User - Shopify - 2026-02-20.txt");
    });

    it("F2) Null name falls back to 'User'", () => {
      const result = buildCoverLetterFilename(
        null as unknown as string,
        "Shopify",
        FIXED_DATE
      );
      expect(result).toBe("User - Shopify - 2026-02-20.txt");
    });

    it("G) Three-part name uses first + last only", () => {
      const result = buildCoverLetterFilename(
        "Mary Jane Watson",
        "Marvel Inc",
        FIXED_DATE
      );
      expect(result).toBe("Mary_Watson - Marvel Inc - 2026-02-20.txt");
    });

    it("G2) File extension is always .txt", () => {
      const result = buildCoverLetterFilename("Jane Doe", "Shopify", FIXED_DATE);
      expect(result.endsWith(".txt")).toBe(true);
    });
  });
});
