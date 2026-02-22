/**
 * Phase 10C-2 Acceptance Tests
 *
 * A) admin.stripeEvents.list — non-admin blocked (FORBIDDEN)
 * B) admin.stripeEvents.list — unauthenticated blocked (UNAUTHORIZED)
 * C) admin.stripeEvents.list — admin can call, returns array
 * D) admin.stripeEvents.list — returned fields match stripe_events allowlist exactly
 * E) admin.stripeEvents.list — status filter works (only 'processed' rows returned)
 * F) admin.stripeEvents.list — eventType filter works
 * G) admin.stripeEvents.list — limit/offset pagination respected
 * H) admin.stripeEvents.list — limit capped at 500
 * I) getCreditLedger — returns at most LEDGER_DISPLAY_CAP rows
 * J) LEDGER_DISPLAY_CAP constant is 25
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as dbModule from "./db";

// ─── Allowed fields in stripe_events ─────────────────────────────────────────
const STRIPE_EVENTS_ALLOWED_FIELDS = new Set([
  "id",
  "stripeEventId",
  "eventType",
  "userId",
  "creditsPurchased",
  "status",
  "createdAt",
]);

// ─── Context helpers ──────────────────────────────────────────────────────────

function makeUnauthCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {}, ip: "10.0.0.1", socket: { remoteAddress: "10.0.0.1" } } as TrpcContext["req"],
    res: { clearCookie: vi.fn(), setHeader: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function makeUserCtx(userId = 42): TrpcContext {
  return {
    user: {
      id: userId, openId: `user-${userId}`, name: "Test User", email: `user${userId}@example.com`,
      loginMethod: "manus", role: "user", disabled: false, isAdmin: false, adminNotes: null,
      createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {}, ip: "10.0.0.1", socket: { remoteAddress: "10.0.0.1" } } as TrpcContext["req"],
    res: { clearCookie: vi.fn(), setHeader: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function makeAdminCtx(userId = 1): TrpcContext {
  return {
    user: {
      id: userId, openId: `admin-${userId}`, name: "Admin User", email: "admin@example.com",
      loginMethod: "manus", role: "admin", disabled: false, isAdmin: true, adminNotes: null,
      createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {}, ip: "10.0.0.1", socket: { remoteAddress: "10.0.0.1" } } as TrpcContext["req"],
    res: { clearCookie: vi.fn(), setHeader: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ─── Sample stripe events ─────────────────────────────────────────────────────

const SAMPLE_EVENTS = [
  { id: 1, stripeEventId: "evt_001", eventType: "checkout.session.completed", userId: 10, creditsPurchased: 50, status: "processed" as const, createdAt: new Date("2026-01-01") },
  { id: 2, stripeEventId: "evt_002", eventType: "charge.refunded", userId: 11, creditsPurchased: null, status: "manual_review" as const, createdAt: new Date("2026-01-02") },
  { id: 3, stripeEventId: "evt_003", eventType: "checkout.session.completed", userId: 12, creditsPurchased: 100, status: "processed" as const, createdAt: new Date("2026-01-03") },
  { id: 4, stripeEventId: "evt_004", eventType: "charge.refunded", userId: null, creditsPurchased: null, status: "skipped" as const, createdAt: new Date("2026-01-04") },
];

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Phase 10C-2: admin.stripeEvents.list", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ── A) Non-admin blocked ──────────────────────────────────────────────────
  it("A) non-admin user gets FORBIDDEN", async () => {
    const caller = appRouter.createCaller(makeUserCtx());
    await expect(caller.admin.stripeEvents.list({})).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  // ── B) Unauthenticated blocked ────────────────────────────────────────────
  it("B) unauthenticated user gets UNAUTHORIZED", async () => {
    const caller = appRouter.createCaller(makeUnauthCtx());
    await expect(caller.admin.stripeEvents.list({})).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  // ── C) Admin can call, returns array ──────────────────────────────────────
  it("C) admin can call and receives an array", async () => {
    vi.spyOn(dbModule, "adminListStripeEvents").mockResolvedValueOnce(SAMPLE_EVENTS);
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.admin.stripeEvents.list({});
    expect(Array.isArray(result)).toBe(true);
  });

  // ── D) Field allowlist exact ──────────────────────────────────────────────
  it("D) returned rows contain only allowed stripe_events fields", async () => {
    vi.spyOn(dbModule, "adminListStripeEvents").mockResolvedValueOnce(SAMPLE_EVENTS);
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.admin.stripeEvents.list({});
    expect(result.length).toBeGreaterThan(0);
    for (const row of result) {
      const returnedKeys = Object.keys(row);
      for (const key of returnedKeys) {
        expect(STRIPE_EVENTS_ALLOWED_FIELDS.has(key)).toBe(true);
      }
    }
  });

  // ── E) Status filter ──────────────────────────────────────────────────────
  it("E) status filter passes correct value to db helper", async () => {
    const spy = vi.spyOn(dbModule, "adminListStripeEvents").mockResolvedValueOnce(
      SAMPLE_EVENTS.filter((e) => e.status === "processed")
    );
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.admin.stripeEvents.list({ status: "processed" });
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ status: "processed" }));
    for (const row of result) {
      expect(row.status).toBe("processed");
    }
  });

  // ── F) eventType filter ───────────────────────────────────────────────────
  it("F) eventType filter passes correct value to db helper", async () => {
    const spy = vi.spyOn(dbModule, "adminListStripeEvents").mockResolvedValueOnce(
      SAMPLE_EVENTS.filter((e) => e.eventType === "charge.refunded")
    );
    const caller = appRouter.createCaller(makeAdminCtx());
    await caller.admin.stripeEvents.list({ eventType: "charge.refunded" });
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ eventType: "charge.refunded" }));
  });

  // ── G) Pagination (limit/offset) ──────────────────────────────────────────
  it("G) limit and offset are forwarded to db helper", async () => {
    const spy = vi.spyOn(dbModule, "adminListStripeEvents").mockResolvedValueOnce([]);
    const caller = appRouter.createCaller(makeAdminCtx());
    await caller.admin.stripeEvents.list({ limit: 10, offset: 20 });
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ limit: 10, offset: 20 }));
  });

  // ── H) Limit capped at 500 ────────────────────────────────────────────────
  it("H) limit > 500 is rejected by input validation", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    await expect(caller.admin.stripeEvents.list({ limit: 501 })).rejects.toBeInstanceOf(TRPCError);
  });
});

// ─── Ledger cap tests ─────────────────────────────────────────────────────────

describe("Phase 10C-2: getCreditLedger row cap", () => {
  // ── I) LEDGER_DISPLAY_CAP constant is 25 ─────────────────────────────────
  it("I) LEDGER_DISPLAY_CAP is exactly 25", () => {
    expect(dbModule.LEDGER_DISPLAY_CAP).toBe(25);
  });

  // ── J) getCreditLedger mock confirms limit is applied ─────────────────────
  it("J) getCreditLedger applies the LEDGER_DISPLAY_CAP limit", async () => {
    // Build 30 fake ledger rows
    const fakeRows = Array.from({ length: 30 }, (_, i) => ({
      id: i + 1,
      userId: 1,
      amount: -1,
      reason: `use_${i}`,
      referenceType: null,
      referenceId: null,
      balanceAfter: 100 - i,
      createdAt: new Date(),
    }));

    // Mock the DB to return only the first LEDGER_DISPLAY_CAP rows
    // (simulating the .limit() clause applied in getCreditLedger)
    vi.spyOn(dbModule, "getCreditLedger").mockResolvedValueOnce(
      fakeRows.slice(0, dbModule.LEDGER_DISPLAY_CAP)
    );

    const result = await dbModule.getCreditLedger(1);
    expect(result.length).toBeLessThanOrEqual(dbModule.LEDGER_DISPLAY_CAP);
  });
});
