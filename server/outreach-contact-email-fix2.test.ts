/**
 * Acceptance tests for Outreach Fix 2/4: Contact Email → To: line
 *
 * Tests cover:
 * A) fixContactEmail: with email → prepends To: line
 * B) fixContactEmail: without email → no To: line added
 * C) fixContactEmail: strips [Recruiter Email] bracket placeholders
 * D) fixContactEmail: strips [Recruiter's Email] variant
 * E) fixContactEmail: To: line already present → not duplicated
 * F) buildContactEmailBlock: with email → returns instruction block
 * G) buildContactEmailBlock: without email → returns empty string
 * H) generatePack: with contactId that has email → recruiter_email starts with To:
 * I) generatePack: with contactId that has no email → no To: line, no placeholder
 * J) generatePack: no contactId → no To: line, no placeholder
 * K) Admin sandbox generateOutreachTestMode: with contactEmail → To: line present
 * L) Admin sandbox generateOutreachTestMode: without contactEmail → no To: line
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fixContactEmail, buildContactEmailBlock } from "../shared/outreachHelpers";
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
    id: 9,
    openId: "test-user-fix2",
    email: "fix2@example.com",
    name: "Fix2 Tester",
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

function makeJobCard() {
  return {
    id: 1, userId: 9, title: "Software Engineer", company: "Acme Corp",
    stage: "bookmarked", priority: "medium", season: "summer",
    jobType: "internship", url: null, location: null, notes: null,
    followupsScheduledAt: null, eligibilityPrecheckStatus: "none",
    eligibilityPrecheckRulesJson: null, eligibilityPrecheckUpdatedAt: null,
    createdAt: new Date(), updatedAt: new Date(),
  };
}

// ─── Unit tests: fixContactEmail ─────────────────────────────────────────────
describe("fixContactEmail (unit)", () => {
  it("A) with email — prepends To: line when not already present", () => {
    const text = "Subject: Hello\nDear Hiring Manager,\n\nBody here.";
    const result = fixContactEmail(text, "erick@company.com");
    expect(result).toMatch(/^To: erick@company\.com/);
    expect(result).toContain("Subject: Hello");
  });

  it("B) without email — returns text unchanged (no To: line)", () => {
    const text = "Subject: Hello\nDear Hiring Manager,\n\nBody here.";
    const result = fixContactEmail(text, null);
    expect(result).not.toMatch(/^To:/m);
    expect(result).toBe(text);
  });

  it("C) strips [Recruiter Email] bracket placeholder", () => {
    const text = "To: [Recruiter Email]\nSubject: Hello\nDear Hiring Manager,";
    const result = fixContactEmail(text, null);
    expect(result).not.toContain("[Recruiter Email]");
  });

  it("D) strips [Recruiter's Email] variant", () => {
    const text = "Please send to [Recruiter's Email] for consideration.";
    const result = fixContactEmail(text, null);
    expect(result).not.toContain("[Recruiter's Email]");
  });

  it("E) To: line already present — not duplicated", () => {
    const text = "To: erick@company.com\nSubject: Hello\nDear Erick,";
    const result = fixContactEmail(text, "erick@company.com");
    const matches = result.match(/^To:/gm);
    expect(matches?.length).toBe(1);
  });
});

// ─── Unit tests: buildContactEmailBlock ──────────────────────────────────────
describe("buildContactEmailBlock (unit)", () => {
  it("F) with email — returns non-empty instruction block", () => {
    const block = buildContactEmailBlock("erick@company.com");
    expect(block).toContain("erick@company.com");
    expect(block).toContain("To:");
    expect(block.length).toBeGreaterThan(20);
  });

  it("G) without email — returns empty string", () => {
    expect(buildContactEmailBlock(null)).toBe("");
    expect(buildContactEmailBlock(undefined)).toBe("");
    expect(buildContactEmailBlock("")).toBe("");
    expect(buildContactEmailBlock("   ")).toBe("");
  });
});

// ─── Integration tests: generatePack ─────────────────────────────────────────
describe("outreach.generatePack — Fix 2/4 contact email", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getJobCardByIdSpy.mockResolvedValue(makeJobCard() as any);
    getLatestJdSnapshotSpy.mockResolvedValue(null);
    getProfileSpy.mockResolvedValue(null);
    getCreditsBalanceSpy.mockResolvedValue(5);
    spendCreditsSpy.mockResolvedValue(true);
    createOutreachPackSpy.mockResolvedValue(1);
    getPersonalizationSourcesSpy.mockResolvedValue([]);
  });

  it("H) with contactId that has email — recruiter_email starts with To: line", async () => {
    getContactByIdSpy.mockResolvedValueOnce({
      id: 5, name: "Erick Tran", email: "erick@company.com", contactRole: null,
    } as any);
    const caller = appRouter.createCaller(makeCtx(makeUser()));
    const result = await caller.outreach.generatePack({ jobCardId: 1, contactId: 5 });
    expect(result.recruiter_email).toMatch(/^To: erick@company\.com/);
    expect(result.recruiter_email).not.toContain("[Recruiter Email]");
  });

  it("I) with contactId that has no email — no To: line, no placeholder", async () => {
    getContactByIdSpy.mockResolvedValueOnce({
      id: 5, name: "Erick Tran", email: null, contactRole: null,
    } as any);
    const caller = appRouter.createCaller(makeCtx(makeUser()));
    const result = await caller.outreach.generatePack({ jobCardId: 1, contactId: 5 });
    expect(result.recruiter_email).not.toMatch(/^To:/m);
    expect(result.recruiter_email).not.toContain("[Recruiter Email]");
  });

  it("J) no contactId — no To: line, no placeholder", async () => {
    const caller = appRouter.createCaller(makeCtx(makeUser()));
    const result = await caller.outreach.generatePack({ jobCardId: 1 });
    expect(result.recruiter_email).not.toMatch(/^To:/m);
    expect(result.recruiter_email).not.toContain("[Recruiter Email]");
  });
});

// ─── Integration tests: admin sandbox generateOutreachTestMode ───────────────
describe("admin.sandbox.generateOutreachTestMode — Fix 2/4 contact email", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getJobCardByIdSpy.mockResolvedValue(makeJobCard() as any);
    getLatestJdSnapshotSpy.mockResolvedValue(null);
    getProfileSpy.mockResolvedValue(null);
    getPersonalizationSourcesSpy.mockResolvedValue([]);
    vi.spyOn(db, "adminLogTestRun").mockResolvedValue(undefined);
    vi.spyOn(db, "logAdminAction").mockResolvedValue(undefined);
    createOutreachPackSpy.mockResolvedValue(1);
  });

  it("K) with contactEmail — recruiter_email starts with To: line", async () => {
    const caller = appRouter.createCaller(makeCtx(makeAdminUser()));
    const result = await caller.admin.sandbox.generateOutreachTestMode({
      jobCardId: 1,
      contactName: "Erick Tran",
      contactEmail: "erick@company.com",
    });
    expect(result.recruiter_email).toMatch(/^To: erick@company\.com/);
    expect(result.recruiter_email).not.toContain("[Recruiter Email]");
  });

  it("L) without contactEmail — no To: line, no placeholder", async () => {
    const caller = appRouter.createCaller(makeCtx(makeAdminUser()));
    const result = await caller.admin.sandbox.generateOutreachTestMode({
      jobCardId: 1,
      contactName: "Erick Tran",
    });
    expect(result.recruiter_email).not.toMatch(/^To:/m);
    expect(result.recruiter_email).not.toContain("[Recruiter Email]");
  });
});
