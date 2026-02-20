import { describe, expect, it } from "vitest";

// ─── Helpers mirrored from server/routers.ts ─────────────────────────

function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const dow = result.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return result;
}

const FOLLOWUP_SLOTS = [
  { title: "Follow up #1", days: 3 },
  { title: "Follow up #2", days: 7 },
  { title: "Follow up #3", days: 14 },
] as const;

const LEGACY_FOLLOWUP_RE = /^Follow up after applying:/i;

type MockTask = {
  id: number;
  title: string;
  taskType: string;
  dueDate: Date | null;
};

/**
 * Pure simulation of ensureFollowUps logic (no DB).
 * Returns the list of tasks after the operation.
 */
function simulateEnsureFollowUps(
  existingTasks: MockTask[],
  appliedAt: Date
): { tasks: MockTask[]; created: number; renamed: number } {
  const tasks = [...existingTasks];
  const followUps = tasks.filter((t) => t.taskType === "follow_up");
  let nextId = Math.max(0, ...tasks.map((t) => t.id)) + 1;
  let created = 0;
  let renamed = 0;

  for (const slot of FOLLOWUP_SLOTS) {
    const targetDue = addBusinessDays(appliedAt, slot.days);

    // Exact title match → slot already covered
    if (followUps.find((t) => t.title === slot.title)) continue;

    // D+7 slot only: check for legacy title and rename
    if (slot.days === 7) {
      const legacy = followUps.find((t) => LEGACY_FOLLOWUP_RE.test(t.title));
      if (legacy) {
        legacy.title = slot.title;
        legacy.dueDate = targetDue;
        renamed++;
        continue;
      }
    }

    // Create missing slot
    const newTask: MockTask = {
      id: nextId++,
      title: slot.title,
      taskType: "follow_up",
      dueDate: targetDue,
    };
    tasks.push(newTask);
    followUps.push(newTask);
    created++;
  }

  return { tasks, created, renamed };
}

// ─── addBusinessDays ─────────────────────────────────────────────────
describe("addBusinessDays", () => {
  it("adds 3 business days from a Monday", () => {
    const monday = new Date("2025-02-17T12:00:00Z");
    const result = addBusinessDays(monday, 3);
    expect(result.getUTCDay()).toBe(4); // Thursday
    expect(result.getUTCDate()).toBe(20);
  });

  it("adds 7 business days from a Monday", () => {
    const monday = new Date("2025-02-17T12:00:00Z");
    const result = addBusinessDays(monday, 7);
    expect(result.getUTCDate()).toBe(26); // Wed Feb 26
  });

  it("adds 14 business days from a Monday", () => {
    const monday = new Date("2025-02-17T12:00:00Z");
    const result = addBusinessDays(monday, 14);
    expect(result.getUTCDate()).toBe(7);
    expect(result.getUTCMonth()).toBe(2); // March
  });

  it("never lands on a Saturday or Sunday", () => {
    const starts = [
      new Date("2025-02-17T12:00:00Z"),
      new Date("2025-02-18T12:00:00Z"),
      new Date("2025-02-19T12:00:00Z"),
    ];
    for (const start of starts) {
      for (const n of [3, 7, 14]) {
        const result = addBusinessDays(start, n);
        expect(result.getDay()).not.toBe(6);
        expect(result.getDay()).not.toBe(0);
      }
    }
  });

  it("due dates are in ascending order D+3 < D+7 < D+14", () => {
    const now = new Date("2025-02-17T12:00:00Z");
    const d3 = addBusinessDays(now, 3);
    const d7 = addBusinessDays(now, 7);
    const d14 = addBusinessDays(now, 14);
    expect(d3.getTime()).toBeLessThan(d7.getTime());
    expect(d7.getTime()).toBeLessThan(d14.getTime());
  });
});

// ─── Acceptance Test A: Bookmarked → Applied creates 3 tasks ─────────
describe("Acceptance A: Bookmarked → Applied creates exactly 3 tasks", () => {
  it("creates 3 follow-up tasks when no prior follow-ups exist", () => {
    const appliedAt = new Date("2025-02-17T12:00:00Z");
    const { tasks, created } = simulateEnsureFollowUps([], appliedAt);

    const followUps = tasks.filter((t) => t.taskType === "follow_up");
    expect(followUps).toHaveLength(3);
    expect(created).toBe(3);
    expect(followUps.map((t) => t.title)).toEqual([
      "Follow up #1",
      "Follow up #2",
      "Follow up #3",
    ]);
  });

  it("assigns correct business-day due dates", () => {
    const appliedAt = new Date("2025-02-17T12:00:00Z");
    const { tasks } = simulateEnsureFollowUps([], appliedAt);

    const fu1 = tasks.find((t) => t.title === "Follow up #1")!;
    const fu2 = tasks.find((t) => t.title === "Follow up #2")!;
    const fu3 = tasks.find((t) => t.title === "Follow up #3")!;

    expect(fu1.dueDate!.getUTCDate()).toBe(20); // D+3 = Thu Feb 20
    expect(fu2.dueDate!.getUTCDate()).toBe(26); // D+7 = Wed Feb 26
    expect(fu3.dueDate!.getUTCMonth()).toBe(2); // D+14 = March
    expect(fu3.dueDate!.getUTCDate()).toBe(7);  // Mar 7
  });
});

// ─── Acceptance Test B: Refresh does not create duplicates ───────────
describe("Acceptance B: Re-running ensureFollowUps does not create duplicates", () => {
  it("does not create tasks when all 3 already exist", () => {
    const appliedAt = new Date("2025-02-17T12:00:00Z");

    // First run
    const { tasks: afterFirst } = simulateEnsureFollowUps([], appliedAt);
    expect(afterFirst.filter((t) => t.taskType === "follow_up")).toHaveLength(3);

    // Second run (simulate page refresh)
    const { tasks: afterSecond, created } = simulateEnsureFollowUps(afterFirst, appliedAt);
    expect(afterSecond.filter((t) => t.taskType === "follow_up")).toHaveLength(3);
    expect(created).toBe(0);
  });

  it("does not create tasks when called multiple times in a row", () => {
    const appliedAt = new Date("2025-02-17T12:00:00Z");
    let current: MockTask[] = [];
    for (let i = 0; i < 5; i++) {
      const { tasks } = simulateEnsureFollowUps(current, appliedAt);
      current = tasks;
    }
    expect(current.filter((t) => t.taskType === "follow_up")).toHaveLength(3);
  });
});

// ─── Acceptance Test C: Toggle Applied → other → Applied no duplicates
describe("Acceptance C: Applied → Bookmarked → Applied does not duplicate", () => {
  it("does not create new tasks when toggling back to Applied after all 3 exist", () => {
    const appliedAt = new Date("2025-02-17T12:00:00Z");

    // First transition to Applied
    const { tasks: afterApplied } = simulateEnsureFollowUps([], appliedAt);
    expect(afterApplied.filter((t) => t.taskType === "follow_up")).toHaveLength(3);

    // Move to Bookmarked (tasks remain, stage changes but tasks are NOT deleted)
    // Move back to Applied — ensureFollowUps runs again with same appliedAt
    const { tasks: afterToggle, created } = simulateEnsureFollowUps(afterApplied, appliedAt);
    expect(afterToggle.filter((t) => t.taskType === "follow_up")).toHaveLength(3);
    expect(created).toBe(0);
  });
});

// ─── Acceptance Test D: Legacy single-task card gets backfilled ───────
describe("Acceptance D: Existing Applied card with 1 legacy follow-up gets 3 tasks", () => {
  it("renames legacy task to Follow up #2 and creates #1 and #3", () => {
    const appliedAt = new Date("2025-02-17T12:00:00Z");

    // Simulate the old single-task state: 1 legacy follow-up at D+5
    const legacyTask: MockTask = {
      id: 1,
      title: "Follow up after applying: Acme Corp SWE",
      taskType: "follow_up",
      dueDate: addBusinessDays(appliedAt, 5),
    };

    const { tasks, created, renamed } = simulateEnsureFollowUps([legacyTask], appliedAt);

    const followUps = tasks.filter((t) => t.taskType === "follow_up");
    expect(followUps).toHaveLength(3);
    expect(created).toBe(2); // #1 and #3 created
    expect(renamed).toBe(1); // legacy renamed to #2

    const titles = followUps.map((t) => t.title).sort();
    expect(titles).toEqual(["Follow up #1", "Follow up #2", "Follow up #3"]);
  });

  it("corrects the due date of the renamed legacy task to D+7", () => {
    const appliedAt = new Date("2025-02-17T12:00:00Z");
    const legacyTask: MockTask = {
      id: 1,
      title: "Follow up after applying: Some Job",
      taskType: "follow_up",
      dueDate: addBusinessDays(appliedAt, 5), // wrong due date
    };

    const { tasks } = simulateEnsureFollowUps([legacyTask], appliedAt);
    const fu2 = tasks.find((t) => t.title === "Follow up #2")!;
    const expectedD7 = addBusinessDays(appliedAt, 7);
    expect(fu2.dueDate!.getTime()).toBe(expectedD7.getTime());
  });

  it("does not rename legacy task if Follow up #2 already exists", () => {
    const appliedAt = new Date("2025-02-17T12:00:00Z");
    const existing: MockTask[] = [
      { id: 1, title: "Follow up after applying: Old Job", taskType: "follow_up", dueDate: addBusinessDays(appliedAt, 5) },
      { id: 2, title: "Follow up #2", taskType: "follow_up", dueDate: addBusinessDays(appliedAt, 7) },
    ];

    const { tasks, created } = simulateEnsureFollowUps(existing, appliedAt);
    const followUps = tasks.filter((t) => t.taskType === "follow_up");
    expect(followUps).toHaveLength(4); // legacy + #2 + #1 + #3 (legacy not renamed, just left)
    // #1 and #3 created
    expect(created).toBe(2);
  });

  it("handles card with only Follow up #1 already present — creates #2 and #3", () => {
    const appliedAt = new Date("2025-02-17T12:00:00Z");
    const existing: MockTask[] = [
      { id: 1, title: "Follow up #1", taskType: "follow_up", dueDate: addBusinessDays(appliedAt, 3) },
    ];

    const { tasks, created } = simulateEnsureFollowUps(existing, appliedAt);
    const followUps = tasks.filter((t) => t.taskType === "follow_up");
    expect(followUps).toHaveLength(3);
    expect(created).toBe(2);
  });
});

// ─── Stage trigger guard ─────────────────────────────────────────────
describe("Stage trigger: ensureFollowUps only runs for Applied stage", () => {
  it("does not run for bookmarked stage", () => {
    // Simulates the server-side guard: only call ensureFollowUps when stage === "applied"
    const shouldRun = (stage: string) => stage === "applied";
    expect(shouldRun("bookmarked")).toBe(false);
    expect(shouldRun("applying")).toBe(false);
    expect(shouldRun("applied")).toBe(true);
    expect(shouldRun("interviewing")).toBe(false);
    expect(shouldRun("offered")).toBe(false);
    expect(shouldRun("rejected")).toBe(false);
    expect(shouldRun("archived")).toBe(false);
  });
});
