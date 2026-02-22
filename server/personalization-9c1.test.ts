/**
 * Phase 9C1 Acceptance Tests: Personalization Sources + Tone Guardrails
 *
 * A) User can list sources (empty initially)
 * B) User can add a source with pasted text ≥ 50 chars
 * C) User can add a source with URL only (no pasted text)
 * D) Validation: pasted text < 50 chars and no URL → error
 * E) Validation: pasted text > 5000 chars → error
 * F) Max 5 sources per job card enforced
 * G) User can update (upsert) an existing source
 * H) User can delete a source
 * I) Sources are scoped to job card (no cross-job mixing)
 * J) Unauthenticated user is blocked
 * K) Tone guardrails config exists with banned + preferred phrases
 * L) Tone guardrails rule_text is non-empty
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";
import type { TrpcContext } from "./_core/context";
import type { User } from "../drizzle/schema";
import { OUTREACH_TONE_GUARDRAILS } from "../shared/toneGuardrails";

// ─── Spies ────────────────────────────────────────────────────────────────────
const getPersonalizationSourcesSpy = vi.spyOn(db, "getPersonalizationSources");
const upsertPersonalizationSourceSpy = vi.spyOn(db, "upsertPersonalizationSource");
const deletePersonalizationSourceSpy = vi.spyOn(db, "deletePersonalizationSource");

// ─── Context factories ────────────────────────────────────────────────────────
function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 42,
    openId: "test-personalization",
    email: "personalization@example.com",
    name: "Personalization Tester",
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

const LONG_TEXT = "A".repeat(60); // 60 chars — passes min-50 check
const TOO_SHORT_TEXT = "Short text"; // 10 chars — fails min-50 check
const TOO_LONG_TEXT = "B".repeat(5001); // 5001 chars — fails max-5000 check

const SAMPLE_SOURCE = {
  id: 1,
  jobCardId: 10,
  userId: 42,
  sourceType: "linkedin_post" as const,
  url: null,
  pastedText: LONG_TEXT,
  capturedAt: new Date(),
  updatedAt: new Date(),
};

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("personalization.list", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("A) returns empty array for new job card", async () => {
    getPersonalizationSourcesSpy.mockResolvedValue([]);
    const caller = appRouter.createCaller(makeCtx(makeUser()));
    const result = await caller.personalization.list({ jobCardId: 10 });
    expect(result).toEqual([]);
    expect(getPersonalizationSourcesSpy).toHaveBeenCalledWith(10, 42);
  });

  it("J) unauthenticated user is blocked", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    await expect(caller.personalization.list({ jobCardId: 10 })).rejects.toThrow();
  });
});

describe("personalization.upsert", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("B) adds source with pasted text ≥ 50 chars", async () => {
    getPersonalizationSourcesSpy.mockResolvedValue([]);
    upsertPersonalizationSourceSpy.mockResolvedValue(1);
    const caller = appRouter.createCaller(makeCtx(makeUser()));
    const result = await caller.personalization.upsert({
      jobCardId: 10,
      sourceType: "linkedin_post",
      pastedText: LONG_TEXT,
    });
    expect(result).toEqual({ id: 1 });
    expect(upsertPersonalizationSourceSpy).toHaveBeenCalledWith(
      expect.objectContaining({ jobCardId: 10, userId: 42, sourceType: "linkedin_post", pastedText: LONG_TEXT })
    );
  });

  it("C) adds source with URL only (no pasted text)", async () => {
    getPersonalizationSourcesSpy.mockResolvedValue([]);
    upsertPersonalizationSourceSpy.mockResolvedValue(2);
    const caller = appRouter.createCaller(makeCtx(makeUser()));
    const result = await caller.personalization.upsert({
      jobCardId: 10,
      sourceType: "company_news",
      url: "https://example.com/news",
    });
    expect(result).toEqual({ id: 2 });
    expect(upsertPersonalizationSourceSpy).toHaveBeenCalledWith(
      expect.objectContaining({ url: "https://example.com/news", pastedText: null })
    );
  });

  it("D) rejects pasted text < 50 chars with no URL", async () => {
    getPersonalizationSourcesSpy.mockResolvedValue([]);
    const caller = appRouter.createCaller(makeCtx(makeUser()));
    await expect(
      caller.personalization.upsert({
        jobCardId: 10,
        sourceType: "other",
        pastedText: TOO_SHORT_TEXT,
      })
    ).rejects.toThrow(/50 characters/i);
  });

  it("E) rejects pasted text > 5000 chars", async () => {
    const caller = appRouter.createCaller(makeCtx(makeUser()));
    await expect(
      caller.personalization.upsert({
        jobCardId: 10,
        sourceType: "other",
        pastedText: TOO_LONG_TEXT,
      })
    ).rejects.toThrow();
  });

  it("F) blocks adding 6th source (max 5 per job card)", async () => {
    // Return 5 existing sources
    getPersonalizationSourcesSpy.mockResolvedValue([
      SAMPLE_SOURCE,
      { ...SAMPLE_SOURCE, id: 2 },
      { ...SAMPLE_SOURCE, id: 3 },
      { ...SAMPLE_SOURCE, id: 4 },
      { ...SAMPLE_SOURCE, id: 5 },
    ]);
    const caller = appRouter.createCaller(makeCtx(makeUser()));
    await expect(
      caller.personalization.upsert({
        jobCardId: 10,
        sourceType: "other",
        pastedText: LONG_TEXT,
      })
    ).rejects.toThrow(/maximum 5/i);
  });

  it("G) updates existing source (id provided, no count check)", async () => {
    upsertPersonalizationSourceSpy.mockResolvedValue(1);
    const caller = appRouter.createCaller(makeCtx(makeUser()));
    const result = await caller.personalization.upsert({
      id: 1,
      jobCardId: 10,
      sourceType: "linkedin_about",
      pastedText: "Updated text that is definitely long enough to pass the minimum length check here.",
    });
    expect(result).toEqual({ id: 1 });
    // getPersonalizationSources should NOT be called for updates (no count check)
    expect(getPersonalizationSourcesSpy).not.toHaveBeenCalled();
  });

  it("I) sources are scoped per job card (different jobCardId passed to db)", async () => {
    getPersonalizationSourcesSpy.mockResolvedValue([]);
    upsertPersonalizationSourceSpy.mockResolvedValue(99);
    const caller = appRouter.createCaller(makeCtx(makeUser()));
    await caller.personalization.upsert({
      jobCardId: 99,
      sourceType: "other",
      url: "https://example.com",
    });
    expect(upsertPersonalizationSourceSpy).toHaveBeenCalledWith(
      expect.objectContaining({ jobCardId: 99 })
    );
    // Confirm list query also uses the correct jobCardId
    getPersonalizationSourcesSpy.mockResolvedValue([]);
    await caller.personalization.list({ jobCardId: 99 });
    expect(getPersonalizationSourcesSpy).toHaveBeenCalledWith(99, 42);
  });
});

describe("personalization.delete", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("H) deletes a source by id", async () => {
    deletePersonalizationSourceSpy.mockResolvedValue(undefined);
    const caller = appRouter.createCaller(makeCtx(makeUser()));
    const result = await caller.personalization.delete({ id: 1 });
    expect(result).toEqual({ success: true });
    expect(deletePersonalizationSourceSpy).toHaveBeenCalledWith(1, 42);
  });

  it("J2) unauthenticated user is blocked on delete", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    await expect(caller.personalization.delete({ id: 1 })).rejects.toThrow();
  });
});

// ─── Tone Guardrails Config Tests ────────────────────────────────────────────
describe("OUTREACH_TONE_GUARDRAILS config (Phase 9C1 foundation)", () => {
  it("K) config exists with non-empty banned_phrases array", () => {
    expect(Array.isArray(OUTREACH_TONE_GUARDRAILS.banned_phrases)).toBe(true);
    expect(OUTREACH_TONE_GUARDRAILS.banned_phrases.length).toBeGreaterThan(0);
  });

  it("K2) config exists with non-empty preferred_phrases array", () => {
    expect(Array.isArray(OUTREACH_TONE_GUARDRAILS.preferred_phrases)).toBe(true);
    expect(OUTREACH_TONE_GUARDRAILS.preferred_phrases.length).toBeGreaterThan(0);
  });

  it("L) rule_text is a non-empty string", () => {
    expect(typeof OUTREACH_TONE_GUARDRAILS.rule_text).toBe("string");
    expect(OUTREACH_TONE_GUARDRAILS.rule_text.length).toBeGreaterThan(10);
  });

  it("L2) banned_phrases includes key problematic phrases", () => {
    const banned = OUTREACH_TONE_GUARDRAILS.banned_phrases as readonly string[];
    expect(banned).toContain("reiterate");
    expect(banned).toContain("once more");
    expect(banned).toContain("final follow up");
    expect(banned).toContain("following my previous");
  });

  it("L3) preferred_phrases includes key soft phrases", () => {
    const preferred = OUTREACH_TONE_GUARDRAILS.preferred_phrases as readonly string[];
    // Note: "just checking in" moved to allowed_not_preferred in Phase 9C3
    expect(preferred).toContain("appreciate your time");
    expect(preferred).toContain("no pressure at all");
  });
});
