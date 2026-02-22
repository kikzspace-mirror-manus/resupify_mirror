/**
 * Prompt B2: JD Fetch Error Suppression
 * Tests for the isExpectedFetchError logic (pure function extracted for testability).
 *
 * Acceptance tests:
 * A) "too short" error → isExpected = true
 * B) "blocks automated fetch" error → isExpected = true
 * C) "Invalid URL" error → isExpected = true
 * D) "Please paste the JD" suffix → isExpected = true
 * E) Unexpected server error → isExpected = false
 * F) Non-TRPCClientError → isExpected = false
 * G) All known expected substrings are covered
 */

import { describe, it, expect } from "vitest";

// ── Pure helper extracted from main.tsx for testability ──────────────────────
const EXPECTED_FETCH_SUBSTRINGS = [
  "too short to be a job description",
  "blocks automated fetch",
  "gated or login-protected",
  "Couldn't extract text",
  "Couldn't fetch text",
  "Couldn't reach this URL",
  "Request timed out",
  "URL does not point to a web page",
  "Page is too large to fetch",
  "Invalid URL",
  "Please paste the JD",
  "Please paste the JD instead",
] as const;

function isExpectedFetchError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  // Duck-type check: TRPCClientError has a .message string
  const msg = (error as any).message;
  if (typeof msg !== "string") return false;
  // Only treat as expected if it looks like a TRPCClientError (has .data or shape)
  if (!("data" in error) && !("shape" in error) && !("cause" in error)) return false;
  return EXPECTED_FETCH_SUBSTRINGS.some((s) => msg.includes(s));
}

// Minimal TRPCClientError-like object factory
function makeTrpcError(message: string) {
  return { message, data: {}, shape: {}, cause: null };
}

function makeGenericError(message: string) {
  return new Error(message);
}

// ── Tests ────────────────────────────────────────────────────────────────────
describe("Prompt B2: isExpectedFetchError suppression logic", () => {
  // ── A: too short ──────────────────────────────────────────────────────────
  it("A) 'too short to be a job description' → expected = true", () => {
    const err = makeTrpcError("Fetched text too short to be a job description. Please paste the JD manually.");
    expect(isExpectedFetchError(err)).toBe(true);
  });

  // ── B: blocked/gated ─────────────────────────────────────────────────────
  it("B) 'blocks automated fetch' → expected = true", () => {
    const err = makeTrpcError("This site blocks automated fetch. Please paste the JD instead.");
    expect(isExpectedFetchError(err)).toBe(true);
  });

  it("B2) 'gated or login-protected' → expected = true", () => {
    const err = makeTrpcError("This page appears to be gated or login-protected.");
    expect(isExpectedFetchError(err)).toBe(true);
  });

  // ── C: invalid URL ────────────────────────────────────────────────────────
  it("C) 'Invalid URL' → expected = true", () => {
    const err = makeTrpcError("Invalid URL provided.");
    expect(isExpectedFetchError(err)).toBe(true);
  });

  it("C2) 'URL does not point to a web page' → expected = true", () => {
    const err = makeTrpcError("URL does not point to a web page. Please paste the JD instead.");
    expect(isExpectedFetchError(err)).toBe(true);
  });

  // ── D: paste JD suffix ────────────────────────────────────────────────────
  it("D) 'Please paste the JD' suffix → expected = true", () => {
    const err = makeTrpcError("Couldn't reach this URL. Please paste the JD instead.");
    expect(isExpectedFetchError(err)).toBe(true);
  });

  it("D2) 'Request timed out' → expected = true", () => {
    const err = makeTrpcError("Request timed out. Please paste the JD instead.");
    expect(isExpectedFetchError(err)).toBe(true);
  });

  it("D3) 'Page is too large to fetch' → expected = true", () => {
    const err = makeTrpcError("Page is too large to fetch. Please paste the JD instead.");
    expect(isExpectedFetchError(err)).toBe(true);
  });

  it("D4) 'Couldn't extract text' → expected = true", () => {
    const err = makeTrpcError("Couldn't extract text from this page. Please paste the JD instead.");
    expect(isExpectedFetchError(err)).toBe(true);
  });

  // ── E: unexpected server error → NOT suppressed ───────────────────────────
  it("E) Unexpected server error → expected = false (not suppressed)", () => {
    const err = makeTrpcError("Internal server error");
    expect(isExpectedFetchError(err)).toBe(false);
  });

  it("E2) Database connection error → expected = false", () => {
    const err = makeTrpcError("ECONNRESET: database connection lost");
    expect(isExpectedFetchError(err)).toBe(false);
  });

  it("E3) Empty message → expected = false", () => {
    const err = makeTrpcError("");
    expect(isExpectedFetchError(err)).toBe(false);
  });

  // ── F: non-TRPCClientError → NOT suppressed ───────────────────────────────
  it("F) Generic Error object → expected = false", () => {
    const err = makeGenericError("Fetched text too short to be a job description.");
    expect(isExpectedFetchError(err)).toBe(false);
  });

  it("F2) null → expected = false", () => {
    expect(isExpectedFetchError(null)).toBe(false);
  });

  it("F3) string → expected = false", () => {
    expect(isExpectedFetchError("Fetched text too short")).toBe(false);
  });

  // ── G: all known substrings are covered ───────────────────────────────────
  it("G) All 12 expected substrings are recognized", () => {
    const testMessages = [
      "Fetched text too short to be a job description. Please paste the JD manually.",
      "This site blocks automated fetch. Please paste the JD instead.",
      "This page appears to be gated or login-protected.",
      "Couldn't extract text from this page. Please paste the JD instead.",
      "Couldn't fetch text from this URL. Please paste the JD instead.",
      "Couldn't reach this URL. Please check the address and try again.",
      "Request timed out. Please paste the JD instead.",
      "URL does not point to a web page. Please paste the JD instead.",
      "Page is too large to fetch. Please paste the JD instead.",
      "Invalid URL provided.",
      "Please paste the JD.",
      "Please paste the JD instead.",
    ];
    for (const msg of testMessages) {
      const err = makeTrpcError(msg);
      expect(isExpectedFetchError(err), `Should be expected: "${msg}"`).toBe(true);
    }
  });
});
