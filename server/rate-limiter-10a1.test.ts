/**
 * Phase 10A-1 — Rate Limiter Acceptance Tests
 *
 * A) checkRateLimit allows requests within the limit
 * B) checkRateLimit blocks after limit is exceeded and returns retryAfterSeconds
 * C) Window expiry: requests older than windowMs are not counted
 * D) Per-user and per-IP keys are independent (different buckets)
 * E) buildRateLimitBody returns correct 429 JSON shape
 * F) LIMITS constants match spec (6/10/8/30/20 per 10 min)
 * G) getClientIp returns req.ip when available
 * H) authRateLimitMiddleware returns 429 JSON with Retry-After header when exceeded
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  checkRateLimit,
  buildRateLimitBody,
  getClientIp,
  LIMITS,
  RATE_LIMITED_CODE,
  authRateLimitMiddleware,
  _clearStoreForTests,
} from "./rateLimiter";

/**
 * checkRateLimit skips limiting when NODE_ENV=test.
 * For tests that need to actually exercise the limit logic, we temporarily
 * override NODE_ENV to a non-test value.
 */
function checkRateLimitForReal(key: string, config: typeof LIMITS[keyof typeof LIMITS]) {
  const orig = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  try {
    return checkRateLimit(key, config);
  } finally {
    process.env.NODE_ENV = orig;
  }
}
import type { Request, Response } from "express";

// ─── Reset store between tests ───────────────────────────────────────────────
beforeEach(() => {
  _clearStoreForTests();
});

function uniqueKey(prefix: string) {
  return `${prefix}:${Math.random().toString(36).slice(2)}`;
}

// ─── Test A: Requests within limit are allowed ────────────────────────────────
describe("Test A: Requests within limit are allowed", () => {
  it("A1) First request is always allowed", () => {
    const key = uniqueKey("a1");
    const result = checkRateLimitForReal(key, LIMITS.EVIDENCE_USER);
    expect(result.allowed).toBe(true);
  });

  it("A2) Requests up to the limit are all allowed", () => {
    const key = uniqueKey("a2");
    for (let i = 0; i < 10; i++) {
      expect(checkRateLimitForReal(key, LIMITS.EVIDENCE_USER).allowed).toBe(true);
    }
  });

  it("A3) Allowed result has retryAfterSeconds=0", () => {
    const key = uniqueKey("a3");
    const result = checkRateLimitForReal(key, LIMITS.EVIDENCE_USER);
    expect(result.retryAfterSeconds).toBe(0);
  });
});

// ─── Test B: Requests exceeding limit are blocked ────────────────────────────
describe("Test B: Requests exceeding limit are blocked", () => {
  it("B1) Request at limit+1 is blocked", () => {
    const key = uniqueKey("b1");
    // EVIDENCE_USER limit = 10; exhaust then check 11th
    for (let i = 0; i < 10; i++) checkRateLimitForReal(key, LIMITS.EVIDENCE_USER);
    const result = checkRateLimitForReal(key, LIMITS.EVIDENCE_USER);
    expect(result.allowed).toBe(false);
  });

  it("B2) Blocked result has retryAfterSeconds > 0", () => {
    const key = uniqueKey("b2");
    // AUTH_IP limit = 20; exhaust then check 21st
    for (let i = 0; i < 20; i++) checkRateLimitForReal(key, LIMITS.AUTH_IP);
    const result = checkRateLimitForReal(key, LIMITS.AUTH_IP);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("B3) retryAfterSeconds is a positive integer (ceiling)", () => {
    const key = uniqueKey("b3");
    // KIT_USER limit = 10; exhaust then check 11th
    for (let i = 0; i < 10; i++) checkRateLimitForReal(key, LIMITS.KIT_USER);
    const result = checkRateLimitForReal(key, LIMITS.KIT_USER);
    expect(Number.isInteger(result.retryAfterSeconds)).toBe(true);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
    expect(result.retryAfterSeconds).toBeLessThanOrEqual(600); // max is 10 min
  });
});

// ─── Test C: Window expiry ────────────────────────────────────────────────────
describe("Test C: Requests outside the window are not counted", () => {
  it("C1) Timestamps older than windowMs are pruned and do not count", () => {
    const key = uniqueKey("c1");
    const config = { limit: 2, windowMs: 1_000 }; // 1 second window

    // Exhaust limit using real check
    const orig = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    checkRateLimit(key, config);
    checkRateLimit(key, config);
    expect(checkRateLimit(key, config).allowed).toBe(false);

    // Advance time past the window using vi.setSystemTime
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 2_000); // 2 seconds later
    // Now the window has expired — requests should be allowed again
    const result = checkRateLimit(key, config);
    vi.useRealTimers();
    process.env.NODE_ENV = orig;
    expect(result.allowed).toBe(true);
  });
});

// ─── Test D: Per-user and per-IP keys are independent ────────────────────────
describe("Test D: Per-user and per-IP keys are independent buckets", () => {
  it("D1) Different key prefixes do not share counts", () => {
    const userKey = uniqueKey("user:1");
    const ipKey = uniqueKey("ip:127.0.0.1");

    // Exhaust EVIDENCE_USER limit on userKey
    for (let i = 0; i < 10; i++) checkRateLimitForReal(userKey, LIMITS.EVIDENCE_USER);
    expect(checkRateLimitForReal(userKey, LIMITS.EVIDENCE_USER).allowed).toBe(false);

    // IP key is independent — still allowed
    expect(checkRateLimitForReal(ipKey, LIMITS.EVIDENCE_USER).allowed).toBe(true);
  });

  it("D2) Same key exhausted by both dimensions independently", () => {
    const base = Math.random().toString(36).slice(2);
    const userKey = `evidence:user:${base}`;
    const ipKey = `evidence:ip:${base}`;

    for (let i = 0; i < 10; i++) checkRateLimitForReal(userKey, LIMITS.EVIDENCE_USER);
    expect(checkRateLimitForReal(userKey, LIMITS.EVIDENCE_USER).allowed).toBe(false);

    // IP key still has capacity
    checkRateLimitForReal(ipKey, LIMITS.EVIDENCE_USER);
    expect(checkRateLimitForReal(ipKey, LIMITS.EVIDENCE_USER).allowed).toBe(true);
  });
});

// ─── Test E: 429 JSON shape ───────────────────────────────────────────────────
describe("Test E: buildRateLimitBody returns correct 429 JSON shape", () => {
  it("E1) Returns error=RATE_LIMITED", () => {
    const body = buildRateLimitBody(30);
    expect(body.error).toBe(RATE_LIMITED_CODE);
    expect(body.error).toBe("RATE_LIMITED");
  });

  it("E2) Returns retryAfterSeconds matching input", () => {
    expect(buildRateLimitBody(45).retryAfterSeconds).toBe(45);
    expect(buildRateLimitBody(1).retryAfterSeconds).toBe(1);
  });

  it("E3) Message contains the retryAfterSeconds value", () => {
    const body = buildRateLimitBody(60);
    expect(body.message).toContain("60s");
  });

  it("E4) Message contains 'too fast' phrasing", () => {
    const body = buildRateLimitBody(10);
    expect(body.message.toLowerCase()).toContain("too fast");
  });

  it("E5) Body has exactly the three required keys", () => {
    const body = buildRateLimitBody(5);
    expect(Object.keys(body).sort()).toEqual(["error", "message", "retryAfterSeconds"].sort());
  });
});

// ─── Test F: LIMITS constants match spec ─────────────────────────────────────
describe("Test F: LIMITS constants match Phase 10A-1 spec", () => {
  const TEN_MINUTES = 10 * 60 * 1000;

  it("F1) EVIDENCE_USER: 10 per 10 min", () => {
    expect(LIMITS.EVIDENCE_USER.limit).toBe(10);
    expect(LIMITS.EVIDENCE_USER.windowMs).toBe(TEN_MINUTES);
  });

  it("F2) OUTREACH_USER: 10 per 10 min", () => {
    expect(LIMITS.OUTREACH_USER.limit).toBe(10);
    expect(LIMITS.OUTREACH_USER.windowMs).toBe(TEN_MINUTES);
  });

  it("F3) KIT_USER: 10 per 10 min", () => {
    expect(LIMITS.KIT_USER.limit).toBe(10);
    expect(LIMITS.KIT_USER.windowMs).toBe(TEN_MINUTES);
  });

  it("F4) URL_FETCH_IP: 20 per hour", () => {
    expect(LIMITS.URL_FETCH_IP.limit).toBe(20);
    expect(LIMITS.URL_FETCH_IP.windowMs).toBe(60 * 60 * 1000);
  });

  it("F5) AUTH_IP: 20 per 10 min", () => {
    expect(LIMITS.AUTH_IP.limit).toBe(20);
    expect(LIMITS.AUTH_IP.windowMs).toBe(TEN_MINUTES);
  });
});

// ─── Test G: getClientIp ──────────────────────────────────────────────────────
describe("Test G: getClientIp extracts IP from request", () => {
  it("G1) Returns req.ip when available", () => {
    const req = { ip: "1.2.3.4", socket: { remoteAddress: "5.6.7.8" } } as unknown as Request;
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("G2) Falls back to socket.remoteAddress when req.ip is undefined", () => {
    const req = { ip: undefined, socket: { remoteAddress: "5.6.7.8" } } as unknown as Request;
    expect(getClientIp(req)).toBe("5.6.7.8");
  });

  it("G3) Returns 'unknown' when both are absent", () => {
    const req = { ip: undefined, socket: undefined } as unknown as Request;
    expect(getClientIp(req)).toBe("unknown");
  });
});

// ─── Test H: authRateLimitMiddleware ─────────────────────────────────────────
describe("Test H: authRateLimitMiddleware returns 429 when limit exceeded", () => {
  function makeReqRes(ip: string) {
    const headers: Record<string, string> = {};
    const body: any = {};
    let statusCode = 200;
    const res = {
      setHeader: (k: string, v: string) => { headers[k] = v; },
      status: (code: number) => { statusCode = code; return res; },
      json: (data: any) => { Object.assign(body, data); },
    } as unknown as Response;
    const req = { ip, socket: { remoteAddress: ip } } as unknown as Request;
    return { req, res, headers, body, getStatus: () => statusCode };
  }

  it("H1) Requests within limit call next()", () => {
    const { req, res } = makeReqRes(`h1-${Math.random()}`);
    let nextCalled = false;
    authRateLimitMiddleware(req, res, () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
  });

  it("H2) After exceeding AUTH_IP limit, returns 429 JSON with RATE_LIMITED error", () => {
    const ip = `h2-${Math.random()}`;
    const { req, res, body, getStatus } = makeReqRes(ip);
    const orig = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    // Exhaust the limit (20 per 10 min)
    for (let i = 0; i < 20; i++) {
      const { req: r, res: rs } = makeReqRes(ip);
      authRateLimitMiddleware(r, rs, () => {});
    }
    // 21st request should be blocked
    authRateLimitMiddleware(req, res, () => {});
    process.env.NODE_ENV = orig;
    expect(getStatus()).toBe(429);
    expect(body.error).toBe("RATE_LIMITED");
    expect(body.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("H3) 429 response sets Retry-After header", () => {
    const ip = `h3-${Math.random()}`;
    const { req, res, headers } = makeReqRes(ip);
    const orig = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    // Exhaust the AUTH_IP limit
    for (let i = 0; i < 20; i++) {
      const { req: r, res: rs } = makeReqRes(ip);
      authRateLimitMiddleware(r, rs, () => {});
    }
    authRateLimitMiddleware(req, res, () => {});
    process.env.NODE_ENV = orig;
    // Retry-After header should be set on the blocked response
    expect(headers["Retry-After"]).toBeDefined();
  });
});
