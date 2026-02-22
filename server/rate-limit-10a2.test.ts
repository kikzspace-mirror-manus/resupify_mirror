/**
 * Phase 10A-2 — Rate Limit: No-Debit Guarantee + 429 Trigger Tests
 *
 * Acceptance criteria:
 * A) evidence.run 429 triggers (error=RATE_LIMITED, retryAfterSeconds present)
 * B) evidence.run 429 → zero credit debit, zero ledger write
 * C) outreach.generatePack 429 triggers
 * D) outreach.generatePack 429 → zero credit debit, zero ledger write
 * E) applicationKits.generate 429 triggers
 * F) jdSnapshots.fetchFromUrl 429 triggers (per-IP)
 * G) auth endpoint per-IP 429 triggers (via authRateLimitMiddleware)
 * H) Non-admin cannot access sandbox behavior (sandbox scoping unchanged)
 */
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import {
  _enableTestBypass,
  _disableTestBypass,
  _clearStoreForTests,
  checkRateLimit,
  LIMITS,
  authRateLimitMiddleware,
  buildRateLimitBody,
} from "./rateLimiter";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeCtx(userId = 1): TrpcContext {
  return {
    user: {
      id: userId,
      openId: `test-user-${userId}`,
      name: "Test User",
      email: `test${userId}@example.com`,
      loginMethod: "manus",
      role: "user",
      disabled: false,
      isAdmin: false,
      adminNotes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {}, ip: "127.0.0.1", socket: { remoteAddress: "127.0.0.1" } } as TrpcContext["req"],
    res: { clearCookie: vi.fn(), setHeader: vi.fn() } as unknown as TrpcContext["res"],
  };
}

/** Run checkRateLimit with bypass disabled (real enforcement). */
function checkReal(key: string, config: typeof LIMITS[keyof typeof LIMITS]) {
  _disableTestBypass();
  try {
    return checkRateLimit(key, config);
  } finally {
    _enableTestBypass();
  }
}

/** Exhaust a bucket by calling checkReal limit+1 times, returning the last (blocked) result. */
function exhaustBucket(prefix: string, config: typeof LIMITS[keyof typeof LIMITS]) {
  const key = `${prefix}:${Math.random().toString(36).slice(2)}`;
  for (let i = 0; i < config.limit; i++) checkReal(key, config);
  return { key, result: checkReal(key, config) };
}

// ─── Mock db module ───────────────────────────────────────────────────────────

const mockGetBalance = vi.fn();
const mockSpend = vi.fn();
const mockGetReqs = vi.fn();
const mockGetResume = vi.fn();
const mockGetSnapshot = vi.fn();
const mockGetProfile = vi.fn();
const mockCreateRun = vi.fn();
const mockUpdateRun = vi.fn();
const mockCreateItems = vi.fn();
const mockCreateTask = vi.fn();
const mockGetJobCard = vi.fn();
const mockGetPack = vi.fn();
const mockGetContacts = vi.fn();
const mockGetExistingKit = vi.fn();
const mockCreateKit = vi.fn();
const mockUpdateKit = vi.fn();
const mockGetEvidenceRun = vi.fn();
const mockGetLatestEvidenceRun = vi.fn();

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getCreditsBalance: (...a: any[]) => mockGetBalance(...a),
    spendCredits: (...a: any[]) => mockSpend(...a),
    getRequirements: (...a: any[]) => mockGetReqs(...a),
    getResumeById: (...a: any[]) => mockGetResume(...a),
    getLatestJdSnapshot: (...a: any[]) => mockGetSnapshot(...a),
    getProfile: (...a: any[]) => mockGetProfile(...a),
    createEvidenceRun: (...a: any[]) => mockCreateRun(...a),
    updateEvidenceRun: (...a: any[]) => mockUpdateRun(...a),
    createEvidenceItems: (...a: any[]) => mockCreateItems(...a),
    createTask: (...a: any[]) => mockCreateTask(...a),
    getJobCardById: (...a: any[]) => mockGetJobCard(...a),
    getOutreachPack: (...a: any[]) => mockGetPack(...a),
    getContacts: (...a: any[]) => mockGetContacts(...a),
    getApplicationKit: (...a: any[]) => mockGetExistingKit(...a),
    createApplicationKit: (...a: any[]) => mockCreateKit(...a),
    updateApplicationKit: (...a: any[]) => mockUpdateKit(...a),
    getEvidenceRunById: (...a: any[]) => mockGetEvidenceRun(...a),
    getLatestEvidenceRun: (...a: any[]) => mockGetLatestEvidenceRun(...a),
  };
});

vi.mock("./server/_core/llm", () => ({ invokeLLM: vi.fn() }));
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{ message: { content: JSON.stringify({
      items: [],
      seniority_signal: "junior",
    }) } }],
  }),
}));

// ─── Setup / teardown ─────────────────────────────────────────────────────────

beforeAll(() => {
  _enableTestBypass();
});

afterAll(() => {
  _disableTestBypass();
});

beforeEach(() => {
  vi.clearAllMocks();
  _clearStoreForTests();
  _enableTestBypass(); // ensure bypass is on for non-rate-limit tests
});

// ─── Test A: evidence.run 429 triggers ───────────────────────────────────────

describe("Test A: evidence.run 429 triggers correctly", () => {
  it("A1) Exhausting EVIDENCE_USER bucket returns allowed=false", () => {
    const { result } = exhaustBucket("evidence:user:1", LIMITS.EVIDENCE_USER);
    expect(result.allowed).toBe(false);
  });

  it("A2) Blocked result has retryAfterSeconds > 0", () => {
    const { result } = exhaustBucket("evidence:user:2", LIMITS.EVIDENCE_USER);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("A3) buildRateLimitBody includes error=RATE_LIMITED and retryAfterSeconds", () => {
    const { result } = exhaustBucket("evidence:user:3", LIMITS.EVIDENCE_USER);
    const body = buildRateLimitBody(result.retryAfterSeconds);
    expect(body.error).toBe("RATE_LIMITED");
    expect(body.retryAfterSeconds).toBeGreaterThan(0);
    expect(typeof body.message).toBe("string");
    expect(body.message).toContain("wait");
  });

  it("A4) tRPC procedure throws TOO_MANY_REQUESTS when bucket is exhausted", async () => {
    // Exhaust the bucket for user 99 without bypass
    const key = `evidence:user:99`;
    _disableTestBypass();
    for (let i = 0; i < LIMITS.EVIDENCE_USER.limit; i++) checkRateLimit(key, LIMITS.EVIDENCE_USER);

    // Now call the procedure — it should throw TOO_MANY_REQUESTS
    const caller = appRouter.createCaller(makeCtx(99));
    await expect(
      caller.evidence.run({ jobCardId: 1, resumeId: 1 })
    ).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });

    _enableTestBypass();
  });
});

// ─── Test B: evidence.run 429 → zero credit debit ────────────────────────────

describe("Test B: evidence.run 429 causes zero credit debit and zero ledger write", () => {
  it("B1) spendCredits is never called when rate limited", async () => {
    const key = `evidence:user:100`;
    _disableTestBypass();
    for (let i = 0; i < LIMITS.EVIDENCE_USER.limit; i++) checkRateLimit(key, LIMITS.EVIDENCE_USER);

    const caller = appRouter.createCaller(makeCtx(100));
    try {
      await caller.evidence.run({ jobCardId: 1, resumeId: 1 });
    } catch {}

    _enableTestBypass();
    expect(mockSpend).not.toHaveBeenCalled();
  });

  it("B2) getCreditsBalance is never called when rate limited (limiter fires first)", async () => {
    const key = `evidence:user:101`;
    _disableTestBypass();
    for (let i = 0; i < LIMITS.EVIDENCE_USER.limit; i++) checkRateLimit(key, LIMITS.EVIDENCE_USER);

    const caller = appRouter.createCaller(makeCtx(101));
    try {
      await caller.evidence.run({ jobCardId: 1, resumeId: 1 });
    } catch {}

    _enableTestBypass();
    expect(mockGetBalance).not.toHaveBeenCalled();
  });
});

// ─── Test C: outreach.generatePack 429 triggers ──────────────────────────────

describe("Test C: outreach.generatePack 429 triggers correctly", () => {
  it("C1) Exhausting OUTREACH_USER bucket returns allowed=false", () => {
    const { result } = exhaustBucket("outreach:user:1", LIMITS.OUTREACH_USER);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("C2) tRPC procedure throws TOO_MANY_REQUESTS when bucket is exhausted", async () => {
    const key = `outreach:user:200`;
    _disableTestBypass();
    for (let i = 0; i < LIMITS.OUTREACH_USER.limit; i++) checkRateLimit(key, LIMITS.OUTREACH_USER);

    const caller = appRouter.createCaller(makeCtx(200));
    await expect(
      caller.outreach.generatePack({ jobCardId: 1 })
    ).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });

    _enableTestBypass();
  });
});

// ─── Test D: outreach.generatePack 429 → zero credit debit ───────────────────

describe("Test D: outreach.generatePack 429 causes zero credit debit", () => {
  it("D1) spendCredits is never called when outreach rate limited", async () => {
    const key = `outreach:user:201`;
    _disableTestBypass();
    for (let i = 0; i < LIMITS.OUTREACH_USER.limit; i++) checkRateLimit(key, LIMITS.OUTREACH_USER);

    const caller = appRouter.createCaller(makeCtx(201));
    try {
      await caller.outreach.generatePack({ jobCardId: 1 });
    } catch {}

    _enableTestBypass();
    expect(mockSpend).not.toHaveBeenCalled();
  });

  it("D2) getCreditsBalance is never called when outreach rate limited", async () => {
    const key = `outreach:user:202`;
    _disableTestBypass();
    for (let i = 0; i < LIMITS.OUTREACH_USER.limit; i++) checkRateLimit(key, LIMITS.OUTREACH_USER);

    const caller = appRouter.createCaller(makeCtx(202));
    try {
      await caller.outreach.generatePack({ jobCardId: 1 });
    } catch {}

    _enableTestBypass();
    expect(mockGetBalance).not.toHaveBeenCalled();
  });
});

// ─── Test E: applicationKits.generate 429 triggers ───────────────────────────

describe("Test E: applicationKits.generate 429 triggers correctly", () => {
  it("E1) Exhausting KIT_USER bucket returns allowed=false", () => {
    const { result } = exhaustBucket("kit:user:1", LIMITS.KIT_USER);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("E2) tRPC procedure throws TOO_MANY_REQUESTS when bucket is exhausted", async () => {
    const key = `kit:user:300`;
    _disableTestBypass();
    for (let i = 0; i < LIMITS.KIT_USER.limit; i++) checkRateLimit(key, LIMITS.KIT_USER);

    const caller = appRouter.createCaller(makeCtx(300));
    await expect(
      caller.applicationKits.generate({ jobCardId: 1, resumeId: 1, evidenceRunId: 1 })
    ).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });

    _enableTestBypass();
  });
});

// ─── Test F: jdSnapshots.fetchFromUrl 429 triggers ───────────────────────────

describe("Test F: jdSnapshots.fetchFromUrl 429 triggers (per-IP)", () => {
  it("F1) Exhausting URL_FETCH_IP bucket returns allowed=false", () => {
    const { result } = exhaustBucket("urlfetch:ip:10.0.0.1", LIMITS.URL_FETCH_IP);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("F2) buildRateLimitBody for URL fetch has correct shape", () => {
    const body = buildRateLimitBody(120);
    expect(body.error).toBe("RATE_LIMITED");
    expect(body.retryAfterSeconds).toBe(120);
    expect(body.message).toContain("120s");
  });

  it("F3) tRPC procedure throws TOO_MANY_REQUESTS when URL fetch IP bucket is exhausted", async () => {
    // Use a unique IP per test to avoid cross-test contamination
    const testIp = `10.0.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    const key = `urlfetch:ip:${testIp}`;
    _disableTestBypass();
    for (let i = 0; i < LIMITS.URL_FETCH_IP.limit; i++) checkRateLimit(key, LIMITS.URL_FETCH_IP);

    // Create context with the test IP
    const ctx = makeCtx(400);
    (ctx.req as any).ip = testIp;

    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.jdSnapshots.fetchFromUrl({ url: "https://example.com/job" })
    ).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });

    _enableTestBypass();
  });
});

// ─── Test G: Auth per-IP 429 triggers ────────────────────────────────────────

describe("Test G: Auth per-IP 429 triggers via authRateLimitMiddleware", () => {
  function makeReqRes(ip: string) {
    const headers: Record<string, string> = {};
    let status = 200;
    let body: any = null;
    const req = { ip, socket: { remoteAddress: ip }, headers: {} } as any;
    const res = {
      setHeader: (k: string, v: string) => { headers[k] = v; },
      status: (s: number) => { status = s; return res; },
      json: (b: any) => { body = b; },
    } as any;
    return { req, res, headers, getStatus: () => status, getBody: () => body };
  }

  it("G1) Requests within AUTH_IP limit call next()", () => {
    const ip = `g1-${Math.random()}`;
    const { req, res } = makeReqRes(ip);
    let nextCalled = false;
    _disableTestBypass();
    authRateLimitMiddleware(req, res, () => { nextCalled = true; });
    _enableTestBypass();
    expect(nextCalled).toBe(true);
  });

  it("G2) After exceeding AUTH_IP limit, returns 429 with RATE_LIMITED error", () => {
    const ip = `g2-${Math.random()}`;
    _disableTestBypass();
    for (let i = 0; i < LIMITS.AUTH_IP.limit; i++) {
      const { req, res } = makeReqRes(ip);
      authRateLimitMiddleware(req, res, () => {});
    }
    const { req, res, getStatus, getBody } = makeReqRes(ip);
    authRateLimitMiddleware(req, res, () => {});
    _enableTestBypass();
    expect(getStatus()).toBe(429);
    expect(getBody().error).toBe("RATE_LIMITED");
    expect(getBody().retryAfterSeconds).toBeGreaterThan(0);
  });

  it("G3) 429 response sets Retry-After header", () => {
    const ip = `g3-${Math.random()}`;
    _disableTestBypass();
    for (let i = 0; i < LIMITS.AUTH_IP.limit; i++) {
      const { req, res } = makeReqRes(ip);
      authRateLimitMiddleware(req, res, () => {});
    }
    const { req, res, headers } = makeReqRes(ip);
    authRateLimitMiddleware(req, res, () => {});
    _enableTestBypass();
    expect(headers["Retry-After"]).toBeDefined();
  });
});

// ─── Test H: Admin sandbox scoping unchanged ──────────────────────────────────

describe("Test H: Non-admin cannot access sandbox behavior", () => {
  it("H1) Non-admin user calling evidence.run goes through the normal credit gate", async () => {
    // With bypass on, the rate limiter passes; the credit gate should still fire
    mockGetBalance.mockResolvedValue(0); // no credits
    mockGetReqs.mockResolvedValue([{ id: 1, jdRequirement: "Python", category: "skills" }]);

    const caller = appRouter.createCaller(makeCtx(1));
    await expect(
      caller.evidence.run({ jobCardId: 1, resumeId: 1 })
    ).rejects.toThrow("Insufficient credits");

    // Confirm spendCredits was never called (credit gate fired before spend)
    expect(mockSpend).not.toHaveBeenCalled();
  });

  it("H2) isAdmin=false user cannot trigger admin-only procedures", async () => {
    const caller = appRouter.createCaller(makeCtx(1)); // isAdmin: false
    // admin.users.list is an adminProcedure — non-admin gets FORBIDDEN
    await expect(
      (caller as any).admin.users.list()
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
