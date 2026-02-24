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

// ─── CA Extended Tracks ─────────────────────────────────────────────────────
const CA_EARLY_CAREER: RegionPack = {
  regionCode: "CA",
  trackCode: "EARLY_CAREER",
  label: "Canada — Early Career (0–5 years)",
  resumeDefaults: {
    sections: ["experience", "achievements", "skills", "projects", "education", "certifications"],
    educationFirst: false,
    includeObjective: false,
    maxPages: 1,
  },
  copyRules: {
    noInventedFacts: true,
    needsConfirmationLabel: "Needs confirmation",
    noExperienceHelper: false,
    convertProjectsToExperience: false,
  },
  schoolCycles: [],
  eligibilityChecks: [],
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
    tools: 0.20,
    responsibilities: 0.30,
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
    track_label: "Early Career",
    season_fall: "Fall Hiring",
    season_winter: "Winter Hiring",
    season_summer: "Summer Hiring",
  },
  trackTips: [
    "Lead with your strongest experience — even internships and co-ops count.",
    "Quantify achievements wherever possible (e.g., 'reduced load time by 30%').",
    "Highlight tools and technologies prominently — early-career roles are often tool-specific.",
    "Keep to 1 page; cut older or less-relevant roles to stay focused.",
  ],
};

const CA_EXPERIENCED: RegionPack = {
  regionCode: "CA",
  trackCode: "EXPERIENCED",
  label: "Canada — Experienced (5+ years)",
  resumeDefaults: {
    sections: ["experience", "leadership", "achievements", "skills", "education"],
    educationFirst: false,
    includeObjective: false,
    maxPages: 2,
  },
  copyRules: {
    noInventedFacts: true,
    needsConfirmationLabel: "Needs confirmation",
    noExperienceHelper: false,
    convertProjectsToExperience: false,
  },
  schoolCycles: [],
  eligibilityChecks: [],
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
    eligibility: 0.20,
    tools: 0.10,
    responsibilities: 0.40,
    skills: 0.15,
    softSkills: 0.15,
  },
  templates: {
    coverLetterStyle: "executive-brief",
    outreachTone: "professional-executive",
    followUpDays: 7,
  },
  localizationLabels: {
    stage_bookmarked: "Bookmarked",
    stage_applying: "Applying",
    stage_applied: "Applied",
    stage_interviewing: "Interviewing",
    stage_offered: "Offered",
    stage_rejected: "Rejected",
    stage_archived: "Archived",
    track_label: "Experienced",
    season_fall: "Fall Hiring",
    season_winter: "Winter Hiring",
    season_summer: "Summer Hiring",
  },
  trackTips: [
    "Lead with impact: open each role with a 1-line summary of scope and scale.",
    "Use 2 pages — experienced roles expect depth, not brevity.",
    "Highlight leadership, cross-functional influence, and business outcomes.",
    "Trim roles older than 15 years to 1–2 bullets or remove them entirely.",
  ],
};

// ─── VN Tracks ──────────────────────────────────────────────────────

const VN_INTERNSHIP: RegionPack = {
  regionCode: "VN",
  trackCode: "INTERNSHIP",
  label: "Vietnam — Internship / Student",
  resumeDefaults: {
    sections: ["education", "projects", "skills", "experience", "certifications", "activities"],
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
  schoolCycles: [],
  eligibilityChecks: [],
  scoringWeights: {
    eligibility: 0.15,
    tools: 0.20,
    responsibilities: 0.20,
    skills: 0.20,
    softSkills: 0.25,
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
    track_label: "Internship / Student",
  },
  trackTips: [
    "Highlight academic projects and coursework relevant to the role.",
    "Include any extracurricular activities or club leadership.",
    "Keep to 1 page — internship recruiters scan quickly.",
  ],
};

const VN_NEW_GRAD: RegionPack = {
  regionCode: "VN",
  trackCode: "NEW_GRAD",
  label: "Vietnam — New Graduate",
  resumeDefaults: {
    sections: ["experience", "projects", "education", "skills", "certifications", "volunteering"],
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
  schoolCycles: [],
  eligibilityChecks: [],
  scoringWeights: {
    eligibility: 0.15,
    tools: 0.20,
    responsibilities: 0.25,
    skills: 0.20,
    softSkills: 0.20,
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
  },
  trackTips: [
    "Lead with any internship or part-time experience before education.",
    "Convert capstone projects and hackathons into quantified bullets.",
    "Include graduation date prominently to confirm new-grad eligibility.",
  ],
};

const VN_EARLY_CAREER: RegionPack = {
  regionCode: "VN",
  trackCode: "EARLY_CAREER",
  label: "Vietnam — Early Career (1–5 years)",
  resumeDefaults: {
    sections: ["experience", "achievements", "skills", "projects", "education", "certifications"],
    educationFirst: false,
    includeObjective: false,
    maxPages: 2,
  },
  copyRules: {
    noInventedFacts: true,
    needsConfirmationLabel: "Needs confirmation",
    noExperienceHelper: false,
    convertProjectsToExperience: false,
  },
  schoolCycles: [],
  eligibilityChecks: [],
  scoringWeights: {
    eligibility: 0.15,
    tools: 0.15,
    responsibilities: 0.35,
    skills: 0.20,
    softSkills: 0.15,
  },
  templates: {
    coverLetterStyle: "professional-concise",
    outreachTone: "professional-direct",
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
    track_label: "Early Career",
  },
  trackTips: [
    "Lead with your strongest work experience — impact metrics matter.",
    "2 pages are acceptable if you have 3+ years of relevant experience.",
    "Highlight promotions or scope expansions to show growth.",
  ],
};

const VN_EXPERIENCED: RegionPack = {
  regionCode: "VN",
  trackCode: "EXPERIENCED",
  label: "Vietnam — Experienced (5+ years)",
  resumeDefaults: {
    sections: ["experience", "leadership", "achievements", "skills", "education"],
    educationFirst: false,
    includeObjective: false,
    maxPages: 2,
  },
  copyRules: {
    noInventedFacts: true,
    needsConfirmationLabel: "Needs confirmation",
    noExperienceHelper: false,
    convertProjectsToExperience: false,
  },
  schoolCycles: [],
  eligibilityChecks: [],
  scoringWeights: {
    eligibility: 0.20,
    tools: 0.10,
    responsibilities: 0.40,
    skills: 0.15,
    softSkills: 0.15,
  },
  templates: {
    coverLetterStyle: "executive-brief",
    outreachTone: "professional-executive",
    followUpDays: 7,
  },
  localizationLabels: {
    stage_bookmarked: "Bookmarked",
    stage_applying: "Applying",
    stage_applied: "Applied",
    stage_interviewing: "Interviewing",
    stage_offered: "Offered",
    stage_rejected: "Rejected",
    stage_archived: "Archived",
    track_label: "Experienced",
  },
  trackTips: [
    "Lead with a concise executive summary (2–3 lines) at the top.",
    "Focus on leadership impact: team size, budget, business outcomes.",
    "Trim older roles to 2–3 bullets; keep the last 10 years detailed.",
  ],
};

// ─── PH Tracks ───────────────────────────────────────────────────────────────

const PH_INTERNSHIP: RegionPack = {
  regionCode: "PH",
  trackCode: "INTERNSHIP",
  label: "Philippines — Internship / Student",
  resumeDefaults: {
    sections: ["education", "projects", "skills", "experience", "certifications", "activities"],
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
  schoolCycles: [],
  eligibilityChecks: [],
  scoringWeights: {
    eligibility: 0.15,
    tools: 0.20,
    responsibilities: 0.20,
    skills: 0.20,
    softSkills: 0.25,
  },
  templates: {
    coverLetterStyle: "professional-concise",
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
    track_label: "Internship / Student",
  },
  trackTips: [
    "Lead with education and relevant coursework if experience is limited.",
    "Convert academic projects and org activities into quantified bullets.",
    "Highlight any part-time work, freelance, or volunteer experience.",
  ],
};

const PH_NEW_GRAD: RegionPack = {
  regionCode: "PH",
  trackCode: "NEW_GRAD",
  label: "Philippines — New Graduate",
  resumeDefaults: {
    sections: ["experience", "projects", "education", "skills", "certifications", "volunteering"],
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
  schoolCycles: [],
  eligibilityChecks: [],
  scoringWeights: {
    eligibility: 0.15,
    tools: 0.20,
    responsibilities: 0.25,
    skills: 0.20,
    softSkills: 0.20,
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
  },
  trackTips: [
    "Lead with any internship or part-time experience before education.",
    "Convert capstone projects and hackathons into quantified bullets.",
    "Include graduation date prominently to confirm new-grad eligibility.",
  ],
};

const PH_EARLY_CAREER: RegionPack = {
  regionCode: "PH",
  trackCode: "EARLY_CAREER",
  label: "Philippines — Early Career (1–5 years)",
  resumeDefaults: {
    sections: ["experience", "achievements", "skills", "projects", "education", "certifications"],
    educationFirst: false,
    includeObjective: false,
    maxPages: 2,
  },
  copyRules: {
    noInventedFacts: true,
    needsConfirmationLabel: "Needs confirmation",
    noExperienceHelper: false,
    convertProjectsToExperience: false,
  },
  schoolCycles: [],
  eligibilityChecks: [],
  scoringWeights: {
    eligibility: 0.15,
    tools: 0.15,
    responsibilities: 0.35,
    skills: 0.20,
    softSkills: 0.15,
  },
  templates: {
    coverLetterStyle: "professional-concise",
    outreachTone: "professional-direct",
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
    track_label: "Early Career",
  },
  trackTips: [
    "Lead with your strongest work experience — impact metrics matter.",
    "2 pages are acceptable if you have 3+ years of relevant experience.",
    "Highlight promotions or scope expansions to show growth.",
  ],
};

const PH_EXPERIENCED: RegionPack = {
  regionCode: "PH",
  trackCode: "EXPERIENCED",
  label: "Philippines — Experienced (5+ years)",
  resumeDefaults: {
    sections: ["experience", "leadership", "achievements", "skills", "education"],
    educationFirst: false,
    includeObjective: false,
    maxPages: 2,
  },
  copyRules: {
    noInventedFacts: true,
    needsConfirmationLabel: "Needs confirmation",
    noExperienceHelper: false,
    convertProjectsToExperience: false,
  },
  schoolCycles: [],
  eligibilityChecks: [],
  scoringWeights: {
    eligibility: 0.20,
    tools: 0.10,
    responsibilities: 0.40,
    skills: 0.15,
    softSkills: 0.15,
  },
  templates: {
    coverLetterStyle: "professional-concise",
    outreachTone: "professional-executive",
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
    track_label: "Experienced",
  },
  trackTips: [
    "Lead with a concise executive summary (2–3 lines) at the top.",
    "Focus on leadership impact: team size, budget, business outcomes.",
    "Trim older roles to 2–3 bullets; keep the last 10 years detailed.",
  ],
};

// ─── US Packs (V2 US Expansion Step 1) ──────────────────────────────────────

const US_INTERNSHIP: RegionPack = {
  regionCode: "US",
  trackCode: "INTERNSHIP",
  label: "United States — Internship / Student",
  resumeDefaults: {
    sections: ["education", "projects", "skills", "experience", "certifications", "activities"],
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
  schoolCycles: [],
  eligibilityChecks: [],
  scoringWeights: {
    eligibility: 0.15,
    tools: 0.20,
    responsibilities: 0.20,
    skills: 0.20,
    softSkills: 0.25,
  },
  templates: {
    coverLetterStyle: "professional-concise",
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
    track_label: "Internship / Student",
  },
  trackTips: [
    "Lead with education and relevant coursework if experience is limited.",
    "Convert academic projects and org activities into quantified bullets.",
    "Highlight any part-time work, freelance, or volunteer experience.",
  ],
};

const US_NEW_GRAD: RegionPack = {
  regionCode: "US",
  trackCode: "NEW_GRAD",
  label: "United States — New Graduate",
  resumeDefaults: {
    sections: ["experience", "projects", "education", "skills", "certifications", "volunteering"],
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
  schoolCycles: [],
  eligibilityChecks: [],
  scoringWeights: {
    eligibility: 0.15,
    tools: 0.20,
    responsibilities: 0.25,
    skills: 0.20,
    softSkills: 0.20,
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
  },
  trackTips: [
    "Lead with any internship or part-time experience before education.",
    "Convert capstone projects and hackathons into quantified bullets.",
    "Include graduation date prominently to confirm new-grad eligibility.",
  ],
};

const US_EARLY_CAREER: RegionPack = {
  regionCode: "US",
  trackCode: "EARLY_CAREER",
  label: "United States — Early Career (1\u20135 years)",
  resumeDefaults: {
    sections: ["experience", "achievements", "skills", "projects", "education", "certifications"],
    educationFirst: false,
    includeObjective: false,
    maxPages: 2,
  },
  copyRules: {
    noInventedFacts: true,
    needsConfirmationLabel: "Needs confirmation",
    noExperienceHelper: false,
    convertProjectsToExperience: false,
  },
  schoolCycles: [],
  eligibilityChecks: [],
  scoringWeights: {
    eligibility: 0.15,
    tools: 0.15,
    responsibilities: 0.35,
    skills: 0.20,
    softSkills: 0.15,
  },
  templates: {
    coverLetterStyle: "professional-concise",
    outreachTone: "professional-direct",
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
    track_label: "Early Career",
  },
  trackTips: [
    "Lead with your strongest work experience — impact metrics matter.",
    "2 pages are acceptable if you have 3+ years of relevant experience.",
    "Highlight promotions or scope expansions to show growth.",
  ],
};

const US_EXPERIENCED: RegionPack = {
  regionCode: "US",
  trackCode: "EXPERIENCED",
  label: "United States — Experienced (5+ years)",
  resumeDefaults: {
    sections: ["experience", "leadership", "achievements", "skills", "education"],
    educationFirst: false,
    includeObjective: false,
    maxPages: 2,
  },
  copyRules: {
    noInventedFacts: true,
    needsConfirmationLabel: "Needs confirmation",
    noExperienceHelper: false,
    convertProjectsToExperience: false,
  },
  schoolCycles: [],
  eligibilityChecks: [],
  scoringWeights: {
    eligibility: 0.20,
    tools: 0.10,
    responsibilities: 0.40,
    skills: 0.15,
    softSkills: 0.15,
  },
  templates: {
    coverLetterStyle: "professional-concise",
    outreachTone: "professional-executive",
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
    track_label: "Experienced",
  },
  trackTips: [
    "Lead with a concise executive summary (2\u20133 lines) at the top.",
    "Focus on leadership impact: team size, budget, business outcomes.",
    "Trim older roles to 2\u20133 bullets; keep the last 10 years detailed.",
  ],
};

const PACKS: Record<string, RegionPack> = {
  "CA_COOP": CA_COOP,
  "CA_NEW_GRAD": CA_NEW_GRAD,
  "CA_EARLY_CAREER": CA_EARLY_CAREER,
  "CA_EXPERIENCED": CA_EXPERIENCED,
  "VN_INTERNSHIP": VN_INTERNSHIP,
  "VN_NEW_GRAD": VN_NEW_GRAD,
  "VN_EARLY_CAREER": VN_EARLY_CAREER,
  "VN_EXPERIENCED": VN_EXPERIENCED,
  "PH_INTERNSHIP": PH_INTERNSHIP,
  "PH_NEW_GRAD": PH_NEW_GRAD,
  "PH_EARLY_CAREER": PH_EARLY_CAREER,
  "PH_EXPERIENCED": PH_EXPERIENCED,
  "US_INTERNSHIP": US_INTERNSHIP,
  "US_NEW_GRAD": US_NEW_GRAD,
  "US_EARLY_CAREER": US_EARLY_CAREER,
  "US_EXPERIENCED": US_EXPERIENCED,
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
