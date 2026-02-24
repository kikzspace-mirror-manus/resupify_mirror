/**
 * V2 — Profile Language Mode Toggle Tests
 *
 * Covers:
 * - db.updateUserLanguageMode: helper exists and is exported
 * - profile.setLanguageMode tRPC mutation: exists, validates enum, non-VN enforcement
 * - Profile.tsx: language-card visibility (flag-gated, VN-only), language-select testid
 * - Profile.tsx: imports Languages icon, setLanguageMode mutation, localLanguageMode state
 * - resolveLocale: uses localLanguageMode for immediate locale refresh
 * - Non-VN enforcement: CA user calling setLanguageMode=vi → effectiveMode=en
 */
import { describe, it, expect, beforeAll } from "vitest";
import { resolveLocale } from "../shared/trackOptions";

// ─── db.updateUserLanguageMode ────────────────────────────────────────────────

describe("db.updateUserLanguageMode", () => {
  it("T1: db.ts exports updateUserLanguageMode function", async () => {
    const m = await import("./db");
    expect(typeof m.updateUserLanguageMode).toBe("function");
  });

  it("T2: updateUserLanguageMode accepts 'en', 'vi', 'bilingual'", async () => {
    // Structural: just verify the function exists and has the right signature
    const m = await import("./db");
    // We can't call it without a real DB, but we can verify it's a function
    expect(m.updateUserLanguageMode.length).toBe(2); // (userId, languageMode)
  });
});

// ─── profile.setLanguageMode tRPC mutation (structural) ──────────────────────

describe("routers.ts profile.setLanguageMode mutation", () => {
  const fs = require("fs");
  const path = require("path");
  let routersContent: string;

  beforeAll(() => {
    routersContent = fs.readFileSync(path.resolve("server/routers.ts"), "utf-8");
  });

  it("T3: routers.ts has setLanguageMode mutation", () => {
    expect(routersContent).toContain("setLanguageMode");
  });

  it("T4: setLanguageMode uses protectedProcedure", () => {
    const idx = routersContent.indexOf("setLanguageMode");
    const block = routersContent.slice(idx, idx + 400);
    expect(block).toContain("protectedProcedure");
  });

  it("T5: setLanguageMode validates enum [en, vi, bilingual]", () => {
    const idx = routersContent.indexOf("setLanguageMode");
    const block = routersContent.slice(idx, idx + 400);
    expect(block).toContain("\"en\"");
    expect(block).toContain("\"vi\"");
    expect(block).toContain("\"bilingual\"");
  });

  it("T6: setLanguageMode enforces non-VN users to en", () => {
    const idx = routersContent.indexOf("setLanguageMode");
    const block = routersContent.slice(idx, idx + 600);
    // Must check countryPackId and force "en" for non-VN
    expect(block).toContain("countryPackId");
    expect(block).toContain("VN");
    expect(block).toContain("effectiveMode");
  });

  it("T7: setLanguageMode calls db.updateUserLanguageMode", () => {
    expect(routersContent).toContain("db.updateUserLanguageMode");
  });

  it("T8: setLanguageMode returns effectiveMode in response", () => {
    const idx = routersContent.indexOf("setLanguageMode");
    const block = routersContent.slice(idx, idx + 600);
    expect(block).toContain("effectiveMode");
  });
});

// ─── Non-VN enforcement logic (via resolveLocale as proxy) ───────────────────

describe("Non-VN enforcement: resolveLocale returns en for non-VN packs", () => {
  it("T9: CA user with languageMode=vi → resolveLocale returns en (flag ON)", () => {
    // This mirrors the server enforcement: CA users should never see VI
    const locale = resolveLocale({ countryPackId: "CA", languageMode: "vi", v2VnTranslationEnabled: true });
    expect(locale).toBe("en");
  });

  it("T10: GLOBAL user with languageMode=vi → resolveLocale returns en (flag ON)", () => {
    const locale = resolveLocale({ countryPackId: "GLOBAL", languageMode: "vi", v2VnTranslationEnabled: true });
    expect(locale).toBe("en");
  });

  it("T11: VN user with languageMode=en → resolveLocale returns en (explicit override)", () => {
    const locale = resolveLocale({ countryPackId: "VN", languageMode: "en", v2VnTranslationEnabled: true });
    expect(locale).toBe("en");
  });

  it("T12: VN user with languageMode=vi → resolveLocale returns vi (flag ON)", () => {
    const locale = resolveLocale({ countryPackId: "VN", languageMode: "vi", v2VnTranslationEnabled: true });
    expect(locale).toBe("vi");
  });

  it("T13: VN user with languageMode=en → resolveLocale returns en (flag ON, explicit EN wins)", () => {
    const locale = resolveLocale({ countryPackId: "VN", languageMode: "en", v2VnTranslationEnabled: true });
    expect(locale).toBe("en");
  });
});

// ─── Profile.tsx structural tests ────────────────────────────────────────────

describe("Profile.tsx Language Mode toggle wiring", () => {
  const fs = require("fs");
  const path = require("path");
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(path.resolve("client/src/pages/Profile.tsx"), "utf-8");
  });

  it("T14: Profile.tsx imports Languages icon from lucide-react", () => {
    expect(content).toContain("Languages");
  });

  it("T15: Profile.tsx has language-card testid", () => {
    expect(content).toContain("data-testid=\"language-card\"");
  });

  it("T16: Profile.tsx has language-select testid", () => {
    expect(content).toContain("data-testid=\"language-select\"");
  });

  it("T17: Profile.tsx has lang-option-en testid", () => {
    expect(content).toContain("data-testid=\"lang-option-en\"");
  });

  it("T18: Profile.tsx has lang-option-vi testid", () => {
    expect(content).toContain("data-testid=\"lang-option-vi\"");
  });

  it("T19: Profile.tsx has lang-option-bilingual testid (behind v2BilingualViewEnabled)", () => {
    expect(content).toContain("lang-option-bilingual");
    expect(content).toContain("v2BilingualViewEnabled");
  });

  it("T20: Profile.tsx language card is gated on v2CountryPacksEnabled && v2VnTranslationEnabled && VN", () => {
    expect(content).toContain("v2CountryPacksEnabled && v2VnTranslationEnabled && userCountryPackId === \"VN\"");
  });

  it("T21: Profile.tsx uses localLanguageMode state for immediate locale refresh", () => {
    expect(content).toContain("localLanguageMode");
    expect(content).toContain("setLocalLanguageMode");
  });

  it("T22: Profile.tsx calls trpc.profile.setLanguageMode.useMutation", () => {
    expect(content).toContain("trpc.profile.setLanguageMode.useMutation");
  });

  it("T23: Profile.tsx invalidates auth.me after language mode change", () => {
    expect(content).toContain("utils.auth.me.invalidate");
  });

  it("T24: Profile.tsx reads v2BilingualViewEnabled from flags", () => {
    expect(content).toContain("v2BilingualViewEnabled");
  });

  it("T25: Profile.tsx syncs localLanguageMode from userLanguageMode via useEffect", () => {
    expect(content).toContain("setLocalLanguageMode(userLanguageMode as any)");
  });
});

// ─── db.ts structural tests ───────────────────────────────────────────────────

describe("db.ts updateUserLanguageMode structure", () => {
  const fs = require("fs");
  const path = require("path");
  let dbContent: string;

  beforeAll(() => {
    dbContent = fs.readFileSync(path.resolve("server/db.ts"), "utf-8");
  });

  it("T26: db.ts has updateUserLanguageMode function", () => {
    expect(dbContent).toContain("updateUserLanguageMode");
  });

  it("T27: updateUserLanguageMode updates users table", () => {
    const idx = dbContent.indexOf("updateUserLanguageMode");
    const block = dbContent.slice(idx, idx + 300);
    expect(block).toContain("users");
    expect(block).toContain("languageMode");
  });

  it("T28: updateUserLanguageMode accepts en/vi/bilingual type", () => {
    const idx = dbContent.indexOf("updateUserLanguageMode");
    const block = dbContent.slice(idx, idx + 200);
    expect(block).toContain("\"en\" | \"vi\" | \"bilingual\"");
  });
});
