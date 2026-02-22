/**
 * V2 Feature Flags
 *
 * All flags default to false (OFF) unless explicitly enabled via environment
 * variables. This keeps V1 behavior completely unchanged until a flag is
 * intentionally flipped.
 *
 * Usage (server-side):
 *   import { featureFlags } from "../shared/featureFlags";
 *   if (featureFlags.v2CountryPacksEnabled) { ... }
 *
 * Usage (client-side):
 *   import { featureFlags } from "@shared/featureFlags";
 *   if (featureFlags.v2CountryPacksEnabled) { ... }
 *
 * To enable a flag in development, set the corresponding env var to "true":
 *   V2_COUNTRY_PACKS_ENABLED=true
 *   V2_VN_TRANSLATION_ENABLED=true
 *   V2_BILINGUAL_VIEW_ENABLED=true
 *
 * NOTE: These flags are intentionally NOT connected to any UI or logic yet.
 *       They are placeholders for V2 Phase 2+ work.
 */

function envBool(key: string): boolean {
  // Works in both Node (process.env) and Vite (import.meta.env via VITE_ prefix).
  // Server-side: reads process.env directly.
  // Client-side: Vite exposes VITE_* vars via import.meta.env; non-VITE_ vars
  // are not forwarded to the browser, so client always gets false for server-only flags.
  if (typeof process !== "undefined" && process.env) {
    return process.env[key] === "true";
  }
  return false;
}

export const featureFlags = {
  /**
   * v2CountryPacksEnabled
   * When true: enables Country Pack selection (VN / PH / US) in user settings
   * and routes evidence/kit generation through the appropriate country pack.
   * Default: false (V1 CA pack behavior unchanged).
   */
  v2CountryPacksEnabled: envBool("V2_COUNTRY_PACKS_ENABLED"),

  /**
   * v2VnTranslationEnabled
   * When true: enables Vietnamese translation of generated assets
   * (cover letters, outreach packs, bullet rewrites).
   * Requires v2CountryPacksEnabled + user.languageMode = "vi" | "bilingual".
   * Default: false.
   */
  v2VnTranslationEnabled: envBool("V2_VN_TRANSLATION_ENABLED"),

  /**
   * v2BilingualViewEnabled
   * When true: shows a side-by-side bilingual view of generated assets
   * (canonical English + localized Vietnamese).
   * Requires v2VnTranslationEnabled.
   * Default: false.
   */
  v2BilingualViewEnabled: envBool("V2_BILINGUAL_VIEW_ENABLED"),

  /**
   * v2AnalyticsEnabled
   * When true: enables writing analytics events to the analytics_events table.
   * All event writes are fire-and-forget; disabling this flag silently no-ops
   * all logAnalyticsEvent calls without affecting any user-facing flows.
   * Default: false.
   */
  v2AnalyticsEnabled: envBool("V2_ANALYTICS_ENABLED"),

  /**
   * v2GrowthDashboardEnabled
   * When true: shows the Growth KPI Dashboard at /admin/growth.
   * Requires role=admin. Has no effect for non-admin users.
   * Default: false.
   */
  v2GrowthDashboardEnabled: envBool("V2_GROWTH_DASHBOARD_ENABLED"),
} as const;

export type FeatureFlags = typeof featureFlags;

/**
 * Type guard: returns true if all required flags for bilingual mode are ON.
 * Convenience helper for V2 Phase 2+ logic.
 */
export function isBilingualModeReady(): boolean {
  return (
    featureFlags.v2CountryPacksEnabled &&
    featureFlags.v2VnTranslationEnabled &&
    featureFlags.v2BilingualViewEnabled
  );
}
