/**
 * Stripe Copy Guard — Acceptance Tests
 *
 * Acceptance criteria:
 * A) stripe.isTestMode returns { isTestMode: true } when key starts with 'sk_test_'
 * B) stripe.isTestMode returns { isTestMode: false } when key starts with 'sk_live_'
 * C) stripe.isTestMode returns { isTestMode: false } when key is empty / unset
 * D) stripe.isTestMode is callable by unauthenticated users (publicProcedure)
 * E) stripe.isTestMode is callable by authenticated users
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Context helpers ──────────────────────────────────────────────────────────

function makeUnauthCtx(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
      ip: "10.0.0.1",
      socket: { remoteAddress: "10.0.0.1" },
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
      setHeader: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function makeUserCtx(userId = 42): TrpcContext {
  return {
    user: {
      id: userId,
      openId: `user-${userId}`,
      name: "Test User",
      email: `user${userId}@example.com`,
      loginMethod: "manus",
      role: "user",
      disabled: false,
      isAdmin: false,
      adminNotes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
      ip: "10.0.0.1",
      socket: { remoteAddress: "10.0.0.1" },
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
      setHeader: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Stripe Copy Guard: stripe.isTestMode", () => {
  const originalKey = process.env.STRIPE_SECRET_KEY;

  afterEach(() => {
    // Restore the original key after each test
    if (originalKey === undefined) {
      delete process.env.STRIPE_SECRET_KEY;
    } else {
      process.env.STRIPE_SECRET_KEY = originalKey;
    }
  });

  // ── A) Test key → isTestMode: true ───────────────────────────────────────
  it("A) returns isTestMode: true when key starts with sk_test_", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_abc123";
    const caller = appRouter.createCaller(makeUnauthCtx());
    const result = await caller.stripe.isTestMode();
    expect(result).toEqual({ isTestMode: true });
  });

  // ── B) Live key → isTestMode: false ──────────────────────────────────────
  it("B) returns isTestMode: false when key starts with sk_live_", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_live_abc123";
    const caller = appRouter.createCaller(makeUnauthCtx());
    const result = await caller.stripe.isTestMode();
    expect(result).toEqual({ isTestMode: false });
  });

  // ── C) Empty key → isTestMode: false ─────────────────────────────────────
  it("C) returns isTestMode: false when key is empty or unset", async () => {
    delete process.env.STRIPE_SECRET_KEY;
    const caller = appRouter.createCaller(makeUnauthCtx());
    const result = await caller.stripe.isTestMode();
    expect(result).toEqual({ isTestMode: false });
  });

  // ── D) Unauthenticated user can call isTestMode (publicProcedure) ─────────
  it("D) unauthenticated user can call stripe.isTestMode without error", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_public_check";
    const caller = appRouter.createCaller(makeUnauthCtx());
    await expect(caller.stripe.isTestMode()).resolves.not.toThrow();
  });

  // ── E) Authenticated user can also call isTestMode ────────────────────────
  it("E) authenticated user can call stripe.isTestMode", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_user_check";
    const caller = appRouter.createCaller(makeUserCtx());
    const result = await caller.stripe.isTestMode();
    expect(result.isTestMode).toBe(true);
  });
});
