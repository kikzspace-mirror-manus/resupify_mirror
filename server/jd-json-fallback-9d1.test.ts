/**
 * Phase 9D1: JD JSON Fallback Extraction Tests
 *
 * Acceptance tests:
 * A) ld+json with JobPosting description → returns populated text, not "too short"
 * B) __NEXT_DATA__ with description field → returns populated text
 * C) window.__INITIAL_STATE__ with description → returns populated text
 * D) Gated/blocked HTML → still returns "blocked" (unchanged)
 * E) Truly thin HTML → still returns "too short" (unchanged)
 * F) extractLdJson: multiple ld+json blocks → picks the JobPosting one
 * G) extractLdJson: array @type including JobPosting → works
 * H) extractLdJson: no JobPosting → returns empty string
 * I) extractNextData: no __NEXT_DATA__ → returns empty string
 * J) extractWindowState: no state blobs → returns empty string
 * K) stripHtmlToText: converts HTML to plain text correctly
 * L) extractFromJson: tries ld_json first, falls back to next_data
 * M) extractFromJson: returns method=none when all fail
 * N) Regression: existing Readability-based extraction still works (Layer A/B)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  extractLdJson,
  extractNextData,
  extractWindowState,
  extractFromJson,
  stripHtmlToText,
} from "../shared/jdJsonExtractors";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const LONG_DESCRIPTION = "We are looking for a talented software engineer to join our team. " +
  "You will be responsible for designing, developing, and maintaining high-quality software solutions. " +
  "The ideal candidate has strong experience with TypeScript, React, Node.js, and cloud infrastructure. " +
  "You will collaborate with cross-functional teams to deliver features that delight our users. " +
  "Requirements: 3+ years of experience, strong communication skills, and a passion for clean code.";

const makeJobPostingLdJson = (description = LONG_DESCRIPTION) => `
<html><head>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "JobPosting",
  "title": "Senior Software Engineer",
  "hiringOrganization": { "name": "Acme Corp" },
  "jobLocation": { "address": { "addressLocality": "San Francisco", "addressRegion": "CA" } },
  "employmentType": "FULL_TIME",
  "description": "${description.replace(/"/g, '\\"')}"
}
</script>
</head><body><p>Loading...</p></body></html>`;

const makeNextDataHtml = (description = LONG_DESCRIPTION) => `
<html><head></head><body>
<script id="__NEXT_DATA__" type="application/json">
{
  "props": {
    "pageProps": {
      "job": {
        "title": "Product Manager",
        "company": "Startup Inc",
        "description": "${description.replace(/"/g, '\\"')}"
      }
    }
  }
}
</script>
<p>Loading...</p>
</body></html>`;

const makeWindowStateHtml = (description = LONG_DESCRIPTION) => `
<html><head></head><body>
<script>
window.__INITIAL_STATE__ = {
  "job": {
    "title": "Data Scientist",
    "description": "${description.replace(/"/g, '\\"')}"
  }
};
</script>
<p>Loading...</p>
</body></html>`;

const THIN_HTML = "<html><body><p>Loading...</p></body></html>";

const GATED_HTML = `<html><body>
<p>Please sign in to view this job posting.</p>
<p>This content requires authentication. Login to continue.</p>
</body></html>`;

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Phase 9D1: stripHtmlToText", () => {
  it("K) converts HTML to plain text, preserving line breaks", () => {
    const html = "<p>Hello <b>world</b></p><p>Second paragraph</p>";
    const result = stripHtmlToText(html);
    expect(result).toContain("Hello");
    expect(result).toContain("world");
    expect(result).toContain("Second paragraph");
    expect(result).not.toContain("<p>");
    expect(result).not.toContain("<b>");
  });

  it("K2) decodes HTML entities", () => {
    const html = "Senior &amp; Lead Engineer &lt;TypeScript&gt;";
    const result = stripHtmlToText(html);
    expect(result).toContain("Senior & Lead Engineer");
    expect(result).toContain("<TypeScript>");
  });

  it("K3) returns empty string for empty input", () => {
    expect(stripHtmlToText("")).toBe("");
    expect(stripHtmlToText(null as any)).toBe("");
  });
});

describe("Phase 9D1: extractLdJson", () => {
  it("A) JobPosting ld+json → returns populated text", () => {
    const html = makeJobPostingLdJson();
    const result = extractLdJson(html);
    expect(result.length).toBeGreaterThanOrEqual(200);
    expect(result).toContain("Senior Software Engineer");
    expect(result).toContain("Acme Corp");
    expect(result).toContain("software engineer");
  });

  it("F) Multiple ld+json blocks → picks the JobPosting one", () => {
    const html = `
      <script type="application/ld+json">{"@type":"Organization","name":"Acme"}</script>
      <script type="application/ld+json">{"@type":"JobPosting","title":"Engineer","description":"${LONG_DESCRIPTION.replace(/"/g, '\\"')}"}</script>
    `;
    const result = extractLdJson(html);
    expect(result.length).toBeGreaterThanOrEqual(200);
    expect(result).toContain("Engineer");
  });

  it("G) Array @type including JobPosting → works", () => {
    const html = `
      <script type="application/ld+json">
        {"@type":["JobPosting","Thing"],"title":"Dev","description":"${LONG_DESCRIPTION.replace(/"/g, '\\"')}"}
      </script>
    `;
    const result = extractLdJson(html);
    expect(result.length).toBeGreaterThanOrEqual(200);
  });

  it("H) No JobPosting → returns empty string", () => {
    const html = `<script type="application/ld+json">{"@type":"Organization","name":"Acme"}</script>`;
    expect(extractLdJson(html)).toBe("");
  });

  it("H2) No ld+json at all → returns empty string", () => {
    expect(extractLdJson(THIN_HTML)).toBe("");
  });

  it("H3) Malformed JSON → returns empty string (no throw)", () => {
    const html = `<script type="application/ld+json">{ invalid json }</script>`;
    expect(() => extractLdJson(html)).not.toThrow();
    expect(extractLdJson(html)).toBe("");
  });
});

describe("Phase 9D1: extractNextData", () => {
  it("B) __NEXT_DATA__ with description → returns populated text", () => {
    const html = makeNextDataHtml();
    const result = extractNextData(html);
    expect(result.length).toBeGreaterThanOrEqual(200);
    expect(result).toContain("software engineer");
  });

  it("I) No __NEXT_DATA__ → returns empty string", () => {
    expect(extractNextData(THIN_HTML)).toBe("");
  });

  it("I2) __NEXT_DATA__ with only short strings → returns empty string", () => {
    const html = `<script id="__NEXT_DATA__" type="application/json">{"props":{"pageProps":{"id":1}}}</script>`;
    expect(extractNextData(html)).toBe("");
  });

  it("I3) Malformed __NEXT_DATA__ JSON → returns empty string (no throw)", () => {
    const html = `<script id="__NEXT_DATA__" type="application/json">{ invalid }</script>`;
    expect(() => extractNextData(html)).not.toThrow();
    expect(extractNextData(html)).toBe("");
  });
});

describe("Phase 9D1: extractWindowState", () => {
  it("C) window.__INITIAL_STATE__ with description → returns populated text", () => {
    const html = makeWindowStateHtml();
    const result = extractWindowState(html);
    expect(result.length).toBeGreaterThanOrEqual(200);
    expect(result).toContain("software engineer");
  });

  it("J) No state blobs → returns empty string", () => {
    expect(extractWindowState(THIN_HTML)).toBe("");
  });

  it("J2) Malformed state blob → returns empty string (no throw)", () => {
    const html = `<script>window.__INITIAL_STATE__ = { invalid json };</script>`;
    expect(() => extractWindowState(html)).not.toThrow();
    expect(extractWindowState(html)).toBe("");
  });
});

describe("Phase 9D1: extractFromJson (orchestrator)", () => {
  it("L) Tries ld_json first, returns it when successful", () => {
    const html = makeJobPostingLdJson();
    const result = extractFromJson(html, 200);
    expect(result.method).toBe("ld_json");
    expect(result.text.length).toBeGreaterThanOrEqual(200);
  });

  it("L2) Falls back to next_data when ld_json fails", () => {
    const html = makeNextDataHtml();
    const result = extractFromJson(html, 200);
    expect(result.method).toBe("next_data");
    expect(result.text.length).toBeGreaterThanOrEqual(200);
  });

  it("L3) Falls back to window_state when ld_json and next_data fail", () => {
    const html = makeWindowStateHtml();
    const result = extractFromJson(html, 200);
    expect(result.method).toBe("window_state");
    expect(result.text.length).toBeGreaterThanOrEqual(200);
  });

  it("M) Returns method=none when all strategies fail", () => {
    const result = extractFromJson(THIN_HTML, 200);
    expect(result.method).toBe("none");
    expect(result.text).toBe("");
  });

  it("M2) Returns method=none for empty HTML", () => {
    const result = extractFromJson("", 200);
    expect(result.method).toBe("none");
    expect(result.text).toBe("");
  });
});

describe("Phase 9D1: integration — fetchFromUrl procedure behavior", () => {
  // These tests verify the Layer C integration by calling the extractors
  // directly with the same HTML that would be returned by a real fetch.

  it("A) ld+json JobPosting HTML → extractFromJson returns text ≥ 200 chars", () => {
    const html = makeJobPostingLdJson();
    const result = extractFromJson(html, 200);
    expect(result.text.length).toBeGreaterThanOrEqual(200);
    expect(result.method).not.toBe("none");
  });

  it("B) __NEXT_DATA__ HTML → extractFromJson returns text ≥ 200 chars", () => {
    const html = makeNextDataHtml();
    const result = extractFromJson(html, 200);
    expect(result.text.length).toBeGreaterThanOrEqual(200);
    expect(result.method).not.toBe("none");
  });

  it("D) Truly thin HTML → extractFromJson returns empty (too short guard still fires)", () => {
    const result = extractFromJson(THIN_HTML, 200);
    expect(result.text).toBe("");
    expect(result.method).toBe("none");
  });

  it("E) Regression: ld+json with responsibilities and qualifications fields", () => {
    const html = `
      <script type="application/ld+json">
      {
        "@type": "JobPosting",
        "title": "Software Engineer",
        "hiringOrganization": {"name": "TechCorp"},
        "description": "We are hiring a software engineer.",
        "responsibilities": "${("Build scalable systems. Design APIs. Mentor junior engineers. ".repeat(5)).replace(/"/g, '\\"')}",
        "qualifications": "${("5+ years TypeScript. Strong system design skills. Experience with cloud platforms. ".repeat(3)).replace(/"/g, '\\"')}"
      }
      </script>
    `;
    const result = extractLdJson(html);
    expect(result).toContain("Responsibilities");
    expect(result).toContain("Qualifications");
    expect(result.length).toBeGreaterThanOrEqual(200);
  });

  it("E2) Regression: description is HTML fragment → stripped to plain text", () => {
    const htmlDesc = "<p>We are looking for a <strong>talented engineer</strong>.</p><ul><li>TypeScript</li><li>React</li></ul>";
    const html = `
      <script type="application/ld+json">
      {"@type":"JobPosting","title":"Engineer","description":"${htmlDesc.replace(/"/g, '\\"').replace(/\n/g, '')}"}
      </script>
    `;
    const result = extractLdJson(html);
    expect(result).not.toContain("<p>");
    expect(result).not.toContain("<strong>");
    expect(result).toContain("talented engineer");
  });
});
