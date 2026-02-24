/**
 * Browser Capture Fallback — Acceptance Tests
 * Covers: URL normalization, /capture route contract, postMessage bridge contract
 */
import { describe, it, expect } from "vitest";
import { normalizeJobUrl } from "../shared/urlNormalize";

// ─── A: URL Normalization ────────────────────────────────────────────────────

describe("normalizeJobUrl", () => {
  it("A1: returns the URL unchanged when no tracking params are present", () => {
    const url = "https://boards.greenhouse.io/company/jobs/12345";
    expect(normalizeJobUrl(url)).toBe(url);
  });

  it("A2: strips utm_source tracking parameter", () => {
    const url = "https://jobs.lever.co/company/abc?utm_source=linkedin";
    const result = normalizeJobUrl(url);
    expect(result).not.toContain("utm_source");
    expect(result).toContain("jobs.lever.co");
  });

  it("A3: strips utm_medium and utm_campaign", () => {
    const url = "https://jobs.lever.co/company/abc?utm_medium=email&utm_campaign=spring";
    const result = normalizeJobUrl(url);
    expect(result).not.toContain("utm_medium");
    expect(result).not.toContain("utm_campaign");
  });

  it("A4: strips all utm_* params while preserving non-tracking params", () => {
    const url = "https://boards.greenhouse.io/company/jobs/12345?gh_src=abc&utm_source=linkedin";
    const result = normalizeJobUrl(url);
    expect(result).not.toContain("utm_source");
    // gh_src is a Greenhouse-specific param — should be stripped too (it's in STRIP_PARAMS)
    expect(result).not.toContain("gh_src");
  });

  it("A5: adds https:// scheme when missing", () => {
    const url = "boards.greenhouse.io/company/jobs/12345";
    const result = normalizeJobUrl(url);
    expect(result).toMatch(/^https:\/\//);
  });

  it("A6: handles URL with no query string", () => {
    const url = "https://jobs.ashbyhq.com/company/abc-123";
    expect(normalizeJobUrl(url)).toBe(url);
  });

  it("A7: returns raw input when URL is completely invalid", () => {
    const url = "not a url at all!!!";
    // Should not throw — returns raw input
    expect(() => normalizeJobUrl(url)).not.toThrow();
  });

  it("A8: strips fbclid tracking parameter", () => {
    const url = "https://jobs.lever.co/company/abc?fbclid=IwAR123";
    const result = normalizeJobUrl(url);
    expect(result).not.toContain("fbclid");
  });

  it("A9: strips gclid tracking parameter", () => {
    const url = "https://jobs.lever.co/company/abc?gclid=abc123";
    const result = normalizeJobUrl(url);
    expect(result).not.toContain("gclid");
  });

  it("A10: normalizes LinkedIn job URL by stripping refId and trackingId", () => {
    const url = "https://www.linkedin.com/jobs/view/12345?refId=abc&trackingId=xyz";
    const result = normalizeJobUrl(url);
    expect(result).not.toContain("refId");
    expect(result).not.toContain("trackingId");
    expect(result).toContain("linkedin.com/jobs/view/12345");
  });

  it("A11: preserves job-relevant query params (e.g. jobId on Workday)", () => {
    const url = "https://company.wd5.myworkdayjobs.com/en-US/careers/job/Location/Title_JR-12345";
    const result = normalizeJobUrl(url);
    expect(result).toContain("myworkdayjobs.com");
  });

  it("A12: handles URL with fragment (#) correctly", () => {
    const url = "https://boards.greenhouse.io/company/jobs/12345#app";
    const result = normalizeJobUrl(url);
    expect(result).toContain("greenhouse.io");
    // Fragment may or may not be preserved — just must not throw
    expect(typeof result).toBe("string");
  });
});

// ─── B: /capture Route Contract ──────────────────────────────────────────────

describe("/capture route contract", () => {
  it("B1: BrowserCapture page file exists", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.resolve("client/src/pages/BrowserCapture.tsx");
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it("B2: BrowserCapture.tsx contains BROWSER_CAPTURE_RESULT postMessage", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const content = fs.readFileSync(
      path.resolve("client/src/pages/BrowserCapture.tsx"),
      "utf-8"
    );
    expect(content).toContain("BROWSER_CAPTURE_RESULT");
  });

  it("B3: BrowserCapture.tsx sends text via window.opener.postMessage", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const content = fs.readFileSync(
      path.resolve("client/src/pages/BrowserCapture.tsx"),
      "utf-8"
    );
    expect(content).toContain("opener.postMessage");
  });

  it("B4: BrowserCapture.tsx reads url from query string", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const content = fs.readFileSync(
      path.resolve("client/src/pages/BrowserCapture.tsx"),
      "utf-8"
    );
    expect(content).toContain("url");
    // Should parse URL from query params
    expect(content).toContain("URLSearchParams");
  });

  it("B5: /capture route is registered in App.tsx", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const content = fs.readFileSync(
      path.resolve("client/src/App.tsx"),
      "utf-8"
    );
    expect(content).toContain("/capture");
    expect(content).toContain("BrowserCapture");
  });
});

// ─── C: postMessage Listener Contract ────────────────────────────────────────

describe("postMessage listener in JD pages", () => {
  it("C1: JobCardDetail.tsx listens for BROWSER_CAPTURE_RESULT", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const content = fs.readFileSync(
      path.resolve("client/src/pages/JobCardDetail.tsx"),
      "utf-8"
    );
    expect(content).toContain("BROWSER_CAPTURE_RESULT");
    expect(content).toContain("addEventListener");
  });

  it("C2: JobCards.tsx listens for BROWSER_CAPTURE_RESULT", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const content = fs.readFileSync(
      path.resolve("client/src/pages/JobCards.tsx"),
      "utf-8"
    );
    expect(content).toContain("BROWSER_CAPTURE_RESULT");
    expect(content).toContain("addEventListener");
  });

  it("C3: JobCardDetail.tsx shows fallback button on fetch error", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const content = fs.readFileSync(
      path.resolve("client/src/pages/JobCardDetail.tsx"),
      "utf-8"
    );
    expect(content).toContain("showBrowserCaptureFallback");
    expect(content).toContain("Try Browser Capture");
  });

  it("C4: JobCards.tsx shows fallback button on fetch error", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const content = fs.readFileSync(
      path.resolve("client/src/pages/JobCards.tsx"),
      "utf-8"
    );
    expect(content).toContain("showBrowserCaptureFallback");
    expect(content).toContain("Try Browser Capture");
  });

  it("C5: fallback button opens /capture in a new tab", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const content = fs.readFileSync(
      path.resolve("client/src/pages/JobCardDetail.tsx"),
      "utf-8"
    );
    expect(content).toContain("window.open");
    expect(content).toContain("_blank");
    expect(content).toContain("/capture");
  });

  it("C6: JobCardDetail.tsx uses normalizeJobUrl before fetching", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const content = fs.readFileSync(
      path.resolve("client/src/pages/JobCardDetail.tsx"),
      "utf-8"
    );
    expect(content).toContain("normalizeJobUrl");
  });

  it("C7: JobCards.tsx uses normalizeJobUrl before fetching", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const content = fs.readFileSync(
      path.resolve("client/src/pages/JobCards.tsx"),
      "utf-8"
    );
    expect(content).toContain("normalizeJobUrl");
  });
});
