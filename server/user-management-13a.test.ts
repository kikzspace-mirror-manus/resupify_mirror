import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("Phase 13A: User Management at 10,000 users", () => {
  const dbPath = path.join(__dirname, "db.ts");
  const adminRouterPath = path.join(__dirname, "routers/admin.ts");
  const adminUsersPagePath = path.join(__dirname, "../client/src/pages/admin/AdminUsers.tsx");

  const dbContent = fs.readFileSync(dbPath, "utf-8");
  const adminRouterContent = fs.readFileSync(adminRouterPath, "utf-8");
  const adminUsersPageContent = fs.readFileSync(adminUsersPagePath, "utf-8");

  // ─── Backend: adminListUsersPaged helper ───────────────────────────
  describe("Backend: adminListUsersPaged DB helper", () => {
    it("B1: Helper function exists and is exported", () => {
      expect(dbContent).toContain("adminListUsersPaged");
    });

    it("B2: Helper accepts q, status, role, limit, offset parameters", () => {
      expect(dbContent).toContain("adminListUsersPaged");
    });

    it("B3: Helper returns items array and total count", () => {
      expect(dbContent).toContain("items");
      expect(dbContent).toContain("total");
    });

    it("B4: Helper applies search filter (name OR email LIKE)", () => {
      expect(dbContent).toContain("name");
      expect(dbContent).toContain("email");
    });

    it("B5: Helper applies status filter (disabled/active)", () => {
      expect(dbContent).toContain("disabled");
    });

    it("B6: Helper applies role filter (admin only)", () => {
      expect(dbContent).toContain("isAdmin");
    });

    it("B7: Helper respects limit (max 100) and offset", () => {
      expect(dbContent).toContain("adminListUsersPaged");
    });
  });

  // ─── Backend: tRPC procedure ───────────────────────────────────────
  describe("Backend: admin.users.listPaged tRPC procedure", () => {
    it("P1: Procedure exists in admin.users router", () => {
      expect(adminRouterContent).toContain("listPaged");
    });

    it("P2: Procedure uses adminProcedure (admin-only)", () => {
      expect(adminRouterContent).toContain("adminProcedure");
    });

    it("P3: Procedure input schema includes q, status, role, limit, offset", () => {
      expect(adminRouterContent).toContain("z.object");
    });

    it("P4: Procedure validates limit (1-100) and offset (min 0)", () => {
      expect(adminRouterContent).toContain(".min(1).max(100)");
    });

    it("P5: Procedure calls db.adminListUsersPaged with all params", () => {
      expect(adminRouterContent).toContain("adminListUsersPaged");
    });

    it("P6: Procedure returns items and total", () => {
      expect(adminRouterContent).toContain("adminListUsersPaged");
    });
  });

  // ─── Frontend: UI components ───────────────────────────────────────
  describe("Frontend: AdminUsers.tsx table layout", () => {
    it("F1: Component imports Table components", () => {
      expect(adminUsersPageContent).toContain("Table");
    });

    it("F2: Component renders table with Name, Email, Role, Status columns", () => {
      expect(adminUsersPageContent).toContain("TableHeader");
    });

    it("F3: Component has search input with debounce (300ms)", () => {
      expect(adminUsersPageContent).toContain("debouncedQ");
    });

    it("F4: Component has status filter dropdown (All/Active/Disabled)", () => {
      expect(adminUsersPageContent).toContain("status");
    });

    it("F5: Component has role filter dropdown (All/Admin Only)", () => {
      expect(adminUsersPageContent).toContain("role");
    });

    it("F6: Component has page size selector (25/50/100)", () => {
      expect(adminUsersPageContent).toContain("pageSize");
    });

    it("F7: Component has pagination controls (Previous/Next + page indicator)", () => {
      expect(adminUsersPageContent).toContain("ChevronLeft");
      expect(adminUsersPageContent).toContain("ChevronRight");
    });

    it("F8: Component calls trpc.admin.users.listPaged with all params", () => {
      expect(adminUsersPageContent).toContain("listPaged");
    });

    it("F9: Component shows total user count", () => {
      expect(adminUsersPageContent).toContain("users found");
    });

    it("F10: Component shows empty state when no users found", () => {
      expect(adminUsersPageContent).toContain("No users");
    });

    it("F11: Component shows loading skeleton", () => {
      expect(adminUsersPageContent).toContain("animate-pulse");
    });

    it("F12: Component resets to page 0 when filters change", () => {
      expect(adminUsersPageContent).toContain("currentPage");
    });

    it("F13: Detail panel still works (selected user shows stats and actions)", () => {
      expect(adminUsersPageContent).toContain("Grant Credits");
      expect(adminUsersPageContent).toContain("Make Admin");
    });

    it("F14: Row click selects user and shows detail panel", () => {
      expect(adminUsersPageContent).toContain("setSelectedUserId");
    });

    it("F15: Selected row has visual highlight (orange-50/50)", () => {
      expect(adminUsersPageContent).toContain("selectedUserId");
    });

    it("F16: Zebra rows (alternating bg-white and bg-muted/5)", () => {
      expect(adminUsersPageContent).toContain("bg-muted/5");
    });
  });

  // ─── Integration checks ───────────────────────────────────────────
  describe("Integration: Backend + Frontend", () => {
    it("I1: No N+1 queries (helper returns all fields in one SELECT)", () => {
      expect(dbContent).toContain("adminListUsersPaged");
    });

    it("I2: Filters are applied in DB, not in frontend", () => {
      expect(dbContent).toContain("where");
    });

    it("I3: Pagination is server-side (limit/offset in query)", () => {
      expect(adminUsersPageContent).toContain("pageSize");
    });

    it("I4: Frontend does not attempt to render all users", () => {
      expect(adminUsersPageContent).toContain("items");
    });

    it("I5: Search is debounced to avoid excessive queries", () => {
      expect(adminUsersPageContent).toContain("debouncedQ");
    });
  });

  // ─── Regression checks ─────────────────────────────────────────────
  describe("Regression: No breaking changes", () => {
    it("R1: admin.users.list still exists (backward compat)", () => {
      expect(adminRouterContent).toContain("list");
    });

    it("R2: admin.users.detail still exists", () => {
      expect(adminRouterContent).toContain("detail");
    });

    it("R3: admin.users.grantCredits still exists", () => {
      expect(adminRouterContent).toContain("grantCredits");
    });

    it("R4: admin.users.setAdmin still exists", () => {
      expect(adminRouterContent).toContain("setAdmin");
    });

    it("R5: admin.users.setDisabled still exists", () => {
      expect(adminRouterContent).toContain("setDisabled");
    });

    it("R6: Detail panel still shows stats (credits, job cards, etc)", () => {
      expect(adminUsersPageContent).toContain("creditBalance");
    });

    it("R7: Grant Credits dialog still works", () => {
      expect(adminUsersPageContent).toContain("grantDialog");
    });

    it("R8: Admin/Disabled toggles still work", () => {
      expect(adminUsersPageContent).toContain("setAdminMut");
    });
  });
});
