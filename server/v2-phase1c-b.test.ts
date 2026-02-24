/**
 * V2 Phase 1C-B — Canada (CA) Country Pack Micro-Patch
 *
 * Tests cover:
 * A) CA pack is in the registry with correct config
 * B) COUNTRY_PACK_IDS includes CA in correct position (after GLOBAL)
 * C) DB schema enum includes CA for users and job_cards
 * D) Profile.tsx dropdown includes CA in correct order
 * E) Router enum includes CA
 * F) Regression: existing packs (GLOBAL/VN/PH/US) unchanged
 */

import { describe, it, expect } from "vitest";
import {
  COUNTRY_PACK_IDS,
  DEFAULT_COUNTRY_PACK_ID,
  countryPackRegistry,
  type CountryPackId,
} from "../shared/countryPacks";

// ─── A) CA pack registry entry ────────────────────────────────────────────────

describe("A) CA pack registry entry", () => {
  it("A1: CA pack exists in countryPackRegistry", () => {
    expect(countryPackRegistry["CA"]).toBeDefined();
  });

  it("A2: CA pack defaultLanguageMode is 'en'", () => {
    expect(countryPackRegistry["CA"].defaultLanguageMode).toBe("en");
  });

  it("A3: CA pack translationEnabled is false", () => {
    expect(countryPackRegistry["CA"].translationEnabled).toBe(false);
  });

  it("A4: CA pack bilingualEnabled is false", () => {
    expect(countryPackRegistry["CA"].bilingualEnabled).toBe(false);
  });

  it("A5: CA pack templateStyleKey is 'ca_english'", () => {
    expect(countryPackRegistry["CA"].templateStyleKey).toBe("ca_english");
  });
});

// ─── B) COUNTRY_PACK_IDS ordering ────────────────────────────────────────────

describe("B) COUNTRY_PACK_IDS includes CA in correct position", () => {
  it("B1: COUNTRY_PACK_IDS contains CA", () => {
    expect(COUNTRY_PACK_IDS).toContain("CA");
  });

  it("B2: COUNTRY_PACK_IDS has 5 entries (GLOBAL, CA, VN, PH, US)", () => {
    expect(COUNTRY_PACK_IDS.length).toBe(5);
  });

  it("B3: GLOBAL is first in COUNTRY_PACK_IDS", () => {
    expect(COUNTRY_PACK_IDS[0]).toBe("GLOBAL");
  });

  it("B4: CA is second in COUNTRY_PACK_IDS (after GLOBAL)", () => {
    expect(COUNTRY_PACK_IDS[1]).toBe("CA");
  });

  it("B5: VN is third in COUNTRY_PACK_IDS", () => {
    expect(COUNTRY_PACK_IDS[2]).toBe("VN");
  });

  it("B6: PH is fourth in COUNTRY_PACK_IDS", () => {
    expect(COUNTRY_PACK_IDS[3]).toBe("PH");
  });

  it("B7: US is fifth in COUNTRY_PACK_IDS", () => {
    expect(COUNTRY_PACK_IDS[4]).toBe("US");
  });
});

// ─── C) DB schema enum includes CA ───────────────────────────────────────────

describe("C) DB schema enum includes CA", () => {
  it("C1: users table countryPackId enum includes CA", () => {
    const fs = require("fs");
    const src = fs.readFileSync(
      require("path").join(process.cwd(), "drizzle/schema.ts"),
      "utf-8"
    );
    // Find the users table countryPackId definition
    const usersSection = src.slice(0, src.indexOf("export const jobCards"));
    expect(usersSection).toContain('"CA"');
  });

  it("C2: job_cards table countryPackId enum includes CA", () => {
    const fs = require("fs");
    const src = fs.readFileSync(
      require("path").join(process.cwd(), "drizzle/schema.ts"),
      "utf-8"
    );
    // Find the jobCards table countryPackId definition
    const jobCardsSection = src.slice(src.indexOf("export const jobCards"));
    expect(jobCardsSection.slice(0, 2000)).toContain('"CA"');
  });

  it("C3: migration file for CA enum was created (0029)", () => {
    const fs = require("fs");
    const path = require("path");
    const migrationsDir = path.join(process.cwd(), "drizzle");
    const files = fs.readdirSync(migrationsDir).filter((f: string) => f.endsWith(".sql"));
    // Find migration 0029
    const migration0029 = files.find((f: string) => f.startsWith("0029"));
    expect(migration0029).toBeDefined();
    if (migration0029) {
      const content = fs.readFileSync(path.join(migrationsDir, migration0029), "utf-8");
      expect(content.toLowerCase()).toContain("ca");
    }
  });
});

// ─── D) Profile.tsx dropdown includes CA in correct order ────────────────────

describe("D) Profile.tsx dropdown order: Global, Canada, Vietnam, Philippines, USA", () => {
  it("D1: Profile.tsx includes CA SelectItem", () => {
    const fs = require("fs");
    const src = fs.readFileSync(
      require("path").join(process.cwd(), "client/src/pages/Profile.tsx"),
      "utf-8"
    );
    expect(src).toContain('value="CA"');
    expect(src).toContain("Canada (CA)");
  });

  it("D2: CA appears before VN in the dropdown", () => {
    const fs = require("fs");
    const src = fs.readFileSync(
      require("path").join(process.cwd(), "client/src/pages/Profile.tsx"),
      "utf-8"
    );
    const caPos = src.indexOf('value="CA"');
    const vnPos = src.indexOf('value="VN"');
    expect(caPos).toBeGreaterThan(0);
    expect(vnPos).toBeGreaterThan(0);
    expect(caPos).toBeLessThan(vnPos);
  });

  it("D3: GLOBAL appears before CA in the dropdown", () => {
    const fs = require("fs");
    const src = fs.readFileSync(
      require("path").join(process.cwd(), "client/src/pages/Profile.tsx"),
      "utf-8"
    );
    const globalPos = src.indexOf('value="GLOBAL"');
    const caPos = src.indexOf('value="CA"');
    expect(globalPos).toBeGreaterThan(0);
    expect(caPos).toBeGreaterThan(0);
    expect(globalPos).toBeLessThan(caPos);
  });

  it("D4: All 5 packs present in dropdown (GLOBAL, CA, VN, PH, US)", () => {
    const fs = require("fs");
    const src = fs.readFileSync(
      require("path").join(process.cwd(), "client/src/pages/Profile.tsx"),
      "utf-8"
    );
    expect(src).toContain('value="GLOBAL"');
    expect(src).toContain('value="CA"');
    expect(src).toContain('value="VN"');
    expect(src).toContain('value="PH"');
    expect(src).toContain('value="US"');
  });
});

// ─── E) Router enum includes CA ──────────────────────────────────────────────

describe("E) Router enum includes CA", () => {
  it("E1: user.updateCountryPack z.enum includes CA", () => {
    const fs = require("fs");
    const src = fs.readFileSync(
      require("path").join(process.cwd(), "server/routers.ts"),
      "utf-8"
    );
    // Find the updateCountryPack input schema
    const updateSection = src.slice(
      src.indexOf("updateCountryPack"),
      src.indexOf("updateCountryPack") + 300
    );
    expect(updateSection).toContain('"CA"');
  });
});

// ─── F) Regression: existing packs unchanged ─────────────────────────────────

describe("F) Regression: existing packs (GLOBAL/VN/PH/US) unchanged", () => {
  it("F1: GLOBAL pack config unchanged", () => {
    expect(countryPackRegistry["GLOBAL"].defaultLanguageMode).toBe("en");
    expect(countryPackRegistry["GLOBAL"].translationEnabled).toBe(false);
    expect(countryPackRegistry["GLOBAL"].templateStyleKey).toBe("global_english");
  });

  it("F2: VN pack config unchanged", () => {
    expect(countryPackRegistry["VN"].defaultLanguageMode).toBe("vi");
    expect(countryPackRegistry["VN"].translationEnabled).toBe(true);
    expect(countryPackRegistry["VN"].bilingualEnabled).toBe(true);
    expect(countryPackRegistry["VN"].templateStyleKey).toBe("vn_formal");
  });

  it("F3: PH pack config unchanged", () => {
    expect(countryPackRegistry["PH"].defaultLanguageMode).toBe("en");
    expect(countryPackRegistry["PH"].translationEnabled).toBe(false);
    expect(countryPackRegistry["PH"].templateStyleKey).toBe("ph_english");
  });

  it("F4: US pack config unchanged", () => {
    expect(countryPackRegistry["US"].defaultLanguageMode).toBe("en");
    expect(countryPackRegistry["US"].translationEnabled).toBe(false);
    expect(countryPackRegistry["US"].templateStyleKey).toBe("us_english");
  });

  it("F5: DEFAULT_COUNTRY_PACK_ID is still GLOBAL", () => {
    expect(DEFAULT_COUNTRY_PACK_ID).toBe("GLOBAL");
  });

  it("F6: countryPackRegistry has exactly 5 entries", () => {
    expect(Object.keys(countryPackRegistry).length).toBe(5);
  });
});
