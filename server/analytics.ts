/**
 * server/analytics.ts — V2 Phase 1B.2
 *
 * Fire-and-forget analytics event logger.
 *
 * RULES:
 * - Failures MUST NOT block user actions (always wrapped in try/catch with void).
 * - Only writes when featureFlags.v2AnalyticsEnabled is true.
 * - No PII: userId is internal DB integer, no email/name stored.
 * - All writes are async; callers do NOT await this function.
 */

import { featureFlags } from "../shared/featureFlags";
import type { AnalyticsEventName } from "../shared/analyticsEvents";
import { getDb } from "./db";
import { analyticsEvents } from "../drizzle/schema";
// Note: getDb() is the shared singleton from server/db.ts

export interface AnalyticsEventProps {
  run_type?: string;
  latency_ms?: number;
  provider?: string;
  outcome?: string;
  suggestion_type?: string;
  pack_id?: string;
  credits?: number;
  [key: string]: unknown;
}

/**
 * Log an analytics event. Fire-and-forget — never throws, never blocks.
 *
 * @param eventName  Canonical event name from shared/analyticsEvents.ts
 * @param userId     Internal DB user ID (nullable for pre-signup events)
 * @param props      Optional structured metadata (no PII)
 * @param opts       Optional: sessionId, countryPackId, track
 */
export function logAnalyticsEvent(
  eventName: AnalyticsEventName,
  userId: number | null,
  props?: AnalyticsEventProps,
  opts?: { sessionId?: string; countryPackId?: string; track?: string }
): void {
  if (!featureFlags.v2AnalyticsEnabled) return;

  // Fire-and-forget: never await, never propagate errors
  void (async () => {
    try {
      const db = await getDb();
      if (!db) return;
      await db.insert(analyticsEvents).values({
        userId: userId ?? null,
        sessionId: opts?.sessionId ?? null,
        eventName,
        props: props ?? null,
        countryPackId: opts?.countryPackId ?? null,
        track: opts?.track ?? null,
      });
    } catch {
      // Intentionally swallowed — analytics must never break user flows
    }
  })();
}
