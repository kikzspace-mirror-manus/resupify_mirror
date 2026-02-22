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
  it("admin user gets a response with enabled boolean", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.admin.growth.kpis();
    expect(result).toHaveProperty("enabled");
    expect(typeof result.enabled).toBe("boolean");
  });

  it("when flag is OFF, returns { enabled: false, data: null }", async () => {
    const originalFlag = featureFlags.v2GrowthDashboardEnabled;
    featureFlags.v2GrowthDashboardEnabled = false;
    try {
      const caller = appRouter.createCaller(makeAdminCtx());
      const result = await caller.admin.growth.kpis();
      expect(result.enabled).toBe(false);
      expect(result.data).toBeNull();
    } finally {
      featureFlags.v2GrowthDashboardEnabled = originalFlag;
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
