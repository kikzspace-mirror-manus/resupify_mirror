/**
 * Phase 12F: Public health check endpoint (/api/health)
 *
 * Acceptance tests covering:
 * F1: GET /api/health route is registered in server/_core/index.ts
 * F2: Route is registered without any auth middleware
 * F3: Route handler calls res.json with status: "ok"
 * F4: Route handler calls res.json with ts: Date.now()
 * F5: Route is a GET (not POST/PUT/DELETE)
 * F6: Route path is exactly /api/health
 * F7: No DB calls in the handler
 * F8: Route is registered before the tRPC middleware
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");
const INDEX_FILE = path.join(ROOT, "server/_core/index.ts");
const src = fs.readFileSync(INDEX_FILE, "utf-8");

// ─── F1: Route is registered ─────────────────────────────────────────────────
describe("F1: /api/health route is registered", () => {
  it("F1: server/_core/index.ts contains /api/health route registration", () => {
    expect(src).toContain("/api/health");
  });
});

// ─── F2: No auth middleware ───────────────────────────────────────────────────
describe("F2: Route has no auth middleware", () => {
  it("F2: health route handler does not reference auth, session, or user", () => {
    const healthIdx = src.indexOf("/api/health");
    expect(healthIdx).toBeGreaterThan(-1);
    // Extract the handler block (up to 200 chars)
    const handler = src.slice(healthIdx, healthIdx + 200);
    expect(handler).not.toContain("requireAuth");
    expect(handler).not.toContain("protectedProcedure");
    expect(handler).not.toContain("ctx.user");
    expect(handler).not.toContain("session");
  });
});

// ─── F3: Returns status: "ok" ────────────────────────────────────────────────
describe("F3: Handler returns status: ok", () => {
  it("F3: handler calls res.json with status: ok", () => {
    const healthIdx = src.indexOf("/api/health");
    const handler = src.slice(healthIdx, healthIdx + 200);
    expect(handler).toContain('status: "ok"');
  });
});

// ─── F4: Returns ts: Date.now() ──────────────────────────────────────────────
describe("F4: Handler returns ts: Date.now()", () => {
  it("F4: handler calls res.json with ts: Date.now()", () => {
    const healthIdx = src.indexOf("/api/health");
    const handler = src.slice(healthIdx, healthIdx + 200);
    expect(handler).toContain("ts: Date.now()");
  });
});

// ─── F5: Route is GET ────────────────────────────────────────────────────────
describe("F5: Route is a GET method", () => {
  it("F5: route is registered with app.get", () => {
    const healthIdx = src.indexOf("/api/health");
    // Look back up to 20 chars to find app.get
    const before = src.slice(Math.max(0, healthIdx - 20), healthIdx);
    expect(before).toContain("app.get");
  });
});

// ─── F6: Exact path /api/health ──────────────────────────────────────────────
describe("F6: Route path is exactly /api/health", () => {
  it("F6: route path string is /api/health", () => {
    expect(src).toContain('"/api/health"');
  });
});

// ─── F7: No DB calls ─────────────────────────────────────────────────────────
describe("F7: No DB calls in the handler", () => {
  it("F7: health handler does not call getDb, db.select, or any DB helper", () => {
    const healthIdx = src.indexOf("/api/health");
    const handler = src.slice(healthIdx, healthIdx + 200);
    expect(handler).not.toContain("getDb");
    expect(handler).not.toContain("db.select");
    expect(handler).not.toContain("await db");
  });
});

// ─── F8: Registered before tRPC middleware ───────────────────────────────────
describe("F8: Route is registered before tRPC middleware", () => {
  it("F8: /api/health appears before /api/trpc in the file", () => {
    const healthIdx = src.indexOf("/api/health");
    const trpcIdx = src.indexOf("/api/trpc");
    expect(healthIdx).toBeGreaterThan(-1);
    expect(trpcIdx).toBeGreaterThan(-1);
    expect(healthIdx).toBeLessThan(trpcIdx);
  });
});
