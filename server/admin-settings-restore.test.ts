/**
 * Admin Settings Restore Tests
 * Restore 1/2: /admin/settings + enabledCountryPacks
 *
 * Tests that:
 * A) /admin/settings route is registered in App.tsx
 * B) AdminSettings.tsx component exists and renders pack toggles
 * C) Settings nav item is present in AdminLayout.tsx
 * D) system.featureFlags returns enabledCountryPacks field
 * E) system.setEnabledCountryPacks mutation exists and is admin-only
 * F) db.getEnabledCountryPacks falls back to ["CA"] when no setting exists
 * G) drizzle/schema.ts declares admin_settings table
 * H) db.ts has getAdminSetting, setAdminSetting, getEnabledCountryPacks helpers
 */
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const ROOT = path.join(__dirname, "..");

// ─── A) Route registration ────────────────────────────────────────────────────
describe("A) /admin/settings route is registered", () => {
  const appContent = fs.readFileSync(path.join(ROOT, "client/src/App.tsx"), "utf-8");

  it("A1: App.tsx imports AdminSettings", () => {
    expect(appContent).toMatch(/import AdminSettings from ["']\.\/pages\/admin\/AdminSettings["']/);
  });

  it("A2: App.tsx has <Route path=\"/admin/settings\"", () => {
    expect(appContent).toMatch(/path=["']\/admin\/settings["']/);
  });

  it("A3: Route uses AdminSettings component", () => {
    expect(appContent).toMatch(/component=\{AdminSettings\}/);
  });
});

// ─── B) AdminSettings.tsx component ──────────────────────────────────────────
describe("B) AdminSettings.tsx component exists and is correct", () => {
  const componentPath = path.join(ROOT, "client/src/pages/admin/AdminSettings.tsx");
  const content = fs.readFileSync(componentPath, "utf-8");

  it("B1: AdminSettings.tsx file exists", () => {
    expect(fs.existsSync(componentPath)).toBe(true);
  });

  it("B2: Uses trpc.system.setEnabledCountryPacks.useMutation", () => {
    expect(content).toMatch(/setEnabledCountryPacks/);
  });

  it("B3: Renders pack checkboxes (Checkbox component used)", () => {
    expect(content).toMatch(/Checkbox/);
  });

  it("B4: Has Save button", () => {
    expect(content).toMatch(/Save/);
  });

  it("B5: Uses AdminLayout wrapper", () => {
    expect(content).toMatch(/AdminLayout/);
  });

  it("B6: Renders all 4 packs (CA, VN, PH, US)", () => {
    expect(content).toMatch(/"CA"/);
    expect(content).toMatch(/"VN"/);
    expect(content).toMatch(/"PH"/);
    expect(content).toMatch(/"US"/);
  });
});

// ─── C) AdminLayout.tsx nav item ──────────────────────────────────────────────
describe("C) Settings nav item in AdminLayout.tsx", () => {
  const layoutContent = fs.readFileSync(
    path.join(ROOT, "client/src/components/AdminLayout.tsx"),
    "utf-8"
  );

  it("C1: Settings icon is imported from lucide-react", () => {
    expect(layoutContent).toMatch(/Settings/);
  });

  it("C2: Nav item with /admin/settings path exists", () => {
    expect(layoutContent).toMatch(/\/admin\/settings/);
  });

  it("C3: Nav item label is \"Settings\"", () => {
    expect(layoutContent).toMatch(/label:\s*["']Settings["']/);
  });
});

// ─── D) system.featureFlags returns enabledCountryPacks ───────────────────────
describe("D) system.featureFlags returns enabledCountryPacks", () => {
  const routerContent = fs.readFileSync(
    path.join(ROOT, "server/_core/systemRouter.ts"),
    "utf-8"
  );

  it("D1: featureFlags query is async (reads from DB)", () => {
    expect(routerContent).toMatch(/featureFlags:\s*publicProcedure\.query\(async/);
  });

  it("D2: Returns enabledCountryPacks field", () => {
    expect(routerContent).toMatch(/enabledCountryPacks/);
  });

  it("D3: Calls db.getEnabledCountryPacks()", () => {
    expect(routerContent).toMatch(/db\.getEnabledCountryPacks\(\)/);
  });

  it("D4: Falls back to [\"CA\"] when v2CountryPacksEnabled is false", () => {
    expect(routerContent).toMatch(/\["CA"\]/);
  });
});

// ─── E) system.setEnabledCountryPacks mutation ────────────────────────────────
describe("E) system.setEnabledCountryPacks mutation exists and is admin-only", () => {
  const routerContent = fs.readFileSync(
    path.join(ROOT, "server/_core/systemRouter.ts"),
    "utf-8"
  );

  it("E1: setEnabledCountryPacks mutation is declared", () => {
    expect(routerContent).toMatch(/setEnabledCountryPacks/);
  });

  it("E2: Uses adminProcedure (admin-only)", () => {
    const idx = routerContent.indexOf("setEnabledCountryPacks");
    expect(idx).toBeGreaterThan(-1);
    const slice = routerContent.slice(idx - 5, idx + 200);
    expect(slice).toMatch(/adminProcedure/);
  });

  it("E3: Validates enabled array with .array(z.enum(...))", () => {
    // The pattern is z\n.array(z.enum(...)) due to formatting
    expect(routerContent).toMatch(/\.array\(z\.enum\(/);
  });

  it("E4: Calls db.setAdminSetting with \"enabled_country_packs\"", () => {
    expect(routerContent).toMatch(/enabled_country_packs/);
  });

  it("E5: Returns { success: true, enabled }", () => {
    expect(routerContent).toMatch(/success:\s*true/);
  });
});

// ─── F) db.getEnabledCountryPacks fallback logic ─────────────────────────────
describe("F) db.getEnabledCountryPacks fallback", () => {
  const dbContent = fs.readFileSync(path.join(ROOT, "server/db.ts"), "utf-8");

  it("F1: getEnabledCountryPacks is exported from db.ts", () => {
    expect(dbContent).toMatch(/export async function getEnabledCountryPacks/);
  });

  it("F2: Falls back to [\"CA\"] when raw is null", () => {
    const idx = dbContent.indexOf("export async function getEnabledCountryPacks");
    const slice = dbContent.slice(idx, idx + 400);
    expect(slice).toMatch(/return \["CA"\]/);
  });

  it("F3: Parses JSON and validates it is a non-empty array", () => {
    const idx = dbContent.indexOf("export async function getEnabledCountryPacks");
    const slice = dbContent.slice(idx, idx + 400);
    expect(slice).toMatch(/JSON\.parse/);
    expect(slice).toMatch(/Array\.isArray/);
  });
});

// ─── G) drizzle/schema.ts admin_settings table ───────────────────────────────
describe("G) drizzle/schema.ts declares admin_settings table", () => {
  const schemaContent = fs.readFileSync(path.join(ROOT, "drizzle/schema.ts"), "utf-8");

  it("G1: adminSettings table is declared", () => {
    expect(schemaContent).toMatch(/export const adminSettings = mysqlTable\("admin_settings"/);
  });

  it("G2: Has key (varchar primaryKey)", () => {
    const idx = schemaContent.indexOf("adminSettings = mysqlTable");
    const slice = schemaContent.slice(idx, idx + 300);
    expect(slice).toMatch(/key.*primaryKey/);
  });

  it("G3: Has valueJson (text)", () => {
    const idx = schemaContent.indexOf("adminSettings = mysqlTable");
    const slice = schemaContent.slice(idx, idx + 300);
    expect(slice).toMatch(/valueJson.*text/);
  });

  it("G4: AdminSetting and InsertAdminSetting types are exported", () => {
    expect(schemaContent).toMatch(/export type AdminSetting/);
    expect(schemaContent).toMatch(/export type InsertAdminSetting/);
  });
});

// ─── H) db.ts helpers ────────────────────────────────────────────────────────
describe("H) db.ts has all three admin settings helpers", () => {
  const dbContent = fs.readFileSync(path.join(ROOT, "server/db.ts"), "utf-8");

  it("H1: getAdminSetting is exported", () => {
    expect(dbContent).toMatch(/export async function getAdminSetting/);
  });

  it("H2: setAdminSetting is exported", () => {
    expect(dbContent).toMatch(/export async function setAdminSetting/);
  });

  it("H3: getEnabledCountryPacks is exported", () => {
    expect(dbContent).toMatch(/export async function getEnabledCountryPacks/);
  });

  it("H4: setAdminSetting uses onDuplicateKeyUpdate (upsert)", () => {
    const idx = dbContent.indexOf("export async function setAdminSetting");
    const slice = dbContent.slice(idx, idx + 400);
    expect(slice).toMatch(/onDuplicateKeyUpdate/);
  });

  it("H5: getAdminSetting queries by key with limit(1)", () => {
    const idx = dbContent.indexOf("export async function getAdminSetting");
    const slice = dbContent.slice(idx, idx + 300);
    expect(slice).toMatch(/limit\(1\)/);
  });
});
