/**
 * V2 Phase 1B.2 — Analytics Events: Acceptance Tests
 *
 * A) Schema: ALL_EVENT_NAMES contains all expected canonical events
 * B) Schema: FUNNEL_STEPS is a subset of ALL_EVENT_NAMES
 * C) Schema: AnalyticsEventName type is inferred from ALL_EVENT_NAMES
 * D) logAnalyticsEvent: does not throw when flag is OFF
 * E) logAnalyticsEvent: does not throw when flag is ON (fire-and-forget)
 * F) logAnalyticsEvent: returns void (fire-and-forget, not a promise)
 * G) featureFlags: v2AnalyticsEnabled and v2GrowthDashboardEnabled exist
 * H) admin.growth.kpis: non-admin user gets FORBIDDEN
 * I) admin.growth.kpis: admin user gets { enabled: boolean, data: ... }
 * J) KPI helpers: getFunnelCompletion7d returns array with step/count/pct
 * K) KPI helpers: getOutcomeCounts returns { interviews, offers }
 * L) KPI helpers: getNewUsers returns a number
 * M) KPI helpers: getWAU returns a number
 * N) KPI helpers: getMAU returns a number
 * O) KPI helpers: getActivatedUsers7d returns a number
 * P) KPI helpers: getErrorCount7d returns a number
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  ALL_EVENT_NAMES,
  FUNNEL_STEPS,
  EVT_SIGNUP_COMPLETED,
  EVT_JOB_CARD_CREATED,
  EVT_QUICK_MATCH_RUN,
  EVT_COVER_LETTER_GENERATED,
  EVT_OUTREACH_GENERATED,
  EVT_PAYWALL_VIEWED,
  EVT_PURCHASE_COMPLETED,
  EVT_AI_RUN_COMPLETED,
} from "../shared/analyticsEvents";
import { featureFlags } from "../shared/featureFlags";
import { logAnalyticsEvent } from "./analytics";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Helpers ─────────────────────────────────────────────────────────────────

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function makeAdminCtx(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 999,
    openId: "admin-open-id",
    email: "admin@resupify.test",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function makeUserCtx(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 42,
    openId: "user-open-id",
    email: "user@resupify.test",
    name: "Regular User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

// ─── A: Schema — ALL_EVENT_NAMES ─────────────────────────────────────────────

describe("A: ALL_EVENT_NAMES", () => {
  it("contains all expected canonical event names", () => {
    expect(ALL_EVENT_NAMES).toContain(EVT_SIGNUP_COMPLETED);
    expect(ALL_EVENT_NAMES).toContain(EVT_JOB_CARD_CREATED);
    expect(ALL_EVENT_NAMES).toContain(EVT_QUICK_MATCH_RUN);
    expect(ALL_EVENT_NAMES).toContain(EVT_COVER_LETTER_GENERATED);
    expect(ALL_EVENT_NAMES).toContain(EVT_OUTREACH_GENERATED);
    expect(ALL_EVENT_NAMES).toContain(EVT_PAYWALL_VIEWED);
    expect(ALL_EVENT_NAMES).toContain(EVT_PURCHASE_COMPLETED);
    expect(ALL_EVENT_NAMES).toContain(EVT_AI_RUN_COMPLETED);
    expect(ALL_EVENT_NAMES.length).toBeGreaterThanOrEqual(8);
  });
});

// ─── B: Schema — FUNNEL_STEPS ─────────────────────────────────────────────────

describe("B: FUNNEL_STEPS", () => {
  it("is a subset of ALL_EVENT_NAMES and contains the core activation steps", () => {
    for (const step of FUNNEL_STEPS) {
      expect(ALL_EVENT_NAMES).toContain(step);
    }
    expect(FUNNEL_STEPS).toContain(EVT_SIGNUP_COMPLETED);
    expect(FUNNEL_STEPS).toContain(EVT_JOB_CARD_CREATED);
    expect(FUNNEL_STEPS).toContain(EVT_COVER_LETTER_GENERATED);
  });

  it("is ordered: signup_completed is first", () => {
    expect(FUNNEL_STEPS[0]).toBe(EVT_SIGNUP_COMPLETED);
  });
});

// ─── C: Schema — no duplicate event names ────────────────────────────────────

describe("C: Schema integrity", () => {
  it("ALL_EVENT_NAMES has no duplicates", () => {
    const unique = new Set(ALL_EVENT_NAMES);
    expect(unique.size).toBe(ALL_EVENT_NAMES.length);
  });

  it("all event names are snake_case and ≤ 64 chars", () => {
    for (const name of ALL_EVENT_NAMES) {
      expect(name).toMatch(/^[a-z][a-z0-9_]*$/);
      expect(name.length).toBeLessThanOrEqual(64);
    }
  });
});

// ─── D: logAnalyticsEvent — flag OFF ─────────────────────────────────────────

describe("D: logAnalyticsEvent — flag OFF", () => {
  let originalFlag: boolean;

  beforeEach(() => {
    originalFlag = featureFlags.v2AnalyticsEnabled;
    featureFlags.v2AnalyticsEnabled = false;
  });

  afterEach(() => {
    featureFlags.v2AnalyticsEnabled = originalFlag;
  });

  it("does not throw when analytics flag is OFF", () => {
    expect(() => logAnalyticsEvent(EVT_SIGNUP_COMPLETED, 1)).not.toThrow();
  });

  it("returns void (not a promise) when flag is OFF", () => {
    const result = logAnalyticsEvent(EVT_SIGNUP_COMPLETED, 1);
    expect(result).toBeUndefined();
  });
});

// ─── E: logAnalyticsEvent — flag ON (fire-and-forget) ────────────────────────

describe("E: logAnalyticsEvent — flag ON", () => {
  let originalFlag: boolean;

  beforeEach(() => {
    originalFlag = featureFlags.v2AnalyticsEnabled;
    featureFlags.v2AnalyticsEnabled = true;
  });

  afterEach(() => {
    featureFlags.v2AnalyticsEnabled = originalFlag;
  });

  it("does not throw when analytics flag is ON (fire-and-forget)", () => {
    expect(() => logAnalyticsEvent(EVT_JOB_CARD_CREATED, 42, { pack_id: "GLOBAL" })).not.toThrow();
  });

  it("returns void (not a promise) when flag is ON", () => {
    const result = logAnalyticsEvent(EVT_JOB_CARD_CREATED, 42);
    expect(result).toBeUndefined();
  });
});

// ─── F: logAnalyticsEvent — null userId ──────────────────────────────────────

describe("F: logAnalyticsEvent — null userId", () => {
  it("accepts null userId without throwing", () => {
    expect(() => logAnalyticsEvent(EVT_SIGNUP_COMPLETED, null)).not.toThrow();
  });
});

// ─── G: featureFlags — analytics flags exist ─────────────────────────────────

describe("G: featureFlags — analytics flags", () => {
  it("v2AnalyticsEnabled is a boolean", () => {
    expect(typeof featureFlags.v2AnalyticsEnabled).toBe("boolean");
  });

  it("v2GrowthDashboardEnabled is a boolean", () => {
    expect(typeof featureFlags.v2GrowthDashboardEnabled).toBe("boolean");
  });
});

// ─── H: admin.growth.kpis — non-admin blocked ────────────────────────────────

describe("H: admin.growth.kpis — access control", () => {
  it("non-admin user gets FORBIDDEN error", async () => {
    const caller = appRouter.createCaller(makeUserCtx());
    await expect(caller.admin.growth.kpis()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("unauthenticated user gets UNAUTHORIZED error", async () => {
    const anonCtx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(anonCtx);
    await expect(caller.admin.growth.kpis()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});

// ─── I: admin.growth.kpis — admin gets response ──────────────────────────────

describe("I: admin.growth.kpis — admin response shape", () => {
  it("admin user gets a response with enabled and analyticsEnabled booleans", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.admin.growth.kpis();
    expect(result).toHaveProperty("enabled");
    expect(typeof result.enabled).toBe("boolean");
    expect(result).toHaveProperty("analyticsEnabled");
    expect(typeof result.analyticsEnabled).toBe("boolean");
  });

  it("when growth flag is OFF, returns { enabled: false, analyticsEnabled: boolean, data: null }", async () => {
    const originalGrowth = featureFlags.v2GrowthDashboardEnabled;
    featureFlags.v2GrowthDashboardEnabled = false;
    try {
      const caller = appRouter.createCaller(makeAdminCtx());
      const result = await caller.admin.growth.kpis();
      expect(result.enabled).toBe(false);
      expect(result.data).toBeNull();
      expect(result).toHaveProperty("analyticsEnabled");
      expect(typeof result.analyticsEnabled).toBe("boolean");
    } finally {
      featureFlags.v2GrowthDashboardEnabled = originalGrowth;
    }
  });

  it("when growth=true and analytics=false, returns enabled=true and analyticsEnabled=false", async () => {
    const originalGrowth = featureFlags.v2GrowthDashboardEnabled;
    const originalAnalytics = featureFlags.v2AnalyticsEnabled;
    featureFlags.v2GrowthDashboardEnabled = true;
    featureFlags.v2AnalyticsEnabled = false;
    try {
      const caller = appRouter.createCaller(makeAdminCtx());
      const result = await caller.admin.growth.kpis();
      expect(result.enabled).toBe(true);
      expect(result.analyticsEnabled).toBe(false);
      expect(result.data).not.toBeNull();
    } finally {
      featureFlags.v2GrowthDashboardEnabled = originalGrowth;
      featureFlags.v2AnalyticsEnabled = originalAnalytics;
    }
  });

  it("when both flags are true, returns enabled=true and analyticsEnabled=true", async () => {
    const originalGrowth = featureFlags.v2GrowthDashboardEnabled;
    const originalAnalytics = featureFlags.v2AnalyticsEnabled;
    featureFlags.v2GrowthDashboardEnabled = true;
    featureFlags.v2AnalyticsEnabled = true;
    try {
      const caller = appRouter.createCaller(makeAdminCtx());
      const result = await caller.admin.growth.kpis();
      expect(result.enabled).toBe(true);
      expect(result.analyticsEnabled).toBe(true);
      expect(result.data).not.toBeNull();
    } finally {
      featureFlags.v2GrowthDashboardEnabled = originalGrowth;
      featureFlags.v2AnalyticsEnabled = originalAnalytics;
    }
  });
});

// ─── J: KPI helpers — getFunnelCompletion7d ──────────────────────────────────

describe("J: getFunnelCompletion7d", () => {
  it("returns an array of { step, count, pct } objects", async () => {
    const { getFunnelCompletion7d } = await import("./db");
    const result = await getFunnelCompletion7d();
    expect(Array.isArray(result)).toBe(true);
    for (const row of result) {
      expect(row).toHaveProperty("step");
      expect(row).toHaveProperty("count");
      expect(row).toHaveProperty("pct");
      expect(typeof row.step).toBe("string");
      expect(typeof row.count).toBe("number");
      expect(typeof row.pct).toBe("number");
    }
  });

  it("all steps are from FUNNEL_STEPS", async () => {
    const { getFunnelCompletion7d } = await import("./db");
    const result = await getFunnelCompletion7d();
    for (const row of result) {
      expect(FUNNEL_STEPS).toContain(row.step);
    }
  });
});

// ─── K: KPI helpers — getOutcomeCounts ───────────────────────────────────────

describe("K: getOutcomeCounts", () => {
  it("returns { interviews: number, offers: number }", async () => {
    const { getOutcomeCounts } = await import("./db");
    const result = await getOutcomeCounts();
    expect(result).toHaveProperty("interviews");
    expect(result).toHaveProperty("offers");
    expect(typeof result.interviews).toBe("number");
    expect(typeof result.offers).toBe("number");
    expect(result.interviews).toBeGreaterThanOrEqual(0);
    expect(result.offers).toBeGreaterThanOrEqual(0);
  });
});

// ─── L: KPI helpers — getNewUsers ────────────────────────────────────────────

describe("L: getNewUsers", () => {
  it("returns a non-negative number for 7 days", async () => {
    const { getNewUsers } = await import("./db");
    const result = await getNewUsers(7);
    expect(typeof result).toBe("number");
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it("returns a non-negative number for 30 days", async () => {
    const { getNewUsers } = await import("./db");
    const result = await getNewUsers(30);
    expect(typeof result).toBe("number");
    expect(result).toBeGreaterThanOrEqual(0);
  });
});

// ─── M: KPI helpers — getWAU ─────────────────────────────────────────────────

describe("M: getWAU", () => {
  it("returns a non-negative number", async () => {
    const { getWAU } = await import("./db");
    const result = await getWAU();
    expect(typeof result).toBe("number");
    expect(result).toBeGreaterThanOrEqual(0);
  });
});

// ─── N: KPI helpers — getMAU ─────────────────────────────────────────────────

describe("N: getMAU", () => {
  it("returns a non-negative number", async () => {
    const { getMAU } = await import("./db");
    const result = await getMAU();
    expect(typeof result).toBe("number");
    expect(result).toBeGreaterThanOrEqual(0);
  });
});

// ─── O: KPI helpers — getActivatedUsers7d ────────────────────────────────────

describe("O: getActivatedUsers7d", () => {
  it("returns a non-negative number", async () => {
    const { getActivatedUsers7d } = await import("./db");
    const result = await getActivatedUsers7d();
    expect(typeof result).toBe("number");
    expect(result).toBeGreaterThanOrEqual(0);
  });
});

// ─── P: KPI helpers — getErrorCount7d ────────────────────────────────────────

describe("P: getErrorCount7d", () => {
  it("returns a non-negative number", async () => {
    const { getErrorCount7d } = await import("./db");
    const result = await getErrorCount7d();
    expect(typeof result).toBe("number");
    expect(result).toBeGreaterThanOrEqual(0);
  });
});

// ─── Q: getNewUsers — DB-based (not event-based) ─────────────────────────────

describe("Q: getNewUsers — DB ground truth", () => {
  it("returns same value regardless of analytics flag state (DB-based, not event-based)", async () => {
    const { getNewUsers } = await import("./db");
    const originalFlag = featureFlags.v2AnalyticsEnabled;
    featureFlags.v2AnalyticsEnabled = false;
    const resultFlagOff = await getNewUsers(7);
    featureFlags.v2AnalyticsEnabled = true;
    const resultFlagOn = await getNewUsers(7);
    featureFlags.v2AnalyticsEnabled = originalFlag;
    expect(typeof resultFlagOff).toBe("number");
    expect(typeof resultFlagOn).toBe("number");
    // Both use the same DB query — values must be identical
    expect(resultFlagOff).toBe(resultFlagOn);
  });

  it("30-day count is >= 7-day count (monotonic)", async () => {
    const { getNewUsers } = await import("./db");
    const [d7, d30] = await Promise.all([getNewUsers(7), getNewUsers(30)]);
    expect(d30).toBeGreaterThanOrEqual(d7);
  });
});

// ─── R: activationRate7d — null when newUsers7d is 0 ─────────────────────────

describe("R: activationRate7d — divide-by-zero guard", () => {
  it("activationRate7d is null or a valid 0-100 percentage", async () => {
    const originalGrowth = featureFlags.v2GrowthDashboardEnabled;
    featureFlags.v2GrowthDashboardEnabled = true;
    try {
      const caller = appRouter.createCaller(makeAdminCtx());
      const result = await caller.admin.growth.kpis();
      if (result.enabled && result.data) {
        const rate = result.data.activationRate7d;
        if (rate !== null) {
          expect(typeof rate).toBe("number");
          expect(rate).toBeGreaterThanOrEqual(0);
          expect(rate).toBeLessThanOrEqual(100);
        } else {
          // null is valid when newUsers7d === 0
          expect(rate).toBeNull();
        }
      }
    } finally {
      featureFlags.v2GrowthDashboardEnabled = originalGrowth;
    }
  });
});

// ─── S: getInstrumentationHealth24h ──────────────────────────────────────────

describe("S: getInstrumentationHealth24h", () => {
  it("returns { events24h: number, lastEventAt: Date|null, topEvents24h: array }", async () => {
    const { getInstrumentationHealth24h } = await import("./db");
    const result = await getInstrumentationHealth24h();
    expect(result).toHaveProperty("events24h");
    expect(result).toHaveProperty("lastEventAt");
    expect(result).toHaveProperty("topEvents24h");
    expect(typeof result.events24h).toBe("number");
    expect(result.events24h).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(result.topEvents24h)).toBe(true);
  });

  it("topEvents24h entries have { name: string, count: number }", async () => {
    const { getInstrumentationHealth24h } = await import("./db");
    const result = await getInstrumentationHealth24h();
    for (const ev of result.topEvents24h) {
      expect(typeof ev.name).toBe("string");
      expect(typeof ev.count).toBe("number");
      expect(ev.count).toBeGreaterThanOrEqual(0);
    }
  });

  it("topEvents24h has at most 5 entries", async () => {
    const { getInstrumentationHealth24h } = await import("./db");
    const result = await getInstrumentationHealth24h();
    expect(result.topEvents24h.length).toBeLessThanOrEqual(5);
  });

  it("admin.growth.kpis data includes instrumentationHealth when growth flag is ON", async () => {
    const originalGrowth = featureFlags.v2GrowthDashboardEnabled;
    featureFlags.v2GrowthDashboardEnabled = true;
    try {
      const caller = appRouter.createCaller(makeAdminCtx());
      const result = await caller.admin.growth.kpis();
      expect(result.enabled).toBe(true);
      expect(result.data).not.toBeNull();
      if (result.data) {
        expect(result.data).toHaveProperty("instrumentationHealth");
        const health = result.data.instrumentationHealth;
        expect(health).toHaveProperty("events24h");
        expect(health).toHaveProperty("lastEventAt");
        expect(health).toHaveProperty("topEvents24h");
      }
    } finally {
      featureFlags.v2GrowthDashboardEnabled = originalGrowth;
    }
  });
});
