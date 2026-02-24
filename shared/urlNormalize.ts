/**
 * URL normalization helper for job posting URLs.
 * Strips common tracking params while preserving essential job IDs.
 *
 * Tracking params stripped: utm_*, source, gh_src, ref, referrer, via,
 *   fbclid, gclid, msclkid, mc_cid, mc_eid, _hsenc, _hsmi, mkt_tok, trk
 *
 * Essential params preserved: ashby_jid, gh_jid, lever_origin, jobId,
 *   job_id, jid, id (when it looks like a job ID)
 */

const STRIP_PARAMS = new Set([
  // UTM
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  // Common tracking
  "source",
  "gh_src",
  "ref",
  "referrer",
  "via",
  "fbclid",
  "gclid",
  "msclkid",
  "mc_cid",
  "mc_eid",
  "_hsenc",
  "_hsmi",
  "mkt_tok",
  "trk",
  "trkCampaign",
  "trkInfo",
  "icid",
  "cid",
  "sid",
  "clickid",
  "affiliate",
  "partner",
  // LinkedIn-specific
  "refid",
  "trackingid",
  "lipi",
  "lici",
]);

/**
 * Normalize a job posting URL by stripping tracking params.
 * Returns the original URL string if parsing fails.
 */
export function normalizeJobUrl(rawUrl: string): string {
  let parsed: URL;
  const trimmed = rawUrl.trim();
  try {
    parsed = new URL(trimmed);
  } catch {
    // Try prepending https:// if no protocol is present
    try {
      parsed = new URL(`https://${trimmed}`);
    } catch {
      return trimmed;
    }
  }

  const keep = new URLSearchParams();
  for (const [key, value] of Array.from(parsed.searchParams.entries())) {
    const lowerKey = key.toLowerCase();
    // Strip if in the blocklist or starts with utm_
    if (STRIP_PARAMS.has(lowerKey) || lowerKey.startsWith("utm_")) {
      continue;
    }
    keep.set(key, value);
  }

  parsed.search = keep.toString();
  // Remove trailing ? if no params remain
  return parsed.toString();
}

/**
 * Safe wrapper around normalizeJobUrl.
 * If normalization throws or returns an empty string, returns the original input.
 */
export function safeNormalizeJobUrl(url: string): string {
  if (!url || !url.trim()) return url;
  try {
    const result = normalizeJobUrl(url);
    return result || url;
  } catch {
    return url;
  }
}

/**
 * Returns true if the URL looks like it came from a site known to block
 * server-side fetching (BambooHR, some Ashby links, LinkedIn, Indeed, Workday).
 * Used as a hint to surface the Browser Capture fallback proactively.
 */
export function isLikelyBlockedHost(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    const h = hostname.toLowerCase();
    return (
      h.includes("bamboohr.com") ||
      h.includes("linkedin.com") ||
      h.includes("indeed.com") ||
      h.includes("myworkdayjobs.com") ||
      h.includes("workday.com") ||
      h.includes("greenhouse.io") ||
      h.includes("lever.co")
    );
  } catch {
    return false;
  }
}
