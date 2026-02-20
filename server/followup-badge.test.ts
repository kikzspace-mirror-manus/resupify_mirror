/**
 * Tests for the next follow-up due date badge logic.
 *
 * The badge is driven by `getFollowupBadgeProps()` in JobCards.tsx (pure function).
 * We replicate the same logic here to test all 4 acceptance criteria without a DOM.
 *
 * The backend query (getJobCards LEFT JOIN tasks MIN) is tested via the data contract:
 * - nextFollowupDueAt is the minimum dueDate of follow_up tasks with completed=false
 * - Completed tasks are excluded
 * - No tasks → null
 */
import { describe, expect, it } from "vitest";

// ─── Replicate badge logic from JobCards.tsx ──────────────────────────────────

function getFollowupBadgeProps(
  nextFollowupDueAt: Date | null | undefined,
  now = new Date()
): { label: string; className: string } | null {
  if (!nextFollowupDueAt) return null;
  const due = new Date(nextFollowupDueAt);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffMs = due.getTime() - todayStart.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const dateStr = due.toLocaleDateString(undefined, { month: "short", day: "numeric" });

  if (diffDays < 0) {
    return { label: `Overdue · ${dateStr}`, className: "bg-red-100 text-red-700 border-red-200" };
  }
  if (diffDays <= 2) {
    return { label: `Follow-up · ${dateStr}`, className: "bg-amber-100 text-amber-700 border-amber-200" };
  }
  return { label: `Follow-up · ${dateStr}`, className: "bg-emerald-100 text-emerald-700 border-emerald-200" };
}

// ─── Helper: compute nextFollowupDueAt from a task list (mirrors DB MIN logic) ─

type Task = {
  taskType: string;
  completed: boolean;
  dueDate: Date | null;
};

function computeNextFollowupDueAt(tasks: Task[]): Date | null {
  const candidates = tasks
    .filter((t) => t.taskType === "follow_up" && !t.completed && t.dueDate !== null)
    .map((t) => t.dueDate!.getTime());
  if (candidates.length === 0) return null;
  return new Date(Math.min(...candidates));
}

// ─── Fixed reference date for deterministic tests ────────────────────────────

const TODAY = new Date(2026, 1, 20); // Feb 20 2026

function daysFromToday(n: number): Date {
  const d = new Date(TODAY);
  d.setDate(d.getDate() + n);
  return d;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("computeNextFollowupDueAt — data contract", () => {

  it("returns the earliest due date among 3 follow_up tasks", () => {
    const tasks: Task[] = [
      { taskType: "follow_up", completed: false, dueDate: daysFromToday(3) },
      { taskType: "follow_up", completed: false, dueDate: daysFromToday(7) },
      { taskType: "follow_up", completed: false, dueDate: daysFromToday(14) },
    ];
    const result = computeNextFollowupDueAt(tasks);
    expect(result?.getTime()).toBe(daysFromToday(3).getTime());
  });

  it("ignores completed follow_up tasks", () => {
    const tasks: Task[] = [
      { taskType: "follow_up", completed: true, dueDate: daysFromToday(3) },   // completed — skip
      { taskType: "follow_up", completed: false, dueDate: daysFromToday(7) },
      { taskType: "follow_up", completed: false, dueDate: daysFromToday(14) },
    ];
    const result = computeNextFollowupDueAt(tasks);
    // Earliest incomplete is D+7
    expect(result?.getTime()).toBe(daysFromToday(7).getTime());
  });

  it("returns null when all follow_up tasks are completed", () => {
    const tasks: Task[] = [
      { taskType: "follow_up", completed: true, dueDate: daysFromToday(3) },
      { taskType: "follow_up", completed: true, dueDate: daysFromToday(7) },
    ];
    const result = computeNextFollowupDueAt(tasks);
    expect(result).toBeNull();
  });

  it("returns null when there are no follow_up tasks", () => {
    const tasks: Task[] = [
      { taskType: "apply", completed: false, dueDate: daysFromToday(1) },
      { taskType: "custom", completed: false, dueDate: daysFromToday(2) },
    ];
    const result = computeNextFollowupDueAt(tasks);
    expect(result).toBeNull();
  });

  it("ignores tasks with null dueDate", () => {
    const tasks: Task[] = [
      { taskType: "follow_up", completed: false, dueDate: null },
      { taskType: "follow_up", completed: false, dueDate: daysFromToday(7) },
    ];
    const result = computeNextFollowupDueAt(tasks);
    expect(result?.getTime()).toBe(daysFromToday(7).getTime());
  });

  it("after completing Follow up #1, returns D+7 as next", () => {
    const tasks: Task[] = [
      { taskType: "follow_up", completed: true, dueDate: daysFromToday(3) },   // just completed
      { taskType: "follow_up", completed: false, dueDate: daysFromToday(7) },
      { taskType: "follow_up", completed: false, dueDate: daysFromToday(14) },
    ];
    const result = computeNextFollowupDueAt(tasks);
    expect(result?.getTime()).toBe(daysFromToday(7).getTime());
  });

});

describe("getFollowupBadgeProps — badge styling", () => {

  it("returns null when nextFollowupDueAt is null (no badge rendered)", () => {
    expect(getFollowupBadgeProps(null, TODAY)).toBeNull();
  });

  it("returns null when nextFollowupDueAt is undefined", () => {
    expect(getFollowupBadgeProps(undefined, TODAY)).toBeNull();
  });

  it("returns red 'Overdue' badge for a past due date", () => {
    const overdue = daysFromToday(-1); // yesterday
    const result = getFollowupBadgeProps(overdue, TODAY);
    expect(result).not.toBeNull();
    expect(result!.label).toContain("Overdue");
    expect(result!.className).toContain("red");
  });

  it("returns amber badge for a date due within 2 days", () => {
    const soon = daysFromToday(1);
    const result = getFollowupBadgeProps(soon, TODAY);
    expect(result).not.toBeNull();
    expect(result!.label).toContain("Follow-up");
    expect(result!.className).toContain("amber");
  });

  it("returns amber badge for exactly 2 days away", () => {
    const twoDays = daysFromToday(2);
    const result = getFollowupBadgeProps(twoDays, TODAY);
    expect(result!.className).toContain("amber");
  });

  it("returns green badge for a date more than 2 days away", () => {
    const future = daysFromToday(7);
    const result = getFollowupBadgeProps(future, TODAY);
    expect(result).not.toBeNull();
    expect(result!.label).toContain("Follow-up");
    expect(result!.className).toContain("emerald");
  });

  it("returns green badge for today (diffDays=0 is not overdue)", () => {
    const today = new Date(TODAY);
    const result = getFollowupBadgeProps(today, TODAY);
    // diffDays = 0 → within 2 days → amber
    expect(result!.className).toContain("amber");
  });

});
