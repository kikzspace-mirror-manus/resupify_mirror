/**
 * Phase 9E11 — Nav Label Cleanup: Rename "Outreach CRM" to "Contacts"
 * Acceptance tests A–D
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const PROJECT_ROOT = join(__dirname, "..");

function readClientFile(relPath: string): string {
  return readFileSync(join(PROJECT_ROOT, relPath), "utf-8");
}

// ─── A: Sidebar shows "Contacts" ─────────────────────────────────────────────

describe("A: Sidebar label", () => {
  it("A1: DashboardLayout menuItems contains 'Contacts' label for /outreach path", () => {
    const content = readClientFile("client/src/components/DashboardLayout.tsx");
    expect(content).toContain("label: \"Contacts\"");
    expect(content).toContain("path: \"/outreach\"");
  });

  it("A2: DashboardLayout does NOT contain 'Outreach CRM' label", () => {
    const content = readClientFile("client/src/components/DashboardLayout.tsx");
    expect(content).not.toContain("Outreach CRM");
  });

  it("A3: DashboardLayout does NOT contain 'Outreach' as a standalone label", () => {
    const content = readClientFile("client/src/components/DashboardLayout.tsx");
    // Should not have label: "Outreach" (old label)
    expect(content).not.toContain("label: \"Outreach\"");
  });
});

// ─── B: Route is unchanged ────────────────────────────────────────────────────

describe("B: Route unchanged", () => {
  it("B1: /outreach path is still present in DashboardLayout", () => {
    const content = readClientFile("client/src/components/DashboardLayout.tsx");
    expect(content).toContain("path: \"/outreach\"");
  });

  it("B2: App.tsx still has /outreach route", () => {
    const content = readClientFile("client/src/App.tsx");
    expect(content).toContain("/outreach");
  });

  it("B3: No route was changed to /contacts", () => {
    const dashContent = readClientFile("client/src/components/DashboardLayout.tsx");
    const appContent = readClientFile("client/src/App.tsx");
    // The route should remain /outreach, not /contacts
    expect(dashContent).not.toContain("path: \"/contacts\"");
    expect(appContent).not.toContain("Route path=\"/contacts\"");
  });
});

// ─── C: Page header shows "Contacts" ─────────────────────────────────────────

describe("C: Page header", () => {
  it("C1: Outreach.tsx page header shows 'Contacts'", () => {
    const content = readClientFile("client/src/pages/Outreach.tsx");
    expect(content).toContain(">Contacts<");
  });

  it("C2: Outreach.tsx does NOT contain 'Outreach CRM' as user-facing text", () => {
    const content = readClientFile("client/src/pages/Outreach.tsx");
    expect(content).not.toContain("Outreach CRM");
  });

  it("C3: Page header h1 contains 'Contacts'", () => {
    const content = readClientFile("client/src/pages/Outreach.tsx");
    // The h1 tag should contain Contacts
    expect(content).toMatch(/h1[^>]*>Contacts<\/h1>/);
  });
});

// ─── D: No other user-facing "Outreach CRM" strings ──────────────────────────

describe("D: No remaining Outreach CRM strings", () => {
  it("D1: No 'Outreach CRM' in Outreach.tsx", () => {
    const content = readClientFile("client/src/pages/Outreach.tsx");
    expect(content).not.toContain("Outreach CRM");
  });

  it("D2: No 'Outreach CRM' in DashboardLayout.tsx", () => {
    const content = readClientFile("client/src/components/DashboardLayout.tsx");
    expect(content).not.toContain("Outreach CRM");
  });

  it("D3: No 'Outreach CRM' in App.tsx", () => {
    const content = readClientFile("client/src/App.tsx");
    expect(content).not.toContain("Outreach CRM");
  });
});
