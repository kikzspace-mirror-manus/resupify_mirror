import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Helpers ────────────────────────────────────────────────────────

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "francisnoces@gmail.com",
    name: "Francis Admin",
    loginMethod: "manus",
    role: "admin",
    isAdmin: true,
    adminNotes: null,
    disabled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

function createRegularUserContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "regular-user",
    email: "student@university.ca",
    name: "Regular Student",
    loginMethod: "manus",
    role: "user",
    isAdmin: false,
    adminNotes: null,
    disabled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

function createUnauthenticatedContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

// ─── Admin Authorization Tests ──────────────────────────────────────

describe("Admin Authorization", () => {
  it("admin.kpis rejects unauthenticated users", async () => {
    const ctx = createUnauthenticatedContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.kpis()).rejects.toThrow();
  });

  it("admin.kpis rejects non-admin users", async () => {
    const ctx = createRegularUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.kpis()).rejects.toThrow(/permission/i);
  });

  it("admin.users.list rejects non-admin users", async () => {
    const ctx = createRegularUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.users.list({})).rejects.toThrow(/permission/i);
  });

  it("admin.runs.list rejects non-admin users", async () => {
    const ctx = createRegularUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.runs.list({})).rejects.toThrow(/permission/i);
  });

  it("admin.ledger.list rejects non-admin users", async () => {
    const ctx = createRegularUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.ledger.list({})).rejects.toThrow(/permission/i);
  });

  it("admin.packs.list rejects non-admin users", async () => {
    const ctx = createRegularUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.packs.list()).rejects.toThrow(/permission/i);
  });

  it("admin.health.overview rejects non-admin users", async () => {
    const ctx = createRegularUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.health.overview()).rejects.toThrow(/permission/i);
  });

  it("admin.auditLogs rejects non-admin users", async () => {
    const ctx = createRegularUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.auditLogs({})).rejects.toThrow(/permission/i);
  });

  it("admin.sandbox.createSampleJobCard rejects non-admin users", async () => {
    const ctx = createRegularUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.sandbox.createSampleJobCard()).rejects.toThrow(/permission/i);
  });

  it("admin.sandbox.createSampleResume rejects non-admin users", async () => {
    const ctx = createRegularUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.sandbox.createSampleResume()).rejects.toThrow(/permission/i);
  });
});

// ─── Admin Packs Tests (no DB required) ─────────────────────────────

describe("Admin Packs", () => {
  it("admin.packs.list returns available packs with packData", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const packs = await caller.admin.packs.list();
    // Now includes 2 CA + 4 VN tracks
    expect(packs.length).toBeGreaterThanOrEqual(2);
    packs.forEach((p) => {
      expect(p.key).toBeTruthy();
      expect(p.label).toBeTruthy();
      expect(p.regionCode).toBeTruthy();
      expect(p.trackCode).toBeTruthy();
      expect(p.packData).toBeDefined();
      expect(p.packData.scoringWeights).toBeDefined();
      expect(p.packData.eligibilityChecks).toBeDefined();
    });
  });

  it("admin.packs.detail returns pack with raw JSON", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const detail = await caller.admin.packs.detail({ regionCode: "CA", trackCode: "COOP" });
    expect(detail.pack).toBeDefined();
    expect(detail.pack.regionCode).toBe("CA");
    expect(detail.pack.trackCode).toBe("COOP");
    expect(detail.rawJson).toBeTruthy();
    expect(typeof detail.rawJson).toBe("string");
    // Raw JSON should be parseable
    const parsed = JSON.parse(detail.rawJson);
    expect(parsed.label).toBe("Canada — Co-op");
  });

  it("admin.packs.detail falls back for unknown pack", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const detail = await caller.admin.packs.detail({ regionCode: "US", trackCode: "INTERN" });
    // Should fall back to CA_NEW_GRAD
    expect(detail.pack.regionCode).toBe("CA");
    expect(detail.pack.trackCode).toBe("NEW_GRAD");
  });
});

// ─── Admin Router Structure Tests ───────────────────────────────────

describe("Admin Router Structure", () => {
  it("appRouter has admin sub-router", () => {
    expect(appRouter._def.procedures).toBeDefined();
    // The admin router should be accessible
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    expect(caller.admin).toBeDefined();
    expect(caller.admin.kpis).toBeDefined();
    expect(caller.admin.users).toBeDefined();
    expect(caller.admin.runs).toBeDefined();
    expect(caller.admin.ledger).toBeDefined();
    expect(caller.admin.packs).toBeDefined();
    expect(caller.admin.health).toBeDefined();
    expect(caller.admin.sandbox).toBeDefined();
    expect(caller.admin.auditLogs).toBeDefined();
  });

  it("admin.users has list, detail, grantCredits, setAdmin, setDisabled", () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    expect(caller.admin.users.list).toBeDefined();
    expect(caller.admin.users.detail).toBeDefined();
    expect(caller.admin.users.grantCredits).toBeDefined();
    expect(caller.admin.users.setAdmin).toBeDefined();
    expect(caller.admin.users.setDisabled).toBeDefined();
  });

  it("admin.runs has list, detail, rerunTestMode", () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    expect(caller.admin.runs.list).toBeDefined();
    expect(caller.admin.runs.detail).toBeDefined();
    expect(caller.admin.runs.rerunTestMode).toBeDefined();
  });

  it("admin.sandbox has createSampleJobCard, createSampleResume, runEvidenceTestMode, generateOutreachTestMode", () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    expect(caller.admin.sandbox.createSampleJobCard).toBeDefined();
    expect(caller.admin.sandbox.createSampleResume).toBeDefined();
    expect(caller.admin.sandbox.runEvidenceTestMode).toBeDefined();
    expect(caller.admin.sandbox.generateOutreachTestMode).toBeDefined();
  });
});
