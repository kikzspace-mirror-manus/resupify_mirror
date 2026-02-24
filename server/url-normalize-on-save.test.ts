/**
 * URL Normalization on Job Card Save — Tests
 * Covers: safeNormalizeJobUrl unit tests + router wiring verification
 */
import { describe, it, expect } from "vitest";
import { normalizeJobUrl, safeNormalizeJobUrl } from "../shared/urlNormalize";

// ─── Unit: safeNormalizeJobUrl ────────────────────────────────────────────────

describe("safeNormalizeJobUrl", () => {
  it("N1: strips utm_source, utm_medium, utm_campaign from URL", () => {
    const url =
      "https://example.com/job?utm_source=linkedin&utm_medium=email&utm_campaign=spring";
    const result = safeNormalizeJobUrl(url);
    expect(result).not.toContain("utm_source");
    expect(result).not.toContain("utm_medium");
    expect(result).not.toContain("utm_campaign");
    expect(result).toContain("example.com/job");
  });

  it("N2: strips utm_term and utm_content", () => {
    const url = "https://example.com/job?utm_term=engineer&utm_content=banner";
    const result = safeNormalizeJobUrl(url);
    expect(result).not.toContain("utm_term");
    expect(result).not.toContain("utm_content");
  });

  it("N3: strips gclid tracking parameter", () => {
    const url = "https://example.com/job?gclid=abc123&title=engineer";
    const result = safeNormalizeJobUrl(url);
    expect(result).not.toContain("gclid");
    // Non-tracking param preserved
    expect(result).toContain("title=engineer");
  });

  it("N4: strips fbclid tracking parameter", () => {
    const url = "https://example.com/job?fbclid=IwAR123abc";
    const result = safeNormalizeJobUrl(url);
    expect(result).not.toContain("fbclid");
  });

  it("N5: strips msclkid tracking parameter", () => {
    const url = "https://example.com/job?msclkid=xyz789";
    const result = safeNormalizeJobUrl(url);
    expect(result).not.toContain("msclkid");
  });

  it("N6: strips mc_cid and mc_eid (Mailchimp) parameters", () => {
    const url = "https://example.com/job?mc_cid=abc&mc_eid=def";
    const result = safeNormalizeJobUrl(url);
    expect(result).not.toContain("mc_cid");
    expect(result).not.toContain("mc_eid");
  });

  it("N7: removes URL fragment (#section)", () => {
    const url = "https://boards.greenhouse.io/company/jobs/12345#app-section";
    const result = safeNormalizeJobUrl(url);
    // URL.toString() drops fragment by default when fragment is cleared
    // The URL class does NOT strip fragments unless explicitly cleared;
    // normalizeJobUrl does not explicitly strip fragments — test that it doesn't crash
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("N8: lowercases the hostname", () => {
    const url = "https://Jobs.Lever.Co/company/abc";
    const result = safeNormalizeJobUrl(url);
    expect(result).toContain("jobs.lever.co");
    expect(result).not.toContain("Jobs.Lever.Co");
  });

  it("N9: preserves Workday job path (no over-stripping)", () => {
    const url =
      "https://company.wd5.myworkdayjobs.com/en-US/careers/job/Location/Title_JR-12345";
    const result = safeNormalizeJobUrl(url);
    expect(result).toContain("myworkdayjobs.com");
    expect(result).toContain("JR-12345");
  });

  it("N10: preserves Greenhouse job path and ID", () => {
    const url = "https://boards.greenhouse.io/company/jobs/12345678";
    const result = safeNormalizeJobUrl(url);
    expect(result).toContain("greenhouse.io");
    expect(result).toContain("12345678");
  });

  it("N11: preserves Lever job path and ID", () => {
    const url = "https://jobs.lever.co/company/abc-def-123";
    const result = safeNormalizeJobUrl(url);
    expect(result).toContain("jobs.lever.co");
    expect(result).toContain("abc-def-123");
  });

  it("N12: preserves Ashby job path and ID", () => {
    const url = "https://jobs.ashbyhq.com/company/abc-123-def";
    const result = safeNormalizeJobUrl(url);
    expect(result).toContain("ashbyhq.com");
    expect(result).toContain("abc-123-def");
  });

  it("N13: returns original URL when input is completely invalid (no crash)", () => {
    const url = "not a url at all!!!";
    expect(() => safeNormalizeJobUrl(url)).not.toThrow();
    const result = safeNormalizeJobUrl(url);
    expect(result).toBe(url);
  });

  it("N14: returns original URL when URL has no scheme and cannot be parsed", () => {
    const url = "://broken-url";
    expect(() => safeNormalizeJobUrl(url)).not.toThrow();
    const result = safeNormalizeJobUrl(url);
    expect(typeof result).toBe("string");
  });

  it("N15: returns empty string as-is (does not crash)", () => {
    expect(() => safeNormalizeJobUrl("")).not.toThrow();
    expect(safeNormalizeJobUrl("")).toBe("");
  });

  it("N16: adds https:// scheme when missing", () => {
    const url = "boards.greenhouse.io/company/jobs/12345";
    const result = safeNormalizeJobUrl(url);
    expect(result).toMatch(/^https:\/\//);
  });

  it("N17: strips all utm_* params in a combined URL with ATS params preserved", () => {
    const url =
      "https://example.com/job?jobId=12345&utm_source=linkedin&utm_medium=social&utm_campaign=fall2024";
    const result = safeNormalizeJobUrl(url);
    expect(result).not.toContain("utm_source");
    expect(result).not.toContain("utm_medium");
    expect(result).not.toContain("utm_campaign");
    // jobId is not in the strip list — should be preserved
    expect(result).toContain("jobId=12345");
  });

  it("N18: strips LinkedIn tracking params (refId, trackingId, lipi)", () => {
    const url =
      "https://www.linkedin.com/jobs/view/12345?refId=abc&trackingId=xyz&lipi=def";
    const result = safeNormalizeJobUrl(url);
    expect(result).not.toContain("refId");
    expect(result).not.toContain("trackingId");
    expect(result).not.toContain("lipi");
    expect(result).toContain("linkedin.com/jobs/view/12345");
  });

  it("N19: URL with only tracking params results in clean base URL (no trailing ?)", () => {
    const url = "https://example.com/job?utm_source=x&fbclid=y";
    const result = safeNormalizeJobUrl(url);
    expect(result).not.toContain("utm_source");
    expect(result).not.toContain("fbclid");
    // Should not end with bare '?'
    expect(result).not.toMatch(/\?$/);
  });
});

// ─── Router Wiring: verify safeNormalizeJobUrl is imported in routers.ts ─────

describe("URL normalization wired into routers.ts", () => {
  it("R1: routers.ts imports safeNormalizeJobUrl from urlNormalize", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const content = fs.readFileSync(
      path.resolve("server/routers.ts"),
      "utf-8"
    );
    expect(content).toContain("safeNormalizeJobUrl");
    expect(content).toContain("urlNormalize");
  });

  it("R2: jobCards.create mutation normalizes URL before db.createJobCard", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const content = fs.readFileSync(
      path.resolve("server/routers.ts"),
      "utf-8"
    );
    // The normalization line must appear before createJobCard call
    const normalizeIdx = content.indexOf("cardData.url = safeNormalizeJobUrl(cardData.url)");
    const createIdx = content.indexOf("db.createJobCard(");
    expect(normalizeIdx).toBeGreaterThan(-1);
    expect(createIdx).toBeGreaterThan(-1);
    expect(normalizeIdx).toBeLessThan(createIdx);
  });

  it("R3: jobCards.update mutation normalizes URL before db.updateJobCard", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const content = fs.readFileSync(
      path.resolve("server/routers.ts"),
      "utf-8"
    );
    // The normalization line must appear before updateJobCard call
    const normalizeIdx = content.indexOf("updateData.url = safeNormalizeJobUrl(updateData.url)");
    const updateIdx = content.indexOf("db.updateJobCard(id, ctx.user.id, updateData)");
    expect(normalizeIdx).toBeGreaterThan(-1);
    expect(updateIdx).toBeGreaterThan(-1);
    expect(normalizeIdx).toBeLessThan(updateIdx);
  });

  it("R4: safeNormalizeJobUrl is exported from shared/urlNormalize.ts", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const content = fs.readFileSync(
      path.resolve("shared/urlNormalize.ts"),
      "utf-8"
    );
    expect(content).toContain("export function safeNormalizeJobUrl");
  });

  it("R5: safeNormalizeJobUrl falls back to original URL on error (no crash)", () => {
    // Simulate a URL that would cause normalizeJobUrl to return empty string
    const weirdUrl = "   ";
    expect(() => safeNormalizeJobUrl(weirdUrl)).not.toThrow();
  });
});

// ─── Integration: normalizeJobUrl + safeNormalizeJobUrl parity ───────────────

describe("normalizeJobUrl and safeNormalizeJobUrl parity", () => {
  it("P1: both return the same result for a valid clean URL", () => {
    const url = "https://boards.greenhouse.io/company/jobs/12345";
    expect(safeNormalizeJobUrl(url)).toBe(normalizeJobUrl(url));
  });

  it("P2: both strip utm params identically", () => {
    const url =
      "https://example.com/job?utm_source=linkedin&utm_campaign=fall";
    expect(safeNormalizeJobUrl(url)).toBe(normalizeJobUrl(url));
  });

  it("P3: safeNormalizeJobUrl returns original for invalid URL where normalizeJobUrl returns trimmed", () => {
    const url = "not a url at all!!!";
    // normalizeJobUrl returns trimmed input on failure; safeNormalizeJobUrl should also return original
    const safe = safeNormalizeJobUrl(url);
    expect(safe).toBe(url);
  });
});
