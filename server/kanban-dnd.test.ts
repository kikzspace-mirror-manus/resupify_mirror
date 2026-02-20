/**
 * Acceptance tests for Patch 6B: Kanban Drag-and-Drop
 *
 * Because the DnD logic lives in the frontend, we test the server-side
 * contract that the drag-and-drop relies on:
 *
 * A) jobCards.update accepts a stage change and persists it
 * B) Dragging to Applied triggers follow-up task creation (existing logic)
 * C) Dragging to same stage is a no-op (no duplicate follow-ups)
 * D) Unauthorized user cannot update stage (revert scenario)
 * E) Disabled user cannot update stage (revert scenario)
 * F) List view still returns correct data after stage update (no regression)
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";
import type { TrpcContext } from "./_core/context";
import type { User } from "../drizzle/schema";

// ─── Spies ───────────────────────────────────────────────────────────────────
const getJobCardByIdSpy = vi.spyOn(db, "getJobCardById");
const updateJobCardSpy = vi.spyOn(db, "updateJobCard");
const getTasksSpy = vi.spyOn(db, "getTasks");
const createTaskSpy = vi.spyOn(db, "createTask");

// ─── Context factories ────────────────────────────────────────────────────────
function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 42,
    openId: "dnd-test-user",
    email: "dnd@example.com",
    name: "DnD Tester",
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

function makeJobCard(stage: string, userId = 42) {
  return {
    id: 10,
    userId,
    title: "SWE Intern",
    company: "Acme",
    pipelineStage: stage,
    notes: null,
    salaryMin: null,
    salaryMax: null,
    location: null,
    jobUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    followupsScheduledAt: null,
  } as any;
}

describe("Kanban DnD — server contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("A) stage update persists: Bookmarked → Applying", async () => {
    getJobCardByIdSpy.mockResolvedValueOnce(makeJobCard("bookmarked"));
    updateJobCardSpy.mockResolvedValueOnce(undefined);
    // No follow-up tasks needed for non-Applied stage
    getTasksSpy.mockResolvedValueOnce([]);

    const caller = appRouter.createCaller(makeCtx(makeUser()));
    await expect(
      caller.jobCards.update({ id: 10, stage: "applying" })
    ).resolves.toBeDefined();

    expect(updateJobCardSpy).toHaveBeenCalledOnce();
    // updateJobCard(id, userId, data) — data uses 'stage' field from InsertJobCard
    const [callId, callUserId, callData] = updateJobCardSpy.mock.calls[0] as [number, number, any];
    expect(callId).toBe(10);
    expect(callData.stage).toBe("applying");
  });

  it("B) dragging to Applied triggers follow-up task creation", async () => {
    getJobCardByIdSpy.mockResolvedValueOnce(makeJobCard("applying"));
    updateJobCardSpy.mockResolvedValueOnce(undefined);
    // No existing follow-up tasks → ensureFollowUps will create 3
    getTasksSpy.mockResolvedValueOnce([]);
    createTaskSpy.mockResolvedValue(99);

    const caller = appRouter.createCaller(makeCtx(makeUser()));
    await caller.jobCards.update({ id: 10, stage: "applied" });

    // Should create exactly 3 follow-up tasks
    expect(createTaskSpy).toHaveBeenCalledTimes(3);
    const titles = createTaskSpy.mock.calls.map((c) => (c[0] as any).title);
    expect(titles).toContain("Follow up #1");
    expect(titles).toContain("Follow up #2");
    expect(titles).toContain("Follow up #3");
  });

  it("C) idempotency is covered by followup.test.ts; stage update to non-Applied does not call createTask", async () => {
    // Moving to Interviewing (not Applied) should never create follow-up tasks
    getJobCardByIdSpy.mockResolvedValueOnce(makeJobCard("applied"));
    updateJobCardSpy.mockResolvedValueOnce(undefined);
    // getTasks should not be called at all for non-Applied stages
    getTasksSpy.mockResolvedValue([] as any);

    const caller = appRouter.createCaller(makeCtx(makeUser()));
    await caller.jobCards.update({ id: 10, stage: "interviewing" });

    // createTask must NOT be called when moving to a non-Applied stage
    expect(createTaskSpy).not.toHaveBeenCalled();
  });

  it("D) unauthenticated user cannot update stage (DnD revert scenario)", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    await expect(
      caller.jobCards.update({ id: 10, stage: "applying" })
    ).rejects.toThrow();
    expect(updateJobCardSpy).not.toHaveBeenCalled();
  });

  it("E) disabled user cannot update stage (DnD revert scenario)", async () => {
    const caller = appRouter.createCaller(makeCtx(makeUser({ disabled: true })));
    await expect(
      caller.jobCards.update({ id: 10, stage: "applying" })
    ).rejects.toThrow();
    expect(updateJobCardSpy).not.toHaveBeenCalled();
  });

  it("F) list view returns updated stage after drag (no regression)", async () => {
    // Simulate a list query after a stage update
    const listSpy = vi.spyOn(db, "getJobCards");
    listSpy.mockResolvedValueOnce([
      { ...makeJobCard("applying"), stage: "applying", nextFollowupDueAt: null } as any,
    ]);

    const caller = appRouter.createCaller(makeCtx(makeUser()));
    const result = await caller.jobCards.list({});

    expect(result).toHaveLength(1);
    expect(result[0].stage).toBe("applying");
    listSpy.mockRestore();
  });
});
