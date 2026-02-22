/**
 * Acceptance tests for Outreach Fix 1/4: Salutation Fallback
 *
 * Tests cover:
 * A) computeSalutation with contact name → "Dear {firstName}," / "Hi {firstName},"
 * B) computeSalutation with no contact → "Dear Hiring Manager," / "Hi there,"
 * C) fixSalutation replaces "Dear ," with "Dear Hiring Manager,"
 * D) fixSalutation replaces "Hi ," with "Hi there,"
 * E) extractFirstName handles edge cases
 * F) generatePack with contactId resolves contact name and injects salutation
 * G) generatePack with no contactId uses fallback salutation
 * H) fixSalutation post-process guard catches LLM "Dear ," output
 * I) Admin generateOutreachTestMode with contactName uses correct salutation
 * J) Admin generateOutreachTestMode with no contactName uses fallback
 */
import { describe, expect, it, vi, beforeEach, beforeAll, afterAll } from "vitest";
import { _enableTestBypass, _disableTestBypass } from "./rateLimiter";

beforeAll(() => _enableTestBypass());
afterAll(() => _disableTestBypass());
import { computeSalutation, fixSalutation, extractFirstName } from "../shared/outreachHelpers";
import { appRouter } from "./routers";
import * as db from "./db";
import type { TrpcContext } from "./_core/context";
import type { User } from "../drizzle/schema";

// ─── Context factories ────────────────────────────────────────────────────────
function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 7,
    openId: "test-user-salutation",
    email: "salutation@example.com",
    name: "Salutation Tester",
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
function makeAdminUser(overrides: Partial<User> = {}): User {
  return makeUser({ role: "admin", isAdmin: true, ...overrides });
}
function makeCtx(user: User | null): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ─── Spies ────────────────────────────────────────────────────────────────────
const getCreditsBalanceSpy = vi.spyOn(db, "getCreditsBalance");
const spendCreditsSpy = vi.spyOn(db, "spendCredits");
const getJobCardByIdSpy = vi.spyOn(db, "getJobCardById");
const getLatestJdSnapshotSpy = vi.spyOn(db, "getLatestJdSnapshot");
const getProfileSpy = vi.spyOn(db, "getProfile");
const createOutreachPackSpy = vi.spyOn(db, "createOutreachPack");
const getContactByIdSpy = vi.spyOn(db, "getContactById");

// ─── Unit tests: computeSalutation ───────────────────────────────────────────
describe("computeSalutation", () => {
  it("A1) email + contact name → Dear {firstName},", () => {
    expect(computeSalutation("Erick Tran", "email")).toBe("Dear Erick,");
  });

  it("A2) linkedin + contact name → Hi {firstName},", () => {
    expect(computeSalutation("Erick Tran", "linkedin")).toBe("Hi Erick,");
  });

  it("B1) email + no contact → Dear Hiring Manager,", () => {
    expect(computeSalutation(null, "email")).toBe("Dear Hiring Manager,");
  });

  it("B2) linkedin + no contact → Hi there,", () => {
    expect(computeSalutation(null, "linkedin")).toBe("Hi there,");
  });

  it("B3) email + empty string → Dear Hiring Manager,", () => {
    expect(computeSalutation("", "email")).toBe("Dear Hiring Manager,");
  });

  it("B4) linkedin + empty string → Hi there,", () => {
    expect(computeSalutation("", "linkedin")).toBe("Hi there,");
  });

  it("A3) single-word name → uses it directly", () => {
    expect(computeSalutation("Jane", "email")).toBe("Dear Jane,");
  });

  it("A4) multi-word name → uses first token only", () => {
    expect(computeSalutation("Sarah O'Brien-Smith", "email")).toBe("Dear Sarah,");
  });
});

// ─── Unit tests: extractFirstName ────────────────────────────────────────────
describe("extractFirstName", () => {
  it("E1) null → null", () => expect(extractFirstName(null)).toBeNull());
  it("E2) empty string → null", () => expect(extractFirstName("")).toBeNull());
  it("E3) whitespace only → null", () => expect(extractFirstName("   ")).toBeNull());
  it("E4) 'Erick Tran' → 'Erick'", () => expect(extractFirstName("Erick Tran")).toBe("Erick"));
  it("E5) '  Jane  ' → 'Jane'", () => expect(extractFirstName("  Jane  ")).toBe("Jane"));
});

// ─── Unit tests: fixSalutation ───────────────────────────────────────────────
describe("fixSalutation", () => {
  it("C1) 'Dear ,' at start → 'Dear Hiring Manager,'", () => {
    const input = "Dear ,\n\nI am writing to express my interest.";
    const result = fixSalutation(input, "email");
    expect(result).toMatch(/^Dear Hiring Manager,/);
    expect(result).not.toContain("Dear ,");
  });

  it("C2) 'Dear,' (no space) at start → 'Dear Hiring Manager,'", () => {
    const input = "Dear,\n\nI am writing.";
    const result = fixSalutation(input, "email");
    expect(result).toMatch(/^Dear Hiring Manager,/);
  });

  it("D1) 'Hi ,' at start → 'Hi there,'", () => {
    const input = "Hi ,\n\nI saw your profile.";
    const result = fixSalutation(input, "linkedin");
    expect(result).toMatch(/^Hi there,/);
    expect(result).not.toContain("Hi ,");
  });

  it("D2) 'Hi,' (no space) at start → 'Hi there,'", () => {
    const input = "Hi,\n\nI saw your profile.";
    const result = fixSalutation(input, "linkedin");
    expect(result).toMatch(/^Hi there,/);
  });

  it("does not alter messages with valid salutation", () => {
    const input = "Dear Jane,\n\nI am writing.";
    expect(fixSalutation(input, "email")).toBe("Dear Jane,\n\nI am writing.");
  });

  it("does not alter messages with 'Dear Hiring Manager,'", () => {
    const input = "Dear Hiring Manager,\n\nI am writing.";
    expect(fixSalutation(input, "email")).toBe("Dear Hiring Manager,\n\nI am writing.");
  });
});

// ─── Integration tests: generatePack ─────────────────────────────────────────
describe("outreach.generatePack — salutation integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default happy-path mocks
    getCreditsBalanceSpy.mockResolvedValue(5);
    getJobCardByIdSpy.mockResolvedValue({
      id: 1, title: "SWE Intern", company: "Acme", userId: 7,
      pipelineStage: "applied", notes: null, salaryMin: null, salaryMax: null,
      location: null, jobUrl: null, createdAt: new Date(), updatedAt: new Date(),
      followupsScheduledAt: null,
    } as any);
    getLatestJdSnapshotSpy.mockResolvedValue(null);
    getProfileSpy.mockResolvedValue(null);
    spendCreditsSpy.mockResolvedValue(true);
    createOutreachPackSpy.mockResolvedValue(99);
  });

  it("F) with contactId — resolves contact name and injects correct salutation in prompt", async () => {
    getContactByIdSpy.mockResolvedValueOnce({ id: 5, name: "Erick Tran", email: null, contactRole: null } as any);

    let capturedMessages: any[] = [];
    const llmModule = await import("./_core/llm");
    vi.spyOn(llmModule, "invokeLLM").mockImplementationOnce(async (opts) => {
      capturedMessages = opts.messages;
      return {
        choices: [{ message: { content: JSON.stringify({
          recruiter_email: "Dear Erick,\n\nI am interested.",
          linkedin_dm: "Hi Erick,\n\nI saw your profile.",
          follow_up_1: "Dear Erick,\n\nFollowing up.",
          follow_up_2: "Dear Erick,\n\nJust checking in.",
        }) } }]
      } as any;
    });

    const caller = appRouter.createCaller(makeCtx(makeUser()));
    const result = await caller.outreach.generatePack({ jobCardId: 1, contactId: 5 });

    // Verify the LLM prompt includes the correct salutation
    const userMsg = capturedMessages.find((m: any) => m.role === "user")?.content ?? "";
    expect(userMsg).toContain("Dear Erick,");
    expect(userMsg).toContain("Hi Erick,");

    // Verify the result starts with the correct salutation
    expect(result.recruiter_email).toMatch(/^Dear Erick,/);
    expect(result.linkedin_dm).toMatch(/^Hi Erick,/);
  });

  it("G) with no contactId — uses fallback salutation in prompt", async () => {
    let capturedMessages: any[] = [];
    const llmModule = await import("./_core/llm");
    vi.spyOn(llmModule, "invokeLLM").mockImplementationOnce(async (opts) => {
      capturedMessages = opts.messages;
      return {
        choices: [{ message: { content: JSON.stringify({
          recruiter_email: "Dear Hiring Manager,\n\nI am interested.",
          linkedin_dm: "Hi there,\n\nI saw your profile.",
          follow_up_1: "Dear Hiring Manager,\n\nFollowing up.",
          follow_up_2: "Dear Hiring Manager,\n\nJust checking in.",
        }) } }]
      } as any;
    });

    const caller = appRouter.createCaller(makeCtx(makeUser()));
    const result = await caller.outreach.generatePack({ jobCardId: 1 });

    // Verify the LLM prompt includes the fallback salutation
    const userMsg = capturedMessages.find((m: any) => m.role === "user")?.content ?? "";
    expect(userMsg).toContain("Dear Hiring Manager,");
    expect(userMsg).toContain("Hi there,");

    // Verify the result starts with the fallback salutation
    expect(result.recruiter_email).toMatch(/^Dear Hiring Manager,/);
    expect(result.linkedin_dm).toMatch(/^Hi there,/);
  });

  it("H) fixSalutation post-process catches LLM 'Dear ,' output", async () => {
    // Simulate LLM returning a blank salutation despite the prompt
    const llmModule = await import("./_core/llm");
    vi.spyOn(llmModule, "invokeLLM").mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify({
        recruiter_email: "Dear ,\n\nI am interested in the role.",
        linkedin_dm: "Hi ,\n\nI saw your profile.",
        follow_up_1: "Dear ,\n\nFollowing up.",
        follow_up_2: "Dear ,\n\nJust checking in.",
      }) } }]
    } as any);

    const caller = appRouter.createCaller(makeCtx(makeUser()));
    const result = await caller.outreach.generatePack({ jobCardId: 1 });

    // Post-process must have replaced "Dear ," with "Dear Hiring Manager,"
    expect(result.recruiter_email).not.toContain("Dear ,");
    expect(result.recruiter_email).toMatch(/^Dear Hiring Manager,/);
    expect(result.linkedin_dm).not.toContain("Hi ,");
    expect(result.linkedin_dm).toMatch(/^Hi there,/);
    expect(result.follow_up_1).not.toContain("Dear ,");
    expect(result.follow_up_2).not.toContain("Dear ,");
  });
});

// ─── Integration tests: admin.sandbox.generateOutreachTestMode ───────────────
describe("admin.sandbox.generateOutreachTestMode — salutation integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getJobCardByIdSpy.mockResolvedValue({
      id: 1, title: "SWE Intern", company: "Acme", userId: 7,
      pipelineStage: "applied", notes: null, salaryMin: null, salaryMax: null,
      location: null, jobUrl: null, createdAt: new Date(), updatedAt: new Date(),
      followupsScheduledAt: null,
    } as any);
    getLatestJdSnapshotSpy.mockResolvedValue(null);
    getProfileSpy.mockResolvedValue(null);
    createOutreachPackSpy.mockResolvedValue(99);
    vi.spyOn(db, "adminLogTestRun").mockResolvedValue(undefined as any);
    vi.spyOn(db, "logAdminAction").mockResolvedValue(undefined as any);
  });

  it("I) with contactName — injects correct salutation in prompt", async () => {
    let capturedMessages: any[] = [];
    const llmModule = await import("./_core/llm");
    vi.spyOn(llmModule, "invokeLLM").mockImplementationOnce(async (opts) => {
      capturedMessages = opts.messages;
      return {
        choices: [{ message: { content: JSON.stringify({
          recruiter_email: "Dear Erick,\n\nI am interested.",
          linkedin_dm: "Hi Erick,\n\nI saw your profile.",
          follow_up_1: "Dear Erick,\n\nFollowing up.",
          follow_up_2: "Dear Erick,\n\nJust checking in.",
        }) } }]
      } as any;
    });

    const caller = appRouter.createCaller(makeCtx(makeAdminUser()));
    const result = await caller.admin.sandbox.generateOutreachTestMode({
      jobCardId: 1,
      contactName: "Erick Tran",
    });

    const userMsg = capturedMessages.find((m: any) => m.role === "user")?.content ?? "";
    expect(userMsg).toContain("Dear Erick,");
    expect(userMsg).toContain("Hi Erick,");
    expect(result.recruiter_email).toMatch(/^Dear Erick,/);
    expect(result.linkedin_dm).toMatch(/^Hi Erick,/);
  });

  it("J) with no contactName — uses fallback salutation in prompt", async () => {
    let capturedMessages: any[] = [];
    const llmModule = await import("./_core/llm");
    vi.spyOn(llmModule, "invokeLLM").mockImplementationOnce(async (opts) => {
      capturedMessages = opts.messages;
      return {
        choices: [{ message: { content: JSON.stringify({
          recruiter_email: "Dear Hiring Manager,\n\nI am interested.",
          linkedin_dm: "Hi there,\n\nI saw your profile.",
          follow_up_1: "Dear Hiring Manager,\n\nFollowing up.",
          follow_up_2: "Dear Hiring Manager,\n\nJust checking in.",
        }) } }]
      } as any;
    });

    const caller = appRouter.createCaller(makeCtx(makeAdminUser()));
    const result = await caller.admin.sandbox.generateOutreachTestMode({ jobCardId: 1 });

    const userMsg = capturedMessages.find((m: any) => m.role === "user")?.content ?? "";
    expect(userMsg).toContain("Dear Hiring Manager,");
    expect(userMsg).toContain("Hi there,");
    expect(result.recruiter_email).toMatch(/^Dear Hiring Manager,/);
    expect(result.linkedin_dm).toMatch(/^Hi there,/);
  });
});
