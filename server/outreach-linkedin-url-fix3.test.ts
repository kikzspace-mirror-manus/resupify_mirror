/**
 * Acceptance tests for Outreach Fix 3/4: LinkedIn URL Injection
 *
 * Tests cover:
 * A) fixLinkedInUrl: with URL → prepends LinkedIn: line
 * B) fixLinkedInUrl: without URL → no LinkedIn: line added
 * C) fixLinkedInUrl: strips [LinkedIn Profile URL] bracket placeholders
 * D) fixLinkedInUrl: strips [LinkedIn URL] variant
 * E) fixLinkedInUrl: strips [Your LinkedIn Profile URL] variant
 * F) fixLinkedInUrl: LinkedIn: line already present → not duplicated
 * G) buildLinkedInBlock: with URL → returns instruction block
 * H) buildLinkedInBlock: without URL → returns empty string
 * I) generatePack: with contactId that has linkedinUrl → linkedin_dm starts with LinkedIn:
 * J) generatePack: with contactId that has no linkedinUrl → no LinkedIn: line, no placeholder
 * K) generatePack: no contactId → no LinkedIn: line, no placeholder
 * L) Admin sandbox generateOutreachTestMode: with contactLinkedInUrl → LinkedIn: line present
 * M) Admin sandbox generateOutreachTestMode: without contactLinkedInUrl → no LinkedIn: line
 */
import { describe, expect, it, vi, beforeEach, beforeAll, afterAll } from "vitest";
import { _enableTestBypass, _disableTestBypass } from "./rateLimiter";

beforeAll(() => _enableTestBypass());
afterAll(() => _disableTestBypass());
import { fixLinkedInUrl, buildLinkedInBlock } from "../shared/outreachHelpers";
import { appRouter } from "./routers";
import * as db from "./db";
import type { TrpcContext } from "./_core/context";
import type { User } from "../drizzle/schema";

// ─── Spies ───────────────────────────────────────────────────────────────────
const getCreditsBalanceSpy = vi.spyOn(db, "getCreditsBalance");
const spendCreditsSpy = vi.spyOn(db, "spendCredits");
const getJobCardByIdSpy = vi.spyOn(db, "getJobCardById");
const getLatestJdSnapshotSpy = vi.spyOn(db, "getLatestJdSnapshot");
const getProfileSpy = vi.spyOn(db, "getProfile");
const createOutreachPackSpy = vi.spyOn(db, "createOutreachPack");
const getContactByIdSpy = vi.spyOn(db, "getContactById");
const getPersonalizationSourcesSpy = vi.spyOn(db, "getPersonalizationSources");

// ─── LLM mock ────────────────────────────────────────────────────────────────
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{
      message: {
        content: JSON.stringify({
          recruiter_email: "Dear Hiring Manager,\n\nI am writing to express my interest.",
          linkedin_dm: "Hi there,\n\nI came across your profile.",
          follow_up_1: "Dear Hiring Manager,\n\nI wanted to follow up.",
          follow_up_2: "Dear Hiring Manager,\n\nJust checking in.",
        }),
      },
    }],
  }),
}));

// ─── Context factories ────────────────────────────────────────────────────────
function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 11,
    openId: "test-user-fix3",
    email: "fix3@example.com",
    name: "Fix3 Tester",
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

// ─── Shared mock data ─────────────────────────────────────────────────────────
const mockJobCard = {
  id: 11,
  userId: 11,
  title: "Software Engineer",
  company: "Acme Corp",
  stage: "bookmarked",
  priority: "medium",
  location: null,
  jobUrl: null,
  notes: null,
  appliedAt: null,
  followupsScheduledAt: null,
  eligibilityPrecheckStatus: "none",
  eligibilityPrecheckRulesJson: null,
  eligibilityPrecheckUpdatedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};
const mockProfile = {
  id: 11,
  userId: 11,
  regionCode: "CA",
  trackCode: "NEW_GRAD",
  school: "University of Waterloo",
  program: "Computer Science",
  gradDate: "2025-04",
  phone: null,
  linkedinUrl: null,
  resumeUrl: null,
  workStatus: null,
  workStatusDetail: null,
  needsSponsorship: null,
  countryOfResidence: null,
  willingToRelocate: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  getJobCardByIdSpy.mockResolvedValue(mockJobCard as any);
  getLatestJdSnapshotSpy.mockResolvedValue(null);
  getProfileSpy.mockResolvedValue(mockProfile as any);
  getCreditsBalanceSpy.mockResolvedValue(10);
  spendCreditsSpy.mockResolvedValue(true);
  createOutreachPackSpy.mockResolvedValue(999);
  getPersonalizationSourcesSpy.mockResolvedValue([]);
  getContactByIdSpy.mockResolvedValue(null);
});

// ─── Unit tests: fixLinkedInUrl ───────────────────────────────────────────────
describe("fixLinkedInUrl", () => {
  it("A) with URL → prepends LinkedIn: line", () => {
    const result = fixLinkedInUrl("Hi there,\n\nGreat profile.", "https://linkedin.com/in/erick-tran");
    expect(result).toMatch(/^LinkedIn: https:\/\/linkedin\.com\/in\/erick-tran/);
    expect(result).toContain("Hi there,");
  });

  it("B) without URL → no LinkedIn: line added", () => {
    const result = fixLinkedInUrl("Hi there,\n\nGreat profile.");
    expect(result).not.toMatch(/^LinkedIn:/);
    expect(result).toContain("Hi there,");
  });

  it("C) strips [LinkedIn Profile URL] bracket placeholder", () => {
    const result = fixLinkedInUrl("Hi there,\n[LinkedIn Profile URL]\n\nGreat profile.");
    expect(result).not.toContain("[LinkedIn Profile URL]");
  });

  it("D) strips [LinkedIn URL] variant", () => {
    const result = fixLinkedInUrl("Hi there,\n[LinkedIn URL]\n\nGreat profile.");
    expect(result).not.toContain("[LinkedIn URL]");
  });

  it("E) strips [Your LinkedIn Profile URL] variant", () => {
    const result = fixLinkedInUrl("Hi there,\n[Your LinkedIn Profile URL]\n\nGreat profile.");
    expect(result).not.toContain("[Your LinkedIn Profile URL]");
  });

  it("F) LinkedIn: line already present → not duplicated", () => {
    const result = fixLinkedInUrl(
      "LinkedIn: https://linkedin.com/in/erick-tran\nHi there,\n\nGreat profile.",
      "https://linkedin.com/in/erick-tran"
    );
    const matches = result.match(/^LinkedIn:/gm);
    expect(matches?.length).toBe(1);
  });
});

// ─── Unit tests: buildLinkedInBlock ──────────────────────────────────────────
describe("buildLinkedInBlock", () => {
  it("G) with URL → returns instruction block containing the URL", () => {
    const block = buildLinkedInBlock("https://linkedin.com/in/erick-tran");
    expect(block).toContain("https://linkedin.com/in/erick-tran");
    expect(block).toContain("linkedin_dm");
    // Block mentions recruiter_email only in a "Do NOT" instruction (correct)
    expect(block).toContain("Do NOT add a LinkedIn: line to recruiter_email");
    // Block should NOT instruct adding LinkedIn: line to recruiter_email
    expect(block).not.toMatch(/For the recruiter_email.*LinkedIn/);
  });

  it("H) without URL → returns empty string", () => {
    expect(buildLinkedInBlock(null)).toBe("");
    expect(buildLinkedInBlock(undefined)).toBe("");
    expect(buildLinkedInBlock("")).toBe("");
    expect(buildLinkedInBlock("  ")).toBe("");
  });
});

// ─── Integration tests: generatePack ─────────────────────────────────────────
describe("generatePack LinkedIn URL injection", () => {
  it("I) with contactId that has linkedinUrl → linkedin_dm starts with LinkedIn:", async () => {
    getContactByIdSpy.mockResolvedValue({
      id: 20,
      userId: 11,
      jobCardId: 11,
      name: "Erick Tran",
      email: null,
      linkedinUrl: "https://linkedin.com/in/erick-tran",
      role: null,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const caller = appRouter.createCaller(makeCtx(makeUser()));
    const result = await caller.outreach.generatePack({ jobCardId: 11, contactId: 20 });

    expect(result.linkedin_dm).toMatch(/^LinkedIn: https:\/\/linkedin\.com\/in\/erick-tran/);
    expect(result.linkedin_dm).not.toContain("[LinkedIn Profile URL]");
  });

  it("J) with contactId that has no linkedinUrl → no LinkedIn: line, no placeholder", async () => {
    getContactByIdSpy.mockResolvedValue({
      id: 21,
      userId: 11,
      jobCardId: 11,
      name: "Jane Smith",
      email: null,
      linkedinUrl: null,
      role: null,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const caller = appRouter.createCaller(makeCtx(makeUser()));
    const result = await caller.outreach.generatePack({ jobCardId: 11, contactId: 21 });

    expect(result.linkedin_dm).not.toMatch(/^LinkedIn:/);
    expect(result.linkedin_dm).not.toContain("[LinkedIn Profile URL]");
  });

  it("K) no contactId → no LinkedIn: line, no placeholder", async () => {
    const caller = appRouter.createCaller(makeCtx(makeUser()));
    const result = await caller.outreach.generatePack({ jobCardId: 11 });

    expect(result.linkedin_dm).not.toMatch(/^LinkedIn:/);
    expect(result.linkedin_dm).not.toContain("[LinkedIn Profile URL]");
  });
});

// ─── Integration tests: Admin sandbox generateOutreachTestMode ────────────────
describe("generateOutreachTestMode LinkedIn URL injection", () => {
  const adminLogTestRunSpy = vi.spyOn(db, "adminLogTestRun");
  const logAdminActionSpy = vi.spyOn(db, "logAdminAction");

  beforeEach(() => {
    adminLogTestRunSpy.mockResolvedValue(undefined as any);
    logAdminActionSpy.mockResolvedValue(undefined as any);
  });

  it("L) with contactLinkedInUrl → LinkedIn: line present in linkedin_dm", async () => {
    const caller = appRouter.createCaller(makeCtx(makeAdminUser()));
    const result = await caller.admin.sandbox.generateOutreachTestMode({
      jobCardId: 11,
      contactLinkedInUrl: "https://linkedin.com/in/erick-tran",
    });

    expect(result.linkedin_dm).toMatch(/^LinkedIn: https:\/\/linkedin\.com\/in\/erick-tran/);
    expect(result.linkedin_dm).not.toContain("[LinkedIn Profile URL]");
  });

  it("M) without contactLinkedInUrl → no LinkedIn: line, no placeholder", async () => {
    const caller = appRouter.createCaller(makeCtx(makeAdminUser()));
    const result = await caller.admin.sandbox.generateOutreachTestMode({
      jobCardId: 11,
    });

    expect(result.linkedin_dm).not.toMatch(/^LinkedIn:/);
    expect(result.linkedin_dm).not.toContain("[LinkedIn Profile URL]");
  });
});

// ─── Regression: other fields unaffected ─────────────────────────────────────
describe("Fix 3/4 regression: other fields unaffected", () => {
  const adminLogTestRunSpy = vi.spyOn(db, "adminLogTestRun");
  const logAdminActionSpy = vi.spyOn(db, "logAdminAction");

  beforeEach(() => {
    adminLogTestRunSpy.mockResolvedValue(undefined as any);
    logAdminActionSpy.mockResolvedValue(undefined as any);
  });

  it("N) recruiter_email does not contain LinkedIn: line when URL provided", async () => {
    getContactByIdSpy.mockResolvedValue({
      id: 22,
      userId: 11,
      jobCardId: 11,
      name: "Erick Tran",
      email: null,
      linkedinUrl: "https://linkedin.com/in/erick-tran",
      role: null,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const caller = appRouter.createCaller(makeCtx(makeUser()));
    const result = await caller.outreach.generatePack({ jobCardId: 11, contactId: 22 });

    // LinkedIn: line should NOT appear in recruiter_email
    expect(result.recruiter_email).not.toMatch(/^LinkedIn:/m);
  });

  it("O) follow_up_1 and follow_up_2 do not contain LinkedIn: line", async () => {
    getContactByIdSpy.mockResolvedValue({
      id: 23,
      userId: 11,
      jobCardId: 11,
      name: "Erick Tran",
      email: null,
      linkedinUrl: "https://linkedin.com/in/erick-tran",
      role: null,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const caller = appRouter.createCaller(makeCtx(makeUser()));
    const result = await caller.outreach.generatePack({ jobCardId: 11, contactId: 23 });

    expect(result.follow_up_1).not.toMatch(/^LinkedIn:/m);
    expect(result.follow_up_2).not.toMatch(/^LinkedIn:/m);
  });
});
