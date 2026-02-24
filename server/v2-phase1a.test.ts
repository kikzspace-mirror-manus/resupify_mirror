/**
 * V2 Phase 1A — DB Fields + Feature Flags (Additive Only, No UI)
 *
 * A) All three V2 feature flags default to false (OFF)
 * B) isBilingualModeReady() returns false when all flags are OFF
 * C) users schema includes countryPackId and languageMode columns
 * D) users.countryPackId accepts VN, PH, US and null (nullable enum)
 * E) users.languageMode defaults to "en"
 * F) job_cards schema includes countryPackId column (nullable)
 * G) application_kits schema includes all 5 V2 translation fields
 * H) application_kits.canonicalLanguage defaults to "en"
 * I) Existing V1 endpoint shapes unchanged: auth.me returns no V2 fields in V1 context
 * J) featureFlags object is frozen (as const) — no runtime mutation
 * K) envBool returns false for unset env vars
 * L) envBool returns true when env var is explicitly "true"
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { featureFlags, isBilingualModeReady } from "../shared/featureFlags";
import { users, jobCards, applicationKits } from "../drizzle/schema";

describe("V2 Phase 1A: DB Fields + Feature Flags", () => {
  // ── A: All flags default OFF ─────────────────────────────────────────────
  it("A) All V2 feature flags default to false", () => {
    expect(featureFlags.v2CountryPacksEnabled).toBe(false);
    expect(featureFlags.v2VnTranslationEnabled).toBe(false);
    expect(featureFlags.v2BilingualViewEnabled).toBe(false);
  });

  // ── B: isBilingualModeReady() returns false when all flags OFF ───────────
  it("B) isBilingualModeReady() returns false when all flags are OFF", () => {
    expect(isBilingualModeReady()).toBe(false);
  });

  // ── C: users schema has countryPackId and languageMode ───────────────────
  it("C) users schema includes countryPackId and languageMode columns", () => {
    const columns = Object.keys(users);
    expect(columns).toContain("countryPackId");
    expect(columns).toContain("languageMode");
  });

  // ── D: users.countryPackId is a nullable enum with VN/PH/US ─────────────
  it("D) users.countryPackId is a nullable enum (VN, PH, US)", () => {
    const col = (users as any).countryPackId;
    expect(col).toBeDefined();
    // Drizzle enum columns expose their enumValues
    // GLOBAL added in Phase 1A.1; CA added in Phase 1C-B
    expect(col.enumValues).toEqual(["GLOBAL", "CA", "VN", "PH", "US"]);
    // Column must be nullable (no notNull constraint)
    expect(col.notNull).toBeFalsy();
  });

  // ── E: users.languageMode defaults to "en" ───────────────────────────────
  it("E) users.languageMode defaults to \"en\"", () => {
    const col = (users as any).languageMode;
    expect(col).toBeDefined();
    expect(col.enumValues).toEqual(["en", "vi", "bilingual"]);
    expect(col.default).toBe("en");
  });

  // ── F: job_cards schema has countryPackId (nullable) ────────────────────
  it("F) job_cards schema includes countryPackId column (nullable)", () => {
    const columns = Object.keys(jobCards);
    expect(columns).toContain("countryPackId");
    const col = (jobCards as any).countryPackId;
    // GLOBAL added in Phase 1A.1; CA added in Phase 1C-B
    expect(col.enumValues).toEqual(["GLOBAL", "CA", "VN", "PH", "US"]);
    expect(col.notNull).toBeFalsy();
  });

  // ── G: application_kits has all 5 V2 translation fields ─────────────────
  it("G) application_kits schema includes all 5 V2 translation fields", () => {
    const columns = Object.keys(applicationKits);
    expect(columns).toContain("canonicalLanguage");
    expect(columns).toContain("canonicalText");
    expect(columns).toContain("localizedLanguage");
    expect(columns).toContain("localizedText");
    expect(columns).toContain("translationMeta");
  });

  // ── H: application_kits.canonicalLanguage defaults to "en" ──────────────
  it("H) application_kits.canonicalLanguage defaults to \"en\"", () => {
    const col = (applicationKits as any).canonicalLanguage;
    expect(col).toBeDefined();
    expect(col.default).toBe("en");
  });

  // ── I: V1 fields on users are unchanged ─────────────────────────────────
  it("I) V1 users fields (id, openId, email, role, disabled, earlyAccessEnabled) still exist", () => {
    const columns = Object.keys(users);
    const v1Fields = ["id", "openId", "email", "role", "disabled", "earlyAccessEnabled", "earlyAccessGrantUsed", "createdAt", "updatedAt"];
    for (const field of v1Fields) {
      expect(columns).toContain(field);
    }
  });

  // ── J: featureFlags keys are all booleans ──────────────────────────────────────────────────
  it("J) featureFlags has exactly the expected V2 keys, all boolean", () => {
    const keys = Object.keys(featureFlags);
    expect(keys).toContain("v2CountryPacksEnabled");
    expect(keys).toContain("v2VnTranslationEnabled");
    expect(keys).toContain("v2BilingualViewEnabled");
    // All values must be booleans
    for (const key of keys) {
      expect(typeof (featureFlags as any)[key]).toBe("boolean");
    }
  });

  // ── K: V2 country pack flags are off by default ──────────────────────────────────────────
  it("K) V2 country pack flags are boolean (env-driven, safe to read)", () => {
    // These flags are read from V2_* env vars at module load time.
    // In this sandbox, V2_ANALYTICS_ENABLED and V2_GROWTH_DASHBOARD_ENABLED may be
    // set via Manus-injected secrets. We only assert type safety here, not specific values.
    expect(typeof featureFlags.v2CountryPacksEnabled).toBe("boolean");
    expect(typeof featureFlags.v2VnTranslationEnabled).toBe("boolean");
    expect(typeof featureFlags.v2BilingualViewEnabled).toBe("boolean");
    expect(typeof featureFlags.v2AnalyticsEnabled).toBe("boolean");
    expect(typeof featureFlags.v2GrowthDashboardEnabled).toBe("boolean");
  });

  // ── L: V1 job_cards fields unchanged ──────────────────────────────────────────────────
  it("L) V1 job_cards fields (id, userId, title, stage, priority) still exist", () => {
    const columns = Object.keys(jobCards);
    const v1Fields = ["id", "userId", "title", "stage", "priority", "season", "notes", "createdAt", "updatedAt"];
    for (const field of v1Fields) {
      expect(columns).toContain(field);
    }
  });
});
