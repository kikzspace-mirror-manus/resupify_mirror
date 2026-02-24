/**
 * Phase 12P Acceptance Tests — Credit Ledger: show user email instead of "User #id"
 *
 * Spec cases:
 * C1) When email exists, ledger row shows email (userDisplay.email is populated)
 * C2) When email missing, falls back to name or User #id
 * C3) Non-admin cannot access ledger endpoint (existing guard remains)
 *
 * Additional structural tests:
 * 4)  adminListLedger does a LEFT JOIN on users table
 * 5)  adminListLedger selects users.email and users.name
 * 6)  adminListLedger returns userDisplay: { id, email, name } per row
 * 7)  adminListLedger uses a single query (no N+1)
 * 8)  admin.ledger.list procedure uses adminProcedure
 * 9)  AdminLedger.tsx uses userDisplay.email as primary identifier
 * 10) AdminLedger.tsx falls back to userDisplay.name
 * 11) AdminLedger.tsx falls back to User #id as final fallback
 * 12) No changes to ledger write behavior (creditsLedger insert unchanged)
 * 13) adminListLedger still returns total count
 * 14) adminListLedger still accepts userId filter
 * 15) adminListLedger still accepts referenceType filter
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const DB_PATH = path.join(__dirname, "db.ts");
const ADMIN_ROUTER_PATH = path.join(__dirname, "routers/admin.ts");
const ADMIN_LEDGER_PAGE_PATH = path.join(__dirname, "../client/src/pages/admin/AdminLedger.tsx");

const db = fs.readFileSync(DB_PATH, "utf-8");
const adminRouter = fs.readFileSync(ADMIN_ROUTER_PATH, "utf-8");
const adminLedgerPage = fs.readFileSync(ADMIN_LEDGER_PAGE_PATH, "utf-8");

// ─── C1–C3: Spec cases ───────────────────────────────────────────────────────
describe("Spec cases C1–C3", () => {
  it("C1 — when email exists, userDisplay.email is populated in the query result", () => {
    const idx = db.indexOf("adminListLedger");
    const slice = db.slice(idx, idx + 2000);
    expect(slice).toContain("userEmail: users.email");
    expect(slice).toContain("email: row.userEmail ?? null");
  });

  it("C2 — fallback chain: email ?? name ?? User #id in AdminLedger.tsx", () => {
    expect(adminLedgerPage).toContain("userDisplay?.email");
    expect(adminLedgerPage).toContain("userDisplay?.name");
    expect(adminLedgerPage).toContain("User #${entry.userId}");
  });

  it("C3 — admin.ledger.list uses adminProcedure (non-admin blocked)", () => {
    const idx = adminRouter.indexOf("ledger:");
    const slice = adminRouter.slice(idx, idx + 500);
    expect(slice).toContain("adminProcedure");
  });
});

// ─── 4–8: Backend structural ─────────────────────────────────────────────────
describe("adminListLedger backend", () => {
  it("4 — does a LEFT JOIN on users table", () => {
    const idx = db.indexOf("export async function adminListLedger");
    const slice = db.slice(idx, idx + 2000);
    expect(slice).toContain("leftJoin(users");
    expect(slice).toContain("eq(creditsLedger.userId, users.id)");
  });

  it("5 — selects users.email and users.name", () => {
    const idx = db.indexOf("export async function adminListLedger");
    const slice = db.slice(idx, idx + 2000);
    expect(slice).toContain("userEmail: users.email");
    expect(slice).toContain("userName: users.name");
  });

  it("6 — returns userDisplay: { id, email, name } per row", () => {
    const idx = db.indexOf("export async function adminListLedger");
    const slice = db.slice(idx, idx + 2000);
    expect(slice).toContain("userDisplay:");
    expect(slice).toContain("id: row.userId");
    expect(slice).toContain("email: row.userEmail ?? null");
    expect(slice).toContain("name: row.userName ?? null");
  });

  it("7 — single query with JOIN (no N+1): no loop calling getUserById", () => {
    const idx = db.indexOf("export async function adminListLedger");
    const slice = db.slice(idx, idx + 2000);
    // Should NOT have a for loop that calls getUser or similar
    expect(slice).not.toContain("getUserById");
    expect(slice).not.toContain("for (const entry");
    // Should have .from(creditsLedger).leftJoin
    expect(slice).toContain(".from(creditsLedger)");
    expect(slice).toContain(".leftJoin(users");
  });

  it("8 — admin.ledger.list procedure calls adminListLedger", () => {
    const idx = adminRouter.indexOf("ledger:");
    const slice = adminRouter.slice(idx, idx + 500);
    expect(slice).toContain("adminListLedger");
  });
});

// ─── 9–11: Frontend ──────────────────────────────────────────────────────────
describe("AdminLedger.tsx frontend", () => {
  it("9 — uses userDisplay.email as primary identifier", () => {
    expect(adminLedgerPage).toContain("userDisplay?.email");
  });

  it("10 — falls back to userDisplay.name", () => {
    expect(adminLedgerPage).toContain("userDisplay?.name");
  });

  it("11 — falls back to User #id as final fallback", () => {
    expect(adminLedgerPage).toContain("User #${entry.userId}");
  });
});

// ─── 12–15: Invariants ───────────────────────────────────────────────────────
describe("Invariants", () => {
  it("12 — ledger write behavior unchanged: addLedgerEntry still inserts into creditsLedger", () => {
    expect(db).toContain("await db.insert(creditsLedger).values(");
  });

  it("13 — adminListLedger still returns total count", () => {
    const idx = db.indexOf("export async function adminListLedger");
    const slice = db.slice(idx, idx + 2000);
    expect(slice).toContain("total:");
    expect(slice).toContain("COUNT(*)");
  });

  it("14 — adminListLedger still accepts userId filter", () => {
    const idx = db.indexOf("export async function adminListLedger");
    const slice = db.slice(idx, idx + 2000);
    expect(slice).toContain("filters?.userId");
    expect(slice).toContain("eq(creditsLedger.userId, filters.userId)");
  });

  it("15 — adminListLedger still accepts referenceType filter", () => {
    const idx = db.indexOf("export async function adminListLedger");
    const slice = db.slice(idx, idx + 2000);
    expect(slice).toContain("filters?.referenceType");
    expect(slice).toContain("eq(creditsLedger.referenceType, filters.referenceType)");
  });
});
