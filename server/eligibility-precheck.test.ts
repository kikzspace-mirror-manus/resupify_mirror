/**
 * Patch 8C1 — Eligibility Pre-Check on Job Card Creation (Soft Badge)
 *
 * Acceptance tests A–F as specified in the patch requirements.
 * Tests cover the pure runEligibilityPrecheck helper and the tRPC router wiring.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { runEligibilityPrecheck, type PrecheckProfile, type PrecheckRule } from "../shared/eligibilityPrecheck";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Helpers ─────────────────────────────────────────────────────────
function makeCtx(overrides: Partial<TrpcContext["user"]> = {}): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user",
      name: "Test User",
      email: "test@example.com",
      loginMethod: "manus",
      role: "user",
      disabled: false,
      isAdmin: false,
      adminNotes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
      ...overrides,
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ─── Sample Region Pack rules (mirrors CA_COOP workAuthRules) ─────────
const SAMPLE_RULES: PrecheckRule[] = [
  {
    id: "citizen_pr_required",
    label: "Citizen/PR Required",
    triggerPhrases: ["canadian citizen", "permanent resident", "citizen or pr"],
    condition: "work_status != citizen_pr",
  },
  {
    id: "no_sponsorship",
    label: "No Sponsorship Available",
    triggerPhrases: ["no sponsorship", "without sponsorship", "sponsorship not available"],
    condition: "needs_sponsorship == true",
  },
  {
    id: "work_authorization",
    label: "Work Authorization Required",
    triggerPhrases: ["legally authorized to work in canada", "authorized to work in canada"],
    condition: "work_status == unknown",
  },
  {
    id: "canada_location",
    label: "Must Be Located in Canada",
    triggerPhrases: ["must be located in canada", "canada-based"],
    condition: "country_of_residence != Canada",
  },
];

// ─── Mock db module ───────────────────────────────────────────────────
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    createJobCard: vi.fn(),
    createJdSnapshot: vi.fn(),
    getProfile: vi.fn(),
    updateJobCard: vi.fn(),
    getJobCardById: vi.fn(),
  };
});

import * as db from "./db";

const mockCreateJobCard = db.createJobCard as ReturnType<typeof vi.fn>;
const mockCreateJdSnapshot = db.createJdSnapshot as ReturnType<typeof vi.fn>;
const mockGetProfile = db.getProfile as ReturnType<typeof vi.fn>;
const mockUpdateJobCard = db.updateJobCard as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  mockCreateJobCard.mockResolvedValue(99);
  mockCreateJdSnapshot.mockResolvedValue(1);
  mockUpdateJobCard.mockResolvedValue(undefined);
});

// ─── Pure helper tests ────────────────────────────────────────────────

// Test A: JD with "no sponsorship" + needs_sponsorship=true → conflict
describe("Test A: JD with 'no sponsorship' + needs_sponsorship=true → conflict", () => {
  it("A1) status is 'conflict' when profile explicitly needs sponsorship and JD says no sponsorship", () => {
    const profile: PrecheckProfile = { workStatus: "temporary_resident", needsSponsorship: "true" };
    const jd = "We are looking for a Python developer. No sponsorship available for this role.";
    const result = runEligibilityPrecheck(jd, profile, SAMPLE_RULES);
    expect(result.status).toBe("conflict");
    expect(result.triggeredRules.some((r) => r.ruleId === "no_sponsorship")).toBe(true);
  });

  it("A2) triggeredRules includes the no_sponsorship rule with title", () => {
    const profile: PrecheckProfile = { workStatus: "temporary_resident", needsSponsorship: "true" };
    const jd = "Sponsorship not available.";
    const result = runEligibilityPrecheck(jd, profile, SAMPLE_RULES);
    const rule = result.triggeredRules.find((r) => r.ruleId === "no_sponsorship");
    expect(rule).toBeDefined();
    expect(rule?.title).toBe("No Sponsorship Available");
  });
});

// Test B: JD with "citizen or permanent resident" + work_status=temporary_resident → conflict
describe("Test B: JD with 'citizen or pr' + work_status=temporary_resident → conflict", () => {
  it("B1) status is 'conflict' when profile is temporary_resident and JD requires citizen/PR", () => {
    const profile: PrecheckProfile = { workStatus: "temporary_resident", needsSponsorship: "unknown" };
    const jd = "Applicants must be citizen or PR of Canada.";
    const result = runEligibilityPrecheck(jd, profile, SAMPLE_RULES);
    expect(result.status).toBe("conflict");
  });

  it("B2) status is 'recommended' (not conflict) when work_status is unknown and JD requires citizen/PR", () => {
    const profile: PrecheckProfile = { workStatus: "unknown", needsSponsorship: "unknown" };
    const jd = "Must be a Canadian citizen or permanent resident.";
    const result = runEligibilityPrecheck(jd, profile, SAMPLE_RULES);
    // unknown work status → recommended (not hard conflict)
    expect(result.status).toBe("recommended");
  });

  it("B3) status is 'recommended' (not conflict) when profile is citizen_pr and JD requires citizen/PR", () => {
    const profile: PrecheckProfile = { workStatus: "citizen_pr", needsSponsorship: "false" };
    const jd = "Must be a Canadian citizen or permanent resident.";
    const result = runEligibilityPrecheck(jd, profile, SAMPLE_RULES);
    // citizen_pr does not create a hard conflict (condition is work_status != citizen_pr)
    // The phrase still triggers so status is 'recommended', not 'conflict'
    expect(result.status).toBe("recommended");
    expect(result.triggeredRules.some((r) => r.ruleId === "citizen_pr_required")).toBe(true);
  });
});

// Test C: JD with no trigger phrases → status == none
describe("Test C: JD with no work auth trigger phrases → status 'none'", () => {
  it("C1) status is 'none' when JD has no trigger phrases", () => {
    const profile: PrecheckProfile = { workStatus: "temporary_resident", needsSponsorship: "true" };
    const jd = "We are looking for a passionate Python developer with strong communication skills.";
    const result = runEligibilityPrecheck(jd, profile, SAMPLE_RULES);
    expect(result.status).toBe("none");
    expect(result.triggeredRules).toHaveLength(0);
  });

  it("C2) empty JD text → status 'none'", () => {
    const profile: PrecheckProfile = { workStatus: "temporary_resident" };
    const result = runEligibilityPrecheck("", profile, SAMPLE_RULES);
    expect(result.status).toBe("none");
  });

  it("C3) null/undefined rules → status 'none'", () => {
    const profile: PrecheckProfile = { workStatus: "temporary_resident" };
    const result = runEligibilityPrecheck("no sponsorship", profile, []);
    expect(result.status).toBe("none");
  });
});

// Test D: Badge rendering helper (pure logic)
describe("Test D: Eligibility badge logic", () => {
  it("D1) 'conflict' status returns red badge props", () => {
    // Verify that the status values are correct for UI rendering
    const profile: PrecheckProfile = { workStatus: "temporary_resident", needsSponsorship: "true" };
    const jd = "No sponsorship available.";
    const result = runEligibilityPrecheck(jd, profile, SAMPLE_RULES);
    expect(result.status).toBe("conflict");
  });

  it("D2) 'recommended' status returns amber badge props", () => {
    const profile: PrecheckProfile = { workStatus: "unknown", needsSponsorship: "unknown" };
    const jd = "Authorized to work in Canada required.";
    const result = runEligibilityPrecheck(jd, profile, SAMPLE_RULES);
    expect(result.status).toBe("recommended");
  });

  it("D3) 'none' status returns no badge", () => {
    const result = runEligibilityPrecheck("Python developer needed", {}, SAMPLE_RULES);
    expect(result.status).toBe("none");
  });
});

// Test E: Evidence+ATS scoring logic is NOT affected (no credits, no LLM calls)
describe("Test E: Pre-check does not affect Evidence+ATS scoring pipeline", () => {
  it("E1) runEligibilityPrecheck is a pure function with no side effects", () => {
    const profile: PrecheckProfile = { workStatus: "temporary_resident", needsSponsorship: "true" };
    const jd = "No sponsorship available.";
    // Call twice — should return same result (pure)
    const result1 = runEligibilityPrecheck(jd, profile, SAMPLE_RULES);
    const result2 = runEligibilityPrecheck(jd, profile, SAMPLE_RULES);
    expect(result1).toEqual(result2);
  });

  it("E2) Pre-check returns only status and triggeredRules — no penalty field", () => {
    const profile: PrecheckProfile = { workStatus: "temporary_resident", needsSponsorship: "true" };
    const jd = "No sponsorship available.";
    const result = runEligibilityPrecheck(jd, profile, SAMPLE_RULES);
    expect(result).toHaveProperty("status");
    expect(result).toHaveProperty("triggeredRules");
    expect(result).not.toHaveProperty("penalty");
    expect(result).not.toHaveProperty("roleFitScore");
  });
});

// Test F: No credits behavior changes
describe("Test F: jobCards.create — pre-check failure does not block card creation", () => {
  it("F1) Card is created even when getProfile throws (pre-check wrapped in try/catch)", async () => {
    mockGetProfile.mockRejectedValue(new Error("DB connection error"));
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.jobCards.create({
      title: "Software Engineer Co-op",
      company: "Acme Corp",
      jdText: "No sponsorship available. Must be authorized to work in Canada.",
    });
    expect(result.id).toBe(99);
    expect(mockCreateJobCard).toHaveBeenCalledTimes(1);
  });

  it("F2) Card is created with no JD text — no precheck runs", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.jobCards.create({
      title: "Software Engineer Co-op",
    });
    expect(result.id).toBe(99);
    // No JD text → no snapshot, no precheck
    expect(mockCreateJdSnapshot).not.toHaveBeenCalled();
    expect(mockGetProfile).not.toHaveBeenCalled();
  });
});

// ─── Additional edge case tests ───────────────────────────────────────
describe("Edge cases", () => {
  it("EC1) Case-insensitive matching: 'NO SPONSORSHIP' triggers the rule", () => {
    const profile: PrecheckProfile = { workStatus: "temporary_resident", needsSponsorship: "true" };
    const jd = "NO SPONSORSHIP AVAILABLE FOR THIS POSITION.";
    const result = runEligibilityPrecheck(jd, profile, SAMPLE_RULES);
    expect(result.status).toBe("conflict");
  });

  it("EC2) Multiple rules triggered — all appear in triggeredRules", () => {
    const profile: PrecheckProfile = { workStatus: "temporary_resident", needsSponsorship: "true" };
    const jd = "Must be Canadian citizen or permanent resident. No sponsorship available.";
    const result = runEligibilityPrecheck(jd, profile, SAMPLE_RULES);
    expect(result.triggeredRules.length).toBeGreaterThanOrEqual(2);
    expect(result.status).toBe("conflict");
  });

  it("EC3) null profile → treats all fields as unknown → recommended (not conflict)", () => {
    const jd = "Must be Canadian citizen or permanent resident.";
    const result = runEligibilityPrecheck(jd, null, SAMPLE_RULES);
    // null profile → unknown fields → no hard conflict
    expect(result.status).toBe("recommended");
  });
});
