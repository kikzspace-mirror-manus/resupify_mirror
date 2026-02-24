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
 */

import type { CountryPackId } from "./countryPacks";

// ─── Types ────────────────────────────────────────────────────────────────────

export type TrackCode =
  | "COOP"
  | "NEW_GRAD"
  | "INTERNSHIP"
  | "EARLY_CAREER"
  | "EXPERIENCED";

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

// ─── Track definitions ────────────────────────────────────────────────────────

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
    label: "Internship / Student",
    sublabel: "Currently enrolled or seeking internship",
  },
  {
    code: "NEW_GRAD",
    regionCode: "VN",
    label: "New Graduate",
    sublabel: "Recently graduated",
  },
  {
    code: "EARLY_CAREER",
    regionCode: "VN",
    label: "Early Career",
    sublabel: "1–5 years of experience",
  },
  {
    code: "EXPERIENCED",
    regionCode: "VN",
    label: "Experienced",
    sublabel: "5+ years of experience",
  },
];

// ─── Core helper ─────────────────────────────────────────────────────────────

/**
 * Returns the ordered list of available tracks, a sensible default track code,
 * and the region code to persist — all based on the user's country pack and
 * whether the V2 country packs feature flag is enabled.
 *
 * Behaviour matrix:
 * | v2Enabled | countryPackId | tracks    | defaultTrack | regionCode |
 * |-----------|---------------|-----------|--------------|------------|
 * | false     | any           | CA_TRACKS | COOP         | CA         |
 * | true      | CA            | CA_TRACKS | COOP         | CA         |
 * | true      | VN            | VN_TRACKS | NEW_GRAD     | VN         |
 * | true      | GLOBAL/PH/US  | []        | NEW_GRAD     | CA         |
 * | true      | null/undefined| []        | NEW_GRAD     | CA         |
 */
export function getTracksForCountry(
  countryPackId: CountryPackId | null | undefined,
  v2Enabled: boolean
): TrackSelectionResult {
  // Flag OFF → V1 behaviour unchanged
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
      tracks: VN_TRACKS,
      defaultTrack: "NEW_GRAD",
      hasTracksForCountry: true,
      regionCode: "VN",
    };
  }

  // GLOBAL / PH / US — no tracks defined yet
  return {
    tracks: [],
    defaultTrack: "NEW_GRAD",
    hasTracksForCountry: false,
    regionCode: "CA",
  };
}
