/**
 * Shared filename builder utilities.
 * Used by cover letter export and any future downloadable artifacts.
 *
 * Convention: FirstName_LastName - Context - YYYY-MM-DD.ext
 */

/**
 * Sanitize a filename segment: remove slashes, colons, quotes, and
 * collapse consecutive whitespace to a single space.
 */
export function sanitizeSegment(segment: string): string {
  return segment
    .replace(/[/\\:*?"<>|]/g, "") // remove forbidden chars
    .replace(/\s+/g, " ")          // collapse whitespace
    .trim();
}

/**
 * Build a resume patch filename.
 *
 * @param fullName  - User's full name (e.g. "Francis Alexes Noces")
 * @param company   - Company name (e.g. "Acme Corp")
 * @param date      - Optional Date object; defaults to today in local time
 * @returns         - e.g. "Francis_Noces - Resume_Patch - Acme Corp - 2026-02-20.txt"
 */

/**
 * Build an Application Kit zip bundle filename.
 *
 * @param fullName  - User's full name (e.g. "Francis Alexes Noces")
 * @param company   - Company name (e.g. "Acme Corp")
 * @param date      - Optional Date object; defaults to today in local time
 * @returns         - e.g. "Francis_Noces - Application_Kit - Acme Corp - 2026-02-21.zip"
 */
export function buildApplicationKitZipFilename(
  fullName: string,
  company: string,
  date?: Date
): string {
  const d = date ?? new Date();

  const nameParts = sanitizeSegment(fullName || "User").split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] ?? "User";
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";
  const namePart = lastName ? `${firstName}_${lastName}` : firstName;

  const companyPart = sanitizeSegment(company || "Company") || "Company";

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const datePart = `${year}-${month}-${day}`;

  return `${namePart} - Application_Kit - ${companyPart} - ${datePart}.zip`;
}

/**
 * Build a top changes (action checklist) filename.
 *
 * @param fullName  - User's full name (e.g. "Francis Alexes Noces")
 * @param company   - Company name (e.g. "Acme Corp")
 * @param date      - Optional Date object; defaults to today in local time
 * @returns         - e.g. "Francis_Noces - Top_Changes - Acme Corp - 2026-02-21.txt"
 */
export function buildTopChangesFilename(
  fullName: string,
  company: string,
  date?: Date
): string {
  const d = date ?? new Date();

  const nameParts = sanitizeSegment(fullName || "User").split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] ?? "User";
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";
  const namePart = lastName ? `${firstName}_${lastName}` : firstName;

  const companyPart = sanitizeSegment(company || "Company") || "Company";

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const datePart = `${year}-${month}-${day}`;

  return `${namePart} - Top_Changes - ${companyPart} - ${datePart}.txt`;
}

export function buildResumePatchFilename(
  fullName: string,
  company: string,
  date?: Date
): string {
  const d = date ?? new Date();

  const nameParts = sanitizeSegment(fullName || "User").split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] ?? "User";
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";
  const namePart = lastName ? `${firstName}_${lastName}` : firstName;

  const companyPart = sanitizeSegment(company || "Company") || "Company";

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const datePart = `${year}-${month}-${day}`;

  return `${namePart} - Resume_Patch - ${companyPart} - ${datePart}.txt`;
}

export function buildCoverLetterFilename(
  fullName: string,
  company: string,
  date?: Date
): string {
  const d = date ?? new Date();

  // Split name into parts; use first + last only
  const nameParts = sanitizeSegment(fullName || "User").split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] ?? "User";
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";
  const namePart = lastName ? `${firstName}_${lastName}` : firstName;

  const companyPart = sanitizeSegment(company || "Company") || "Company";

  // Local date as YYYY-MM-DD
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const datePart = `${year}-${month}-${day}`;

  return `${namePart} - ${companyPart} - ${datePart}.txt`;
}
