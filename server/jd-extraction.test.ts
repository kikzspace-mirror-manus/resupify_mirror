import { describe, it, expect, vi, beforeEach } from "vitest";
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

// ─── Mock db module ───────────────────────────────────────────────────
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getLatestJdSnapshot: vi.fn(),
    getJobCardById: vi.fn(),
    updateJobCard: vi.fn(),
    upsertRequirements: vi.fn(),
    getRequirements: vi.fn(),
  };
});

// ─── Mock LLM ────────────────────────────────────────────────────────
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

import * as db from "./db";
import { invokeLLM } from "./_core/llm";

const mockLLM = invokeLLM as ReturnType<typeof vi.fn>;
const mockGetLatest = db.getLatestJdSnapshot as ReturnType<typeof vi.fn>;
const mockGetJobCard = db.getJobCardById as ReturnType<typeof vi.fn>;
const mockUpdateJobCard = db.updateJobCard as ReturnType<typeof vi.fn>;
const mockUpsertReqs = db.upsertRequirements as ReturnType<typeof vi.fn>;
const mockGetReqs = db.getRequirements as ReturnType<typeof vi.fn>;

const SAMPLE_JD = "A".repeat(300); // 300 chars — above the 200-char minimum

const SAMPLE_LLM_RESPONSE = {
  company_name: "Acme Corp",
  job_title: "Software Engineer Intern",
  location: "Toronto, ON",
  job_type: "co-op",
  requirements: [
    { requirement_text: "Proficiency in Python", requirement_type: "skill" },
    { requirement_text: "Experience with React", requirement_type: "skill" },
    { requirement_text: "Use of Git for version control", requirement_type: "tool" },
    { requirement_text: "Write unit tests", requirement_type: "responsibility" },
    { requirement_text: "Strong communication skills", requirement_type: "softskill" },
    { requirement_text: "Must be enrolled in a co-op program", requirement_type: "eligibility" },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetJobCard.mockResolvedValue({ id: 1, company: null, title: "Untitled Job", location: null, jobType: null });
  mockUpdateJobCard.mockResolvedValue(undefined);
  mockUpsertReqs.mockResolvedValue(undefined);
  mockGetReqs.mockResolvedValue([]);
});

// ─── Tests ────────────────────────────────────────────────────────────
describe("jdSnapshots.extract", () => {
  it("A) throws if no snapshot exists for the job card", async () => {
    mockGetLatest.mockResolvedValue(null);
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.jdSnapshots.extract({ jobCardId: 1 })).rejects.toThrow(
      "No JD snapshot found"
    );
  });

  it("B) throws if snapshot text is too short (< 200 chars)", async () => {
    mockGetLatest.mockResolvedValue({ id: 1, snapshotText: "Short text", capturedAt: new Date() });
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.jdSnapshots.extract({ jobCardId: 1 })).rejects.toThrow(
      "JD too short"
    );
  });

  it("C) calls LLM and returns structured requirements on success", async () => {
    mockGetLatest.mockResolvedValue({ id: 1, snapshotText: SAMPLE_JD, capturedAt: new Date() });
    mockLLM.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(SAMPLE_LLM_RESPONSE) } }],
    });

    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.jdSnapshots.extract({ jobCardId: 1 });

    expect(result.count).toBe(6);
    expect(result.structuredFields.company_name).toBe("Acme Corp");
    expect(result.structuredFields.job_title).toBe("Software Engineer Intern");
    expect(result.requirements.some(r => r.requirementType === "eligibility")).toBe(true);
    expect(result.requirements.some(r => r.requirementType === "skill")).toBe(true);
  });

  it("D) persists requirements via upsertRequirements", async () => {
    mockGetLatest.mockResolvedValue({ id: 42, snapshotText: SAMPLE_JD, capturedAt: new Date() });
    mockLLM.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(SAMPLE_LLM_RESPONSE) } }],
    });

    const caller = appRouter.createCaller(makeCtx());
    await caller.jdSnapshots.extract({ jobCardId: 1 });

    expect(mockUpsertReqs).toHaveBeenCalledWith(
      1,
      42,
      expect.arrayContaining([
        expect.objectContaining({ requirementType: "skill" }),
        expect.objectContaining({ requirementType: "eligibility" }),
      ])
    );
  });

  it("E) updates job card structured fields when they are empty", async () => {
    mockGetLatest.mockResolvedValue({ id: 1, snapshotText: SAMPLE_JD, capturedAt: new Date() });
    mockLLM.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(SAMPLE_LLM_RESPONSE) } }],
    });

    const caller = appRouter.createCaller(makeCtx());
    await caller.jdSnapshots.extract({ jobCardId: 1 });

    expect(mockUpdateJobCard).toHaveBeenCalledWith(
      1,
      1,
      expect.objectContaining({ company: "Acme Corp", location: "Toronto, ON" })
    );
  });

  it("F) does not overwrite existing job card fields", async () => {
    mockGetJobCard.mockResolvedValue({
      id: 1,
      company: "Existing Corp",
      title: "Existing Title",
      location: "Existing Location",
      jobType: "full-time",
    });
    mockGetLatest.mockResolvedValue({ id: 1, snapshotText: SAMPLE_JD, capturedAt: new Date() });
    mockLLM.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(SAMPLE_LLM_RESPONSE) } }],
    });

    const caller = appRouter.createCaller(makeCtx());
    await caller.jdSnapshots.extract({ jobCardId: 1 });

    // updateJobCard should not be called since all fields already have values
    expect(mockUpdateJobCard).not.toHaveBeenCalled();
  });

  it("G) filters out invalid requirement_type values from LLM response", async () => {
    const dirtyResponse = {
      ...SAMPLE_LLM_RESPONSE,
      requirements: [
        ...SAMPLE_LLM_RESPONSE.requirements,
        { requirement_text: "Invalid type item", requirement_type: "unknown_type" },
      ],
    };
    mockGetLatest.mockResolvedValue({ id: 1, snapshotText: SAMPLE_JD, capturedAt: new Date() });
    mockLLM.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(dirtyResponse) } }],
    });

    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.jdSnapshots.extract({ jobCardId: 1 });

    // The invalid type item should be filtered out
    expect(result.count).toBe(6);
    expect(result.requirements.every(r =>
      ["skill", "responsibility", "tool", "softskill", "eligibility"].includes(r.requirementType)
    )).toBe(true);
  });

  it("H) throws if LLM returns no content", async () => {
    mockGetLatest.mockResolvedValue({ id: 1, snapshotText: SAMPLE_JD, capturedAt: new Date() });
    mockLLM.mockResolvedValue({ choices: [{ message: { content: null } }] });

    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.jdSnapshots.extract({ jobCardId: 1 })).rejects.toThrow(
      "LLM returned no content"
    );
  });

  it("I) blocked for disabled users", async () => {
    mockGetLatest.mockResolvedValue({ id: 1, snapshotText: SAMPLE_JD, capturedAt: new Date() });
    const caller = appRouter.createCaller(makeCtx({ disabled: true }));
    try {
      await caller.jdSnapshots.extract({ jobCardId: 1 });
      expect.fail("Should have thrown");
    } catch (err: any) {
      expect(err.message).toContain("disabled");
    }
  });
});

describe("jdSnapshots.requirements query", () => {
  it("J) returns requirements for a job card", async () => {
    const mockReqs = [
      { id: 1, jobCardId: 1, jdSnapshotId: 1, requirementText: "Python", requirementType: "skill", createdAt: new Date() },
      { id: 2, jobCardId: 1, jdSnapshotId: 1, requirementText: "React", requirementType: "tool", createdAt: new Date() },
    ];
    mockGetReqs.mockResolvedValue(mockReqs);

    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.jdSnapshots.requirements({ jobCardId: 1 });

    expect(result).toHaveLength(2);
    expect(result[0]?.requirementText).toBe("Python");
  });
});
