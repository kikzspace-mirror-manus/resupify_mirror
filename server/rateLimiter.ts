/**
 * Phase 10A — In-memory rate limiter
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
 *
 * Phase 10A (updated):
 * - Admin bypass: users with role="admin" skip all rate limits
 * - Concurrency guard: max 1 active AI call per user (per endpoint group)
 * - Corrected limits to match spec: AI 10/10min, URL fetch 10/hour
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

/** Map<concurrencyKey, activeCount> — tracks in-flight AI calls per user */
const concurrencyStore = new Map<string, number>();

/** Clear all rate limit buckets. Only intended for test environments. */
export function _clearStoreForTests() {
  store.clear();
  concurrencyStore.clear();
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

// ─── Concurrency guard ────────────────────────────────────────────────────────

/**
 * Check and increment the concurrency counter for a user+endpoint.
 * Returns true if the call is allowed (counter incremented), false if at limit.
 */
export function acquireConcurrency(key: string, maxConcurrent: number): boolean {
  if (_bypassForTests) return true;
  const current = concurrencyStore.get(key) ?? 0;
  if (current >= maxConcurrent) return false;
  concurrencyStore.set(key, current + 1);
  return true;
}

/**
 * Decrement the concurrency counter for a user+endpoint.
 * Always call this in a finally block after acquireConcurrency.
 */
export function releaseConcurrency(key: string): void {
  const current = concurrencyStore.get(key) ?? 0;
  if (current <= 1) {
    concurrencyStore.delete(key);
  } else {
    concurrencyStore.set(key, current - 1);
  }
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
const ONE_HOUR = 60 * 60 * 1000;

export const LIMITS = {
  /** Evidence / ATS run: 10 per user per 10 min (spec: 10/10min) */
  EVIDENCE_USER: { limit: 10, windowMs: TEN_MINUTES } satisfies RateLimitConfig,
  /** Outreach generate: 10 per user per 10 min */
  OUTREACH_USER: { limit: 10, windowMs: TEN_MINUTES } satisfies RateLimitConfig,
  /** Application Kit generate: 10 per user per 10 min */
  KIT_USER: { limit: 10, windowMs: TEN_MINUTES } satisfies RateLimitConfig,
  /** JD extract (LLM): 10 per user per 10 min */
  JD_EXTRACT_USER: { limit: 10, windowMs: TEN_MINUTES } satisfies RateLimitConfig,
  /** JD URL fetch: 10 per user per hour (spec: 10/hour) */
  URL_FETCH_USER: { limit: 10, windowMs: ONE_HOUR } satisfies RateLimitConfig,
  /** JD URL fetch: 20 per IP per hour (slightly more permissive for shared IPs) */
  URL_FETCH_IP: { limit: 20, windowMs: ONE_HOUR } satisfies RateLimitConfig,
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

export type EndpointGroup = "evidence" | "outreach" | "kit" | "jd_extract" | "url_fetch" | "auth";

// ─── tRPC middleware factory ──────────────────────────────────────────────────

import { initTRPC } from "@trpc/server";
import type { TrpcContext } from "./_core/context";

const t = initTRPC.context<TrpcContext>().create();

/**
 * Build a tRPC middleware that enforces per-user AND per-IP limits.
 * Pass `null` for either config to skip that dimension.
 * When a limit fires, a non-PII operational event is logged asynchronously.
 *
 * Admin users (role="admin") bypass all rate limits.
 *
 * If maxConcurrent > 0, enforces a concurrency cap per user for this endpoint.
 * The caller must ensure the concurrency slot is released after the call.
 */
export function makeRateLimitMiddleware(
  userConfig: RateLimitConfig | null,
  ipConfig: RateLimitConfig | null,
  prefix: string,
  endpointGroup: EndpointGroup,
  maxConcurrent = 0
) {
  return t.middleware(async ({ ctx, next }) => {
    const ip = getClientIp(ctx.req);

    // Admin bypass: admins are never rate-limited
    if (ctx.user?.role === "admin") {
      return next();
    }

    // Per-IP check (always runs when ipConfig provided)
    if (ipConfig) {
      const ipKey = `${prefix}:ip:${ip}`;
      const ipResult = checkRateLimit(ipKey, ipConfig);
      if (!ipResult.allowed) {
        if (typeof ctx.res?.setHeader === "function") {
          ctx.res.setHeader("Retry-After", String(ipResult.retryAfterSeconds));
        }
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
        void logRateLimitEvent({
          endpointGroup,
          retryAfterSeconds: userResult.retryAfterSeconds,
          userIdHash: shortHash(String(ctx.user.id)),
          ipHash: shortHash(ip),
        });
        throwRateLimited(userResult.retryAfterSeconds);
      }
    }

    // Concurrency check (only when authenticated and maxConcurrent > 0)
    if (maxConcurrent > 0 && ctx.user) {
      const concKey = `${prefix}:concurrency:${ctx.user.id}`;
      const acquired = acquireConcurrency(concKey, maxConcurrent);
      if (!acquired) {
        throwRateLimited(30); // suggest retry in 30s for concurrency limit
      }
      try {
        return await next();
      } finally {
        releaseConcurrency(concKey);
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

/** Evidence/ATS scan: 10/10min per user, max 1 concurrent */
export const evidenceRateLimit = makeRateLimitMiddleware(
  LIMITS.EVIDENCE_USER,
  null,
  "evidence",
  "evidence",
  1 // max 1 concurrent AI call per user
);

/** Outreach generate: 10/10min per user, max 1 concurrent */
export const outreachRateLimit = makeRateLimitMiddleware(
  LIMITS.OUTREACH_USER,
  null,
  "outreach",
  "outreach",
  1
);

/** Application Kit generate: 10/10min per user, max 1 concurrent */
export const kitRateLimit = makeRateLimitMiddleware(
  LIMITS.KIT_USER,
  null,
  "kit",
  "kit",
  1
);

/** JD extract (LLM): 10/10min per user, max 1 concurrent */
export const jdExtractRateLimit = makeRateLimitMiddleware(
  LIMITS.JD_EXTRACT_USER,
  null,
  "jd_extract",
  "jd_extract",
  1
);

/** JD URL fetch: 10/hour per user + 20/hour per IP */
export const urlFetchRateLimit = makeRateLimitMiddleware(
  LIMITS.URL_FETCH_USER,
  LIMITS.URL_FETCH_IP,
  "urlfetch",
  "url_fetch",
  0 // no concurrency limit for URL fetch
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
