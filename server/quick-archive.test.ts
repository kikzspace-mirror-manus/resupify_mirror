/**
 * Phase 9E4: Quick Archive Action — Acceptance Tests
 *
 * A) Archive from list row moves card to Archived immediately.
 * B) Archive from Kanban tile moves card to Archived immediately.
 * C) Unarchive returns card to Bookmarked.
 * D) Drag-and-drop Kanban still works (no interference) — structural check.
 * E) No data loss: archived card still accessible via jobCards.get.
 * S) UI structure: Archive/Unarchive menu exists in both list and Kanban views.
 */

import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import * as db from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import type { User } from "../drizzle/schema";
import * as fs from "fs";
import * as path from "path";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 99,
    openId: "archive-test-user",
    email: "archive@example.com",
    name: "Archive Tester",
    role: "user",
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    credits: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeCtx(user: User): TrpcContext {
  return { user, req: { headers: {} } as any, res: {} as any };
}

function makeCard(overrides: Record<string, any> = {}) {
  return {
    id: 1,
    userId: 99,
    title: "Software Engineer",
    company: "Acme Corp",
    location: "Remote",
    url: null,
    stage: "bookmarked",
    priority: "medium",
    season: null,
    notes: null,
    salary: null,
    jobType: null,
    jdText: null,
    jdSnapshotHash: null,
    appliedAt: null,
    nextTouchAt: null,
    dueDate: null,
    nextFollowupDueAt: null,
    eligibilityPrecheckStatus: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ─── A: Archive from list row ─────────────────────────────────────────────────

describe("A: Archive from list row", () => {
  let getCardSpy: ReturnType<typeof vi.spyOn>;
  let updateCardSpy: ReturnType<typeof vi.spyOn>;
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeAll(() => {
    const user = makeUser();
    caller = appRouter.createCaller(makeCtx(user));
    getCardSpy = vi.spyOn(db, "getJobCardById").mockResolvedValue(makeCard() as any);
    updateCardSpy = vi.spyOn(db, "updateJobCard").mockResolvedValue(undefined as any);
  });

  afterAll(() => {
    getCardSpy.mockRestore();
    updateCardSpy.mockRestore();
  });

  it("A1: calls update with stage=archived", async () => {
    await caller.jobCards.update({ id: 1, stage: "archived" });
    expect(updateCardSpy).toHaveBeenCalledWith(
      1,
      99,
      expect.objectContaining({ stage: "archived" })
    );
  });

  it("A2: archived is a valid stage enum value (no throw)", async () => {
    await expect(
      caller.jobCards.update({ id: 1, stage: "archived" })
    ).resolves.toBeDefined();
  });

  it("A3: update returns success: true", async () => {
    const result = await caller.jobCards.update({ id: 1, stage: "archived" });
    expect(result).toEqual({ success: true });
  });
});

// ─── B: Archive from Kanban tile ─────────────────────────────────────────────

describe("B: Archive from Kanban tile (same mutation, same stage)", () => {
  let getCardSpy: ReturnType<typeof vi.spyOn>;
  let updateCardSpy: ReturnType<typeof vi.spyOn>;
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeAll(() => {
    const user = makeUser();
    caller = appRouter.createCaller(makeCtx(user));
    getCardSpy = vi.spyOn(db, "getJobCardById").mockResolvedValue(makeCard() as any);
    updateCardSpy = vi.spyOn(db, "updateJobCard").mockResolvedValue(undefined as any);
  });

  afterAll(() => {
    getCardSpy.mockRestore();
    updateCardSpy.mockRestore();
  });

  it("B1: Kanban archive path calls jobCards.update with stage=archived", async () => {
    const result = await caller.jobCards.update({ id: 2, stage: "archived" });
    expect(result).toEqual({ success: true });
    expect(updateCardSpy).toHaveBeenCalledWith(
      2,
      99,
      expect.objectContaining({ stage: "archived" })
    );
  });

  it("B2: archived stage resolves without error", async () => {
    await expect(
      caller.jobCards.update({ id: 3, stage: "archived" })
    ).resolves.toEqual({ success: true });
  });
});

// ─── C: Unarchive returns card to Bookmarked ─────────────────────────────────

describe("C: Unarchive returns card to Bookmarked", () => {
  let getCardSpy: ReturnType<typeof vi.spyOn>;
  let updateCardSpy: ReturnType<typeof vi.spyOn>;
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeAll(() => {
    const user = makeUser();
    caller = appRouter.createCaller(makeCtx(user));
    getCardSpy = vi.spyOn(db, "getJobCardById").mockResolvedValue(makeCard({ stage: "archived" }) as any);
    updateCardSpy = vi.spyOn(db, "updateJobCard").mockResolvedValue(undefined as any);
  });

  afterAll(() => {
    getCardSpy.mockRestore();
    updateCardSpy.mockRestore();
  });

  it("C1: calls update with stage=bookmarked to unarchive", async () => {
    await caller.jobCards.update({ id: 1, stage: "bookmarked" });
    expect(updateCardSpy).toHaveBeenCalledWith(
      1,
      99,
      expect.objectContaining({ stage: "bookmarked" })
    );
  });

  it("C2: bookmarked is a valid stage enum value (no throw)", async () => {
    await expect(
      caller.jobCards.update({ id: 1, stage: "bookmarked" })
    ).resolves.toEqual({ success: true });
  });

  it("C3: unarchive returns success: true", async () => {
    const result = await caller.jobCards.update({ id: 1, stage: "bookmarked" });
    expect(result).toEqual({ success: true });
  });
});

// ─── D: Drag-and-drop still works (no interference) ─────────────────────────

describe("D: Drag-and-drop Kanban still works (all stage values valid)", () => {
  let getCardSpy: ReturnType<typeof vi.spyOn>;
  let updateCardSpy: ReturnType<typeof vi.spyOn>;
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeAll(() => {
    const user = makeUser();
    caller = appRouter.createCaller(makeCtx(user));
    getCardSpy = vi.spyOn(db, "getJobCardById").mockResolvedValue(makeCard() as any);
    updateCardSpy = vi.spyOn(db, "updateJobCard").mockResolvedValue(undefined as any);
  });

  afterAll(() => {
    getCardSpy.mockRestore();
    updateCardSpy.mockRestore();
  });

  it("D1: all 7 stage values are valid in jobCards.update", async () => {
    const stages = [
      "bookmarked", "applying", "applied",
      "interviewing", "offered", "rejected", "archived",
    ] as const;
    for (const stage of stages) {
      await expect(
        caller.jobCards.update({ id: 1, stage })
      ).resolves.toEqual({ success: true });
    }
  });

  it("D2: archive action does not break other field updates", async () => {
    await expect(
      caller.jobCards.update({ id: 1, stage: "archived", priority: "high" })
    ).resolves.toEqual({ success: true });
  });
});

// ─── E: No data loss — archived card still accessible ────────────────────────

describe("E: No data loss — archived card still accessible via get", () => {
  let getCardSpy: ReturnType<typeof vi.spyOn>;
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeAll(() => {
    const user = makeUser();
    caller = appRouter.createCaller(makeCtx(user));
    getCardSpy = vi.spyOn(db, "getJobCardById").mockResolvedValue(
      makeCard({ stage: "archived", title: "Archived Job", company: "Old Corp" }) as any
    );
  });

  afterAll(() => {
    getCardSpy.mockRestore();
  });

  it("E1: jobCards.get returns the archived card with all fields intact", async () => {
    const card = await caller.jobCards.get({ id: 1 });
    expect(card).toBeDefined();
    expect(card?.stage).toBe("archived");
    expect(card?.title).toBe("Archived Job");
    expect(card?.company).toBe("Old Corp");
  });

  it("E2: archived card title and company are preserved", async () => {
    const card = await caller.jobCards.get({ id: 1 });
    expect(card?.title).toBeTruthy();
    expect(card?.company).toBeTruthy();
  });
});

// ─── S: UI structure checks ─────────────────────────────────────────────────

describe("S: UI structure — Archive/Unarchive menu in list and Kanban views", () => {
  const filePath = path.join(__dirname, "../client/src/pages/JobCards.tsx");
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(filePath, "utf8");
  });

  it("S1: imports DropdownMenu components", () => {
    expect(content).toContain("DropdownMenu");
    expect(content).toContain("DropdownMenuContent");
    expect(content).toContain("DropdownMenuTrigger");
    expect(content).toContain("DropdownMenuItem");
  });

  it("S2: imports Archive and ArchiveRestore icons", () => {
    expect(content).toContain("Archive,");
    expect(content).toContain("ArchiveRestore,");
  });

  it("S3: has archiveConfirmId state for the confirm dialog", () => {
    expect(content).toContain("archiveConfirmId");
  });

  it("S4: renders Archive confirm AlertDialog with correct title", () => {
    expect(content).toContain("Archive this job card?");
    expect(content).toContain("AlertDialogTitle");
  });

  it("S5: KanbanCard has jobStage, onArchive, onUnarchive props", () => {
    expect(content).toContain("jobStage: string;");
    expect(content).toContain("onArchive: (id: number) => void;");
    expect(content).toContain("onUnarchive: (id: number) => void;");
  });

  it("S6: KanbanCard renders Archive/Unarchive based on jobStage", () => {
    expect(content).toContain('jobStage !== "archived"');
    expect(content).toContain("onArchive(job.id)");
    expect(content).toContain("onUnarchive(job.id)");
  });

  it("S7: list view has DropdownMenu with Archive/Unarchive based on job.stage", () => {
    expect(content).toContain('job.stage !== "archived"');
    expect(content).toContain("setArchiveConfirmId(job.id)");
  });
});
