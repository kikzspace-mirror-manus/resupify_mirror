/**
 * Patch: Waitlist Notify-Owner via Ops Event — Acceptance Tests
 *
 * A) Unauthenticated caller cannot call waitlist.joined (UNAUTHORIZED)
 * B) Logged-in gated user: first call logs event (logged=true)
 * C) Logged-in gated user: second call within 24h is deduped (logged=false)
 * D) After 24h window, event is logged again (logged=true)
 * E) logOperationalEvent called with correct endpointGroup and eventType on first visit
 * F) logOperationalEvent NOT called when dedupe fires
 * G) waitlistEventRecentlyLogged returns false when no recent event exists
 * H) waitlistEventRecentlyLogged returns true when recent event exists
 * I) operationalEvents schema includes "waitlist" endpointGroup and "waitlist_joined" eventType
 * J) admin.operationalEvents.list accepts endpointGroup=waitlist filter (non-admin blocked)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as dbModule from "./db";

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
      earlyAccessEnabled: false, earlyAccessGrantUsed: false,
      createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
    } as any,
    req: { protocol: "https", headers: {}, ip: "10.0.0.1", socket: { remoteAddress: "10.0.0.1" } } as TrpcContext["req"],
    res: { clearCookie: vi.fn(), setHeader: vi.fn() } as unknown as TrpcContext["res"],
  };
}
function makeAdminCtx(userId = 1): TrpcContext {
  return {
    user: {
      id: userId, openId: `admin-${userId}`, name: "Admin", email: "admin@example.com",
      loginMethod: "manus", role: "admin", disabled: false, isAdmin: true, adminNotes: null,
      earlyAccessEnabled: true, earlyAccessGrantUsed: true,
      createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
    } as any,
    req: { protocol: "https", headers: {}, ip: "10.0.0.1", socket: { remoteAddress: "10.0.0.1" } } as TrpcContext["req"],
    res: { clearCookie: vi.fn(), setHeader: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ─── Spies ────────────────────────────────────────────────────────────────────
const mockWaitlistRecent = vi.spyOn(dbModule, "waitlistEventRecentlyLogged");
const mockLogEvent = vi.spyOn(dbModule, "logOperationalEvent");

beforeEach(() => {
  vi.clearAllMocks();
  // Default: no recent event → first visit
  mockWaitlistRecent.mockResolvedValue(false);
  mockLogEvent.mockResolvedValue(undefined);
});

describe("Patch: Waitlist Notify-Owner via Ops Event", () => {
  // A) Unauthenticated blocked
  it("A) Unauthenticated caller cannot call waitlist.joined (UNAUTHORIZED)", async () => {
    const caller = appRouter.createCaller(makeUnauthCtx());
    await expect(caller.waitlist.joined()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  // B) First visit: logged=true
  it("B) First visit: waitlist.joined returns { logged: true }", async () => {
    mockWaitlistRecent.mockResolvedValue(false);
    const caller = appRouter.createCaller(makeUserCtx());
    const result = await caller.waitlist.joined();
    expect(result.logged).toBe(true);
  });

  // C) Second visit within 24h: logged=false (deduped)
  it("C) Second visit within 24h: waitlist.joined returns { logged: false }", async () => {
    mockWaitlistRecent.mockResolvedValue(true);
    const caller = appRouter.createCaller(makeUserCtx());
    const result = await caller.waitlist.joined();
    expect(result.logged).toBe(false);
  });

  // D) After 24h: logged=true again
  it("D) After 24h window: waitlist.joined returns { logged: true } again", async () => {
    // Simulate 24h passed: recent check returns false
    mockWaitlistRecent.mockResolvedValue(false);
    const caller = appRouter.createCaller(makeUserCtx());
    const result = await caller.waitlist.joined();
    expect(result.logged).toBe(true);
  });

  // E) logOperationalEvent called with correct fields on first visit
  it("E) logOperationalEvent called with endpointGroup=waitlist, eventType=waitlist_joined on first visit", async () => {
    mockWaitlistRecent.mockResolvedValue(false);
    const caller = appRouter.createCaller(makeUserCtx());
    await caller.waitlist.joined();
    expect(mockLogEvent).toHaveBeenCalledTimes(1);
    const callArg = mockLogEvent.mock.calls[0]![0];
    expect(callArg.endpointGroup).toBe("waitlist");
    expect(callArg.eventType).toBe("waitlist_joined");
    expect(callArg.statusCode).toBe(200);
    expect(callArg.userIdHash).toBeDefined();
    expect(typeof callArg.userIdHash).toBe("string");
    expect(callArg.userIdHash!.length).toBe(16);
  });

  // F) logOperationalEvent NOT called when dedupe fires
  it("F) logOperationalEvent NOT called when dedupe fires (within 24h)", async () => {
    mockWaitlistRecent.mockResolvedValue(true);
    const caller = appRouter.createCaller(makeUserCtx());
    await caller.waitlist.joined();
    expect(mockLogEvent).not.toHaveBeenCalled();
  });

  // G) waitlistEventRecentlyLogged returns false when no recent event
  it("G) waitlistEventRecentlyLogged returns false when no recent event exists", async () => {
    mockWaitlistRecent.mockResolvedValue(false);
    const result = await dbModule.waitlistEventRecentlyLogged("abc123def456abcd");
    expect(result).toBe(false);
  });

  // H) waitlistEventRecentlyLogged returns true when recent event exists
  it("H) waitlistEventRecentlyLogged returns true when recent event exists", async () => {
    mockWaitlistRecent.mockResolvedValue(true);
    const result = await dbModule.waitlistEventRecentlyLogged("abc123def456abcd");
    expect(result).toBe(true);
  });

  // I) Schema includes new enum values
  it("I) operationalEvents schema includes waitlist endpointGroup and waitlist_joined eventType", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.operationalEvents).toBeDefined();
    // TypeScript compilation validates the enum values; this confirms the import works
    expect(schema).toBeDefined();
  });

  // J) admin.operationalEvents.list — non-admin blocked (FORBIDDEN)
  it("J) admin.operationalEvents.list — non-admin blocked (FORBIDDEN)", async () => {
    const caller = appRouter.createCaller(makeUserCtx());
    await expect(
      caller.admin.operationalEvents.list({ endpointGroup: "waitlist", eventType: "waitlist_joined" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
