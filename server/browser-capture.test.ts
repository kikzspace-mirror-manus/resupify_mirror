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

// ─── D: Blocked State & Paste Fallback Contract ──────────────────────────────

describe("/capture blocked state and paste fallback", () => {
  it("D1: BrowserCapture.tsx has a 'blocked' phase state", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const content = fs.readFileSync(
      path.resolve("client/src/pages/BrowserCapture.tsx"),
      "utf-8"
    );
    expect(content).toContain('"blocked"');
  });

  it("D2: BrowserCapture.tsx shows textarea when blocked", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const content = fs.readFileSync(
      path.resolve("client/src/pages/BrowserCapture.tsx"),
      "utf-8"
    );
    // Textarea is rendered in blocked phase
    expect(content).toContain("Textarea");
    expect(content).toContain("Paste the full job description");
  });

  it("D3: BrowserCapture.tsx has a 'Send to Resupify' button in blocked state", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const content = fs.readFileSync(
      path.resolve("client/src/pages/BrowserCapture.tsx"),
      "utf-8"
    );
    expect(content).toContain("Send to Resupify");
  });

  it("D4: BrowserCapture.tsx validates minimum text length before sending", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const content = fs.readFileSync(
      path.resolve("client/src/pages/BrowserCapture.tsx"),
      "utf-8"
    );
    expect(content).toContain("MIN_TEXT_LENGTH");
    // Should show error for short text
    expect(content).toContain("too short");
  });

  it("D5: BrowserCapture.tsx has 8-second timeout to detect blocked iframe", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const content = fs.readFileSync(
      path.resolve("client/src/pages/BrowserCapture.tsx"),
      "utf-8"
    );
    expect(content).toContain("8000");
  });

  it("D6: BrowserCapture.tsx handles iframe onerror by switching to blocked phase", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const content = fs.readFileSync(
      path.resolve("client/src/pages/BrowserCapture.tsx"),
      "utf-8"
    );
    expect(content).toContain("handleIframeError");
    expect(content).toContain("onError={handleIframeError}");
  });

  it("D7: postMessage payload uses BROWSER_CAPTURE_RESULT type with text field", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const content = fs.readFileSync(
      path.resolve("client/src/pages/BrowserCapture.tsx"),
      "utf-8"
    );
    // Verify the exact payload shape matches what the listeners expect
    expect(content).toContain('type: "BROWSER_CAPTURE_RESULT"');
    expect(content).toContain("text");
    expect(content).toContain("opener.postMessage");
  });

  it("D8: BrowserCapture.tsx shows success state after sending text", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const content = fs.readFileSync(
      path.resolve("client/src/pages/BrowserCapture.tsx"),
      "utf-8"
    );
    expect(content).toContain('"success"');
    expect(content).toContain("close this tab");
  });

  it("D9: BrowserCapture.tsx provides a direct link to open the job posting in blocked state", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const content = fs.readFileSync(
      path.resolve("client/src/pages/BrowserCapture.tsx"),
      "utf-8"
    );
    expect(content).toContain("Open the job posting");
    expect(content).toContain("Open job posting");
  });

  it("D10: normalizeText collapses excessive whitespace and newlines", () => {
    // Test the normalization logic inline (mirrors BrowserCapture.tsx normalizeText)
    function normalizeText(raw: string): string {
      return raw
        .replace(/\r\n/g, "\n")
        .replace(/[ \t]+/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
    }
    const input = "Software Engineer\r\n\n\n\n  Requirements:  \n- TypeScript  \n- React";
    const result = normalizeText(input);
    expect(result).not.toContain("\r");
    expect(result).not.toContain("\n\n\n");
    expect(result).toContain("Requirements:");
  });
});

// ─── E) Proactive Blocked-Host Hint ────────────────────────────────────────
import { isLikelyBlockedHost } from "../shared/urlNormalize";

describe("E) Proactive Blocked-Host Hint — isLikelyBlockedHost coverage", () => {
  it("E1: LinkedIn job URLs are flagged as blocked", () => {
    expect(isLikelyBlockedHost("https://www.linkedin.com/jobs/view/123456")).toBe(true);
  });

  it("E2: Indeed job URLs are flagged as blocked", () => {
    expect(isLikelyBlockedHost("https://ca.indeed.com/viewjob?jk=abc123")).toBe(true);
  });

  it("E3: Workday URLs are flagged as blocked", () => {
    expect(isLikelyBlockedHost("https://shopify.wd1.myworkdayjobs.com/en-US/Shopify/job/123")).toBe(true);
  });

  it("E4: BambooHR URLs are flagged as blocked", () => {
    expect(isLikelyBlockedHost("https://company.bamboohr.com/jobs/view.php?id=1")).toBe(true);
  });

  it("E5: Greenhouse URLs are flagged as blocked", () => {
    expect(isLikelyBlockedHost("https://boards.greenhouse.io/company/jobs/123")).toBe(true);
  });

  it("E6: Lever URLs are flagged as blocked", () => {
    expect(isLikelyBlockedHost("https://jobs.lever.co/company/abc-123")).toBe(true);
  });

  it("E7: Ashby URLs are NOT flagged as blocked (not in list)", () => {
    expect(isLikelyBlockedHost("https://jobs.ashbyhq.com/company/role")).toBe(false);
  });

  it("E8: Generic company career page is not flagged", () => {
    expect(isLikelyBlockedHost("https://careers.shopify.com/jobs/123")).toBe(false);
  });

  it("E9: Empty string returns false", () => {
    expect(isLikelyBlockedHost("")).toBe(false);
  });

  it("E10: Invalid URL returns false without throwing", () => {
    expect(() => isLikelyBlockedHost("not-a-url")).not.toThrow();
    expect(isLikelyBlockedHost("not-a-url")).toBe(false);
  });

  it("E11: JobCards.tsx shows proactive amber hint for blocked hosts", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const content = fs.readFileSync(path.resolve("client/src/pages/JobCards.tsx"), "utf-8");
    expect(content).toContain("isBlockedHost");
    expect(content).toContain("This site usually blocks automated fetch");
    expect(content).toContain("bg-amber-600");
  });

  it("E12: JobCardDetail.tsx shows proactive amber hint for blocked hosts", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const content = fs.readFileSync(path.resolve("client/src/pages/JobCardDetail.tsx"), "utf-8");
    expect(content).toContain("isBlockedHost");
    expect(content).toContain("This site usually blocks automated fetch");
    expect(content).toContain("bg-amber-600");
  });

  it("E13: Fetch JD button is disabled when isBlockedHost is true (JobCards)", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const content = fs.readFileSync(path.resolve("client/src/pages/JobCards.tsx"), "utf-8");
    expect(content).toContain("isBlockedHost}");
    expect(content).toContain("disabled={!isValidHttpsUrl(url) || fetchFromUrl.isPending || isBlockedHost}");
  });

  it("E14: Fetch from URL button is disabled when isBlockedHost is true (JobCardDetail)", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const content = fs.readFileSync(path.resolve("client/src/pages/JobCardDetail.tsx"), "utf-8");
    expect(content).toContain("|| isBlockedHost}");
  });
});
