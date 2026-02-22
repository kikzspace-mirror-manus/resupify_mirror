/**
 * Phase 10A-1 — In-memory rate limiter
 *
 * Supports per-user (authenticated) and per-IP limits.
 * Uses a TTL-based sliding window backed by a Map<key, number[]>.
 * Each entry stores an array of request timestamps; entries older than
 * the window are pruned on each check.
 *
 * Single-instance deployment: Map lives in process memory.
 * No new infrastructure required.
 *
 * Phase 10B-2B — Operational event logging
 * When a rate limit fires, a non-PII event is written to operational_events.
 * user_id_hash and ip_hash are first-16-chars of a SHA-256 hex digest.
 */
import { TRPCError } from "@trpc/server";
import type { Request } from "express";
import { createHash } from "crypto";
import { nanoid } from "nanoid";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RateLimitConfig {
  /** Maximum number of requests allowed within the window */
  limit: number;
  /** Window duration in milliseconds */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

// ─── Storage ──────────────────────────────────────────────────────────────────

/** Map<rateKey, timestamps[]> — timestamps are epoch ms */
const store = new Map<string, number[]>();

/** Clear all rate limit buckets. Only intended for test environments. */
export function _clearStoreForTests() {
  store.clear();
}

/**
 * Periodically prune expired entries to prevent unbounded memory growth.
 * Runs every 5 minutes.
 */
function pruneExpired(windowMs: number) {
  const now = Date.now();
  for (const [storeKey, timestamps] of Array.from(store.entries())) {
    const fresh = timestamps.filter((ts) => now - ts < windowMs);
    if (fresh.length === 0) {
      store.delete(storeKey);
    } else {
      store.set(storeKey, fresh);
    }
  }
}

// Schedule periodic cleanup (every 5 minutes)
let pruneTimer: ReturnType<typeof setInterval> | null = null;
export function startPruneTimer(windowMs = 10 * 60 * 1000) {
  if (pruneTimer) return;
  pruneTimer = setInterval(() => pruneExpired(windowMs), 5 * 60 * 1000);
  if (pruneTimer.unref) pruneTimer.unref(); // don't keep process alive
}
startPruneTimer();

// ─── Core check ──────────────────────────────────────────────────────────────

/**
 * Check (and record) a request against a rate limit bucket.
 * Returns { allowed: true } or { allowed: false, retryAfterSeconds }.
 */
/** Set to true in test environments to bypass rate limiting for procedure-level tests. */
export let _bypassForTests = false;

/** Enable the test bypass. Call this in beforeAll/beforeEach in test files that invoke procedures. */
export function _enableTestBypass() { _bypassForTests = true; }
/** Disable the test bypass. */
export function _disableTestBypass() { _bypassForTests = false; }

export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  // When the test bypass is active, always allow (prevents cross-test contamination
  // from tests that call the same procedure many times with the same user ID).
  if (_bypassForTests) {
    return { allowed: true, retryAfterSeconds: 0 };
  }
  const now = Date.now();
  const { limit, windowMs } = config;

  const timestamps = store.get(key) ?? [];
  // Prune timestamps outside the window
  const fresh = timestamps.filter((t) => now - t < windowMs);

  if (fresh.length >= limit) {
    // Oldest timestamp in window determines when the window resets
    const oldest = fresh[0]!;
    const retryAfterMs = windowMs - (now - oldest);
    const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  fresh.push(now);
  store.set(key, fresh);
  return { allowed: true, retryAfterSeconds: 0 };
}

// ─── IP extraction ────────────────────────────────────────────────────────────

/**
 * Extract the client IP from an Express request.
 * Does NOT trust X-Forwarded-For unless the app has explicitly configured
 * `app.set("trust proxy", ...)`. Falls back to socket remote address.
 */
export function getClientIp(req: Request): string {
  // req.ip respects the trust proxy setting automatically.
  // If trust proxy is not set, req.ip === req.socket.remoteAddress.
  return req.ip ?? req.socket?.remoteAddress ?? "unknown";
}

// ─── 429 response helpers ─────────────────────────────────────────────────────

export const RATE_LIMITED_CODE = "RATE_LIMITED";

/**
 * Build the standard 429 JSON body.
 */
export function buildRateLimitBody(retryAfterSeconds: number) {
  return {
    error: RATE_LIMITED_CODE,
    message: `You're doing that a bit too fast. Please wait ${retryAfterSeconds}s and try again.`,
    retryAfterSeconds,
  };
}

/**
 * Throw a tRPC TOO_MANY_REQUESTS error with the standard 429 shape.
 * Also sets the Retry-After header via the response object in ctx.
 */
export function throwRateLimited(retryAfterSeconds: number): never {
  throw new TRPCError({
    code: "TOO_MANY_REQUESTS",
    message: buildRateLimitBody(retryAfterSeconds).message,
    cause: { retryAfterSeconds },
  });
}

// ─── Limit constants ──────────────────────────────────────────────────────────

const TEN_MINUTES = 10 * 60 * 1000;

export const LIMITS = {
  /** Evidence / ATS run: 6 per user per 10 min */
  EVIDENCE_USER: { limit: 6, windowMs: TEN_MINUTES } satisfies RateLimitConfig,
  /** Outreach generate: 10 per user per 10 min */
  OUTREACH_USER: { limit: 10, windowMs: TEN_MINUTES } satisfies RateLimitConfig,
  /** Application Kit generate: 8 per user per 10 min */
  KIT_USER: { limit: 8, windowMs: TEN_MINUTES } satisfies RateLimitConfig,
  /** JD URL fetch: 30 per IP per 10 min */
  URL_FETCH_IP: { limit: 30, windowMs: TEN_MINUTES } satisfies RateLimitConfig,
  /** Auth endpoints: 20 per IP per 10 min */
  AUTH_IP: { limit: 20, windowMs: TEN_MINUTES } satisfies RateLimitConfig,
} as const;

// ─── Hashing helpers ──────────────────────────────────────────────────────────

/**
 * One-way hash for user IDs and IPs.
 * Returns the first 16 hex chars of SHA-256 — enough for bucketing/correlation
 * without being reversible or storing PII.
 */
export function shortHash(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

// ─── Endpoint group mapping ───────────────────────────────────────────────────

export type EndpointGroup = "evidence" | "outreach" | "kit" | "url_fetch" | "auth";

// ─── tRPC middleware factory ──────────────────────────────────────────────────

import { initTRPC } from "@trpc/server";
import type { TrpcContext } from "./_core/context";

const t = initTRPC.context<TrpcContext>().create();

/**
 * Build a tRPC middleware that enforces per-user AND per-IP limits.
 * Pass `null` for either config to skip that dimension.
 * When a limit fires, a non-PII operational event is logged asynchronously.
 */
export function makeRateLimitMiddleware(
  userConfig: RateLimitConfig | null,
  ipConfig: RateLimitConfig | null,
  prefix: string,
  endpointGroup: EndpointGroup
) {
  return t.middleware(async ({ ctx, next }) => {
    const ip = getClientIp(ctx.req);

    // Per-IP check (always runs when ipConfig provided)
    if (ipConfig) {
      const ipKey = `${prefix}:ip:${ip}`;
      const ipResult = checkRateLimit(ipKey, ipConfig);
      if (!ipResult.allowed) {
        if (typeof ctx.res?.setHeader === "function") {
          ctx.res.setHeader("Retry-After", String(ipResult.retryAfterSeconds));
        }
        // Log non-PII event (fire-and-forget)
        void logRateLimitEvent({
          endpointGroup,
          retryAfterSeconds: ipResult.retryAfterSeconds,
          userIdHash: ctx.user ? shortHash(String(ctx.user.id)) : undefined,
          ipHash: shortHash(ip),
        });
        throwRateLimited(ipResult.retryAfterSeconds);
      }
    }

    // Per-user check (only when authenticated and userConfig provided)
    if (userConfig && ctx.user) {
      const userKey = `${prefix}:user:${ctx.user.id}`;
      const userResult = checkRateLimit(userKey, userConfig);
      if (!userResult.allowed) {
        if (typeof ctx.res?.setHeader === "function") {
          ctx.res.setHeader("Retry-After", String(userResult.retryAfterSeconds));
        }
        // Log non-PII event (fire-and-forget)
        void logRateLimitEvent({
          endpointGroup,
          retryAfterSeconds: userResult.retryAfterSeconds,
          userIdHash: shortHash(String(ctx.user.id)),
          ipHash: shortHash(ip),
        });
        throwRateLimited(userResult.retryAfterSeconds);
      }
    }

    return next();
  });
}

// ─── Operational event logger ─────────────────────────────────────────────────

interface LogRateLimitEventArgs {
  endpointGroup: EndpointGroup;
  retryAfterSeconds: number;
  userIdHash?: string;
  ipHash?: string;
}

/**
 * Fire-and-forget: log a rate_limited operational event.
 * Dynamically imports db to avoid circular dependency issues.
 */
async function logRateLimitEvent(args: LogRateLimitEventArgs): Promise<void> {
  try {
    const { logOperationalEvent } = await import("./db");
    await logOperationalEvent({
      requestId: nanoid(),
      endpointGroup: args.endpointGroup,
      eventType: "rate_limited",
      statusCode: 429,
      retryAfterSeconds: args.retryAfterSeconds,
      userIdHash: args.userIdHash ?? null,
      ipHash: args.ipHash ?? null,
    });
  } catch {
    // Silently swallow — logging must never break the request path
  }
}

// ─── Pre-built middleware instances ──────────────────────────────────────────

export const evidenceRateLimit = makeRateLimitMiddleware(
  LIMITS.EVIDENCE_USER,
  null, // no per-IP for LLM endpoints (user auth is sufficient)
  "evidence",
  "evidence"
);

export const outreachRateLimit = makeRateLimitMiddleware(
  LIMITS.OUTREACH_USER,
  null,
  "outreach",
  "outreach"
);

export const kitRateLimit = makeRateLimitMiddleware(
  LIMITS.KIT_USER,
  null,
  "kit",
  "kit"
);

export const urlFetchRateLimit = makeRateLimitMiddleware(
  LIMITS.URL_FETCH_IP, // per-user (when auth'd)
  LIMITS.URL_FETCH_IP, // per-IP (always)
  "urlfetch",
  "url_fetch"
);

// ─── Express middleware for auth endpoints ────────────────────────────────────

import type { Response, NextFunction } from "express";

/**
 * Express middleware for auth routes (e.g. /api/oauth/callback).
 * Enforces per-IP limit only.
 */
export function authRateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  const ip = getClientIp(req);
  const key = `auth:ip:${ip}`;
  const result = checkRateLimit(key, LIMITS.AUTH_IP);
  if (!result.allowed) {
    res.setHeader("Retry-After", String(result.retryAfterSeconds));
    // Log non-PII event (fire-and-forget)
    void (async () => {
      try {
        const { logOperationalEvent } = await import("./db");
        await logOperationalEvent({
          requestId: nanoid(),
          endpointGroup: "auth",
          eventType: "rate_limited",
          statusCode: 429,
          retryAfterSeconds: result.retryAfterSeconds,
          userIdHash: null,
          ipHash: shortHash(ip),
        });
      } catch { /* swallow */ }
    })();
    res.status(429).json(buildRateLimitBody(result.retryAfterSeconds));
    return;
  }
  next();
}
