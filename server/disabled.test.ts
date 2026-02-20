import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import type { User } from "../drizzle/schema";
import { ACCOUNT_DISABLED_ERR_MSG, ACCOUNT_DISABLED_CODE } from "../shared/const";

// ─── Context factories ───────────────────────────────────────────────

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 42,
    openId: "test-user-openid",
    name: "Test User",
    email: "test@example.com",
    loginMethod: "manus",
    role: "user",
    isAdmin: false,
    adminNotes: null,
    disabled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };
}

function makeCtx(user: User | null): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

function makeDisabledCtx(): TrpcContext {
  return makeCtx(makeUser({ disabled: true }));
}

function makeEnabledCtx(): TrpcContext {
  return makeCtx(makeUser({ disabled: false }));
}

function makeAdminCtx(): TrpcContext {
  return makeCtx(makeUser({ role: "admin", isAdmin: true, disabled: false }));
}

function makeDisabledAdminCtx(): TrpcContext {
  return makeCtx(makeUser({ role: "admin", isAdmin: true, disabled: true }));
}

// ─── Helper: assert ACCOUNT_DISABLED error ───────────────────────────

async function expectAccountDisabled(fn: () => Promise<unknown>) {
  try {
    await fn();
    expect.fail("Expected ACCOUNT_DISABLED error but procedure succeeded");
  } catch (err: any) {
    expect(err.message).toBe(ACCOUNT_DISABLED_ERR_MSG);
    expect(err.code).toBe("FORBIDDEN");
    // The cause carries the machine-readable code
    expect(err.cause?.code ?? (err as any).opts?.cause?.code).toBe(ACCOUNT_DISABLED_CODE);
  }
}

// ─── Tests ───────────────────────────────────────────────────────────

describe("Disabled user blocking — server-side enforcement (Option A)", () => {

  // ── auth.me is PUBLIC — disabled users can still read their own identity ──
  it("auth.me (public) returns user even when disabled", async () => {
    const caller = appRouter.createCaller(makeDisabledCtx());
    const result = await caller.auth.me();
    expect(result?.disabled).toBe(true);
  });

  // ── Job Cards ────────────────────────────────────────────────────────────
  it("disabled user cannot list job cards", async () => {
    const caller = appRouter.createCaller(makeDisabledCtx());
    await expectAccountDisabled(() => caller.jobCards.list());
  });

  it("disabled user cannot create a job card", async () => {
    const caller = appRouter.createCaller(makeDisabledCtx());
    await expectAccountDisabled(() =>
      caller.jobCards.create({ title: "SWE Intern", company: "Acme" })
    );
  });

  it("disabled user cannot get a job card by id", async () => {
    const caller = appRouter.createCaller(makeDisabledCtx());
    await expectAccountDisabled(() => caller.jobCards.get({ id: 1 }));
  });

  // ── Tasks ────────────────────────────────────────────────────────────────
  it("disabled user cannot list tasks", async () => {
    const caller = appRouter.createCaller(makeDisabledCtx());
    await expectAccountDisabled(() => caller.tasks.list());
  });

  it("disabled user cannot create a task", async () => {
    const caller = appRouter.createCaller(makeDisabledCtx());
    await expectAccountDisabled(() =>
      caller.tasks.create({ title: "Follow up #1" })
    );
  });

  it("disabled user cannot update a task", async () => {
    const caller = appRouter.createCaller(makeDisabledCtx());
    await expectAccountDisabled(() =>
      caller.tasks.update({ id: 1, completed: true })
    );
  });

  // ── JD Snapshots ─────────────────────────────────────────────────────────
  it("disabled user cannot list JD snapshots", async () => {
    const caller = appRouter.createCaller(makeDisabledCtx());
    await expectAccountDisabled(() => caller.jdSnapshots.list({ jobCardId: 1 }));
  });

  // ── Resumes ──────────────────────────────────────────────────────────────
  it("disabled user cannot list resumes", async () => {
    const caller = appRouter.createCaller(makeDisabledCtx());
    await expectAccountDisabled(() => caller.resumes.list());
  });

  // ── Contacts / Outreach ──────────────────────────────────────────────────
  it("disabled user cannot list contacts", async () => {
    const caller = appRouter.createCaller(makeDisabledCtx());
    await expectAccountDisabled(() => caller.contacts.list());
  });

  // ── Credits / Billing ────────────────────────────────────────────────────
  it("disabled user cannot read credits balance", async () => {
    const caller = appRouter.createCaller(makeDisabledCtx());
    await expectAccountDisabled(() => caller.credits.balance());
  });

  // ── Admin endpoints (Option A: disabled blocks admin too) ────────────────
  it("disabled admin cannot access admin KPIs (Option A)", async () => {
    const caller = appRouter.createCaller(makeDisabledAdminCtx());
    await expectAccountDisabled(() => caller.admin.kpis());
  });

  it("disabled admin cannot list admin users (Option A)", async () => {
    const caller = appRouter.createCaller(makeDisabledAdminCtx());
    await expectAccountDisabled(() => caller.admin.users.list());
  });

  // ── Non-disabled users are unaffected ────────────────────────────────────
  it("enabled user can list job cards without ACCOUNT_DISABLED error", async () => {
    const caller = appRouter.createCaller(makeEnabledCtx());
    // Will fail with a DB error (no DB in test env) but NOT with ACCOUNT_DISABLED
    try {
      await caller.jobCards.list();
    } catch (err: any) {
      expect(err.message).not.toBe(ACCOUNT_DISABLED_ERR_MSG);
    }
  });

  it("enabled user can list tasks without ACCOUNT_DISABLED error", async () => {
    const caller = appRouter.createCaller(makeEnabledCtx());
    try {
      await caller.tasks.list();
    } catch (err: any) {
      expect(err.message).not.toBe(ACCOUNT_DISABLED_ERR_MSG);
    }
  });

  it("enabled admin can access admin KPIs without ACCOUNT_DISABLED error", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    try {
      await caller.admin.kpis();
    } catch (err: any) {
      expect(err.message).not.toBe(ACCOUNT_DISABLED_ERR_MSG);
    }
  });

  // ── Error shape validation ────────────────────────────────────────────────
  it("ACCOUNT_DISABLED error has correct code and message", async () => {
    const caller = appRouter.createCaller(makeDisabledCtx());
    let caught: any = null;
    try {
      await caller.jobCards.list();
    } catch (err) {
      caught = err;
    }
    expect(caught).not.toBeNull();
    expect(caught.code).toBe("FORBIDDEN");
    expect(caught.message).toBe(ACCOUNT_DISABLED_ERR_MSG);
    expect(caught.message).toContain("10003");
  });

  it("ACCOUNT_DISABLED error cause carries machine-readable code", async () => {
    const caller = appRouter.createCaller(makeDisabledCtx());
    let caught: any = null;
    try {
      await caller.jobCards.list();
    } catch (err: any) {
      caught = err;
    }
    // The cause is attached so the frontend can detect without string-matching
    const causeCode = caught?.cause?.code ?? caught?.opts?.cause?.code;
    expect(causeCode).toBe(ACCOUNT_DISABLED_CODE);
  });
});
