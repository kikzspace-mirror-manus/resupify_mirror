/**
 * shared/trackOptions.ts
 *
 * Single source of truth for track definitions and the country-aware
 * getTracksForCountry() helper. Used by both Onboarding.tsx and Profile.tsx
 * so that track lists never diverge between the two pages.
 *
 * V1 behaviour is fully preserved when v2CountryPacksEnabled is false:
 * the function always returns CA tracks with default COOP, identical to the
 * original hard-coded selector.
 *
 * V2 VN Translation: when v2VnTranslationEnabled is ON and the effective
 * country pack is "VN", Vietnamese labels/sublabels are returned for VN tracks.
 * Use resolveLocale() to determine the locale, then pass it to
 * getTracksForCountry() or getTranslatedTrackStepCopy().
 */

import type { CountryPackId } from "./countryPacks";

// ─── Types ────────────────────────────────────────────────────────────────────

export type TrackCode =
  | "COOP"
  | "NEW_GRAD"
  | "INTERNSHIP"
  | "EARLY_CAREER"
  | "EXPERIENCED";

export type SupportedLocale = "en" | "vi";

export interface TrackOption {
  /** Track code persisted to the database. */
  code: TrackCode;
  /** Region code sent alongside the track when saving. */
  regionCode: string;
  /** Human-readable label shown in the UI. */
  label: string;
  /** Short description shown below the label. */
  sublabel: string;
}

export interface TrackSelectionResult {
  /** Ordered list of tracks to display in the selector. Empty = no tracks for country. */
  tracks: TrackOption[];
  /** Sensible default track code for this country. */
  defaultTrack: TrackCode;
  /** True when the country has at least one track defined. */
  hasTracksForCountry: boolean;
  /** Region code to persist when saving (e.g. "CA" or "VN"). */
  regionCode: string;
}

/** Copy for the Track step header/helper text, localised per locale. */
export interface TrackStepCopy {
  header: string;
  helper: string;
}

// ─── Locale resolution ───────────────────────────────────────────────────────

/**
 * Resolves the display locale for a given user context.
 *
 * Rules (deterministic, no side-effects):
 * 1. If v2VnTranslationEnabled is OFF → always "en"
 * 2. If countryPackId !== "VN" → always "en"
 * 3. If languageMode === "vi" OR browserLocale starts with "vi" → "vi"
 * 4. Otherwise → "en"
 *
 * `browserLocale` is optional; pass `navigator.language` from the client.
 * On the server (tests) omit it or pass undefined.
 */
export function resolveLocale(opts: {
  countryPackId: CountryPackId | null | undefined;
  languageMode?: string | null;
  browserLocale?: string;
  v2VnTranslationEnabled: boolean;
}): SupportedLocale {
  if (!opts.v2VnTranslationEnabled) return "en";
  if (opts.countryPackId !== "VN") return "en";
  // Explicit English preference always wins
  if (opts.languageMode === "en") return "en";
  if (opts.languageMode === "vi") return "vi";
  if (opts.browserLocale?.startsWith("vi")) return "vi";
  // VN pack but no explicit vi preference → still show Vietnamese copy
  // (pack-based default: VN users see VI labels unless they've set languageMode=en)
  return "vi";
}

// ─── Track definitions (EN) ──────────────────────────────────────────────────

export const CA_TRACKS: TrackOption[] = [
  {
    code: "COOP",
    regionCode: "CA",
    label: "Student / Co-op",
    sublabel: "Currently enrolled",
  },
  {
    code: "NEW_GRAD",
    regionCode: "CA",
    label: "Early-career / General",
    sublabel: "New grad or career changer",
  },
];

export const VN_TRACKS: TrackOption[] = [
  {
    code: "INTERNSHIP",
    regionCode: "VN",
    label: "Vietnam — Internship / Student",
    sublabel: "Best for students applying for internships",
  },
  {
    code: "NEW_GRAD",
    regionCode: "VN",
    label: "Vietnam — New Graduate",
    sublabel: "Best for 0–1 years experience",
  },
  {
    code: "EARLY_CAREER",
    regionCode: "VN",
    label: "Vietnam — Early Career (1–5 years)",
    sublabel: "Best for early professionals building experience",
  },
  {
    code: "EXPERIENCED",
    regionCode: "VN",
    label: "Vietnam — Experienced (5+ years)",
    sublabel: "Best for senior individual contributors or managers",
  },
];

// ─── Track definitions (PH — English-only) ─────────────────────────────────
// PH tracks are always returned in English regardless of locale.

export const PH_TRACKS: TrackOption[] = [
  {
    code: "INTERNSHIP",
    regionCode: "PH",
    label: "Philippines — Internship / Student",
    sublabel: "Best for students applying for internships",
  },
  {
    code: "NEW_GRAD",
    regionCode: "PH",
    label: "Philippines — New Graduate",
    sublabel: "Best for 0–1 years experience",
  },
  {
    code: "EARLY_CAREER",
    regionCode: "PH",
    label: "Philippines — Early Career (1–5 years)",
    sublabel: "Best for early professionals building experience",
  },
  {
    code: "EXPERIENCED",
    regionCode: "PH",
    label: "Philippines — Experienced (5+ years)",
    sublabel: "Best for senior individual contributors or managers",
  },
];

// ─── Track definitions (VI) ──────────────────────────────────────────────────

export const VN_TRACKS_VI: TrackOption[] = [
  {
    code: "INTERNSHIP",
    regionCode: "VN",
    label: "Việt Nam — Thực tập / Sinh viên",
    sublabel: "Phù hợp cho sinh viên ứng tuyển thực tập",
  },
  {
    code: "NEW_GRAD",
    regionCode: "VN",
    label: "Việt Nam — Mới tốt nghiệp",
    sublabel: "Phù hợp cho 0–1 năm kinh nghiệm",
  },
  {
    code: "EARLY_CAREER",
    regionCode: "VN",
    label: "Việt Nam — Đi làm (1–5 năm)",
    sublabel: "Phù hợp cho người mới đi làm tích lũy kinh nghiệm",
  },
  {
    code: "EXPERIENCED",
    regionCode: "VN",
    label: "Việt Nam — Kinh nghiệm (5+ năm)",
    sublabel: "Phù hợp cho senior/manager",
  },
];

// ─── Track step copy (header + helper text) ──────────────────────────────────

const TRACK_STEP_COPY: Record<SupportedLocale, TrackStepCopy> = {
  en: {
    header: "Choose your track",
    helper: "This helps us tailor resume tips and eligibility checks for you.",
  },
  vi: {
    header: "Chọn lộ trình hồ sơ",
    helper: "Chọn theo giai đoạn nghề nghiệp của bạn",
  },
};

/**
 * Returns the localised header and helper text for the Track selection step.
 */
export function getTranslatedTrackStepCopy(locale: SupportedLocale): TrackStepCopy {
  return TRACK_STEP_COPY[locale] ?? TRACK_STEP_COPY.en;
}

// ─── Core helper ─────────────────────────────────────────────────────────────

/**
 * Returns the ordered list of available tracks, a sensible default track code,
 * and the region code to persist — all based on the user's country pack,
 * the V2 flag, and the resolved display locale.
 *
 * Behaviour matrix:
 * | v2Enabled | countryPackId | locale | tracks        | defaultTrack | regionCode |
 * |-----------|---------------|--------|---------------|--------------|------------|
 * | false     | any           | any    | CA_TRACKS(en) | COOP         | CA         |
 * | true      | CA            | any    | CA_TRACKS(en) | COOP         | CA         |
 * | true      | VN            | en     | VN_TRACKS(en) | NEW_GRAD     | VN         |
 * | true      | VN            | vi     | VN_TRACKS(vi) | NEW_GRAD     | VN         |
 * | true      | GLOBAL/PH/US  | any    | []            | NEW_GRAD     | CA         |
 * | true      | null/undefined| any    | []            | NEW_GRAD     | CA         |
 */
export function getTracksForCountry(
  countryPackId: CountryPackId | null | undefined,
  v2Enabled: boolean,
  locale: SupportedLocale = "en"
): TrackSelectionResult {
  // Flag OFF → V1 behaviour unchanged (always EN CA tracks)
  if (!v2Enabled) {
    return {
      tracks: CA_TRACKS,
      defaultTrack: "COOP",
      hasTracksForCountry: true,
      regionCode: "CA",
    };
  }

  const effectivePack = countryPackId ?? "GLOBAL";

  if (effectivePack === "CA") {
    return {
      tracks: CA_TRACKS,
      defaultTrack: "COOP",
      hasTracksForCountry: true,
      regionCode: "CA",
    };
  }

  if (effectivePack === "VN") {
    return {
      tracks: locale === "vi" ? VN_TRACKS_VI : VN_TRACKS,
      defaultTrack: "NEW_GRAD",
      hasTracksForCountry: true,
      regionCode: "VN",
    };
  }

  if (effectivePack === "PH") {
    // PH is always English-only — locale param is intentionally ignored
    return {
      tracks: PH_TRACKS,
      defaultTrack: "NEW_GRAD",
      hasTracksForCountry: true,
      regionCode: "PH",
    };
  }

  // GLOBAL / US — no tracks defined yet
  return {
    tracks: [],
    defaultTrack: "NEW_GRAD",
    hasTracksForCountry: false,
    regionCode: "CA",
  };
}
