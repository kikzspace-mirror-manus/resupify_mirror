/**
 * Acceptance tests for Patch 6A: Outreach Generate Pack
 *
 * Tests cover:
 * A) generatePack requires authentication
 * B) generatePack is blocked for disabled users
 * C) generatePack throws on insufficient credits
 * D) generatePack calls spendCredits exactly once on success
 * E) generatePack returns all 4 message fields
 * F) Credit charging behavior: spendCredits called with correct args
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
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

// ─── Context factories ────────────────────────────────────────────────────────

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 7,
    openId: "test-user-outreach",
    email: "outreach@example.com",
    name: "Outreach Tester",
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

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("outreach.generatePack", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("A) requires authentication — unauthenticated user is blocked", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    await expect(caller.outreach.generatePack({ jobCardId: 1 })).rejects.toThrow();
    expect(getCreditsBalanceSpy).not.toHaveBeenCalled();
  });

  it("B) disabled user is blocked before credit check", async () => {
    const caller = appRouter.createCaller(makeCtx(makeUser({ disabled: true })));
    await expect(caller.outreach.generatePack({ jobCardId: 1 })).rejects.toThrow();
    expect(getCreditsBalanceSpy).not.toHaveBeenCalled();
  });

  it("C) throws 'Insufficient credits' when balance is 0", async () => {
    getCreditsBalanceSpy.mockResolvedValueOnce(0);
    const caller = appRouter.createCaller(makeCtx(makeUser()));

    await expect(caller.outreach.generatePack({ jobCardId: 1 })).rejects.toThrow(
      "Insufficient credits"
    );
    expect(spendCreditsSpy).not.toHaveBeenCalled();
  });

  it("C2) throws 'Insufficient credits' when balance is negative", async () => {
    getCreditsBalanceSpy.mockResolvedValueOnce(-5);
    const caller = appRouter.createCaller(makeCtx(makeUser()));

    await expect(caller.outreach.generatePack({ jobCardId: 1 })).rejects.toThrow(
      "Insufficient credits"
    );
  });

  it("D) spendCredits is called exactly once with 1 credit on success", async () => {
    getCreditsBalanceSpy.mockResolvedValueOnce(5);
    getJobCardByIdSpy.mockResolvedValueOnce({
      id: 1, title: "SWE Intern", company: "Acme", userId: 7,
      pipelineStage: "applied", notes: null, salaryMin: null, salaryMax: null,
      location: null, jobUrl: null, createdAt: new Date(), updatedAt: new Date(),
      followupsScheduledAt: null,
    } as any);
    getLatestJdSnapshotSpy.mockResolvedValueOnce(null);
    getProfileSpy.mockResolvedValueOnce(null);
    spendCreditsSpy.mockResolvedValueOnce(true);
    createOutreachPackSpy.mockResolvedValueOnce(99);

    // Mock the LLM call via the invokeLLM module
    const llmModule = await import("./_core/llm");
    vi.spyOn(llmModule, "invokeLLM").mockResolvedValueOnce({
      choices: [{
        message: {
          content: JSON.stringify({
            recruiter_email: "Hi, I am interested in the SWE Intern role.",
            linkedin_dm: "Hi, I noticed your posting for SWE Intern.",
            follow_up_1: "Following up on my application.",
            follow_up_2: "Just checking in again.",
          })
        }
      }]
    } as any);

    const caller = appRouter.createCaller(makeCtx(makeUser()));
    const result = await caller.outreach.generatePack({ jobCardId: 1 });

    expect(spendCreditsSpy).toHaveBeenCalledOnce();
    expect(spendCreditsSpy).toHaveBeenCalledWith(7, 1, "Outreach Pack generation", "outreach_pack");
    expect(result.id).toBe(99);
  });

  it("E) returns all 4 message fields on success", async () => {
    getCreditsBalanceSpy.mockResolvedValueOnce(3);
    getJobCardByIdSpy.mockResolvedValueOnce({
      id: 2, title: "PM Co-op", company: "Beta Corp", userId: 7,
      pipelineStage: "applying", notes: null, salaryMin: null, salaryMax: null,
      location: null, jobUrl: null, createdAt: new Date(), updatedAt: new Date(),
      followupsScheduledAt: null,
    } as any);
    getLatestJdSnapshotSpy.mockResolvedValueOnce(null);
    getProfileSpy.mockResolvedValueOnce(null);
    spendCreditsSpy.mockResolvedValueOnce(true);
    createOutreachPackSpy.mockResolvedValueOnce(100);

    const llmModule = await import("./_core/llm");
    vi.spyOn(llmModule, "invokeLLM").mockResolvedValueOnce({
      choices: [{
        message: {
          content: JSON.stringify({
            recruiter_email: "Email body",
            linkedin_dm: "LinkedIn body",
            follow_up_1: "Follow-up 1 body",
            follow_up_2: "Follow-up 2 body",
          })
        }
      }]
    } as any);

    const caller = appRouter.createCaller(makeCtx(makeUser()));
    const result = await caller.outreach.generatePack({ jobCardId: 2 });

    expect(result.recruiter_email).toBe("Email body");
    expect(result.linkedin_dm).toBe("LinkedIn body");
    expect(result.follow_up_1).toBe("Follow-up 1 body");
    expect(result.follow_up_2).toBe("Follow-up 2 body");
  });

  it("F) credit charge uses correct reason string (no breaking change)", async () => {
    getCreditsBalanceSpy.mockResolvedValueOnce(10);
    getJobCardByIdSpy.mockResolvedValueOnce({
      id: 3, title: "Data Analyst", company: "Gamma", userId: 7,
      pipelineStage: "bookmarked", notes: null, salaryMin: null, salaryMax: null,
      location: null, jobUrl: null, createdAt: new Date(), updatedAt: new Date(),
      followupsScheduledAt: null,
    } as any);
    getLatestJdSnapshotSpy.mockResolvedValueOnce(null);
    getProfileSpy.mockResolvedValueOnce(null);
    spendCreditsSpy.mockResolvedValueOnce(true);
    createOutreachPackSpy.mockResolvedValueOnce(101);

    const llmModule = await import("./_core/llm");
    vi.spyOn(llmModule, "invokeLLM").mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify({
        recruiter_email: "e", linkedin_dm: "l", follow_up_1: "f1", follow_up_2: "f2"
      }) } }]
    } as any);

    const caller = appRouter.createCaller(makeCtx(makeUser()));
    await caller.outreach.generatePack({ jobCardId: 3 });

    // Verify exact ledger reason string — must not change (API contract)
    const [, , reason, referenceType] = spendCreditsSpy.mock.calls[0] as [number, number, string, string];
    expect(reason).toBe("Outreach Pack generation");
    expect(referenceType).toBe("outreach_pack");
  });
});
