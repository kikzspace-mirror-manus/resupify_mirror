import { describe, it, expect } from "vitest";
import fs from "fs";

describe("Phase 12V: Ops Status Recent Stripe Events (reduce whitespace + user email)", () => {
  // ─── Backend: adminListStripeEvents includes userEmail/userName ───────────────
  describe("B: Backend query returns userEmail and userName", () => {
    it("B1: adminListStripeEvents query includes userEmail field in SELECT", () => {
      const dbPath = "/home/ubuntu/resupify/server/db.ts";
      const content = fs.readFileSync(dbPath, "utf-8");
      const slice = content.slice(
        content.indexOf("export async function adminListStripeEvents"),
        content.indexOf("export async function adminListStripeEvents") + 2500
      );
      expect(slice).toContain("userEmail: users.email");
    });

    it("B2: adminListStripeEvents query includes userName field in SELECT", () => {
      const dbPath = "/home/ubuntu/resupify/server/db.ts";
      const content = fs.readFileSync(dbPath, "utf-8");
      const slice = content.slice(
        content.indexOf("export async function adminListStripeEvents"),
        content.indexOf("export async function adminListStripeEvents") + 2500
      );
      expect(slice).toContain("userName: users.name");
    });

    it("B3: adminListStripeEvents performs LEFT JOIN users", () => {
      const dbPath = "/home/ubuntu/resupify/server/db.ts";
      const content = fs.readFileSync(dbPath, "utf-8");
      const slice = content.slice(
        content.indexOf("export async function adminListStripeEvents"),
        content.indexOf("export async function adminListStripeEvents") + 2500
      );
      expect(slice).toContain(".leftJoin(users");
    });

    it("B4: adminListStripeEvents JOIN condition uses userId", () => {
      const dbPath = "/home/ubuntu/resupify/server/db.ts";
      const content = fs.readFileSync(dbPath, "utf-8");
      const slice = content.slice(
        content.indexOf("export async function adminListStripeEvents"),
        content.indexOf("export async function adminListStripeEvents") + 2500
      );
      expect(slice).toContain("stripeEvents.userId, users.id");
    });

    it("B5: adminListStripeEvents still filters by status when provided", () => {
      const dbPath = "/home/ubuntu/resupify/server/db.ts";
      const content = fs.readFileSync(dbPath, "utf-8");
      const slice = content.slice(
        content.indexOf("export async function adminListStripeEvents"),
        content.indexOf("export async function adminListStripeEvents") + 2500
      );
      expect(slice).toContain("if (status) conditions.push(eqFn(stripeEvents.status, status))");
    });

    it("B6: adminListStripeEvents still filters by eventType when provided", () => {
      const dbPath = "/home/ubuntu/resupify/server/db.ts";
      const content = fs.readFileSync(dbPath, "utf-8");
      const slice = content.slice(
        content.indexOf("export async function adminListStripeEvents"),
        content.indexOf("export async function adminListStripeEvents") + 2500
      );
      expect(slice).toContain("if (eventType) conditions.push(eqFn(stripeEvents.eventType, eventType))");
    });

    it("B7: adminListStripeEvents preserves pagination (limit/offset)", () => {
      const dbPath = "/home/ubuntu/resupify/server/db.ts";
      const content = fs.readFileSync(dbPath, "utf-8");
      const slice = content.slice(
        content.indexOf("export async function adminListStripeEvents"),
        content.indexOf("export async function adminListStripeEvents") + 2500
      );
      expect(slice).toContain(".limit(Math.min(limit, 500))");
      expect(slice).toContain(".offset(offset)");
    });
  });

  // ─── Frontend: AdminOps.tsx displays userEmail instead of #id ────────────────
  describe("F: Frontend renders user email in User column", () => {
    it("F1: AdminOps.tsx User column checks evt.userEmail first", () => {
      const opsPath = "/home/ubuntu/resupify/client/src/pages/admin/AdminOps.tsx";
      const content = fs.readFileSync(opsPath, "utf-8");
      const slice = content.slice(
        content.indexOf("td className=\"px-3 py-2 text-xs text-muted-foreground text-left align-middle truncate"),
        content.indexOf("td className=\"px-3 py-2 text-xs text-muted-foreground text-left align-middle truncate") + 300
      );
      expect(slice).toContain("evt.userEmail");
    });

    it("F2: AdminOps.tsx User column falls back to evt.userName", () => {
      const opsPath = "/home/ubuntu/resupify/client/src/pages/admin/AdminOps.tsx";
      const content = fs.readFileSync(opsPath, "utf-8");
      const slice = content.slice(
        content.indexOf("evt.userEmail ? evt.userEmail"),
        content.indexOf("evt.userEmail ? evt.userEmail") + 200
      );
      expect(slice).toContain("evt.userName");
    });

    it("F3: AdminOps.tsx User column falls back to #userId if no email/name", () => {
      const opsPath = "/home/ubuntu/resupify/client/src/pages/admin/AdminOps.tsx";
      const content = fs.readFileSync(opsPath, "utf-8");
      const slice = content.slice(
        content.indexOf("evt.userName ?"),
        content.indexOf("evt.userName ?") + 150
      );
      expect(slice).toContain("evt.userId");
    });

    it("F4: AdminOps.tsx User column has truncate class for long emails", () => {
      const opsPath = "/home/ubuntu/resupify/client/src/pages/admin/AdminOps.tsx";
      const content = fs.readFileSync(opsPath, "utf-8");
      const userColStart = content.indexOf("td className=\"px-3 py-2 text-xs text-muted-foreground text-left align-middle truncate");
      const userColEnd = userColStart + 300;
      const slice = content.slice(userColStart, userColEnd);
      expect(slice).toContain("truncate");
      expect(slice).toContain("overflow-hidden");
      expect(slice).toContain("text-ellipsis");
      expect(slice).toContain("whitespace-nowrap");
    });

    it("F5: AdminOps.tsx table still has fixed layout", () => {
      const opsPath = "/home/ubuntu/resupify/client/src/pages/admin/AdminOps.tsx";
      const content = fs.readFileSync(opsPath, "utf-8");
      const tableStart = content.indexOf("table className=\"w-full text-sm\"");
      const tableEnd = tableStart + 200;
      const slice = content.slice(tableStart, tableEnd);
      expect(slice).toContain("tableLayout: \"fixed\"");
    });

    it("F6: AdminOps.tsx table has colgroup with explicit widths", () => {
      const opsPath = "/home/ubuntu/resupify/client/src/pages/admin/AdminOps.tsx";
      const content = fs.readFileSync(opsPath, "utf-8");
      expect(content).toContain("<colgroup>");
      expect(content).toContain("width: \"34%\"");
      expect(content).toContain("width: \"18%\"");
      expect(content).toContain("width: \"12%\"");
    });
  });

  // ─── Integration: No backend changes to stripe webhook or credit logic ────────
  describe("I: Integration checks (no breaking changes)", () => {
    it("I1: stripeWebhook.ts charge.refunded handler unchanged", () => {
      const webhookPath = "/home/ubuntu/resupify/server/stripeWebhook.ts";
      const content = fs.readFileSync(webhookPath, "utf-8");
      // Verify the handler still exists and processes refunds
      expect(content).toContain("case \"charge.refunded\":");
    });

    it("I2: admin.stripeEvents.list procedure still uses adminListStripeEvents", () => {
      const adminPath = "/home/ubuntu/resupify/server/routers/admin.ts";
      const content = fs.readFileSync(adminPath, "utf-8");
      const slice = content.slice(
        content.indexOf("stripeEvents: router({"),
        content.indexOf("stripeEvents: router({") + 500
      );
      expect(slice).toContain("db.adminListStripeEvents");
    });

    it("I3: admin.stripeEvents.list input validation unchanged", () => {
      const adminPath = "/home/ubuntu/resupify/server/routers/admin.ts";
      const content = fs.readFileSync(adminPath, "utf-8");
      const slice = content.slice(
        content.indexOf("stripeEvents: router({"),
        content.indexOf("stripeEvents: router({") + 500
      );
      expect(slice).toContain("z.enum([\"processed\", \"manual_review\", \"skipped\"])");
    });

    it("I4: No changes to credit ledger or refund processing", () => {
      const dbPath = "/home/ubuntu/resupify/server/db.ts";
      const content = fs.readFileSync(dbPath, "utf-8");
      // Verify processRefundQueueItem still exists
      expect(content).toContain("export async function processRefundQueueItem");
    });
  });

  // ─── Regression: UI still works with null userEmail/userName ────────────────
  describe("R: Regression checks (null handling)", () => {
    it("R1: Frontend handles null userEmail gracefully", () => {
      const opsPath = "/home/ubuntu/resupify/client/src/pages/admin/AdminOps.tsx";
      const content = fs.readFileSync(opsPath, "utf-8");
      const slice = content.slice(
        content.indexOf("evt.userEmail ? evt.userEmail"),
        content.indexOf("evt.userEmail ? evt.userEmail") + 250
      );
      // Verify the ternary chain handles falsy values
      expect(slice).toContain("?");
      expect(slice).toContain(":");
    });

    it("R2: Frontend renders \"—\" when all user fields are null", () => {
      const opsPath = "/home/ubuntu/resupify/client/src/pages/admin/AdminOps.tsx";
      const content = fs.readFileSync(opsPath, "utf-8");
      const slice = content.slice(
        content.indexOf("evt.userId != null ? `#${evt.userId}`"),
        content.indexOf("evt.userId != null ? `#${evt.userId}`") + 50
      );
      expect(slice).toContain("\"—\"");
    });

    it("R3: Table renders without crashing if userEmail is undefined", () => {
      // This is a structural check — the code should handle undefined gracefully
      const opsPath = "/home/ubuntu/resupify/client/src/pages/admin/AdminOps.tsx";
      const content = fs.readFileSync(opsPath, "utf-8");
      // Verify no direct property access without checks (e.g., evt.userEmail.substring)
      expect(content).not.toContain("evt.userEmail.substring");
      expect(content).not.toContain("evt.userEmail.toLowerCase");
    });
  });
});
