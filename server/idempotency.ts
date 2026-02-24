/**
 * Phase 10C — Server-side idempotency guard
 *
 * Prevents duplicate AI runs and duplicate credit charges caused by
 * double-clicks, refresh/retry, slow networks, or client timeouts.
 *
 * Design:
 * - In-memory Map keyed by `${userId}:${endpoint}:${actionId}`
 * - TTL: IDEMPOTENCY_WINDOW_MS (5 minutes) — entries expire on next access
 * - Single-process deployment: Map lives in process memory (same as rateLimiter.ts)
 *
 * Usage in a tRPC mutation:
 *
 *   const idem = checkIdempotency(ctx.user.id, "evidence.run", input.actionId);
 *   if (idem?.status === "succeeded") return idem.result as ReturnType;
 *   if (idem?.status === "started")   throw new TRPCError({ code: "CONFLICT", message: "Action already in progress." });
 *   markStarted(ctx.user.id, "evidence.run", input.actionId);
 *   try {
 *     // ... do work ...
 *     markSucceeded(ctx.user.id, "evidence.run", input.actionId, result);
 *     return result;
 *   } catch (err) {
 *     markFailed(ctx.user.id, "evidence.run", input.actionId, String(err));
 *     throw err;
 *   }
 */

export const IDEMPOTENCY_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

export type IdempotencyStatus = "started" | "succeeded" | "failed";

export interface IdempotencyRecord {
  status: IdempotencyStatus;
  createdAt: number; // epoch ms
  result?: unknown;  // snapshot of the successful response payload
  errorMessage?: string;
  creditsCharged: boolean;
}

/** In-memory store: key → record */
const _store = new Map<string, IdempotencyRecord>();

/** Build the store key */
function makeKey(userId: number, endpoint: string, actionId: string): string {
  return `${userId}:${endpoint}:${actionId}`;
}

/** Check if an entry exists and is still within the TTL window. */
function isExpired(record: IdempotencyRecord): boolean {
  return Date.now() - record.createdAt > IDEMPOTENCY_WINDOW_MS;
}

/**
 * Look up an existing idempotency record.
 * Returns null if:
 *   - actionId is undefined/empty (idempotency opt-out)
 *   - no record exists
 *   - record has expired (auto-deleted)
 */
export function checkIdempotency(
  userId: number,
  endpoint: string,
  actionId: string | undefined | null
): IdempotencyRecord | null {
  if (!actionId) return null;
  const key = makeKey(userId, endpoint, actionId);
  const record = _store.get(key);
  if (!record) return null;
  if (isExpired(record)) {
    _store.delete(key);
    return null;
  }
  return record;
}

/**
 * Mark an action as started (in-flight).
 * Idempotent: if already started, does not overwrite.
 */
export function markStarted(
  userId: number,
  endpoint: string,
  actionId: string | undefined | null
): void {
  if (!actionId) return;
  const key = makeKey(userId, endpoint, actionId);
  if (_store.has(key)) return; // already exists
  _store.set(key, {
    status: "started",
    createdAt: Date.now(),
    creditsCharged: false,
  });
}

/**
 * Mark an action as succeeded and store the result snapshot.
 */
export function markSucceeded(
  userId: number,
  endpoint: string,
  actionId: string | undefined | null,
  result: unknown,
  creditsCharged = false
): void {
  if (!actionId) return;
  const key = makeKey(userId, endpoint, actionId);
  _store.set(key, {
    status: "succeeded",
    createdAt: _store.get(key)?.createdAt ?? Date.now(),
    result,
    creditsCharged,
  });
}

/**
 * Mark an action as failed and store the error message.
 * Credits are NOT charged on failure (creditsCharged stays false).
 */
export function markFailed(
  userId: number,
  endpoint: string,
  actionId: string | undefined | null,
  errorMessage: string
): void {
  if (!actionId) return;
  const key = makeKey(userId, endpoint, actionId);
  _store.set(key, {
    status: "failed",
    createdAt: _store.get(key)?.createdAt ?? Date.now(),
    errorMessage,
    creditsCharged: false,
  });
}

/**
 * Mark that credits were charged for this action.
 * Call this immediately after a successful spendCredits() call.
 */
export function markCreditsCharged(
  userId: number,
  endpoint: string,
  actionId: string | undefined | null
): void {
  if (!actionId) return;
  const key = makeKey(userId, endpoint, actionId);
  const record = _store.get(key);
  if (record) {
    record.creditsCharged = true;
  }
}

/**
 * Prune all expired entries. Called periodically to prevent unbounded growth.
 */
export function pruneExpiredIdempotencyEntries(): void {
  for (const [key, record] of Array.from(_store.entries())) {
    if (isExpired(record)) {
      _store.delete(key);
    }
  }
}

// ── Periodic cleanup every 5 minutes ─────────────────────────────────────────
// Only schedule in non-test environments to avoid timer leaks in tests
if (process.env.NODE_ENV !== "test") {
  setInterval(pruneExpiredIdempotencyEntries, IDEMPOTENCY_WINDOW_MS);
}

// ── Test helpers ──────────────────────────────────────────────────────────────

/** Clear all idempotency records. Only for test environments. */
export function _clearIdempotencyStoreForTests(): void {
  _store.clear();
}

/** Get the raw store size. Only for test environments. */
export function _getStoreSize(): number {
  return _store.size;
}

/** Get a raw record by key. Only for test environments. */
export function _getRecord(
  userId: number,
  endpoint: string,
  actionId: string
): IdempotencyRecord | undefined {
  return _store.get(makeKey(userId, endpoint, actionId));
}
