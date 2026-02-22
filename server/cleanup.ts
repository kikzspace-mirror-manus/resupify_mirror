/**
 * server/cleanup.ts — Phase 10D-1
 *
 * Daily auto-purge job for operational tables.
 * Runs once on server start (after a short delay), then every 24 hours.
 *
 * Retention policy:
 *   - operational_events: 30 days
 *   - stripe_events:      90 days
 *
 * No PII is logged. Only row counts and timestamps are emitted.
 */
import { purgeOldOperationalEvents, purgeOldStripeEvents } from "./db";

const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const INITIAL_DELAY_MS    = 10_000;               // 10 seconds after server start

/**
 * Run both purge helpers and log the result.
 * Errors are caught and logged without crashing the server.
 */
export async function runDailyCleanup(): Promise<void> {
  const ts = new Date().toISOString();
  try {
    const opCount     = await purgeOldOperationalEvents();
    const stripeCount = await purgeOldStripeEvents();
    console.log(
      `[Cleanup] ${ts} — purged ${opCount} operational_events (>30d), ` +
      `${stripeCount} stripe_events (>90d)`
    );
  } catch (err) {
    console.error(`[Cleanup] ${ts} — cleanup failed:`, (err as Error).message ?? err);
  }
}

/**
 * Register the daily cleanup job.
 * Call once from server startup (server/_core/index.ts).
 */
export function registerDailyCleanup(): void {
  // Run once shortly after startup, then on a 24-hour interval.
  setTimeout(async () => {
    await runDailyCleanup();
    setInterval(runDailyCleanup, CLEANUP_INTERVAL_MS);
  }, INITIAL_DELAY_MS);
}
