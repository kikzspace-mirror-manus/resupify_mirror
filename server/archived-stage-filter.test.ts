/**
 * Phase 9E4.1: Job Cards Stage Filter — Add "Archived" Option
 *
 * A) Select "Archived" → only archived cards display in list view.
 * B) Select "Archived" → only archived cards display in board view (same filter logic).
 * C) Switch back to "All Stages" → all cards display again.
 * D) No changes to quick archive/unarchive menu behavior.
 * S) UI structure: SelectSeparator and explicit "archived" SelectItem exist in filter.
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
    openId: "filter-test-user",
    email: "filter@example.com",
    name: "Filter Tester",
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

function makeCard(id: number, stage: string, title: string) {
  return {
    id,
    userId: 99,
    title,
    company: "Acme Corp",
    location: "Remote",
    url: null,
    stage,
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
  };
}

const mockCards = [
  makeCard(1, "bookmarked", "Active Job 1"),
  makeCard(2, "applying", "Active Job 2"),
  makeCard(3, "archived", "Archived Job 1"),
  makeCard(4, "archived", "Archived Job 2"),
  makeCard(5, "offered", "Active Job 3"),
];

// ─── A: Archived filter shows only archived cards in list view ────────────────

describe("A: Archived filter — list view (server-side query)", () => {
  let listSpy: ReturnType<typeof vi.spyOn>;
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeAll(() => {
    const user = makeUser();
    caller = appRouter.createCaller(makeCtx(user));
    listSpy = vi.spyOn(db, "getJobCards").mockImplementation(async (_userId, filters) => {
      if (filters?.stage === "archived") {
        return mockCards.filter((c) => c.stage === "archived") as any;
      }
      return mockCards as any;
    });
  });

  afterAll(() => {
    listSpy.mockRestore();
  });

  it("A1: jobCards.list with stage=archived returns only archived cards", async () => {
    const cards = await caller.jobCards.list({ stage: "archived" });
    expect(cards.every((c) => c.stage === "archived")).toBe(true);
  });

  it("A2: archived filter returns 2 cards from mock data", async () => {
    const cards = await caller.jobCards.list({ stage: "archived" });
    expect(cards).toHaveLength(2);
  });

  it("A3: archived cards have correct titles", async () => {
    const cards = await caller.jobCards.list({ stage: "archived" });
    const titles = cards.map((c) => c.title);
    expect(titles).toContain("Archived Job 1");
    expect(titles).toContain("Archived Job 2");
  });
});

// ─── B: Archived filter shows only archived cards in board view ───────────────

describe("B: Archived filter — board view (same filter logic, stage=archived)", () => {
  let listSpy: ReturnType<typeof vi.spyOn>;
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeAll(() => {
    const user = makeUser();
    caller = appRouter.createCaller(makeCtx(user));
    listSpy = vi.spyOn(db, "getJobCards").mockImplementation(async (_userId, filters) => {
      if (filters?.stage === "archived") {
        return mockCards.filter((c) => c.stage === "archived") as any;
      }
      return mockCards as any;
    });
  });

  afterAll(() => {
    listSpy.mockRestore();
  });

  it("B1: board view uses same jobCards.list query — stage=archived returns only archived", async () => {
    const cards = await caller.jobCards.list({ stage: "archived" });
    expect(cards.every((c) => c.stage === "archived")).toBe(true);
  });

  it("B2: non-archived cards are excluded when stage=archived", async () => {
    const cards = await caller.jobCards.list({ stage: "archived" });
    const nonArchived = cards.filter((c) => c.stage !== "archived");
    expect(nonArchived).toHaveLength(0);
  });
});

// ─── C: Switch back to All Stages shows all cards ────────────────────────────

describe("C: Switch back to All Stages shows all cards", () => {
  let listSpy: ReturnType<typeof vi.spyOn>;
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeAll(() => {
    const user = makeUser();
    caller = appRouter.createCaller(makeCtx(user));
    listSpy = vi.spyOn(db, "getJobCards").mockResolvedValue(mockCards as any);
  });

  afterAll(() => {
    listSpy.mockRestore();
  });

  it("C1: jobCards.list with no stage filter returns all 5 cards", async () => {
    const cards = await caller.jobCards.list({});
    expect(cards).toHaveLength(5);
  });

  it("C2: all-stages result includes both archived and non-archived cards", async () => {
    const cards = await caller.jobCards.list({});
    const hasArchived = cards.some((c) => c.stage === "archived");
    const hasNonArchived = cards.some((c) => c.stage !== "archived");
    expect(hasArchived).toBe(true);
    expect(hasNonArchived).toBe(true);
  });
});

// ─── D: Quick archive/unarchive menu behavior unchanged ──────────────────────

describe("D: Quick archive/unarchive menu behavior unchanged", () => {
  let getCardSpy: ReturnType<typeof vi.spyOn>;
  let updateCardSpy: ReturnType<typeof vi.spyOn>;
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeAll(() => {
    const user = makeUser();
    caller = appRouter.createCaller(makeCtx(user));
    getCardSpy = vi.spyOn(db, "getJobCardById").mockResolvedValue(makeCard(1, "bookmarked", "Test Job") as any);
    updateCardSpy = vi.spyOn(db, "updateJobCard").mockResolvedValue(undefined as any);
  });

  afterAll(() => {
    getCardSpy.mockRestore();
    updateCardSpy.mockRestore();
  });

  it("D1: archive action still works after filter change", async () => {
    const result = await caller.jobCards.update({ id: 1, stage: "archived" });
    expect(result).toEqual({ success: true });
    expect(updateCardSpy).toHaveBeenCalledWith(
      1, 99, expect.objectContaining({ stage: "archived" })
    );
  });

  it("D2: unarchive action still works after filter change", async () => {
    const result = await caller.jobCards.update({ id: 1, stage: "bookmarked" });
    expect(result).toEqual({ success: true });
    expect(updateCardSpy).toHaveBeenCalledWith(
      1, 99, expect.objectContaining({ stage: "bookmarked" })
    );
  });
});

// ─── S: UI structure checks ─────────────────────────────────────────────────

describe("S: UI structure — SelectSeparator and Archived option in Stage filter", () => {
  const filePath = path.join(__dirname, "../client/src/pages/JobCards.tsx");
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(filePath, "utf8");
  });

  it("S1: imports SelectSeparator from @/components/ui/select", () => {
    expect(content).toContain("SelectSeparator");
  });

  it("S2: Stage filter has explicit SelectItem for 'archived'", () => {
    expect(content).toContain('value="archived"');
  });

  it("S3: Stage filter has SelectSeparator before Archived option", () => {
    const separatorIdx = content.indexOf("<SelectSeparator />");
    const archivedIdx = content.indexOf('value="archived"');
    expect(separatorIdx).toBeGreaterThan(0);
    expect(archivedIdx).toBeGreaterThan(separatorIdx);
  });

  it("S4: STAGES.filter excludes archived from the main map loop", () => {
    expect(content).toContain('STAGES.filter((s) => s !== "archived")');
  });

  it("S5: filterStage state is used to filter jobs client-side", () => {
    expect(content).toContain("filterStage !== \"all\" && job.stage !== filterStage");
  });
});
