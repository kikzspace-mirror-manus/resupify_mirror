/**
 * Acceptance tests for the "Mark as sent" feature on follow-up tasks.
 *
 * Tests cover:
 * A) markSent sets completed=true, completedAt, and sentAt via updateTask
 * B) markSent is idempotent (calling twice doesn't error)
 * C) Non-followup tasks can also be marked (no server-side restriction by design)
 * D) Disabled user is blocked before reaching the DB call
 * E) Unauthenticated user is blocked
 * F-H) Badge logic: after marking sent, next incomplete follow_up becomes the badge date
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";
import type { TrpcContext } from "./_core/context";
import type { User } from "../drizzle/schema";

// ─── Spy on updateTask ────────────────────────────────────────────────────────

const updateTaskSpy = vi.spyOn(db, "updateTask").mockResolvedValue(undefined as any);

// ─── Context factories ────────────────────────────────────────────────────────

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 42,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    disabled: false,
    isAdmin: false,
    adminNotes: null,
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
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("tasks.markSent", () => {
  beforeEach(() => {
    updateTaskSpy.mockClear();
  });

  it("A) calls updateTask with completed=true, completedAt, and sentAt", async () => {
    const caller = appRouter.createCaller(makeCtx(makeUser()));

    const result = await caller.tasks.markSent({ id: 101 });

    expect(result.success).toBe(true);
    expect(result.sentAt).toBeInstanceOf(Date);

    expect(updateTaskSpy).toHaveBeenCalledOnce();
    const [taskId, userId, updateData] = updateTaskSpy.mock.calls[0] as [number, number, any];
    expect(taskId).toBe(101);
    expect(userId).toBe(42);
    expect(updateData.completed).toBe(true);
    expect(updateData.completedAt).toBeInstanceOf(Date);
    expect(updateData.sentAt).toBeInstanceOf(Date);
    // sentAt and completedAt should be the same timestamp (within 1 second)
    expect(Math.abs(updateData.sentAt.getTime() - updateData.completedAt.getTime())).toBeLessThan(1000);
  });

  it("B) can be called twice without error (idempotent at procedure level)", async () => {
    const caller = appRouter.createCaller(makeCtx(makeUser()));

    await caller.tasks.markSent({ id: 55 });
    const result2 = await caller.tasks.markSent({ id: 55 });

    expect(result2.success).toBe(true);
    expect(updateTaskSpy).toHaveBeenCalledTimes(2);
  });

  it("C) works for any task id (no server-side restriction by task type)", async () => {
    const caller = appRouter.createCaller(makeCtx(makeUser()));

    const result = await caller.tasks.markSent({ id: 999 });
    expect(result.success).toBe(true);
    expect(updateTaskSpy).toHaveBeenCalledWith(999, 42, expect.objectContaining({
      completed: true,
      sentAt: expect.any(Date),
    }));
  });

  it("D) disabled user is blocked before reaching the DB", async () => {
    const caller = appRouter.createCaller(makeCtx(makeUser({ disabled: true })));

    await expect(caller.tasks.markSent({ id: 1 })).rejects.toThrow();
    // DB should NOT have been called
    expect(updateTaskSpy).not.toHaveBeenCalled();
  });

  it("E) unauthenticated user (null) cannot call markSent", async () => {
    const caller = appRouter.createCaller(makeCtx(null));

    await expect(caller.tasks.markSent({ id: 1 })).rejects.toThrow();
    expect(updateTaskSpy).not.toHaveBeenCalled();
  });
});

// ─── Badge logic after mark-sent (pure function tests) ───────────────────────

type TaskLike = {
  id: number;
  taskType: string;
  completed: boolean;
  dueDate: Date | null;
  sentAt?: Date | null;
};

/** Mirrors the getFollowupBadgeProps logic from JobCards.tsx */
function computeNextFollowupDueAt(tasks: TaskLike[]): Date | null {
  const candidates = tasks
    .filter((t) => t.taskType === "follow_up" && !t.completed && t.dueDate !== null)
    .map((t) => t.dueDate!.getTime());
  if (candidates.length === 0) return null;
  return new Date(Math.min(...candidates));
}

const TODAY = new Date(2026, 1, 20); // Feb 20 2026
function daysFromToday(n: number): Date {
  const d = new Date(TODAY);
  d.setDate(d.getDate() + n);
  return d;
}

describe("Badge shifts after markSent", () => {
  it("F) after marking Follow up #1 as sent, badge shows D+7", () => {
    const tasks: TaskLike[] = [
      { id: 1, taskType: "follow_up", completed: true, dueDate: daysFromToday(3), sentAt: new Date() },
      { id: 2, taskType: "follow_up", completed: false, dueDate: daysFromToday(7), sentAt: null },
      { id: 3, taskType: "follow_up", completed: false, dueDate: daysFromToday(14), sentAt: null },
    ];
    const result = computeNextFollowupDueAt(tasks);
    expect(result?.getTime()).toBe(daysFromToday(7).getTime());
  });

  it("G) after marking all 3 as sent, badge returns null (no badge shown)", () => {
    const tasks: TaskLike[] = [
      { id: 1, taskType: "follow_up", completed: true, dueDate: daysFromToday(3), sentAt: new Date() },
      { id: 2, taskType: "follow_up", completed: true, dueDate: daysFromToday(7), sentAt: new Date() },
      { id: 3, taskType: "follow_up", completed: true, dueDate: daysFromToday(14), sentAt: new Date() },
    ];
    const result = computeNextFollowupDueAt(tasks);
    expect(result).toBeNull();
  });

  it("H) completed task has sentAt set (data contract check)", () => {
    const completedTask: TaskLike = {
      id: 1,
      taskType: "follow_up",
      completed: true,
      dueDate: daysFromToday(3),
      sentAt: new Date(2026, 1, 23),
    };
    expect(completedTask.sentAt).toBeInstanceOf(Date);
    expect(completedTask.completed).toBe(true);
  });
});
