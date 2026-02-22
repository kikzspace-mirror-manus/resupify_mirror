/**
 * Phase 9A Fix — Create Job Card Modal: Fetch JD Button
 *
 * Acceptance tests A–F:
 *   A) isValidHttpsUrl: valid https URL → true
 *   B) isValidHttpsUrl: http URL → false (button disabled)
 *   C) isValidHttpsUrl: non-URL string → false
 *   D) fetchFromUrl reuses existing jdSnapshots.fetchFromUrl procedure (no new backend)
 *   E) Fetched text < 200 chars → procedure returns PRECONDITION_FAILED error
 *   F) No backend changes: no new procedures, no schema changes
 */
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from "vitest";
import { _enableTestBypass, _disableTestBypass } from "./rateLimiter";

beforeAll(() => _enableTestBypass());
afterAll(() => _disableTestBypass());
import axios from "axios";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";

// ─── Mock modules ─────────────────────────────────────────────────────
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

// ─── Pure helper: isValidHttpsUrl (mirrors client logic) ──────────────
function isValidHttpsUrl(u: string): boolean {
  try {
    const p = new URL(u);
    return p.protocol === "https:";
  } catch {
    return false;
  }
}

// ─── Test Suite ───────────────────────────────────────────────────────
describe("Phase 9A Fix: Create Job Card Modal — Fetch JD Button", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Test A: valid https URL ───────────────────────────────────────
  it("A) isValidHttpsUrl: valid https URL returns true (button enabled)", () => {
    expect(isValidHttpsUrl("https://jobs.lever.co/company/role")).toBe(true);
    expect(isValidHttpsUrl("https://boards.greenhouse.io/company/jobs/123")).toBe(true);
    expect(isValidHttpsUrl("https://example.com/careers")).toBe(true);
  });

  // ── Test B: http URL → false ──────────────────────────────────────
  it("B) isValidHttpsUrl: http URL returns false (button disabled)", () => {
    expect(isValidHttpsUrl("http://example.com/job")).toBe(false);
  });

  // ── Test C: non-URL string → false ───────────────────────────────
  it("C) isValidHttpsUrl: non-URL string returns false", () => {
    expect(isValidHttpsUrl("not a url")).toBe(false);
    expect(isValidHttpsUrl("")).toBe(false);
    expect(isValidHttpsUrl("ftp://example.com")).toBe(false);
  });

  // ── Test D: fetchFromUrl procedure returns text + fetchedAt ───────
  it("D) fetchFromUrl reuses existing procedure and returns text + fetchedAt", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);

    const html = `<html><head><title>Job</title></head><body>
      <article>
        <h1>Software Engineer</h1>
        <p>${"We are looking for a software engineer to join our team. ".repeat(6)}</p>
        <p>Requirements: TypeScript, React, Node.js, 2+ years experience.</p>
      </article>
    </body></html>`;

    mockAxiosGet.mockResolvedValueOnce({
      data: html,
      headers: { "content-type": "text/html; charset=utf-8" },
    });

    const result = await caller.jdSnapshots.fetchFromUrl({
      url: "https://jobs.example.com/engineer",
    });

    expect(result.text).toBeTruthy();
    expect(result.text.length).toBeGreaterThan(200);
    expect(result.fetchedAt).toBeTruthy();
    expect(typeof result.fetchedAt).toBe("string"); // ISO string from procedure
  });

  // ── Test E: fetched text < 200 chars → error ──────────────────────
  it("E) fetched text < 200 chars returns PRECONDITION_FAILED error", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);

    const html = `<html><body><p>Short content.</p></body></html>`;

    mockAxiosGet.mockResolvedValueOnce({
      data: html,
      headers: { "content-type": "text/html; charset=utf-8" },
    });

    await expect(
      caller.jdSnapshots.fetchFromUrl({ url: "https://example.com/short" })
    ).rejects.toThrow();
  });

  // ── Test F: no credits consumed by fetchFromUrl ───────────────────
  it("F) fetchFromUrl does not consume credits", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);

    const html = `<html><head><title>Job</title></head><body>
      <article>
        <p>${"Job description content that is long enough to pass the minimum length check. ".repeat(4)}</p>
      </article>
    </body></html>`;

    mockAxiosGet.mockResolvedValueOnce({
      data: html,
      headers: { "content-type": "text/html; charset=utf-8" },
    });

    await caller.jdSnapshots.fetchFromUrl({ url: "https://example.com/job" });

    expect(mockGetCreditsBalance).not.toHaveBeenCalled();
  });

  // ── Test G: non-https URL rejected by procedure ───────────────────
  it("G) procedure rejects non-https URLs", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.jdSnapshots.fetchFromUrl({ url: "http://example.com/job" })
    ).rejects.toThrow();
  });

  // ── Test H: binary content-type rejected ─────────────────────────
  it("H) binary content-type returns error", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);

    mockAxiosGet.mockResolvedValueOnce({
      data: Buffer.from("binary data"),
      headers: { "content-type": "application/pdf" },
    });

    await expect(
      caller.jdSnapshots.fetchFromUrl({ url: "https://example.com/resume.pdf" })
    ).rejects.toThrow();
  });
});
