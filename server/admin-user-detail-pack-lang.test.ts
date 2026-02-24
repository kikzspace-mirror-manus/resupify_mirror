/**
 * Admin User Detail — Country Pack + Language Mode badges
 * Tests: badge rendering, fallback (null → GLOBAL/en), badge colors, regression
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const ADMIN_USERS_PATH = resolve(__dirname, "../client/src/pages/admin/AdminUsers.tsx");
const content = readFileSync(ADMIN_USERS_PATH, "utf-8");

// ── A: Country Pack badge in user detail panel ─────────────────────────────

describe("A — Country Pack badge in user detail panel", () => {
  it("A1) user-detail-country-pack-badge data-testid is present", () => {
    expect(content).toContain('data-testid="user-detail-country-pack-badge"');
  });

  it("A2) Country Pack badge uses PACK_BADGE_COLORS for styling", () => {
    expect(content).toContain("PACK_BADGE_COLORS[(userDetail.countryPackId");
  });

  it("A3) Country Pack badge falls back to GLOBAL when countryPackId is null", () => {
    expect(content).toContain('userDetail.countryPackId ?? "GLOBAL"');
  });

  it("A4) Country Pack badge uses variant=outline (consistent with user list)", () => {
    const detailSection = content.slice(content.indexOf("user-detail-country-pack-badge") - 300, content.indexOf("user-detail-country-pack-badge") + 200);
    expect(detailSection).toContain('variant="outline"');
  });

  it("A5) Country Pack badge has font-mono class (consistent with user list)", () => {
    const detailSection = content.slice(content.indexOf("user-detail-country-pack-badge") - 200, content.indexOf("user-detail-country-pack-badge") + 200);
    expect(detailSection).toContain("font-mono");
  });

  it("A6) PACK_BADGE_COLORS includes CA with red styling", () => {
    const packBadgeColors = content.slice(content.indexOf("PACK_BADGE_COLORS"), content.indexOf("PACK_BADGE_COLORS") + 300);
    expect(packBadgeColors).toContain("CA:");
    expect(packBadgeColors).toContain("red");
  });

  it("A7) PACK_BADGE_COLORS includes VN with yellow styling", () => {
    const packBadgeColors = content.slice(content.indexOf("PACK_BADGE_COLORS"), content.indexOf("PACK_BADGE_COLORS") + 300);
    expect(packBadgeColors).toContain("VN:");
    expect(packBadgeColors).toContain("yellow");
  });

  it("A8) PACK_BADGE_COLORS includes PH with blue styling", () => {
    const packBadgeColors = content.slice(content.indexOf("PACK_BADGE_COLORS"), content.indexOf("PACK_BADGE_COLORS") + 300);
    expect(packBadgeColors).toContain("PH:");
    expect(packBadgeColors).toContain("blue");
  });

  it("A9) PACK_BADGE_COLORS includes US with indigo styling", () => {
    const packBadgeColors = content.slice(content.indexOf("PACK_BADGE_COLORS"), content.indexOf("PACK_BADGE_COLORS") + 300);
    expect(packBadgeColors).toContain("US:");
    expect(packBadgeColors).toContain("indigo");
  });

  it("A10) PACK_BADGE_COLORS includes GLOBAL with gray styling", () => {
    const packBadgeColors = content.slice(content.indexOf("PACK_BADGE_COLORS"), content.indexOf("PACK_BADGE_COLORS") + 300);
    expect(packBadgeColors).toContain("GLOBAL:");
    expect(packBadgeColors).toContain("gray");
  });
});

// ── B: Language Mode badge in user detail panel ────────────────────────────

describe("B — Language Mode badge in user detail panel", () => {
  it("B1) user-detail-language-mode-badge data-testid is present", () => {
    expect(content).toContain('data-testid="user-detail-language-mode-badge"');
  });

  it("B2) Language Mode badge falls back to 'en' when languageMode is null", () => {
    expect(content).toContain('userDetail.languageMode ?? "en"');
  });

  it("B3) Language Mode badge uses variant=secondary", () => {
    const detailSection = content.slice(content.indexOf("user-detail-language-mode-badge") - 200, content.indexOf("user-detail-language-mode-badge") + 200);
    expect(detailSection).toContain('variant="secondary"');
  });

  it("B4) Language Mode badge has text-xs class", () => {
    const detailSection = content.slice(content.indexOf("user-detail-language-mode-badge") - 200, content.indexOf("user-detail-language-mode-badge") + 200);
    expect(detailSection).toContain("text-xs");
  });
});

// ── C: Pack info container ─────────────────────────────────────────────────

describe("C — Pack info container in user detail panel", () => {
  it("C1) user-detail-pack-info container data-testid is present", () => {
    expect(content).toContain('data-testid="user-detail-pack-info"');
  });

  it("C2) Pack info container uses flex-wrap for responsive layout", () => {
    const detailSection = content.slice(content.indexOf("user-detail-pack-info") - 100, content.indexOf("user-detail-pack-info") + 200);
    expect(detailSection).toContain("flex-wrap");
  });

  it("C3) Both badges are inside the same pack info container", () => {
    const containerStart = content.indexOf('data-testid="user-detail-pack-info"');
    const containerEnd = content.indexOf("</div>", containerStart);
    const containerBlock = content.slice(containerStart, containerEnd + 10);
    expect(containerBlock).toContain("user-detail-country-pack-badge");
    expect(containerBlock).toContain("user-detail-language-mode-badge");
  });

  it("C4) Pack info section is inside the CardContent of the user detail card", () => {
    const cardContentIdx = content.lastIndexOf("<CardContent", content.indexOf("user-detail-pack-info"));
    const packInfoIdx = content.indexOf("user-detail-pack-info");
    expect(packInfoIdx).toBeGreaterThan(cardContentIdx);
  });
});

// ── D: Regression — user list badges unchanged ────────────────────────────

describe("D — Regression: user list badges unchanged", () => {
  it("D1) country-pack-badge data-testid still present in user list rows", () => {
    expect(content).toContain('data-testid="country-pack-badge"');
  });

  it("D2) language-mode-badge data-testid still present in user list rows", () => {
    expect(content).toContain('data-testid="language-mode-badge"');
  });

  it("D3) PACK_LABEL_COLORS still defined (used by PackDistributionBar)", () => {
    expect(content).toContain("PACK_LABEL_COLORS");
  });

  it("D4) PACK_BADGE_COLORS still defined (used by user list rows)", () => {
    expect(content).toContain("PACK_BADGE_COLORS");
  });

  it("D5) computePackCounts still exported", () => {
    expect(content).toContain("export function computePackCounts");
  });

  it("D6) PackDistributionBar still present", () => {
    expect(content).toContain("PackDistributionBar");
  });

  it("D7) pack-distribution-bar data-testid still present", () => {
    expect(content).toContain('data-testid="pack-distribution-bar"');
  });

  it("D8) PACK_FILTER_OPTIONS still includes US", () => {
    const filterOptions = content.slice(content.indexOf("PACK_FILTER_OPTIONS"), content.indexOf("PACK_FILTER_OPTIONS") + 400);
    expect(filterOptions).toContain('"US"');
  });

  it("D9) adminGetUser query still uses trpc.admin.users.detail", () => {
    expect(content).toContain("trpc.admin.users.detail.useQuery");
  });

  it("D10) userDetail.countryPackId is accessed (not a renamed field)", () => {
    expect(content).toContain("userDetail.countryPackId");
  });

  it("D11) userDetail.languageMode is accessed (not a renamed field)", () => {
    expect(content).toContain("userDetail.languageMode");
  });
});
