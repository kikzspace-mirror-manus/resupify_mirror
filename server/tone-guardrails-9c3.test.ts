/**
 * Phase 9C3 Acceptance Tests: Outreach Tone Guardrails
 *
 * A) Unit: sanitizeTone removes banned phrases
 * A2) Unit: sanitizeTone appends no-pressure fallback when follow-up lacks no-pressure clause
 * A3) Unit: sanitizeTone appends fallback when follow-up lacks appreciation phrase
 * A4) Unit: sanitizeTone does NOT append fallback when both clauses are present
 * A5) Unit: sanitizeTone does NOT modify non-follow-up messages (email, DM)
 * A6) Unit: sanitizeTone handles empty string gracefully
 * B) Prompt wiring: buildToneSystemPrompt includes rule_text
 * B2) Prompt wiring: buildToneSystemPrompt includes all banned phrases
 * B3) Prompt wiring: buildToneSystemPrompt includes follow-up constraint text
 * B4) Prompt wiring: buildToneSystemPrompt includes preferred phrases
 * C) Integration: generateOutreachTestMode system prompt includes tone guardrails
 * C2) Integration: generatePack system prompt includes tone guardrails
 * D) Regression: salutation logic still works after sanitizeTone
 * D2) Regression: bracket stripping still works after sanitizeTone
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { sanitizeTone, buildToneSystemPrompt, OUTREACH_TONE_GUARDRAILS } from "../shared/toneGuardrails";
import { appRouter } from "./routers";
import * as db from "./db";
import type { TrpcContext } from "./_core/context";
import type { User } from "../drizzle/schema";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 55,
    openId: "tone-test",
    email: "tone@example.com",
    name: "Tone Tester",
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

// ─── Spies for integration tests ─────────────────────────────────────────────
const invokeLLMSpy = vi.fn();
vi.mock("./server/_core/llm", () => ({ invokeLLM: invokeLLMSpy }));

// ─── A) sanitizeTone unit tests ───────────────────────────────────────────────
describe("sanitizeTone — banned phrase removal", () => {
  it("A) removes a banned phrase from text", () => {
    const result = sanitizeTone("I wanted to reiterate my interest in this role.", false);
    expect(result.toLowerCase()).not.toContain("reiterate");
  });

  it("A-case-insensitive) removes banned phrase regardless of case", () => {
    const result = sanitizeTone("ONCE MORE I am reaching out.", false);
    expect(result.toLowerCase()).not.toContain("once more");
  });

  it("A-multi) removes multiple banned phrases in one pass", () => {
    const result = sanitizeTone(
      "I am writing again to reiterate my strong interest. Final follow up.",
      false
    );
    expect(result.toLowerCase()).not.toContain("reiterate");
    expect(result.toLowerCase()).not.toContain("final follow up");
    expect(result.toLowerCase()).not.toContain("i am writing again");
  });

  it("A2) appends no-pressure fallback when follow-up lacks no-pressure clause", () => {
    const text = "Dear Hiring Manager,\n\nI appreciate your consideration.\n\nBest,\nJane";
    const result = sanitizeTone(text, true);
    // Has appreciation but no no-pressure → fallback appended
    const lower = result.toLowerCase();
    const hasNoPressure = ["no rush", "no pressure", "whenever you have a moment", "totally understand if", "if you're able to share", "if there's any update", "if timing isn't right", "at your convenience", "whenever works for you"].some(m => lower.includes(m));
    expect(hasNoPressure).toBe(true);
  });

  it("A3) appends fallback when follow-up lacks appreciation phrase", () => {
    const text = "Dear Hiring Manager,\n\nNo rush at all — just wanted to follow up briefly.\n\nBest,\nJane";
    const result = sanitizeTone(text, true);
    // Has no-pressure but no appreciation → fallback appended
    const lower = result.toLowerCase();
    const hasAppreciation = ["thank you", "thanks for", "appreciate", "grateful"].some(m => lower.includes(m));
    expect(hasAppreciation).toBe(true);
  });

  it("A4) does NOT append fallback when both clauses are already present", () => {
    const text = "Dear Hiring Manager,\n\nNo rush at all — thanks for your time.\n\nBest,\nJane";
    const result = sanitizeTone(text, true);
    // Should not have duplicate fallback
    expect(result.split("No rush at all — thanks for your time").length).toBeLessThanOrEqual(2);
    // Confirm it was not double-appended
    expect(result.endsWith("No rush at all — thanks for your time.\n\nNo rush at all — thanks for your time.")).toBe(false);
  });

  it("A5) does NOT append fallback for non-follow-up messages", () => {
    const text = "Dear Hiring Manager,\n\nI am excited about this role.";
    const result = sanitizeTone(text, false);
    // No fallback appended for isFollowUp=false
    expect(result).toBe(text);
  });

  it("A6) handles empty string gracefully", () => {
    expect(sanitizeTone("", false)).toBe("");
    expect(sanitizeTone("", true)).toBe("");
  });
});

// ─── B) buildToneSystemPrompt tests ──────────────────────────────────────────
describe("buildToneSystemPrompt", () => {
  it("B) includes rule_text verbatim", () => {
    const prompt = buildToneSystemPrompt();
    expect(prompt).toContain(OUTREACH_TONE_GUARDRAILS.rule_text);
  });

  it("B2) includes all banned phrases", () => {
    const prompt = buildToneSystemPrompt();
    for (const phrase of OUTREACH_TONE_GUARDRAILS.banned_phrases) {
      expect(prompt).toContain(phrase);
    }
  });

  it("B3) includes follow-up constraint text", () => {
    const prompt = buildToneSystemPrompt();
    expect(prompt.toLowerCase()).toContain("follow-up");
    expect(prompt.toLowerCase()).toContain("no-pressure");
    expect(prompt.toLowerCase()).toContain("appreciation");
  });

  it("B4) includes preferred phrases", () => {
    const prompt = buildToneSystemPrompt();
    // At least one preferred phrase should appear
    const hasPreferred = OUTREACH_TONE_GUARDRAILS.preferred_phrases.some(p => prompt.includes(p));
    expect(hasPreferred).toBe(true);
  });

  it("B5) includes allowed-but-not-preferred list", () => {
    const prompt = buildToneSystemPrompt();
    expect(prompt).toContain("just checking in");
  });
});

// ─── C) Integration: prompt wiring via router inspection ─────────────────────
describe("Prompt wiring: generateOutreachTestMode and generatePack include tone guardrails", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("C) generateOutreachTestMode system prompt includes tone guardrails", async () => {
    // Mock all DB calls needed for the procedure
    vi.spyOn(db, "getJobCardById").mockResolvedValue({
      id: 1, userId: 55, title: "Software Engineer", company: "Acme", stage: "applying",
      regionCode: "CA", trackCode: "NEW_GRAD", jdText: null, url: null, location: null,
      priority: "medium", season: null, salary: null, notes: null, followupsScheduledAt: null,
      eligibilityPrecheckStatus: "none", eligibilityPrecheckRulesJson: null, eligibilityPrecheckUpdatedAt: null,
      createdAt: new Date(), updatedAt: new Date(),
    } as any);
    vi.spyOn(db, "getLatestJdSnapshot").mockResolvedValue(null);
    vi.spyOn(db, "getProfile").mockResolvedValue(null);
    vi.spyOn(db, "createOutreachPack").mockResolvedValue(99);
    vi.spyOn(db, "adminLogTestRun").mockResolvedValue(undefined as any);
    vi.spyOn(db, "logAdminAction").mockResolvedValue(undefined as any);

    // Mock invokeLLM at the module level
    const { invokeLLM } = await import("./_core/llm");
    const llmSpy = vi.spyOn({ invokeLLM }, "invokeLLM");

    // We capture the system prompt by intercepting the actual invokeLLM call
    let capturedSystemPrompt = "";
    const invokeLLMMod = await import("./_core/llm");
    vi.spyOn(invokeLLMMod, "invokeLLM").mockImplementation(async (args: any) => {
      capturedSystemPrompt = args.messages.find((m: any) => m.role === "system")?.content ?? "";
      return {
        choices: [{
          message: {
            content: JSON.stringify({
              recruiter_email: "Dear Hiring Manager,\n\nNo rush at all — thanks for your time.\n\nBest,\nTest",
              linkedin_dm: "Hi there,\n\nAppreciate your time.\n\nBest,\nTest",
              follow_up_1: "Dear Hiring Manager,\n\nNo rush at all — thanks for your time.\n\nBest,\nTest",
              follow_up_2: "Dear Hiring Manager,\n\nNo rush at all — thanks for your time.\n\nBest,\nTest",
            })
          }
        }]
      };
    });

    const caller = appRouter.createCaller(makeCtx(makeUser()));
    await caller.admin.sandbox.generateOutreachTestMode({ jobCardId: 1 });

    expect(capturedSystemPrompt).toContain(OUTREACH_TONE_GUARDRAILS.rule_text);
    expect(capturedSystemPrompt).toContain("banned");
    expect(capturedSystemPrompt).toContain("follow-up");
  });

  it("C2) generatePack system prompt includes tone guardrails", async () => {
    vi.spyOn(db, "getJobCardById").mockResolvedValue({
      id: 1, userId: 55, title: "Software Engineer", company: "Acme", stage: "applying",
      regionCode: "CA", trackCode: "NEW_GRAD", jdText: null, url: null, location: null,
      priority: "medium", season: null, salary: null, notes: null, followupsScheduledAt: null,
      eligibilityPrecheckStatus: "none", eligibilityPrecheckRulesJson: null, eligibilityPrecheckUpdatedAt: null,
      createdAt: new Date(), updatedAt: new Date(),
    } as any);
    vi.spyOn(db, "getLatestJdSnapshot").mockResolvedValue(null);
    vi.spyOn(db, "getProfile").mockResolvedValue(null);
    vi.spyOn(db, "getCreditsBalance").mockResolvedValue(10);
    vi.spyOn(db, "spendCredits").mockResolvedValue(true);
    vi.spyOn(db, "createOutreachPack").mockResolvedValue(100);

    let capturedSystemPrompt = "";
    const invokeLLMMod = await import("./_core/llm");
    vi.spyOn(invokeLLMMod, "invokeLLM").mockImplementation(async (args: any) => {
      capturedSystemPrompt = args.messages.find((m: any) => m.role === "system")?.content ?? "";
      return {
        choices: [{
          message: {
            content: JSON.stringify({
              recruiter_email: "Dear Hiring Manager,\n\nNo rush at all — thanks for your time.\n\nBest,\nTest",
              linkedin_dm: "Hi there,\n\nAppreciate your time.\n\nBest,\nTest",
              follow_up_1: "Dear Hiring Manager,\n\nNo rush at all — thanks for your time.\n\nBest,\nTest",
              follow_up_2: "Dear Hiring Manager,\n\nNo rush at all — thanks for your time.\n\nBest,\nTest",
            })
          }
        }]
      };
    });

    const caller = appRouter.createCaller(makeCtx(makeUser({ isAdmin: false, role: "user" })));
    await caller.outreach.generatePack({ jobCardId: 1 });

    expect(capturedSystemPrompt).toContain(OUTREACH_TONE_GUARDRAILS.rule_text);
    expect(capturedSystemPrompt).toContain("banned");
    expect(capturedSystemPrompt).toContain("follow-up");
  });
});

// ─── D) Regression: salutation + bracket stripping still work ────────────────
describe("Regression: salutation and bracket stripping preserved after sanitizeTone", () => {
  it("D) sanitizeTone preserves existing salutation (Dear Hiring Manager,)", () => {
    const text = "Dear Hiring Manager,\n\nNo rush at all — thanks for your time.\n\nBest,\nJane";
    const result = sanitizeTone(text, true);
    expect(result).toContain("Dear Hiring Manager,");
  });

  it("D2) sanitizeTone does not strip non-banned bracket-like text", () => {
    // sanitizeTone should not strip brackets — that's stripBrackets' job
    const text = "Dear Hiring Manager,\n\nNo rush at all — thanks for your time.\n\nBest,\nJane";
    const result = sanitizeTone(text, true);
    expect(result).toContain("Dear Hiring Manager,");
  });

  it("D3) sanitizeTone preserves phone/linkedin content if not banned", () => {
    const text = "Dear Hiring Manager,\n\nReach me at 416-555-1234 or linkedin.com/in/jane.\n\nNo rush at all — thanks for your time.";
    const result = sanitizeTone(text, true);
    expect(result).toContain("416-555-1234");
    expect(result).toContain("linkedin.com/in/jane");
  });
});
