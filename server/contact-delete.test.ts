/**
 * Phase 9E12 — Contact Delete Button
 * Acceptance tests A–D
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const PROJECT_ROOT = join(__dirname, "..");

function readClientFile(relPath: string): string {
  return readFileSync(join(PROJECT_ROOT, relPath), "utf-8");
}

// ─── A: Trash icon present on each row ───────────────────────────────────────

describe("A: Delete button present", () => {
  it("A1: ContactTableRow has delete-contact-btn data-testid", () => {
    const content = readClientFile("client/src/pages/Outreach.tsx");
    expect(content).toContain("data-testid=\"delete-contact-btn\"");
  });

  it("A2: Trash2 icon is imported from lucide-react", () => {
    const content = readClientFile("client/src/pages/Outreach.tsx");
    expect(content).toContain("Trash2");
    expect(content).toMatch(/import.*Trash2.*from ["']lucide-react["']/);
  });

  it("A3: Trash2 icon used in ContactTableRow Actions cell", () => {
    const content = readClientFile("client/src/pages/Outreach.tsx");
    expect(content).toContain("<Trash2 className");
  });

  it("A4: Mobile card also has delete-contact-btn", () => {
    const content = readClientFile("client/src/pages/Outreach.tsx");
    // Should appear at least twice (desktop + mobile)
    const matches = content.match(/data-testid="delete-contact-btn"/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeGreaterThanOrEqual(2);
  });
});

// ─── B: Confirm dialog ───────────────────────────────────────────────────────

describe("B: Confirm dialog", () => {
  it("B1: Delete confirm dialog exists in Outreach.tsx", () => {
    const content = readClientFile("client/src/pages/Outreach.tsx");
    expect(content).toContain("Delete contact?");
  });

  it("B2: Dialog has Cancel button", () => {
    const content = readClientFile("client/src/pages/Outreach.tsx");
    expect(content).toContain("Cancel");
  });

  it("B3: Dialog has destructive Delete button", () => {
    const content = readClientFile("client/src/pages/Outreach.tsx");
    expect(content).toContain("variant=\"destructive\"");
    expect(content).toMatch(/Deleting|Delete/);
  });

  it("B4: Dialog shows contactToDelete name", () => {
    const content = readClientFile("client/src/pages/Outreach.tsx");
    expect(content).toContain("contactToDelete?.name");
  });

  it("B5: Dialog has warning text about permanent removal", () => {
    const content = readClientFile("client/src/pages/Outreach.tsx");
    expect(content).toContain("permanently removed");
  });
});

// ─── C: Delete mutation wired correctly ──────────────────────────────────────

describe("C: Delete mutation", () => {
  it("C1: contacts.delete mutation is used in Outreach.tsx", () => {
    const content = readClientFile("client/src/pages/Outreach.tsx");
    expect(content).toContain("trpc.contacts.delete.useMutation");
  });

  it("C2: onSuccess invalidates listWithUsage", () => {
    const content = readClientFile("client/src/pages/Outreach.tsx");
    expect(content).toContain("utils.contacts.listWithUsage.invalidate");
  });

  it("C3: onSuccess clears contactToDelete state", () => {
    const content = readClientFile("client/src/pages/Outreach.tsx");
    expect(content).toContain("setContactToDelete(null)");
  });

  it("C4: onSuccess shows success toast", () => {
    const content = readClientFile("client/src/pages/Outreach.tsx");
    expect(content).toContain("toast.success");
    expect(content).toContain("Contact deleted");
  });

  it("C5: onError shows error toast", () => {
    const content = readClientFile("client/src/pages/Outreach.tsx");
    expect(content).toContain("toast.error");
    expect(content).toContain("Failed to delete contact");
  });
});

// ─── D: Backend delete procedure ─────────────────────────────────────────────

describe("D: Backend delete procedure", () => {
  it("D1: contacts.delete procedure exists in routers.ts", () => {
    const content = readFileSync(join(PROJECT_ROOT, "server/routers.ts"), "utf-8");
    expect(content).toContain("delete: protectedProcedure.input(z.object({ id: z.number() }))");
  });

  it("D2: deleteContact db helper exists in db.ts", () => {
    const content = readFileSync(join(PROJECT_ROOT, "server/db.ts"), "utf-8");
    expect(content).toContain("deleteContact");
  });

  it("D3: delete procedure uses user-scoped deletion (userId check)", () => {
    const content = readFileSync(join(PROJECT_ROOT, "server/db.ts"), "utf-8");
    // deleteContact should take userId to prevent deleting other users' contacts
    expect(content).toMatch(/deleteContact.*userId|userId.*deleteContact/);
  });
});
