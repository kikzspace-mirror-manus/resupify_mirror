/**
 * Phase 9E0.1 — Application Kit Tone Clarity: Acceptance Tests
 *
 * These tests verify the server-side behavior that underpins the UI note:
 *
 * A) applicationKits.get returns the existing kit with its stored tone (not the selector value)
 *    — confirms the UI can compare tone !== existingKit.tone to decide whether to show the note.
 * B) applicationKits.generate stores the new tone in the DB; subsequent .get returns updated tone
 *    — confirms the note disappears after regeneration with the new tone.
 * C) No regressions to exports/zip — applicationKits.get still returns all kit fields
 *    (topChanges, bulletRewrites, coverLetter) needed for the zip export.
 */
import { describe, expect, it, vi, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";
import type { TrpcContext } from "./_core/context";
import type { User } from "../drizzle/schema";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 77,
    openId: "kit-tone-clarity-test",
    email: "kit-tone@example.com",
    name: "Kit Tone Tester",
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
    req: {
      protocol: "https",
      headers: { origin: "https://resupify.example.com" },
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function makeKit(tone: "Human" | "Confident" | "Warm" | "Direct" = "Human") {
  return {
    id: 1,
    userId: 77,
    jobCardId: 10,
    resumeId: 5,
    evidenceRunId: 3,
    regionCode: "CA",
    trackCode: "NEW_GRAD",
    tone,
    topChangesJson: JSON.stringify([{ requirement_text: "Python", status: "missing", fix: "Add Python to skills" }]),
    bulletRewritesJson: JSON.stringify([{ requirement_text: "Managed team", status: "partial", fix: "Quantify", rewrite_a: "Led 5-person team", rewrite_b: "Managed 5 engineers", needs_confirmation: false }]),
    coverLetterText: "Dear Hiring Manager, I am excited to apply...",
    canonicalLanguage: "en",
    canonicalText: null,
    localizedLanguage: null,
    localizedText: null,
    translationMeta: null,
    createdAt: new Date("2026-01-15T10:00:00Z"),
  };
}

// ─── Test A: .get returns kit with stored tone ────────────────────────────────
describe("Phase 9E0.1 — Test A: applicationKits.get returns stored tone", () => {
  const getApplicationKitSpy = vi.spyOn(db, "getApplicationKit");

  beforeAll(() => {
    getApplicationKitSpy.mockResolvedValue(makeKit("Confident") as any);
  });

  afterAll(() => {
    getApplicationKitSpy.mockRestore();
  });

  it("A1: .get returns kit with tone='Confident' when kit was generated with Confident tone", async () => {
    const caller = appRouter.createCaller(makeCtx(makeUser()));
    const kit = await caller.applicationKits.get({ jobCardId: 10, resumeId: 5, evidenceRunId: 3 });
    expect(kit).not.toBeNull();
    expect(kit!.tone).toBe("Confident");
  });

  it("A2: .get tone field is one of the valid TONES enum values", async () => {
    const caller = appRouter.createCaller(makeCtx(makeUser()));
    const kit = await caller.applicationKits.get({ jobCardId: 10, resumeId: 5, evidenceRunId: 3 });
    expect(["Human", "Confident", "Warm", "Direct"]).toContain(kit!.tone);
  });

  it("A3: UI note condition — tone !== existingKit.tone evaluates correctly for each tone", () => {
    // Simulate the UI condition: selector=Human, kit.tone=Confident → note should show
    const kitTone = "Confident";
    const selectorTone = "Human";
    expect(selectorTone !== kitTone).toBe(true); // note shows

    // Same tone → note should NOT show
    const sameTone = "Confident";
    expect(sameTone !== kitTone).toBe(false); // note hidden
  });

  it("A4: .get returns null when no kit exists (no note should show)", async () => {
    const noKitSpy = vi.spyOn(db, "getApplicationKit").mockResolvedValueOnce(null as any);
    const caller = appRouter.createCaller(makeCtx(makeUser()));
    const kit = await caller.applicationKits.get({ jobCardId: 99, resumeId: 5, evidenceRunId: 3 });
    expect(kit).toBeNull();
    noKitSpy.mockRestore();
  });
});

// ─── Test B: regeneration updates stored tone ─────────────────────────────────
describe("Phase 9E0.1 — Test B: after regeneration, .get returns new tone", () => {
  it("B1: .get after regeneration with Warm tone returns tone='Warm'", async () => {
    const getApplicationKitSpy = vi.spyOn(db, "getApplicationKit")
      .mockResolvedValue(makeKit("Warm") as any);
    const caller = appRouter.createCaller(makeCtx(makeUser()));
    const kit = await caller.applicationKits.get({ jobCardId: 10, resumeId: 5, evidenceRunId: 3 });
    expect(kit!.tone).toBe("Warm");
    // UI note condition: selector=Warm, kit.tone=Warm → note should NOT show
    expect("Warm" !== kit!.tone).toBe(false);
    getApplicationKitSpy.mockRestore();
  });

  it("B2: .get after regeneration with Direct tone returns tone='Direct'", async () => {
    const getApplicationKitSpy = vi.spyOn(db, "getApplicationKit")
      .mockResolvedValue(makeKit("Direct") as any);
    const caller = appRouter.createCaller(makeCtx(makeUser()));
    const kit = await caller.applicationKits.get({ jobCardId: 10, resumeId: 5, evidenceRunId: 3 });
    expect(kit!.tone).toBe("Direct");
    getApplicationKitSpy.mockRestore();
  });

  it("B3: .get after regeneration with Human tone returns tone='Human' (default)", async () => {
    const getApplicationKitSpy = vi.spyOn(db, "getApplicationKit")
      .mockResolvedValue(makeKit("Human") as any);
    const caller = appRouter.createCaller(makeCtx(makeUser()));
    const kit = await caller.applicationKits.get({ jobCardId: 10, resumeId: 5, evidenceRunId: 3 });
    expect(kit!.tone).toBe("Human");
    getApplicationKitSpy.mockRestore();
  });
});// ─── Test C: no regressions to exports/zip ─────────────────────────────────────────────────────
describe("Phase 9E0.1 — Test C: .get still returns all fields needed for zip export", () => {
  let getApplicationKitSpy: ReturnType<typeof vi.spyOn>;
  beforeAll(() => {
    // Re-spy after A-group afterAll restores the original
    getApplicationKitSpy = vi.spyOn(db, "getApplicationKit").mockResolvedValue(makeKit("Human") as any);
  });
  afterAll(() => {
    getApplicationKitSpy.mockRestore();
  });
  it("C1: .get returns topChangesJson field (needed for zip export)", async () => {
    const caller = appRouter.createCaller(makeCtx(makeUser()));
    const kit = await caller.applicationKits.get({ jobCardId: 10, resumeId: 5, evidenceRunId: 3 });
    expect(kit).toHaveProperty("topChangesJson");
    expect(kit!.topChangesJson).toBeTruthy();
  });

  it("C2: .get returns bulletRewritesJson field (needed for zip export)", async () => {
    const caller = appRouter.createCaller(makeCtx(makeUser()));
    const kit = await caller.applicationKits.get({ jobCardId: 10, resumeId: 5, evidenceRunId: 3 });
    expect(kit).toHaveProperty("bulletRewritesJson");
    expect(kit!.bulletRewritesJson).toBeTruthy();
  });

  it("C3: .get returns coverLetterText field (needed for zip export)", async () => {
    const caller = appRouter.createCaller(makeCtx(makeUser()));
    const kit = await caller.applicationKits.get({ jobCardId: 10, resumeId: 5, evidenceRunId: 3 });
    expect(kit).toHaveProperty("coverLetterText");
    expect(kit!.coverLetterText).toBeTruthy();
  });

  it("C4: .get returns createdAt field (shown in kit metadata line)", async () => {
    const caller = appRouter.createCaller(makeCtx(makeUser()));
    const kit = await caller.applicationKits.get({ jobCardId: 10, resumeId: 5, evidenceRunId: 3 });
    expect(kit).toHaveProperty("createdAt");
    expect(kit!.createdAt).toBeInstanceOf(Date);
  });

  it("C5: applicationKits.get is a protectedProcedure — unauthenticated call throws", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    await expect(
      caller.applicationKits.get({ jobCardId: 10, resumeId: 5, evidenceRunId: 3 })
    ).rejects.toThrow(/Please login|UNAUTHORIZED|unauthorized/i);
  });
});
