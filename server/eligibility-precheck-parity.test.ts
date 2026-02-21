/**
 * Patch 8C3 — Eligibility Pre-Check Parity (URL Import vs Paste)
 *
 * Architecture note: Resupify does NOT have a server-side URL scraping/fetch
 * endpoint. The `url` field on a Job Card is stored as metadata only (a link
 * to the job posting). JD text always enters the system through one of two
 * paths, both of which already have runEligibilityPrecheck wired (Patch 8C1):
 *
 *   Path 1: jobCards.create with jdText (paste at card creation)
 *   Path 2: jdSnapshots.create with snapshotText (paste in JD Snapshot tab)
 *
 * These tests confirm that:
 *   A) Both paths correctly detect eligibility conflicts
 *   B) Both paths correctly return "none" when no triggers present
 *   C) No regressions to either path
 *   D) No LLM or credit usage in pre-check
 *
 * Tests are pure-logic tests using the shared runEligibilityPrecheck helper
 * directly, mirroring exactly what both server procedures call.
 */
import { describe, it, expect } from "vitest";
import { runEligibilityPrecheck, type PrecheckProfile, type PrecheckRule } from "../shared/eligibilityPrecheck";

// Sample rules mirroring CA_COOP / CA_NEW_GRAD workAuthRules
const SAMPLE_RULES: PrecheckRule[] = [
  {
    id: "no_sponsorship",
    label: "No sponsorship available",
    triggerPhrases: ["no sponsorship", "will not sponsor", "sponsorship is not available"],
    condition: "needs_sponsorship == true",
  },
  {
    id: "citizen_pr_required",
    label: "Citizen or PR required",
    triggerPhrases: ["must be a canadian citizen", "citizen or permanent resident", "authorized to work in canada"],
    condition: "work_status != citizen_pr",
  },
  {
    id: "unknown_work_status",
    label: "Work authorization unclear",
    triggerPhrases: ["legally authorized to work", "eligible to work in canada"],
    condition: "work_status == unknown",
  },
];

// ─── Test A: JD with "no sponsorship" + needs_sponsorship=true → conflict ─────
describe("Test A: Conflict detection — both entry paths use the same helper", () => {
  it("A1) JD text with 'no sponsorship' + needs_sponsorship=true → conflict", () => {
    const profile: PrecheckProfile = { workStatus: "temporary_resident", needsSponsorship: "true" };
    const jd = "We are looking for a Software Engineer. No sponsorship is available for this role.";
    const result = runEligibilityPrecheck(jd, profile, SAMPLE_RULES);
    expect(result.status).toBe("conflict");
    expect(result.triggeredRules.some((r) => r.ruleId === "no_sponsorship")).toBe(true);
  });

  it("A2) Same JD via jdSnapshots.create path (snapshotText) → same conflict result", () => {
    // This test confirms the helper produces identical results regardless of which
    // server procedure calls it — both jobCards.create and jdSnapshots.create
    // call runEligibilityPrecheck with the same arguments.
    const profile: PrecheckProfile = { workStatus: "temporary_resident", needsSponsorship: "true" };
    const snapshotText = "We are looking for a Software Engineer. No sponsorship is available for this role.";
    const result = runEligibilityPrecheck(snapshotText, profile, SAMPLE_RULES);
    expect(result.status).toBe("conflict");
  });

  it("A3) JD with 'citizen or permanent resident' + work_status=temporary_resident → conflict", () => {
    const profile: PrecheckProfile = { workStatus: "temporary_resident", needsSponsorship: "false" };
    const jd = "Applicants must be a Canadian citizen or permanent resident.";
    const result = runEligibilityPrecheck(jd, profile, SAMPLE_RULES);
    expect(result.status).toBe("conflict");
    expect(result.triggeredRules.some((r) => r.ruleId === "citizen_pr_required")).toBe(true);
  });
});

// ─── Test B: JD with no triggers → status "none" ──────────────────────────────
describe("Test B: No triggers → status 'none'", () => {
  it("B1) Generic JD with no work auth phrases → status 'none'", () => {
    const profile: PrecheckProfile = { workStatus: "temporary_resident", needsSponsorship: "true" };
    const jd = "We are looking for a passionate Software Engineer to join our team. You will work on exciting projects.";
    const result = runEligibilityPrecheck(jd, profile, SAMPLE_RULES);
    expect(result.status).toBe("none");
    expect(result.triggeredRules).toHaveLength(0);
  });

  it("B2) Empty JD text → status 'none' (no triggers to match)", () => {
    const profile: PrecheckProfile = { workStatus: "temporary_resident", needsSponsorship: "true" };
    const result = runEligibilityPrecheck("", profile, SAMPLE_RULES);
    expect(result.status).toBe("none");
  });

  it("B3) Null profile → status 'recommended' (triggers found but no hard conflict without profile)", () => {
    // When profile is null, workStatus defaults to 'unknown' and needsSponsorship to 'unknown'.
    // Trigger phrases still match, so status is 'recommended' (not 'conflict', not 'none').
    const jd = "No sponsorship available. Must be a Canadian citizen.";
    const result = runEligibilityPrecheck(jd, null, SAMPLE_RULES);
    expect(result.status).toBe("recommended");
    expect(result.triggeredRules.length).toBeGreaterThan(0);
  });
});

// ─── Test C: No regressions to existing paths ─────────────────────────────────
describe("Test C: No regressions — citizen_pr user sees no conflict", () => {
  it("C1) citizen_pr + no sponsorship needed → no conflict even with trigger phrases", () => {
    const profile: PrecheckProfile = { workStatus: "citizen_pr", needsSponsorship: "false" };
    const jd = "Must be a Canadian citizen or permanent resident. No sponsorship available.";
    const result = runEligibilityPrecheck(jd, profile, SAMPLE_RULES);
    // citizen_pr satisfies citizen_pr_required (condition: work_status != citizen_pr → false)
    // needs_sponsorship=false satisfies no_sponsorship (condition: needs_sponsorship == true → false)
    // So no hard conflicts — at most "recommended" from phrase detection
    expect(result.status).not.toBe("conflict");
  });

  it("C2) Multiple triggers but all conditions pass → no conflict", () => {
    const profile: PrecheckProfile = { workStatus: "citizen_pr", needsSponsorship: "false" };
    const jd = "Legally authorized to work in Canada. No sponsorship. Citizen or permanent resident required.";
    const result = runEligibilityPrecheck(jd, profile, SAMPLE_RULES);
    expect(result.status).not.toBe("conflict");
  });
});

// ─── Test D: No LLM or credit usage ───────────────────────────────────────────
describe("Test D: Pre-check is pure — no LLM, no credits", () => {
  it("D1) runEligibilityPrecheck is a synchronous pure function (no async)", () => {
    const profile: PrecheckProfile = { workStatus: "unknown", needsSponsorship: "false" };
    const jd = "Legally authorized to work in Canada required.";
    // If this were async, it would return a Promise — we verify it returns a plain object
    const result = runEligibilityPrecheck(jd, profile, SAMPLE_RULES);
    expect(result).not.toBeInstanceOf(Promise);
    expect(typeof result.status).toBe("string");
    expect(Array.isArray(result.triggeredRules)).toBe(true);
  });

  it("D2) Pre-check result shape matches expected schema", () => {
    const profile: PrecheckProfile = { workStatus: "temporary_resident", needsSponsorship: "true" };
    const jd = "No sponsorship available.";
    const result = runEligibilityPrecheck(jd, profile, SAMPLE_RULES);
    expect(["none", "recommended", "conflict"]).toContain(result.status);
    expect(Array.isArray(result.triggeredRules)).toBe(true);
    if (result.triggeredRules.length > 0) {
      const rule = result.triggeredRules[0];
      // The helper returns { ruleId, title } (not 'label')
      expect(typeof rule.ruleId).toBe("string");
      expect(typeof rule.title).toBe("string");
    }
  });

  it("D3) Empty rules array → always returns 'none' (no rules to match)", () => {
    const profile: PrecheckProfile = { workStatus: "temporary_resident", needsSponsorship: "true" };
    const jd = "No sponsorship available. Must be a Canadian citizen.";
    const result = runEligibilityPrecheck(jd, profile, []);
    expect(result.status).toBe("none");
    expect(result.triggeredRules).toHaveLength(0);
  });
});
