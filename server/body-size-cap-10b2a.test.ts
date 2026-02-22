/**
 * Phase 10B-2A — HTTP Body Size Cap
 *
 * Tests: oversized payloads are rejected before reaching tRPC handlers,
 * and no credits are spent on rejected requests.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "./routers";
import { createContext } from "./_core/context";
import { _enableTestBypass, _disableTestBypass } from "./rateLimiter";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildTestApp(bodyLimit: string) {
  const app = express();
  app.use(express.json({ limit: bodyLimit }));
  app.use(
    "/api/trpc",
    createExpressMiddleware({ router: appRouter, createContext })
  );
  return app;
}

async function postTrpc(
  app: express.Express,
  procedure: string,
  body: unknown
): Promise<{ status: number; json: unknown }> {
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as { port: number }).port;

  const res = await fetch(`http://localhost:${port}/api/trpc/${procedure}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  await new Promise<void>((resolve, reject) =>
    server.close((err) => (err ? reject(err) : resolve()))
  );
  return { status: res.status, json };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Phase 10B-2A: HTTP body size cap", () => {
  beforeAll(() => _enableTestBypass());
  afterAll(() => _disableTestBypass());

  it("A1: request within 512 kb limit is not rejected by body parser", async () => {
    // A 10 kb JSON body — well within limit
    const app = buildTestApp("512kb");
    const smallText = "x".repeat(10_000);
    const { status } = await postTrpc(app, "jobCards.create", {
      title: "Test Job",
      company: "Acme",
      jdText: smallText,
    });
    // Should reach the tRPC handler (may return 401 UNAUTHORIZED, not 413)
    expect(status).not.toBe(413);
  });

  it("A2: request exceeding 512 kb limit is rejected with 413", async () => {
    const app = buildTestApp("512kb");
    // 600 kb of text — exceeds the 512 kb limit
    const oversizedText = "x".repeat(600_000);
    const { status } = await postTrpc(app, "jobCards.create", {
      title: "Test Job",
      company: "Acme",
      jdText: oversizedText,
    });
    expect(status).toBe(413);
  });

  it("A3: 413 response is returned before any tRPC handler runs (no TRPC error shape)", async () => {
    const app = buildTestApp("512kb");
    const oversizedText = "x".repeat(600_000);
    const { status, json } = await postTrpc(app, "evidence.run", {
      jobCardId: 1,
      resumeId: 1,
      resumeText: oversizedText,
    });
    expect(status).toBe(413);
    // Express body-parser returns its own error, not a tRPC error shape
    // The response should NOT contain a tRPC "result" or "error" key at the top level
    const body = json as Record<string, unknown> | null;
    expect(body?.result).toBeUndefined();
    // tRPC wraps errors in { error: { ... } } — body parser rejects before that
    if (body?.error) {
      // If Express does return JSON, it should not be a tRPC error with a "code" field
      const err = body.error as Record<string, unknown>;
      expect(err?.code).toBeUndefined();
    }
  });

  it("A4: evidence.run with oversized body returns 413 (credits never checked)", async () => {
    const app = buildTestApp("512kb");
    const oversizedResume = "x".repeat(600_000);
    const { status } = await postTrpc(app, "evidence.run", {
      jobCardId: 1,
      resumeId: 1,
      resumeText: oversizedResume,
    });
    // 413 means the body parser rejected it before the tRPC handler ran,
    // so getCreditsBalance and spendCredits were never called.
    expect(status).toBe(413);
  });

  it("A5: outreach.generatePack with oversized body returns 413", async () => {
    const app = buildTestApp("512kb");
    const oversizedSources = "x".repeat(600_000);
    const { status } = await postTrpc(app, "outreach.generatePack", {
      jobCardId: 1,
      contactId: 1,
      sources: oversizedSources,
    });
    expect(status).toBe(413);
  });

  it("A6: applicationKits.generate with oversized body returns 413", async () => {
    const app = buildTestApp("512kb");
    const oversizedText = "x".repeat(600_000);
    const { status } = await postTrpc(app, "applicationKits.generate", {
      jobCardId: 1,
      resumeId: 1,
      tone: oversizedText,
    });
    expect(status).toBe(413);
  });

  it("B1: normal resume text (25 kb) is not rejected", async () => {
    const app = buildTestApp("512kb");
    const normalResume = "x".repeat(25_000);
    const { status } = await postTrpc(app, "evidence.run", {
      jobCardId: 1,
      resumeId: 1,
      resumeText: normalResume,
    });
    // Should reach the tRPC handler — 401 UNAUTHORIZED (not logged in), not 413
    expect(status).not.toBe(413);
  });

  it("B2: normal JD text (25 kb) is not rejected", async () => {
    const app = buildTestApp("512kb");
    const normalJd = "x".repeat(25_000);
    const { status } = await postTrpc(app, "jobCards.create", {
      title: "Test Job",
      company: "Acme",
      jdText: normalJd,
    });
    expect(status).not.toBe(413);
  });
});
