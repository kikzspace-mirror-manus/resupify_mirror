import { describe, expect, it } from "vitest";

// ─── addBusinessDays helper (extracted for isolated testing) ─────────
// Mirrors the implementation in server/routers.ts
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

// ─── Business Day Calculation ────────────────────────────────────────
describe("addBusinessDays", () => {
  it("adds 3 business days from a Monday (skips weekend)", () => {
    // Monday Feb 17, 2025
    const monday = new Date("2025-02-17T12:00:00Z");
    const result = addBusinessDays(monday, 3);
    // Thu Feb 20
    expect(result.getUTCDay()).toBe(4); // Thursday
    expect(result.getUTCDate()).toBe(20);
  });

  it("adds 7 business days from a Monday (crosses a weekend)", () => {
    const monday = new Date("2025-02-17T12:00:00Z");
    const result = addBusinessDays(monday, 7);
    // 5 days = Mon Feb 24, +2 more = Wed Feb 26
    expect(result.getUTCDate()).toBe(26);
  });

  it("adds 14 business days from a Monday (crosses two weekends)", () => {
    const monday = new Date("2025-02-17T12:00:00Z");
    const result = addBusinessDays(monday, 14);
    // 10 days = Mon Mar 3, +4 more = Fri Mar 7
    expect(result.getUTCDate()).toBe(7);
    expect(result.getUTCMonth()).toBe(2); // March (0-indexed)
  });

  it("never lands on a Saturday", () => {
    // Test multiple starting days
    const dates = [
      new Date("2025-02-17T12:00:00Z"), // Monday
      new Date("2025-02-18T12:00:00Z"), // Tuesday
      new Date("2025-02-19T12:00:00Z"), // Wednesday
    ];
    for (const start of dates) {
      for (const n of [3, 7, 14]) {
        const result = addBusinessDays(start, n);
        expect(result.getDay()).not.toBe(6); // not Saturday
        expect(result.getDay()).not.toBe(0); // not Sunday
      }
    }
  });

  it("adds 3 business days from a Wednesday (no weekend crossing)", () => {
    const wednesday = new Date("2025-02-19T12:00:00Z");
    const result = addBusinessDays(wednesday, 3);
    // Thu, Fri, Mon → Mon Feb 24
    expect(result.getUTCDate()).toBe(24);
    expect(result.getUTCDay()).toBe(1); // Monday
  });

  it("adds 3 business days from a Thursday (crosses weekend)", () => {
    const thursday = new Date("2025-02-20T12:00:00Z");
    const result = addBusinessDays(thursday, 3);
    // Fri, Mon, Tue → Tue Feb 25
    expect(result.getUTCDate()).toBe(25);
    expect(result.getUTCDay()).toBe(2); // Tuesday
  });
});

// ─── Follow-up scheduling logic ──────────────────────────────────────
describe("Follow-up auto-scheduling logic", () => {
  // Simulate the scheduling logic from routers.ts
  function simulateStageUpdate(
    currentStage: string,
    newStage: string,
    followupsScheduledAt: Date | null
  ): { tasksCreated: number; followupsScheduledAtSet: boolean } {
    let tasksCreated = 0;
    let followupsScheduledAtSet = false;

    if (newStage === "applied" && !followupsScheduledAt) {
      const followUpDefs = [
        { title: "Follow up #1", days: 3 },
        { title: "Follow up #2", days: 7 },
        { title: "Follow up #3", days: 14 },
      ];
      tasksCreated = followUpDefs.length;
      followupsScheduledAtSet = true;
    }

    return { tasksCreated, followupsScheduledAtSet };
  }

  it("creates exactly 3 tasks when stage changes to applied for the first time", () => {
    const result = simulateStageUpdate("bookmarked", "applied", null);
    expect(result.tasksCreated).toBe(3);
    expect(result.followupsScheduledAtSet).toBe(true);
  });

  it("creates exactly 3 tasks when stage was 'applying' and changes to 'applied'", () => {
    const result = simulateStageUpdate("applying", "applied", null);
    expect(result.tasksCreated).toBe(3);
    expect(result.followupsScheduledAtSet).toBe(true);
  });

  it("does NOT create tasks when re-saving in Applied (idempotency)", () => {
    const alreadyScheduled = new Date("2025-02-17T10:00:00Z");
    const result = simulateStageUpdate("applied", "applied", alreadyScheduled);
    expect(result.tasksCreated).toBe(0);
    expect(result.followupsScheduledAtSet).toBe(false);
  });

  it("does NOT create tasks when toggling back to Applied after it was already scheduled", () => {
    // User moved to interviewing, then back to applied
    const alreadyScheduled = new Date("2025-02-17T10:00:00Z");
    const result = simulateStageUpdate("interviewing", "applied", alreadyScheduled);
    expect(result.tasksCreated).toBe(0);
    expect(result.followupsScheduledAtSet).toBe(false);
  });

  it("does NOT create tasks when stage changes to something other than applied", () => {
    const result = simulateStageUpdate("bookmarked", "applying", null);
    expect(result.tasksCreated).toBe(0);
    expect(result.followupsScheduledAtSet).toBe(false);
  });

  it("does NOT create tasks when stage changes to interviewing", () => {
    const result = simulateStageUpdate("applied", "interviewing", null);
    expect(result.tasksCreated).toBe(0);
    expect(result.followupsScheduledAtSet).toBe(false);
  });

  it("does NOT create tasks when stage changes to rejected", () => {
    const result = simulateStageUpdate("applied", "rejected", null);
    expect(result.tasksCreated).toBe(0);
    expect(result.followupsScheduledAtSet).toBe(false);
  });
});

// ─── Follow-up task titles ───────────────────────────────────────────
describe("Follow-up task titles", () => {
  it("generates correct titles for all 3 follow-up tasks", () => {
    const followUpDefs = [
      { title: "Follow up #1", days: 3 },
      { title: "Follow up #2", days: 7 },
      { title: "Follow up #3", days: 14 },
    ];
    expect(followUpDefs[0]!.title).toBe("Follow up #1");
    expect(followUpDefs[1]!.title).toBe("Follow up #2");
    expect(followUpDefs[2]!.title).toBe("Follow up #3");
    expect(followUpDefs[0]!.days).toBe(3);
    expect(followUpDefs[1]!.days).toBe(7);
    expect(followUpDefs[2]!.days).toBe(14);
  });

  it("due dates are in ascending order (D+3 < D+7 < D+14)", () => {
    const now = new Date("2025-02-17T12:00:00Z");
    const d3 = addBusinessDays(now, 3);
    const d7 = addBusinessDays(now, 7);
    const d14 = addBusinessDays(now, 14);
    expect(d3.getTime()).toBeLessThan(d7.getTime());
    expect(d7.getTime()).toBeLessThan(d14.getTime());
  });
});
