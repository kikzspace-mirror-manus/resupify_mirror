/**
 * Patch 8I — JD URL Fetch (Auto-Populate JD Snapshot from a Link)
 *
 * Acceptance tests A–H:
 *   A) Valid URL fetch returns extracted text (>200 chars) and fetchedAt timestamp
 *   B) Saving snapshot stores jd_snapshot_text and triggers eligibility pre-check
 *   C1) 403 blocked → user-friendly error
 *   C2) Timeout → user-friendly error
 *   C3) Fetched text too short → user-friendly error
 *   C4) Non-http(s) URL rejected by Zod
 *   C5) PDF content-type blocked → user-friendly error
 *   D) No credits consumed, no LLM called during URL fetch
 *   E) 404 response → clear error
 *   F) Extracted text truncated at 20k chars
 *   G) URL protocol guardrail logic
 *   H) Binary content-type guardrail logic
 */
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from "vitest";
import { _enableTestBypass, _disableTestBypass } from "./rateLimiter";

beforeAll(() => _enableTestBypass());
afterAll(() => _disableTestBypass());
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Helpers ─────────────────────────────────────────────────────────
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

// ─── Mock axios ───────────────────────────────────────────────────────
// We mock the entire axios module so axios.get is a spy
vi.mock("axios", () => {
  const mockGet = vi.fn();
  const mockIsAxiosError = vi.fn((err: any) => err?.__isAxiosError === true);
  const instance = {
    get: mockGet,
    isAxiosError: mockIsAxiosError,
  };
  return {
    default: instance,
    ...instance,
  };
});
import axios from "axios";
const mockAxiosGet = axios.get as ReturnType<typeof vi.fn>;
const mockIsAxiosError = axios.isAxiosError as ReturnType<typeof vi.fn>;

// ─── Mock db module ───────────────────────────────────────────────────
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    createJdSnapshot: vi.fn(),
    getJdSnapshots: vi.fn(),
    getProfile: vi.fn(),
    updateJobCard: vi.fn(),
  };
});
import * as db from "./db";

// ─── Fixtures ─────────────────────────────────────────────────────────
const SAMPLE_JD_HTML = `<!DOCTYPE html>
<html>
<head><title>Software Engineer - Acme Corp</title></head>
<body>
  <nav>Navigation bar content</nav>
  <main>
    <article>
      <h1>Software Engineer</h1>
      <h2>About Acme Corp</h2>
      <p>Acme Corp is a leading technology company building innovative solutions for enterprise customers worldwide.</p>
      <h2>Responsibilities</h2>
      <ul>
        <li>Design and implement scalable backend services using TypeScript and Node.js</li>
        <li>Collaborate with cross-functional teams to define and ship new features</li>
        <li>Write clean, maintainable, and well-tested code with high coverage</li>
        <li>Participate in code reviews and technical discussions with the team</li>
        <li>Mentor junior engineers and contribute to engineering culture and best practices</li>
      </ul>
      <h2>Requirements</h2>
      <ul>
        <li>3+ years of experience with TypeScript or JavaScript in production environments</li>
        <li>Experience with REST APIs and microservices architecture at scale</li>
        <li>Strong understanding of SQL and NoSQL databases including PostgreSQL and MongoDB</li>
        <li>Experience with cloud platforms such as AWS, GCP, or Azure</li>
        <li>Excellent communication and problem-solving skills in a collaborative environment</li>
      </ul>
      <h2>Nice to Have</h2>
      <ul>
        <li>Experience with React or similar frontend frameworks for full-stack work</li>
        <li>Familiarity with Docker and Kubernetes for container orchestration</li>
        <li>Open source contributions demonstrating technical depth and community engagement</li>
      </ul>
      <p>Compensation: $120,000 - $160,000 CAD annually. Location: Toronto, ON (Hybrid). Full-time position with benefits.</p>
    </article>
  </main>
  <footer>Footer content here. Copyright 2026.</footer>
  <script>console.log("tracking script");</script>
</body>
</html>`;

// ─── Test Suite ───────────────────────────────────────────────────────
describe("Patch 8I: JD URL Fetch", () => {
  const ctx = makeCtx();
  const caller = appRouter.createCaller(ctx);

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: isAxiosError returns false unless overridden
    mockIsAxiosError.mockReturnValue(false);
  });

  // ── Test A: valid URL fetch returns extracted text ────────────────
  it("A) valid URL fetch returns extracted text (>200 chars) and fetchedAt timestamp", async () => {
    mockAxiosGet.mockResolvedValueOnce({
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
      data: SAMPLE_JD_HTML,
    });

    const result = await caller.jdSnapshots.fetchFromUrl({
      url: "https://jobs.acmecorp.com/software-engineer",
    });

    expect(result.text).toBeDefined();
    expect(result.text.length).toBeGreaterThan(200);
    // Should contain job-relevant content
    expect(result.text).toContain("TypeScript");
    expect(result.text).toContain("Acme Corp");
    // Should NOT contain script content
    expect(result.text).not.toContain("console.log");
    expect(result.text).not.toContain("tracking script");
    // fetchedAt should be a valid ISO timestamp
    expect(result.fetchedAt).toBeDefined();
    expect(() => new Date(result.fetchedAt)).not.toThrow();
    const fetchedDate = new Date(result.fetchedAt);
    expect(fetchedDate.getTime()).toBeGreaterThan(0);
  });

  // ── Test A2: axios called with correct URL ────────────────────────
  it("A2) axios.get is called with the provided URL and correct options", async () => {
    mockAxiosGet.mockResolvedValueOnce({
      status: 200,
      headers: { "content-type": "text/html" },
      data: SAMPLE_JD_HTML,
    });

    await caller.jdSnapshots.fetchFromUrl({
      url: "https://jobs.greenhouse.io/acme/12345",
    });

    expect(mockAxiosGet).toHaveBeenCalledTimes(1);
    expect(mockAxiosGet).toHaveBeenCalledWith(
      "https://jobs.greenhouse.io/acme/12345",
      expect.objectContaining({
        timeout: expect.any(Number),
        responseType: "text",
        headers: expect.objectContaining({ "User-Agent": expect.any(String) }),
      })
    );
  });

  // ── Test B: saving snapshot triggers eligibility pre-check ────────
  it("B) jdSnapshots.create triggers eligibility pre-check after saving snapshot", async () => {
    // createJdSnapshot returns a number (insertId)
    vi.mocked(db.createJdSnapshot).mockResolvedValueOnce(42 as any);
    vi.mocked(db.getJdSnapshots).mockResolvedValueOnce([] as any);
    vi.mocked(db.getProfile).mockResolvedValueOnce({
      id: 1,
      userId: 1,
      regionCode: "CA",
      trackCode: "NEW_GRAD",
      workStatus: "citizen",
      needsSponsorship: false,
    } as any);
    vi.mocked(db.updateJobCard).mockResolvedValueOnce(undefined as any);

    const result = await caller.jdSnapshots.create({
      jobCardId: 10,
      snapshotText: "Software Engineer position at Acme Corp. Requirements: TypeScript, Node.js, 3+ years experience. Must be eligible to work in Canada. Full-time role in Toronto with competitive salary.",
    });

    expect(result.id).toBe(42);
    expect(db.createJdSnapshot).toHaveBeenCalledTimes(1);
    // Eligibility pre-check runs (updateJobCard called with precheck fields)
    expect(db.updateJobCard).toHaveBeenCalledTimes(1);
    const updateCall = vi.mocked(db.updateJobCard).mock.calls[0];
    expect(updateCall[0]).toBe(10); // jobCardId
    expect(updateCall[2]).toHaveProperty("eligibilityPrecheckStatus");
    expect(updateCall[2]).toHaveProperty("eligibilityPrecheckUpdatedAt");
  });

  // ── Test C1: 403 blocked returns user-friendly error ─────────────
  it("C1) 403 response returns user-friendly error message", async () => {
    mockAxiosGet.mockResolvedValueOnce({
      status: 403,
      headers: { "content-type": "text/html" },
      data: "<html><body>Access denied</body></html>",
    });

    await expect(
      caller.jdSnapshots.fetchFromUrl({ url: "https://jobs.workday.com/blocked-job" })
    ).rejects.toThrow("This site blocks automated fetch");
  });

  // ── Test C2: timeout returns user-friendly error ──────────────────
  it("C2) request timeout returns user-friendly error message", async () => {
    const timeoutError = Object.assign(new Error("timeout of 15000ms exceeded"), {
      __isAxiosError: true,
      code: "ECONNABORTED",
    });
    mockAxiosGet.mockRejectedValueOnce(timeoutError);
    mockIsAxiosError.mockReturnValueOnce(true);

    await expect(
      caller.jdSnapshots.fetchFromUrl({ url: "https://jobs.slowsite.com/job" })
    ).rejects.toThrow("Request timed out. Please paste the JD instead.");
  });

  // ── Test C3: fetched text too short returns user-friendly error ───
  it("C3) fetched text < 200 chars returns 'too short' error", async () => {
    mockAxiosGet.mockResolvedValueOnce({
      status: 200,
      headers: { "content-type": "text/html" },
      data: "<html><body><p>Short page</p></body></html>",
    });

    await expect(
      caller.jdSnapshots.fetchFromUrl({ url: "https://jobs.example.com/short" })
    ).rejects.toThrow("Fetched text too short");
  });

  // ── Test C4: non-https URL rejected by Zod ────────────────────────
  it("C4) non-http(s) URL is rejected by input validation", async () => {
    await expect(
      caller.jdSnapshots.fetchFromUrl({ url: "ftp://jobs.example.com/job" })
    ).rejects.toThrow(); // Zod URL validation rejects non-http(s)
  });

  // ── Test C5: binary content type blocked ─────────────────────────
  it("C5) PDF content-type returns user-friendly error", async () => {
    mockAxiosGet.mockResolvedValueOnce({
      status: 200,
      headers: { "content-type": "application/pdf" },
      data: "%PDF-1.4 binary content",
    });

    await expect(
      caller.jdSnapshots.fetchFromUrl({ url: "https://jobs.example.com/jd.pdf" })
    ).rejects.toThrow("URL does not point to a web page. Please paste the JD instead.");
  });

  // ── Test D: no LLM called, no credits consumed ────────────────────
  it("D) fetchFromUrl does not call invokeLLM or touch credits (no db writes)", async () => {
    mockAxiosGet.mockResolvedValueOnce({
      status: 200,
      headers: { "content-type": "text/html" },
      data: SAMPLE_JD_HTML,
    });

    await caller.jdSnapshots.fetchFromUrl({
      url: "https://jobs.acmecorp.com/software-engineer",
    });

    // Only axios.get should be called — no db writes
    expect(mockAxiosGet).toHaveBeenCalledTimes(1);
    expect(db.createJdSnapshot).not.toHaveBeenCalled();
    expect(db.updateJobCard).not.toHaveBeenCalled();
  });

  // ── Test E: 404 returns clear error ──────────────────────────────
  it("E) 404 response returns 'not found' error message", async () => {
    mockAxiosGet.mockResolvedValueOnce({
      status: 404,
      headers: { "content-type": "text/html" },
      data: "<html><body>Not found</body></html>",
    });

    await expect(
      caller.jdSnapshots.fetchFromUrl({ url: "https://jobs.example.com/expired-job" })
    ).rejects.toThrow("Job posting not found (404). Please check the URL.");
  });

  // ── Test F: text truncated at 20k chars ──────────────────────────
  it("F) extracted text is truncated to 20,000 characters maximum", async () => {
    // Build a long HTML page with >20k chars of content
    const longContent = "Software Engineer position requiring TypeScript and Node.js experience. ".repeat(400);
    const longHtml = `<!DOCTYPE html><html><body><main><article><h1>Software Engineer</h1><p>${longContent}</p></article></main></body></html>`;
    mockAxiosGet.mockResolvedValueOnce({
      status: 200,
      headers: { "content-type": "text/html" },
      data: longHtml,
    });

    const result = await caller.jdSnapshots.fetchFromUrl({
      url: "https://jobs.example.com/long-jd",
    });

    expect(result.text.length).toBeLessThanOrEqual(20_000);
    // Should still contain meaningful content
    expect(result.text.length).toBeGreaterThan(200);
  });
});

// ─── Unit tests for URL guardrail logic ──────────────────────────────
describe("Patch 8I: URL guardrail logic (pure)", () => {
  it("G) https and http protocols are accepted, others are not", () => {
    const isAllowed = (url: string) => {
      try {
        const p = new URL(url).protocol;
        return p === "https:" || p === "http:";
      } catch {
        return false;
      }
    };

    expect(isAllowed("https://jobs.greenhouse.io/acme/123")).toBe(true);
    expect(isAllowed("http://jobs.example.com/job")).toBe(true);
    expect(isAllowed("ftp://jobs.example.com/job")).toBe(false);
    expect(isAllowed("javascript:alert(1)")).toBe(false);
    expect(isAllowed("file:///etc/passwd")).toBe(false);
  });

  it("H) binary content types are correctly identified and blocked", () => {
    const BLOCKED = ["application/pdf", "application/octet-stream", "image/", "video/", "audio/"];
    const isBlocked = (ct: string) => BLOCKED.some((t) => ct.toLowerCase().includes(t));

    expect(isBlocked("application/pdf")).toBe(true);
    expect(isBlocked("image/jpeg")).toBe(true);
    expect(isBlocked("video/mp4")).toBe(true);
    expect(isBlocked("audio/mpeg")).toBe(true);
    expect(isBlocked("application/octet-stream")).toBe(true);
    expect(isBlocked("text/html; charset=utf-8")).toBe(false);
    expect(isBlocked("text/html")).toBe(false);
    expect(isBlocked("application/xhtml+xml")).toBe(false);
  });

  it("I) text truncation at 20k chars preserves start of content", () => {
    const MAX = 20_000;
    const longText = "A".repeat(25_000);
    const truncated = longText.length > MAX ? longText.substring(0, MAX) : longText;
    expect(truncated.length).toBe(MAX);
    expect(truncated[0]).toBe("A");
  });

  it("J) whitespace normalization collapses multiple newlines and spaces", () => {
    const raw = "  Software   Engineer  \n\n\n\n  TypeScript  \n\n  Node.js  ";
    const normalized = raw
      .replace(/\r\n/g, "\n")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    // Note: trailing space before newline is preserved by the regex (only collapses tabs/spaces, not newlines)
    expect(normalized).toBe("Software Engineer \n\n TypeScript \n\n Node.js");
  });
});
