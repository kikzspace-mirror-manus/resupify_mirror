/**
 * Phase 9D1: JD JSON Fallback Extractors
 *
 * Used when primary Readability + container extraction returns text that is
 * too short.  Tries three JSON-based extraction strategies in order:
 *   1. ld+json  — JobPosting structured data (Ashby, Greenhouse, Lever, etc.)
 *   2. __NEXT_DATA__ — Next.js app-shell JSON blob
 *   3. window.__INITIAL_STATE__ / __APOLLO_STATE__ / dataLayer — SPA state blobs
 *
 * All helpers are pure functions that accept raw HTML and return a plain-text
 * string (empty string if nothing useful was found).
 */

// ── Shared text normalizer ────────────────────────────────────────────────────

/**
 * Strip HTML tags from a fragment and return clean plain text.
 * Preserves paragraph/line-break semantics by converting block-level tags to
 * newlines before stripping.
 */
export function stripHtmlToText(html: string): string {
  if (!html || typeof html !== "string") return "";
  return html
    // Block-level tags → newline
    .replace(/<\/(p|div|li|h[1-6]|section|article|br)[^>]*>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    // Strip all remaining tags
    .replace(/<[^>]+>/g, " ")
    // Decode common HTML entities
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    // Normalise whitespace
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * De-duplicate consecutive identical paragraphs (common in SPA state blobs).
 */
function deduplicateParagraphs(text: string): string {
  const lines = text.split("\n");
  const seen = new Set<string>();
  const result: string[] = [];
  for (const line of lines) {
    const key = line.trim();
    if (key.length === 0 || !seen.has(key)) {
      result.push(line);
      if (key.length > 0) seen.add(key);
    }
  }
  return result.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Normalise and cap a candidate text block.
 */
function normalise(raw: string, maxChars = 12_000): string {
  const text = deduplicateParagraphs(stripHtmlToText(raw));
  return text.length > maxChars ? text.substring(0, maxChars) : text;
}

// ── Helper: recursively find the largest "description-like" string in a JSON blob ──

const DESCRIPTION_KEYS = [
  "description",
  "jobDescription",
  "job_description",
  "fullDescription",
  "full_description",
  "content",
  "body",
  "text",
  "details",
  "responsibilities",
  "qualifications",
  "requirements",
  "skills",
  "aboutRole",
  "about_role",
  "roleDescription",
  "role_description",
  "sections",
  "blocks",
  "posting",
  "position",
  "apply",
  "overview",
  "summary",
];

/**
 * Walk a JSON value and collect all string values whose key matches a
 * description-like name.  Returns the longest one found.
 */
function pickLargestDescriptionString(
  obj: unknown,
  depth = 0
): string {
  if (depth > 8) return "";
  if (typeof obj === "string") return obj.length > 80 ? obj : "";
  if (Array.isArray(obj)) {
    let best = "";
    for (const item of obj) {
      const candidate = pickLargestDescriptionString(item, depth + 1);
      if (candidate.length > best.length) best = candidate;
    }
    return best;
  }
  if (obj !== null && typeof obj === "object") {
    let best = "";
    for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
      const lk = key.toLowerCase();
      // Prioritise known description keys
      if (DESCRIPTION_KEYS.some((dk) => lk.includes(dk))) {
        const candidate = pickLargestDescriptionString(val, depth + 1);
        if (candidate.length > best.length) best = candidate;
      } else {
        // Still recurse but at lower priority
        const candidate = pickLargestDescriptionString(val, depth + 1);
        if (candidate.length > best.length) best = candidate;
      }
    }
    return best;
  }
  return "";
}

// ── Layer C1: ld+json JobPosting ──────────────────────────────────────────────

/**
 * Parse all <script type="application/ld+json"> blocks and extract JobPosting
 * fields into a plain-text JD body.
 *
 * Returns empty string if no JobPosting is found or the result is too short.
 */
export function extractLdJson(html: string): string {
  const scriptRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  const candidates: string[] = [];

  while ((match = scriptRegex.exec(html)) !== null) {
    try {
      const raw = match[1].trim();
      const parsed = JSON.parse(raw);
      const items: unknown[] = Array.isArray(parsed) ? parsed : [parsed];

      for (const item of items) {
        if (
          typeof item !== "object" ||
          item === null ||
          !("@type" in item)
        ) continue;

        const types = Array.isArray((item as any)["@type"])
          ? (item as any)["@type"]
          : [(item as any)["@type"]];

        if (!types.some((t: string) => typeof t === "string" && t.toLowerCase().includes("jobposting"))) {
          continue;
        }

        const jp = item as Record<string, any>;
        const parts: string[] = [];

        if (jp.title) parts.push(`Job Title: ${jp.title}`);
        if (jp.hiringOrganization?.name) parts.push(`Company: ${jp.hiringOrganization.name}`);
        if (jp.jobLocation) {
          const loc = jp.jobLocation;
          const address = loc?.address;
          if (typeof address === "string") parts.push(`Location: ${address}`);
          else if (address?.addressLocality) {
            const city = address.addressLocality;
            const region = address.addressRegion ?? "";
            const country = address.addressCountry ?? "";
            parts.push(`Location: ${[city, region, country].filter(Boolean).join(", ")}`);
          }
        }
        if (jp.employmentType) parts.push(`Employment Type: ${jp.employmentType}`);
        if (jp.description) parts.push(`\nDescription:\n${stripHtmlToText(jp.description)}`);
        if (jp.responsibilities) parts.push(`\nResponsibilities:\n${stripHtmlToText(jp.responsibilities)}`);
        if (jp.qualifications) parts.push(`\nQualifications:\n${stripHtmlToText(jp.qualifications)}`);
        if (jp.skills) parts.push(`\nSkills:\n${stripHtmlToText(jp.skills)}`);

        const assembled = parts.join("\n").trim();
        if (assembled.length > 80) candidates.push(assembled);
      }
    } catch {
      // Malformed JSON — skip
    }
  }

  if (candidates.length === 0) return "";
  // Return the longest candidate
  const best = candidates.reduce((a, b) => (a.length >= b.length ? a : b), "");
  return normalise(best);
}

// ── Layer C2: __NEXT_DATA__ ───────────────────────────────────────────────────

/**
 * Parse <script id="__NEXT_DATA__" type="application/json"> and extract the
 * largest description-like string from the JSON tree.
 */
export function extractNextData(html: string): string {
  const match = /<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i.exec(html);
  if (!match) return "";
  try {
    const parsed = JSON.parse(match[1].trim());
    const candidate = pickLargestDescriptionString(parsed);
    if (candidate.length < 80) return "";
    return normalise(candidate);
  } catch {
    return "";
  }
}

// ── Layer C3: window state blobs ──────────────────────────────────────────────

/**
 * Extract description-like content from common SPA state injection patterns:
 *   - window.__INITIAL_STATE__ = {...}
 *   - window.__APOLLO_STATE__ = {...}
 *   - window.__APP_STATE__ = {...}
 *   - window.__REDUX_STATE__ = {...}
 *   - dataLayer.push({...})  (Google Tag Manager)
 */
export function extractWindowState(html: string): string {
  const STATE_PATTERNS = [
    /window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\})(?:\s*;|\s*<\/script>)/,
    /window\.__APOLLO_STATE__\s*=\s*(\{[\s\S]*?\})(?:\s*;|\s*<\/script>)/,
    /window\.__APP_STATE__\s*=\s*(\{[\s\S]*?\})(?:\s*;|\s*<\/script>)/,
    /window\.__REDUX_STATE__\s*=\s*(\{[\s\S]*?\})(?:\s*;|\s*<\/script>)/,
    /window\.__STATE__\s*=\s*(\{[\s\S]*?\})(?:\s*;|\s*<\/script>)/,
    /dataLayer\.push\((\{[\s\S]*?\})\)/,
  ];

  let best = "";
  for (const pattern of STATE_PATTERNS) {
    const match = pattern.exec(html);
    if (!match) continue;
    try {
      const parsed = JSON.parse(match[1]);
      const candidate = pickLargestDescriptionString(parsed);
      if (candidate.length > best.length) best = candidate;
    } catch {
      // Malformed — skip
    }
  }

  if (best.length < 80) return "";
  return normalise(best);
}

// ── Public API ────────────────────────────────────────────────────────────────

export type JsonExtractionMethod = "ld_json" | "next_data" | "window_state" | "none";

export interface JsonExtractionResult {
  text: string;
  method: JsonExtractionMethod;
}

/**
 * Try all JSON fallback strategies in order and return the first result that
 * passes the minimum length threshold.
 */
export function extractFromJson(
  html: string,
  minLength = 200
): JsonExtractionResult {
  const ldJson = extractLdJson(html);
  if (ldJson.length >= minLength) return { text: ldJson, method: "ld_json" };

  const nextData = extractNextData(html);
  if (nextData.length >= minLength) return { text: nextData, method: "next_data" };

  const windowState = extractWindowState(html);
  if (windowState.length >= minLength) return { text: windowState, method: "window_state" };

  return { text: "", method: "none" };
}
