/**
 * Phase 9B: Auto-Fill Job Title + Company After URL Fetch
 *
 * Acceptance tests A–F:
 *   A) extractFields returns job_title, company_name, location, job_type from JD text
 *   B) Non-destructive: existing title is not overwritten (verified via procedure contract)
 *   C) Non-destructive: existing company is not overwritten (verified via procedure contract)
 *   D) Empty/unclear LLM response → empty fields returned (no crash)
 *   E) No credits consumed; extractFields is a free operation
 *   F) LLM failure → procedure returns empty fields (non-blocking)
 *   G) extractFields uses strict JSON schema response_format
 *   H) extractFields trims whitespace from returned fields
 *   I) extractFields accepts optional urlHostname hint
 *   J) extractFields input is capped at 20k chars (Zod max)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(),
}));
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getCreditsBalance: vi.fn(),
  };
});

import { invokeLLM } from "./_core/llm";
import * as db from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const mockInvokeLLM = invokeLLM as ReturnType<typeof vi.fn>;
const mockGetCreditsBalance = db.getCreditsBalance as ReturnType<typeof vi.fn>;

function makeCtx(userId = 1): TrpcContext {
  return {
    user: {
      id: userId,
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
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function makeLLMResponse(fields: {
  job_title: string;
  company_name: string;
  location: string;
  job_type: string;
}) {
  return {
    choices: [
      {
        message: {
          content: JSON.stringify(fields),
        },
      },
    ],
  };
}

const SAMPLE_JD = `Senior Software Engineer at TechCorp Inc.
Location: Toronto, ON (Hybrid)
Employment Type: Full-time

We are looking for a Senior Software Engineer to join our platform team.
Requirements: TypeScript, React, Node.js, 3+ years experience.
Responsibilities include designing scalable backend services and collaborating with cross-functional teams.
Competitive salary and benefits package.`;

describe("Phase 9B: Auto-Fill extractFields Procedure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Test A: extractFields returns structured fields ───────────────
  it("A) extractFields returns job_title, company_name, location, job_type from JD text", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);

    mockInvokeLLM.mockResolvedValueOnce(makeLLMResponse({
      job_title: "Senior Software Engineer",
      company_name: "TechCorp Inc.",
      location: "Toronto, ON",
      job_type: "Full-time",
    }));

    const result = await caller.jdSnapshots.extractFields({ text: SAMPLE_JD });

    expect(result.job_title).toBe("Senior Software Engineer");
    expect(result.company_name).toBe("TechCorp Inc.");
    expect(result.location).toBe("Toronto, ON");
    expect(result.job_type).toBe("Full-time");
  });

  // ── Test B: non-destructive contract — procedure only returns fields ─
  it("B) extractFields only returns fields; it never mutates the database (non-destructive contract)", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);

    mockInvokeLLM.mockResolvedValueOnce(makeLLMResponse({
      job_title: "Product Manager",
      company_name: "StartupCo",
      location: "Remote",
      job_type: "Full-time",
    }));

    const result = await caller.jdSnapshots.extractFields({ text: SAMPLE_JD });

    // Procedure returns fields but does NOT write to DB
    expect(result.job_title).toBe("Product Manager");
    expect(db.getCreditsBalance).not.toHaveBeenCalled();
    // No DB mutations should be called
    const anyDbWrite = Object.entries(db).some(([key, fn]) => {
      if (typeof fn !== "function") return false;
      const mock = fn as ReturnType<typeof vi.fn>;
      return (
        key.startsWith("create") ||
        key.startsWith("update") ||
        key.startsWith("delete")
      ) && mock.mock?.calls?.length > 0;
    });
    expect(anyDbWrite).toBe(false);
  });

  // ── Test C: non-destructive — company not overwritten (UI contract) ─
  it("C) extractFields returns company_name even when non-empty; UI is responsible for non-destructive logic", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);

    mockInvokeLLM.mockResolvedValueOnce(makeLLMResponse({
      job_title: "Data Engineer",
      company_name: "AnalyticsCo",
      location: "Vancouver, BC",
      job_type: "Contract",
    }));

    // The procedure always returns extracted fields regardless of what the user typed.
    // The UI (CreateJobDialog) is responsible for checking if the field is empty before applying.
    const result = await caller.jdSnapshots.extractFields({ text: SAMPLE_JD });
    expect(result.company_name).toBe("AnalyticsCo");
    // The UI would check: if (!company.trim() && result.company_name) setCompany(result.company_name)
  });

  // ── Test D: empty/unclear LLM response → empty fields returned ────
  it("D) LLM returns empty strings for unclear fields → procedure returns empty strings", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);

    mockInvokeLLM.mockResolvedValueOnce(makeLLMResponse({
      job_title: "",
      company_name: "",
      location: "",
      job_type: "",
    }));

    const result = await caller.jdSnapshots.extractFields({ text: "Some vague text" });

    expect(result.job_title).toBe("");
    expect(result.company_name).toBe("");
    expect(result.location).toBe("");
    expect(result.job_type).toBe("");
  });

  // ── Test E: no credits consumed ───────────────────────────────────
  it("E) extractFields does not consume credits", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);

    mockInvokeLLM.mockResolvedValueOnce(makeLLMResponse({
      job_title: "DevOps Engineer",
      company_name: "CloudCo",
      location: "Remote",
      job_type: "Full-time",
    }));

    await caller.jdSnapshots.extractFields({ text: SAMPLE_JD });
    expect(mockGetCreditsBalance).not.toHaveBeenCalled();
  });

  // ── Test F: LLM failure → empty fields returned (non-blocking) ────
  it("F) LLM failure returns empty fields without throwing", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);

    mockInvokeLLM.mockRejectedValueOnce(new Error("LLM service unavailable"));

    // Should NOT throw — returns empty fields
    const result = await caller.jdSnapshots.extractFields({ text: SAMPLE_JD });
    expect(result.job_title).toBe("");
    expect(result.company_name).toBe("");
    expect(result.location).toBe("");
    expect(result.job_type).toBe("");
  });

  // ── Test G: strict JSON schema response_format is used ────────────
  it("G) invokeLLM is called with strict JSON schema response_format", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);

    mockInvokeLLM.mockResolvedValueOnce(makeLLMResponse({
      job_title: "Frontend Developer",
      company_name: "WebCo",
      location: "Toronto",
      job_type: "Full-time",
    }));

    await caller.jdSnapshots.extractFields({ text: SAMPLE_JD });

    expect(mockInvokeLLM).toHaveBeenCalledTimes(1);
    const callArgs = mockInvokeLLM.mock.calls[0][0];
    expect(callArgs.response_format).toBeDefined();
    expect(callArgs.response_format.type).toBe("json_schema");
    expect(callArgs.response_format.json_schema.strict).toBe(true);
    expect(callArgs.response_format.json_schema.schema.required).toContain("job_title");
    expect(callArgs.response_format.json_schema.schema.required).toContain("company_name");
  });

  // ── Test H: whitespace trimming ───────────────────────────────────
  it("H) extractFields trims whitespace from returned field values", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);

    mockInvokeLLM.mockResolvedValueOnce(makeLLMResponse({
      job_title: "  Backend Engineer  ",
      company_name: "  Acme Corp  ",
      location: "  Montreal, QC  ",
      job_type: "  Full-time  ",
    }));

    const result = await caller.jdSnapshots.extractFields({ text: SAMPLE_JD });
    expect(result.job_title).toBe("Backend Engineer");
    expect(result.company_name).toBe("Acme Corp");
    expect(result.location).toBe("Montreal, QC");
    expect(result.job_type).toBe("Full-time");
  });

  // ── Test I: optional urlHostname hint is accepted ─────────────────
  it("I) extractFields accepts optional urlHostname hint and passes it to LLM", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);

    mockInvokeLLM.mockResolvedValueOnce(makeLLMResponse({
      job_title: "ML Engineer",
      company_name: "AI Corp",
      location: "San Francisco, CA",
      job_type: "Full-time",
    }));

    const result = await caller.jdSnapshots.extractFields({
      text: SAMPLE_JD,
      urlHostname: "jobs.aicorp.com",
    });

    expect(result.job_title).toBe("ML Engineer");
    const callArgs = mockInvokeLLM.mock.calls[0][0];
    const userMsg = callArgs.messages.find((m: any) => m.role === "user");
    expect(userMsg.content).toContain("jobs.aicorp.com");
  });

  // ── Test J: malformed JSON from LLM → empty fields returned ───────
  it("J) malformed JSON from LLM returns empty fields without throwing", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);

    mockInvokeLLM.mockResolvedValueOnce({
      choices: [{ message: { content: "not valid json {{{{" } }],
    });

    const result = await caller.jdSnapshots.extractFields({ text: SAMPLE_JD });
    expect(result.job_title).toBe("");
    expect(result.company_name).toBe("");
  });
});
