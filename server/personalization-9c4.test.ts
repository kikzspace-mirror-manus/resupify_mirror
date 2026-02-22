/**
 * Phase 9C4 Acceptance Tests: Use Personalization Sources in Outreach
 *
 * A) No sources saved → generated outputs contain 0 personalization references
 * B) With 1–3 sources → personalization block is injected into LLM user message
 * C) Source truncation: excerpt > 800 chars is truncated to 800
 * D) Regression: tone guardrails still apply; no banned phrases appear
 * E) Regression: salutation logic still works with personalization sources present
 * F) stripPersonalizationFromFollowUp removes personalization signals from follow-ups
 * G) buildPersonalizationBlock returns empty string for empty sources
 * H) buildPersonalizationBlock includes source type, URL, and excerpt
 * I) buildPersonalizationBlock limits excerpt to maxExcerptChars
 * J) Admin sandbox: personalization block is injected when sources exist
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  buildPersonalizationBlock,
  stripPersonalizationFromFollowUp,
  type PersonalizationSourceRow,
} from "../shared/outreachHelpers";
import { appRouter } from "./routers";
import * as db from "./db";
import type { TrpcContext } from "./_core/context";
import type { User } from "../drizzle/schema";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 99,
    openId: "9c4-test",
    email: "9c4@example.com",
    name: "Personalization Tester",
    loginMethod: "manus",
    role: "admin",
    disabled: false,
    isAdmin: true,
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

// ─── Unit tests: buildPersonalizationBlock ────────────────────────────────────

describe("buildPersonalizationBlock (unit)", () => {
  it("G) returns empty string for empty sources array", () => {
    expect(buildPersonalizationBlock([])).toBe("");
  });

  it("G2) returns empty string for null/undefined sources", () => {
    expect(buildPersonalizationBlock(null as any)).toBe("");
    expect(buildPersonalizationBlock(undefined as any)).toBe("");
  });

  it("H) includes source type, URL, and excerpt", () => {
    const sources: PersonalizationSourceRow[] = [
      {
        sourceType: "linkedin_post",
        url: "https://linkedin.com/posts/abc123",
        pastedText: "We are expanding our AI team to tackle climate change.",
      },
    ];
    const block = buildPersonalizationBlock(sources);
    expect(block).toContain("=== PERSONALIZATION CONTEXT (USER-PROVIDED) ===");
    expect(block).toContain("Source 1 (linkedin_post):");
    expect(block).toContain("URL: https://linkedin.com/posts/abc123");
    expect(block).toContain("We are expanding our AI team to tackle climate change.");
    expect(block).toContain("=== END PERSONALIZATION CONTEXT ===");
  });

  it("H2) includes multiple sources with correct numbering", () => {
    const sources: PersonalizationSourceRow[] = [
      { sourceType: "company_news", url: null, pastedText: "Acme Corp just raised Series B." },
      { sourceType: "job_post", url: "https://acme.com/jobs/123", pastedText: "Looking for a PM." },
    ];
    const block = buildPersonalizationBlock(sources);
    expect(block).toContain("Source 1 (company_news):");
    expect(block).toContain("Source 2 (job_post):");
    expect(block).toContain("URL: https://acme.com/jobs/123");
  });

  it("H3) omits URL line when url is null/empty", () => {
    const sources: PersonalizationSourceRow[] = [
      { sourceType: "other", url: null, pastedText: "Some text." },
    ];
    const block = buildPersonalizationBlock(sources);
    expect(block).not.toContain("URL:");
    expect(block).toContain("Some text.");
  });

  it("I) truncates excerpt to maxExcerptChars (default 800)", () => {
    const longText = "A".repeat(1200);
    const sources: PersonalizationSourceRow[] = [
      { sourceType: "other", url: null, pastedText: longText },
    ];
    const block = buildPersonalizationBlock(sources);
    // Should contain exactly 800 A's in the excerpt
    expect(block).toContain("A".repeat(800));
    expect(block).not.toContain("A".repeat(801));
  });

  it("C) custom maxExcerptChars is respected", () => {
    const longText = "B".repeat(500);
    const sources: PersonalizationSourceRow[] = [
      { sourceType: "other", url: null, pastedText: longText },
    ];
    const block = buildPersonalizationBlock(sources, 200);
    expect(block).toContain("B".repeat(200));
    expect(block).not.toContain("B".repeat(201));
  });

  it("includes no-LinkedIn-mention rule in the block", () => {
    const sources: PersonalizationSourceRow[] = [
      { sourceType: "other", url: null, pastedText: "Some text." },
    ];
    const block = buildPersonalizationBlock(sources);
    expect(block).toContain("Never mention 'I saw your LinkedIn'");
  });

  it("includes follow-up restriction in the block", () => {
    const sources: PersonalizationSourceRow[] = [
      { sourceType: "other", url: null, pastedText: "Some text." },
    ];
    const block = buildPersonalizationBlock(sources);
    expect(block).toContain("Do NOT add personalization to follow-ups");
  });
});

// ─── Unit tests: stripPersonalizationFromFollowUp ─────────────────────────────

describe("stripPersonalizationFromFollowUp (unit)", () => {
  it("F) removes sentences with 'I noticed'", () => {
    const text = "Dear Hiring Manager,\n\nI noticed your recent expansion. I am writing to follow up on my application.";
    const result = stripPersonalizationFromFollowUp(text);
    expect(result).not.toContain("I noticed");
    expect(result).toContain("I am writing to follow up");
  });

  it("F2) removes sentences with 'your recent post'", () => {
    const text = "I wanted to follow up. I read your recent post about AI. No pressure at all.";
    const result = stripPersonalizationFromFollowUp(text);
    expect(result).not.toContain("your recent post");
    expect(result).toContain("I wanted to follow up");
  });

  it("F3) returns text unchanged when no personalization signals present", () => {
    const text = "I wanted to follow up on my application. No pressure at all — thanks for your time.";
    const result = stripPersonalizationFromFollowUp(text);
    expect(result).toBe(text);
  });

  it("F4) handles empty string", () => {
    expect(stripPersonalizationFromFollowUp("")).toBe("");
  });
});

// ─── Integration tests: generatePack personalization injection ────────────────

describe("outreach.generatePack — personalization injection (Phase 9C4)", () => {
  const getCreditsBalanceSpy = vi.spyOn(db, "getCreditsBalance");
  const spendCreditsSpy = vi.spyOn(db, "spendCredits");
  const getJobCardByIdSpy = vi.spyOn(db, "getJobCardById");
  const getLatestJdSnapshotSpy = vi.spyOn(db, "getLatestJdSnapshot");
  const getProfileSpy = vi.spyOn(db, "getProfile");
  const createOutreachPackSpy = vi.spyOn(db, "createOutreachPack");
  const getPersonalizationSourcesSpy = vi.spyOn(db, "getPersonalizationSources");

  beforeEach(() => {
    vi.clearAllMocks();
    getCreditsBalanceSpy.mockResolvedValue(5);
    getJobCardByIdSpy.mockResolvedValue({
      id: 1, title: "PM Co-op", company: "Acme", userId: 99,
      pipelineStage: "applied", notes: null, salaryMin: null, salaryMax: null,
      location: null, jobUrl: null, createdAt: new Date(), updatedAt: new Date(),
      followupsScheduledAt: null,
    } as any);
    getLatestJdSnapshotSpy.mockResolvedValue(null);
    getProfileSpy.mockResolvedValue(null);
    spendCreditsSpy.mockResolvedValue(true);
    createOutreachPackSpy.mockResolvedValue(200);
  });

  it("A) No sources → LLM user message does NOT contain personalization block", async () => {
    getPersonalizationSourcesSpy.mockResolvedValueOnce([]);

    let capturedUserMsg = "";
    const llmModule = await import("./_core/llm");
    vi.spyOn(llmModule, "invokeLLM").mockImplementationOnce(async (opts: any) => {
      capturedUserMsg = opts.messages.find((m: any) => m.role === "user")?.content ?? "";
      return {
        choices: [{ message: { content: JSON.stringify({
          recruiter_email: "Dear Hiring Manager,\n\nI am applying for PM Co-op.",
          linkedin_dm: "Hi there,\n\nI am interested in the PM Co-op role.",
          follow_up_1: "Following up. No rush at all — thanks for your time.",
          follow_up_2: "Just checking in. Appreciate your time.",
        }) } }]
      } as any;
    });

    const caller = appRouter.createCaller(makeCtx(makeUser({ role: "user", isAdmin: false })));
    await caller.outreach.generatePack({ jobCardId: 1 });

    expect(capturedUserMsg).not.toContain("PERSONALIZATION CONTEXT");
    expect(getPersonalizationSourcesSpy).toHaveBeenCalledWith(1, 99);
  });

  it("B) With 2 sources → LLM user message contains personalization block with both sources", async () => {
    getPersonalizationSourcesSpy.mockResolvedValueOnce([
      { id: 1, jobCardId: 1, userId: 99, sourceType: "linkedin_post", url: "https://linkedin.com/abc", pastedText: "Acme is expanding into AI.", capturedAt: new Date() },
      { id: 2, jobCardId: 1, userId: 99, sourceType: "company_news", url: null, pastedText: "Acme raised Series B funding.", capturedAt: new Date() },
    ] as any);

    let capturedUserMsg = "";
    const llmModule = await import("./_core/llm");
    vi.spyOn(llmModule, "invokeLLM").mockImplementationOnce(async (opts: any) => {
      capturedUserMsg = opts.messages.find((m: any) => m.role === "user")?.content ?? "";
      return {
        choices: [{ message: { content: JSON.stringify({
          recruiter_email: "Dear Hiring Manager,\n\nI noticed your recent AI expansion. I am applying for PM Co-op.",
          linkedin_dm: "Hi there,\n\nI saw your recent Series B news. I am interested.",
          follow_up_1: "Following up. No rush at all — thanks for your time.",
          follow_up_2: "Just checking in. Appreciate your time.",
        }) } }]
      } as any;
    });

    const caller = appRouter.createCaller(makeCtx(makeUser({ role: "user", isAdmin: false })));
    await caller.outreach.generatePack({ jobCardId: 1 });

    expect(capturedUserMsg).toContain("=== PERSONALIZATION CONTEXT (USER-PROVIDED) ===");
    expect(capturedUserMsg).toContain("Source 1 (linkedin_post):");
    expect(capturedUserMsg).toContain("Source 2 (company_news):");
    expect(capturedUserMsg).toContain("Acme is expanding into AI.");
    expect(capturedUserMsg).toContain("Acme raised Series B funding.");
    expect(capturedUserMsg).toContain("=== END PERSONALIZATION CONTEXT ===");
  });

  it("B2) Only top 3 sources are included even if more exist", async () => {
    getPersonalizationSourcesSpy.mockResolvedValueOnce([
      { id: 1, jobCardId: 1, userId: 99, sourceType: "other", url: null, pastedText: "Source 1 text.", capturedAt: new Date() },
      { id: 2, jobCardId: 1, userId: 99, sourceType: "other", url: null, pastedText: "Source 2 text.", capturedAt: new Date() },
      { id: 3, jobCardId: 1, userId: 99, sourceType: "other", url: null, pastedText: "Source 3 text.", capturedAt: new Date() },
      { id: 4, jobCardId: 1, userId: 99, sourceType: "other", url: null, pastedText: "Source 4 text.", capturedAt: new Date() },
      { id: 5, jobCardId: 1, userId: 99, sourceType: "other", url: null, pastedText: "Source 5 text.", capturedAt: new Date() },
    ] as any);

    let capturedUserMsg = "";
    const llmModule = await import("./_core/llm");
    vi.spyOn(llmModule, "invokeLLM").mockImplementationOnce(async (opts: any) => {
      capturedUserMsg = opts.messages.find((m: any) => m.role === "user")?.content ?? "";
      return {
        choices: [{ message: { content: JSON.stringify({
          recruiter_email: "Dear Hiring Manager,\n\nApplying.",
          linkedin_dm: "Hi there,\n\nInterested.",
          follow_up_1: "Following up. No rush at all — thanks for your time.",
          follow_up_2: "Just checking in. Appreciate your time.",
        }) } }]
      } as any;
    });

    const caller = appRouter.createCaller(makeCtx(makeUser({ role: "user", isAdmin: false })));
    await caller.outreach.generatePack({ jobCardId: 1 });

    expect(capturedUserMsg).toContain("Source 1 (other):");
    expect(capturedUserMsg).toContain("Source 2 (other):");
    expect(capturedUserMsg).toContain("Source 3 (other):");
    expect(capturedUserMsg).not.toContain("Source 4 (other):");
    expect(capturedUserMsg).not.toContain("Source 5 (other):");
  });

  it("D) Regression: tone guardrails still apply — banned phrases are stripped", async () => {
    getPersonalizationSourcesSpy.mockResolvedValueOnce([
      { id: 1, jobCardId: 1, userId: 99, sourceType: "other", url: null, pastedText: "Acme is growing.", capturedAt: new Date() },
    ] as any);

    const llmModule = await import("./_core/llm");
    vi.spyOn(llmModule, "invokeLLM").mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify({
        recruiter_email: "Dear Hiring Manager,\n\nI wanted to reiterate my interest.",
        linkedin_dm: "Hi there,\n\nOnce more, I am interested.",
        follow_up_1: "Following up. No rush at all — thanks for your time.",
        follow_up_2: "Just checking in. Appreciate your time.",
      }) } }]
    } as any);

    const caller = appRouter.createCaller(makeCtx(makeUser({ role: "user", isAdmin: false })));
    const result = await caller.outreach.generatePack({ jobCardId: 1 });

    // Tone guardrails should strip the banned phrases verbatim
    // sanitizeTone removes the phrase itself (not the whole sentence)
    expect(result.recruiter_email).not.toContain("I wanted to reiterate");
    expect(result.linkedin_dm).not.toContain("once more");
  });

  it("E) Regression: salutation logic still works with personalization sources", async () => {
    getPersonalizationSourcesSpy.mockResolvedValueOnce([
      { id: 1, jobCardId: 1, userId: 99, sourceType: "other", url: null, pastedText: "Acme is growing.", capturedAt: new Date() },
    ] as any);

    const getContactByIdSpy = vi.spyOn(db, "getContactById");
    getContactByIdSpy.mockResolvedValueOnce({ id: 5, name: "Sarah Chen", email: "sarah@acme.com" } as any);

    const llmModule = await import("./_core/llm");
    vi.spyOn(llmModule, "invokeLLM").mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify({
        recruiter_email: "Dear Sarah,\n\nI am applying for PM Co-op.",
        linkedin_dm: "Hi Sarah,\n\nI am interested.",
        follow_up_1: "Following up. No rush at all — thanks for your time.",
        follow_up_2: "Just checking in. Appreciate your time.",
      }) } }]
    } as any);

    const caller = appRouter.createCaller(makeCtx(makeUser({ role: "user", isAdmin: false })));
    const result = await caller.outreach.generatePack({ jobCardId: 1, contactId: 5 });

    expect(result.recruiter_email).toMatch(/^Dear Sarah,/);
    expect(result.linkedin_dm).toMatch(/^Hi Sarah,/);
  });
});

// ─── Integration tests: admin sandbox personalization injection ────────────────

describe("admin.sandbox.generateOutreachTestMode — personalization injection (Phase 9C4)", () => {
  const getJobCardByIdSpy = vi.spyOn(db, "getJobCardById");
  const getLatestJdSnapshotSpy = vi.spyOn(db, "getLatestJdSnapshot");
  const getProfileSpy = vi.spyOn(db, "getProfile");
  const createOutreachPackSpy = vi.spyOn(db, "createOutreachPack");
  const getPersonalizationSourcesSpy = vi.spyOn(db, "getPersonalizationSources");
  const adminLogTestRunSpy = vi.spyOn(db, "adminLogTestRun");
  const logAdminActionSpy = vi.spyOn(db, "logAdminAction");

  beforeEach(() => {
    vi.clearAllMocks();
    getJobCardByIdSpy.mockResolvedValue({
      id: 1, title: "PM Co-op", company: "Acme", userId: 99,
      pipelineStage: "applied", notes: null, salaryMin: null, salaryMax: null,
      location: null, jobUrl: null, createdAt: new Date(), updatedAt: new Date(),
      followupsScheduledAt: null,
    } as any);
    getLatestJdSnapshotSpy.mockResolvedValue(null);
    getProfileSpy.mockResolvedValue(null);
    createOutreachPackSpy.mockResolvedValue(201);
    adminLogTestRunSpy.mockResolvedValue(undefined as any);
    logAdminActionSpy.mockResolvedValue(undefined as any);
  });

  it("J) Admin sandbox: personalization block injected when sources exist", async () => {
    getPersonalizationSourcesSpy.mockResolvedValueOnce([
      { id: 1, jobCardId: 1, userId: 99, sourceType: "linkedin_post", url: "https://linkedin.com/abc", pastedText: "Acme is expanding into AI.", capturedAt: new Date() },
    ] as any);

    let capturedUserMsg = "";
    const llmModule = await import("./_core/llm");
    vi.spyOn(llmModule, "invokeLLM").mockImplementationOnce(async (opts: any) => {
      capturedUserMsg = opts.messages.find((m: any) => m.role === "user")?.content ?? "";
      return {
        choices: [{ message: { content: JSON.stringify({
          recruiter_email: "Dear Hiring Manager,\n\nI noticed your AI expansion. Applying.",
          linkedin_dm: "Hi there,\n\nI saw your LinkedIn post. Interested.",
          follow_up_1: "Following up. No rush at all — thanks for your time.",
          follow_up_2: "Just checking in. Appreciate your time.",
        }) } }]
      } as any;
    });

    const caller = appRouter.createCaller(makeCtx(makeUser()));
    await caller.admin.sandbox.generateOutreachTestMode({ jobCardId: 1 });

    expect(capturedUserMsg).toContain("=== PERSONALIZATION CONTEXT (USER-PROVIDED) ===");
    expect(capturedUserMsg).toContain("Source 1 (linkedin_post):");
    expect(capturedUserMsg).toContain("Acme is expanding into AI.");
  });

  it("J2) Admin sandbox: no personalization block when sources empty", async () => {
    getPersonalizationSourcesSpy.mockResolvedValueOnce([]);

    let capturedUserMsg = "";
    const llmModule = await import("./_core/llm");
    vi.spyOn(llmModule, "invokeLLM").mockImplementationOnce(async (opts: any) => {
      capturedUserMsg = opts.messages.find((m: any) => m.role === "user")?.content ?? "";
      return {
        choices: [{ message: { content: JSON.stringify({
          recruiter_email: "Dear Hiring Manager,\n\nApplying.",
          linkedin_dm: "Hi there,\n\nInterested.",
          follow_up_1: "Following up. No rush at all — thanks for your time.",
          follow_up_2: "Just checking in. Appreciate your time.",
        }) } }]
      } as any;
    });

    const caller = appRouter.createCaller(makeCtx(makeUser()));
    await caller.admin.sandbox.generateOutreachTestMode({ jobCardId: 1 });

    expect(capturedUserMsg).not.toContain("PERSONALIZATION CONTEXT");
  });
});
