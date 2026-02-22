/**
 * shared/eligibilityPrecheck.ts
 *
 * Pure helper for eligibility pre-check on Job Card creation / JD Snapshot save.
 * No credits, no LLM, no role_fit penalties — those remain in the Evidence+ATS pipeline.
 *
 * Returns:
 *   status: "none" | "recommended" | "conflict"
 *   triggeredRules: Array<{ ruleId: string; title: string }>
 */

export interface PrecheckProfile {
  workStatus?: string | null;
  needsSponsorship?: string | null;
  countryOfResidence?: string | null;
}

export interface PrecheckRule {
  id: string;
  label: string;
  triggerPhrases: string[];
  condition: string;
}

export interface PrecheckResult {
  status: "none" | "recommended" | "conflict";
  triggeredRules: Array<{ ruleId: string; title: string }>;
}

/**
 * Run a lightweight eligibility pre-check against JD text.
 *
 * - "conflict": a rule triggered AND the profile explicitly conflicts with the condition
 * - "recommended": a rule triggered but profile is unknown/missing (no hard conflict)
 * - "none": no trigger phrases found in JD
 */
export function runEligibilityPrecheck(
  jdText: string,
  profile: PrecheckProfile | null | undefined,
  rules: PrecheckRule[]
): PrecheckResult {
  if (!jdText || !rules || rules.length === 0) {
    return { status: "none", triggeredRules: [] };
  }

  const jdLower = jdText.toLowerCase();
  const triggeredRules: Array<{ ruleId: string; title: string }> = [];
  let hasConflict = false;

  for (const rule of rules) {
    // Check if any trigger phrase appears in the JD
    const triggered = rule.triggerPhrases.some((phrase) =>
      jdLower.includes(phrase.toLowerCase())
    );
    if (!triggered) continue;

    triggeredRules.push({ ruleId: rule.id, title: rule.label });

    // Evaluate whether the profile creates a hard conflict
    const workStatus = profile?.workStatus ?? "unknown";
    const needsSponsorship = profile?.needsSponsorship ?? "unknown";
    const countryOfResidence = profile?.countryOfResidence ?? null;

    let conflict = false;
    if (rule.condition === "work_status != citizen_pr") {
      // Hard conflict only if explicitly set to temporary_resident (not unknown)
      conflict = workStatus === "temporary_resident";
    } else if (rule.condition === "needs_sponsorship == true") {
      // Hard conflict only if explicitly true
      conflict = needsSponsorship === "true";
    } else if (rule.condition === "work_status == unknown") {
      // This rule is about uncertainty — never a hard conflict, always recommended
      conflict = false;
    } else if (rule.condition === "country_of_residence != Canada") {
      // Hard conflict only if country is explicitly set and is not Canada
      conflict =
        countryOfResidence !== null &&
        countryOfResidence.toLowerCase() !== "canada";
    }

    if (conflict) {
      hasConflict = true;
    }
  }

  if (triggeredRules.length === 0) {
    return { status: "none", triggeredRules: [] };
  }

  return {
    status: hasConflict ? "conflict" : "recommended",
    triggeredRules,
  };
}
