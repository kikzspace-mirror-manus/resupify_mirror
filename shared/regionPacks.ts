// ─── Region Pack System ──────────────────────────────────────────────
// Core engines are "pack-blind" — they only consume the injected pack.
// getRegionPack(region_code, track_code) returns all config needed.

export type EligibilityCheck = {
  field?: string;
  label: string;
  required?: boolean;
  riskMessage?: string;
  // Work authorization rules (new)
  type?: "profile_field" | "jd_trigger";
  triggerPhrases?: string[];
  condition?: string; // e.g., "work_status != citizen_pr", "needs_sponsorship == true"
  penalty?: number; // role_fit penalty
  message?: string; // guidance message
};

export type ScoringWeights = {
  eligibility: number;
  tools: number;
  responsibilities: number;
  skills: number;
  softSkills: number;
  workAuthorization?: number; // optional weight for work auth penalties
};

export type SchoolCycle = {
  name: string;
  code: string;
  months: number[]; // 0-indexed months
};

export type WorkAuthorizationRule = {
  id: string;
  label: string;
  triggerPhrases: string[];
  condition: string; // e.g., "work_status != citizen_pr"
  penalty: number;
  message: string;
};

export type WorkAuthFlags = {
  triggeredRules: string[]; // rule IDs that triggered
  totalPenalty: number;
};

export type RegionPack = {
  regionCode: string;
  trackCode: string;
  label: string;
  resumeDefaults: {
    sections: string[];
    educationFirst: boolean;
    includeObjective: boolean;
    maxPages: number;
  };
  copyRules: {
    noInventedFacts: boolean;
    needsConfirmationLabel: string;
    noExperienceHelper: boolean;
    convertProjectsToExperience: boolean;
  };
  schoolCycles: SchoolCycle[];
  eligibilityChecks: EligibilityCheck[];
  workAuthRules?: WorkAuthorizationRule[];
  scoringWeights: ScoringWeights;
  templates: {
    coverLetterStyle: string;
    outreachTone: string;
    followUpDays: number;
  };
  localizationLabels: Record<string, string>;
  trackTips: string[];
};

const CA_COOP: RegionPack = {
  regionCode: "CA",
  trackCode: "COOP",
  label: "Canada — Co-op",
  resumeDefaults: {
    sections: ["education", "skills", "projects", "experience", "volunteering", "certifications"],
    educationFirst: true,
    includeObjective: false,
    maxPages: 1,
  },
  copyRules: {
    noInventedFacts: true,
    needsConfirmationLabel: "Needs confirmation",
    noExperienceHelper: true,
    convertProjectsToExperience: true,
  },
  schoolCycles: [
    { name: "Fall", code: "fall", months: [8, 9, 10, 11] },
    { name: "Winter", code: "winter", months: [0, 1, 2, 3] },
    { name: "Summer", code: "summer", months: [4, 5, 6, 7] },
  ],
  eligibilityChecks: [
    {
      field: "currentlyEnrolled",
      label: "Currently Enrolled",
      required: true,
      riskMessage: "This co-op posting requires you to be currently enrolled in a post-secondary program.",
    },
    {
      field: "school",
      label: "School / Institution",
      required: true,
      riskMessage: "Your profile is missing school information. Many co-op postings require institutional affiliation.",
    },
    {
      field: "program",
      label: "Program",
      required: true,
      riskMessage: "Your profile is missing program information. Employers verify co-op eligibility by program.",
    },
  ],
  workAuthRules: [
    {
      id: "citizen_pr_requirement",
      label: "Citizen/PR Requirement",
      triggerPhrases: ["canadian citizen", "permanent resident", "pr required", "citizen or pr", "must be citizen", "must be pr"],
      condition: "work_status != citizen_pr",
      penalty: -35,
      message: "Posting asks for Citizen/PR. If you're not sure, confirm with recruiter.",
    },
    {
      id: "no_sponsorship",
      label: "No Sponsorship Available",
      triggerPhrases: ["no sponsorship", "without sponsorship", "sponsorship not available", "sponsorship not provided"],
      condition: "needs_sponsorship == true",
      penalty: -35,
      message: "Posting says no sponsorship. Consider prioritizing other roles or confirming directly.",
    },
    {
      id: "work_authorization_unclear",
      label: "Work Authorization Status",
      triggerPhrases: ["legally authorized to work in canada", "authorized to work in canada", "legally entitled to work"],
      condition: "work_status == unknown",
      penalty: -10,
      message: "Posting may screen for work authorization. Add your status to reduce uncertainty.",
    },
    {
      id: "location_requirement",
      label: "Location Requirement",
      triggerPhrases: ["must be located in canada", "must reside in canada", "canada-based", "based in canada"],
      condition: "country_of_residence != Canada",
      penalty: -15,
      message: "Posting mentions location requirement. Confirm if remote/relocation is possible.",
    },
  ],
  scoringWeights: {
    eligibility: 0.25,
    tools: 0.20,
    responsibilities: 0.20,
    skills: 0.20,
    softSkills: 0.15,
  },
  templates: {
    coverLetterStyle: "formal-academic",
    outreachTone: "professional-eager",
    followUpDays: 5,
  },
  localizationLabels: {
    stage_bookmarked: "Bookmarked",
    stage_applying: "Applying",
    stage_applied: "Applied",
    stage_interviewing: "Interviewing",
    stage_offered: "Offered",
    stage_rejected: "Rejected",
    stage_archived: "Archived",
    track_label: "Co-op",
    season_fall: "Fall Term",
    season_winter: "Winter Term",
    season_summer: "Summer Term",
  },
  trackTips: [
    "Put education section first — co-op employers check enrollment status.",
    "Include your co-op sequence number if applicable (e.g., 'Work Term 2 of 6').",
    "Highlight relevant coursework that maps to the JD requirements.",
    "Mention any academic projects that demonstrate hands-on skills.",
  ],
};

const CA_NEW_GRAD: RegionPack = {
  regionCode: "CA",
  trackCode: "NEW_GRAD",
  label: "Canada — New Graduate",
  resumeDefaults: {
    sections: ["experience", "education", "skills", "projects", "certifications", "volunteering"],
    educationFirst: false,
    includeObjective: false,
    maxPages: 1,
  },
  copyRules: {
    noInventedFacts: true,
    needsConfirmationLabel: "Needs confirmation",
    noExperienceHelper: true,
    convertProjectsToExperience: true,
  },
  schoolCycles: [
    { name: "Spring Convocation", code: "spring", months: [4, 5] },
    { name: "Fall Convocation", code: "fall", months: [9, 10] },
  ],
  eligibilityChecks: [
    {
      field: "graduationDate",
      label: "Graduation Date",
      required: true,
      riskMessage: "Your profile is missing graduation date. New grad roles often have eligibility windows.",
    },
  ],
  workAuthRules: [
    {
      id: "citizen_pr_requirement",
      label: "Citizen/PR Requirement",
      triggerPhrases: ["canadian citizen", "permanent resident", "pr required", "citizen or pr", "must be citizen", "must be pr"],
      condition: "work_status != citizen_pr",
      penalty: -35,
      message: "Posting asks for Citizen/PR. If you're not sure, confirm with recruiter.",
    },
    {
      id: "no_sponsorship",
      label: "No Sponsorship Available",
      triggerPhrases: ["no sponsorship", "without sponsorship", "sponsorship not available", "sponsorship not provided"],
      condition: "needs_sponsorship == true",
      penalty: -35,
      message: "Posting says no sponsorship. Consider prioritizing other roles or confirming directly.",
    },
    {
      id: "work_authorization_unclear",
      label: "Work Authorization Status",
      triggerPhrases: ["legally authorized to work in canada", "authorized to work in canada", "legally entitled to work"],
      condition: "work_status == unknown",
      penalty: -10,
      message: "Posting may screen for work authorization. Add your status to reduce uncertainty.",
    },
    {
      id: "location_requirement",
      label: "Location Requirement",
      triggerPhrases: ["must be located in canada", "must reside in canada", "canada-based", "based in canada"],
      condition: "country_of_residence != Canada",
      penalty: -15,
      message: "Posting mentions location requirement. Confirm if remote/relocation is possible.",
    },
  ],
  scoringWeights: {
    eligibility: 0.15,
    tools: 0.25,
    responsibilities: 0.25,
    skills: 0.20,
    softSkills: 0.15,
  },
  templates: {
    coverLetterStyle: "professional-concise",
    outreachTone: "professional-confident",
    followUpDays: 5,
  },
  localizationLabels: {
    stage_bookmarked: "Bookmarked",
    stage_applying: "Applying",
    stage_applied: "Applied",
    stage_interviewing: "Interviewing",
    stage_offered: "Offered",
    stage_rejected: "Rejected",
    stage_archived: "Archived",
    track_label: "New Graduate",
    season_fall: "Fall Hiring",
    season_winter: "Winter Hiring",
    season_summer: "Summer Hiring",
  },
  trackTips: [
    "Lead with experience if you have any — even part-time or freelance counts.",
    "Include your graduation date prominently to confirm new-grad eligibility.",
    "Watch for 'overqualified' signals: if the role says '0-1 years' and you have 3+, flag it.",
    "Convert capstone projects, hackathons, and volunteer work into quantified bullets.",
  ],
};

const PACKS: Record<string, RegionPack> = {
  "CA_COOP": CA_COOP,
  "CA_NEW_GRAD": CA_NEW_GRAD,
};

export function getRegionPack(regionCode: string, trackCode: string): RegionPack {
  const key = `${regionCode}_${trackCode}`;
  const pack = PACKS[key];
  if (!pack) {
    // Fallback to CA_NEW_GRAD as default
    return CA_NEW_GRAD;
  }
  return pack;
}

export function getAvailablePacks(): { key: string; label: string }[] {
  return Object.entries(PACKS).map(([key, pack]) => ({
    key,
    label: pack.label,
  }));
}

export const STAGES = [
  "bookmarked", "applying", "applied", "interviewing", "offered", "rejected", "archived"
] as const;

export type Stage = typeof STAGES[number];

export const STAGE_LABELS: Record<Stage, string> = {
  bookmarked: "Bookmarked",
  applying: "Applying",
  applied: "Applied",
  interviewing: "Interviewing",
  offered: "Offered",
  rejected: "Rejected",
  archived: "Archived",
};

export const EVIDENCE_GROUP_TYPES = [
  "eligibility", "tools", "responsibilities", "skills", "soft_skills"
] as const;

export type EvidenceGroupType = typeof EVIDENCE_GROUP_TYPES[number];

export const EVIDENCE_GROUP_LABELS: Record<EvidenceGroupType, string> = {
  eligibility: "Eligibility",
  tools: "Tools",
  responsibilities: "Responsibilities",
  skills: "Skills",
  soft_skills: "Soft Skills",
};
