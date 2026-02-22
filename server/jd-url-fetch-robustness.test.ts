/**
 * Phase 9A: URL Fetch Robustness (Board-Agnostic + Graceful Failures)
 *
 * Acceptance tests A–F:
 *   A) Standard Greenhouse/Lever-style HTML returns meaningful JD text
 *   B) Content-container fallback: page with job-description class extracts correctly
 *   C) Blocked page (403) returns the friendly gated-site message
 *   D) Gated page (keyword "captcha" + thin content) returns friendly message
 *   E) All guardrails still apply: https-only, binary block, too-short, 404
 *   F) No schema changes, no credits consumed
 *   G) Browser-like headers are sent (User-Agent, Accept-Encoding, Sec-Fetch-*)
 *   H) maxRedirects is set (follows redirects)
 *   I) 429 rate-limit returns gated message
 *   J) Script-heavy page still extracts via fallback
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";

vi.mock("axios");
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getCreditsBalance: vi.fn(),
  };
});

import * as db from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const mockAxiosGet = axios.get as ReturnType<typeof vi.fn>;
const mockGetCreditsBalance = db.getCreditsBalance as ReturnType<typeof vi.fn>;

function makeCtx(userId = 1): TrpcContext {
  return {
    user: {
      id: userId,
      openId: "test-user",
      name: "Test User",
      email: "test@example.com",
      loginMethod: "manus",
      role: "user",
      disabled: false,
      isAdmin: false,
      adminNotes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

const GATED_MESSAGE = "This site blocks automated fetch (common with LinkedIn/Indeed/Workday in some cases). Please paste the JD text instead.";

// ─── Helpers ──────────────────────────────────────────────────────────
function makeGreenhouseHtml(jobText: string) {
  return `<!DOCTYPE html><html><head><title>Software Engineer at Acme</title></head><body>
    <main>
      <h1>Software Engineer</h1>
      <article class="job-description">
        <p>${jobText}</p>
      </article>
    </main>
  </body></html>`;
}

function makeScriptHeavyHtml(jobText: string) {
  return `<!DOCTYPE html><html><head>
    <script>window.__INITIAL_STATE__ = ${JSON.stringify({ data: "lots of js" })};</script>
    <script src="bundle.js"></script>
  </head><body>
    <div id="root">
      <div class="job-description">
        <h2>About the role</h2>
        <p>${jobText}</p>
      </div>
    </div>
  </body></html>`;
}

// ─── Test Suite ───────────────────────────────────────────────────────
describe("Phase 9A: URL Fetch Robustness", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Test A: Standard Greenhouse/Lever HTML ────────────────────────
  it("A) Standard Greenhouse/Lever HTML returns meaningful JD text", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const jobText = "We are looking for a Senior Software Engineer to join our platform team. ".repeat(5) +
      "Requirements: TypeScript, React, Node.js, 3+ years experience in distributed systems.";

    mockAxiosGet.mockResolvedValueOnce({
      data: makeGreenhouseHtml(jobText),
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    });

    const result = await caller.jdSnapshots.fetchFromUrl({ url: "https://boards.greenhouse.io/acme/jobs/123" });
    expect(result.text.length).toBeGreaterThan(200);
    expect(result.text).toContain("Software Engineer");
    expect(result.fetchedAt).toBeTruthy();
  });

  // ── Test B: Content-container fallback ───────────────────────────
  it("B) Page with .job-description container extracts via fallback", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const jobText = "Full Stack Developer position at TechCorp. ".repeat(8) +
      "You will work on our core product using React, TypeScript, and PostgreSQL.";

    // Minimal HTML that Readability might struggle with but fallback handles
    const html = `<html><body>
      <div class="sidebar">Navigation links here</div>
      <div class="job-description">
        <h1>Full Stack Developer</h1>
        <p>${jobText}</p>
      </div>
      <footer>Footer content</footer>
    </body></html>`;

    mockAxiosGet.mockResolvedValueOnce({
      data: html,
      status: 200,
      headers: { "content-type": "text/html" },
    });

    const result = await caller.jdSnapshots.fetchFromUrl({ url: "https://jobs.example.com/fullstack" });
    expect(result.text.length).toBeGreaterThan(200);
    expect(result.text).toContain("Full Stack Developer");
  });

  // ── Test C: 403 blocked → friendly gated message ─────────────────
  it("C) 403 response returns friendly gated-site message", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);

    mockAxiosGet.mockResolvedValueOnce({
      data: "<html><body>Access Denied</body></html>",
      status: 403,
      headers: { "content-type": "text/html" },
    });

    await expect(
      caller.jdSnapshots.fetchFromUrl({ url: "https://www.linkedin.com/jobs/view/123" })
    ).rejects.toThrow(GATED_MESSAGE);
  });

  // ── Test D: Gated page with captcha keyword + thin content ────────
  it("D) Page with 'captcha' keyword and thin content returns gated message", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);

    const html = `<html><body>
      <h1>Security Check</h1>
      <p>Please complete the captcha to continue.</p>
    </body></html>`;

    mockAxiosGet.mockResolvedValueOnce({
      data: html,
      status: 200,
      headers: { "content-type": "text/html" },
    });

    await expect(
      caller.jdSnapshots.fetchFromUrl({ url: "https://example.com/captcha-page" })
    ).rejects.toThrow(GATED_MESSAGE);
  });

  // ── Test E1: https-only guardrail ─────────────────────────────────
  it("E1) Non-https URL is rejected", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.jdSnapshots.fetchFromUrl({ url: "http://example.com/job" })
    ).rejects.toThrow();
  });

  // ── Test E2: Binary content-type guardrail ────────────────────────
  it("E2) Binary content-type (PDF) is rejected", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);

    mockAxiosGet.mockResolvedValueOnce({
      data: Buffer.from("binary"),
      status: 200,
      headers: { "content-type": "application/pdf" },
    });

    await expect(
      caller.jdSnapshots.fetchFromUrl({ url: "https://example.com/resume.pdf" })
    ).rejects.toThrow("URL does not point to a web page");
  });

  // ── Test E3: Too-short guardrail ──────────────────────────────────
  it("E3) Fetched text < 200 chars returns too-short error", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);

    mockAxiosGet.mockResolvedValueOnce({
      data: "<html><body><p>Short.</p></body></html>",
      status: 200,
      headers: { "content-type": "text/html" },
    });

    await expect(
      caller.jdSnapshots.fetchFromUrl({ url: "https://example.com/short" })
    ).rejects.toThrow();
  });

  // ── Test E4: 404 guardrail ────────────────────────────────────────
  it("E4) 404 response returns not-found error", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);

    mockAxiosGet.mockResolvedValueOnce({
      data: "<html><body>Not Found</body></html>",
      status: 404,
      headers: { "content-type": "text/html" },
    });

    await expect(
      caller.jdSnapshots.fetchFromUrl({ url: "https://example.com/expired-job" })
    ).rejects.toThrow("404");
  });

  // ── Test F: No credits consumed ───────────────────────────────────
  it("F) fetchFromUrl does not consume credits", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const jobText = "Backend Engineer role at Startup. ".repeat(8) + "Python, Go, Kubernetes required.";

    mockAxiosGet.mockResolvedValueOnce({
      data: makeGreenhouseHtml(jobText),
      status: 200,
      headers: { "content-type": "text/html" },
    });

    await caller.jdSnapshots.fetchFromUrl({ url: "https://example.com/job" });
    expect(mockGetCreditsBalance).not.toHaveBeenCalled();
  });

  // ── Test G: Browser-like headers are sent ─────────────────────────
  it("G) Browser-like headers are sent (Chrome User-Agent, Accept-Encoding)", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const jobText = "Product Manager at BigCo. ".repeat(8) + "5+ years experience required.";

    mockAxiosGet.mockResolvedValueOnce({
      data: makeGreenhouseHtml(jobText),
      status: 200,
      headers: { "content-type": "text/html" },
    });

    await caller.jdSnapshots.fetchFromUrl({ url: "https://example.com/pm-job" });

    const callArgs = mockAxiosGet.mock.calls[0];
    const config = callArgs[1] as any;
    expect(config.headers["User-Agent"]).toContain("Chrome");
    expect(config.headers["Accept-Encoding"]).toContain("gzip");
    expect(config.headers["Sec-Fetch-Dest"]).toBe("document");
  });

  // ── Test H: maxRedirects is set ───────────────────────────────────
  it("H) maxRedirects is configured for redirect following", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const jobText = "DevOps Engineer at CloudCo. ".repeat(8) + "AWS, Terraform, Docker required.";

    mockAxiosGet.mockResolvedValueOnce({
      data: makeGreenhouseHtml(jobText),
      status: 200,
      headers: { "content-type": "text/html" },
    });

    await caller.jdSnapshots.fetchFromUrl({ url: "https://example.com/devops" });

    const callArgs = mockAxiosGet.mock.calls[0];
    const config = callArgs[1] as any;
    expect(config.maxRedirects).toBeGreaterThan(0);
  });

  // ── Test I: 429 rate-limit returns gated message ──────────────────
  it("I) 429 rate-limit returns friendly gated-site message", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);

    mockAxiosGet.mockResolvedValueOnce({
      data: "<html><body>Too Many Requests</body></html>",
      status: 429,
      headers: { "content-type": "text/html" },
    });

    await expect(
      caller.jdSnapshots.fetchFromUrl({ url: "https://www.indeed.com/viewjob?jk=abc123" })
    ).rejects.toThrow(GATED_MESSAGE);
  });

  // ── Test J: Script-heavy page extracts via fallback ───────────────
  it("J) Script-heavy page still extracts usable text via fallback", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const jobText = "Data Engineer at AnalyticsCo. ".repeat(8) + "Spark, Kafka, Python, dbt required.";

    mockAxiosGet.mockResolvedValueOnce({
      data: makeScriptHeavyHtml(jobText),
      status: 200,
      headers: { "content-type": "text/html" },
    });

    const result = await caller.jdSnapshots.fetchFromUrl({ url: "https://example.com/data-engineer" });
    expect(result.text.length).toBeGreaterThan(200);
    expect(result.text).toContain("Data Engineer");
  });
});
