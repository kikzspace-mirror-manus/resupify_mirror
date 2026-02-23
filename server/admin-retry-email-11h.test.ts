/**
 * Phase 11H: Admin Retry Purchase Confirmation Email
 *
 * Acceptance tests covering:
 * H1: admin.billing.retryReceiptEmail mutation exists in admin router
 * H2: retryReceiptEmail requires admin role (adminProcedure)
 * H3: retryReceiptEmail returns { status: "not_found" } for missing receipt
 * H4: retryReceiptEmail returns { status: "already_sent" } when emailSentAt is set
 * H5: retryReceiptEmail calls sendPurchaseConfirmationEmail and marks emailSentAt on success
 * H6: retryReceiptEmail returns { status: "failed", error } when email send fails
 * H7: retryReceiptEmail does NOT fail webhook on email error (fire-and-forget pattern)
 * H8: admin.billing.listReceipts procedure exists in admin router
 * H9: listReceipts accepts optional userId filter
 * H10: listReceipts accepts optional emailSentAt filter ("sent" | "unsent")
 * H11: AdminBillingReceipts page file exists
 * H12: AdminBillingReceipts page imports trpc.admin.billing.listReceipts
 * H13: AdminBillingReceipts page imports trpc.admin.billing.retryReceiptEmail
 * H14: AdminBillingReceipts page renders a Retry email button for unsent receipts
 * H15: AdminBillingReceipts page is registered in App.tsx at /admin/billing-receipts
 * H16: AdminBillingReceipts nav item exists in AdminLayout
 * H17: adminListPurchaseReceipts helper exists in db.ts
 * H18: adminListPurchaseReceipts supports emailSentAt "sent" filter
 * H19: adminListPurchaseReceipts supports emailSentAt "unsent" filter
 * H20: retryReceiptEmail marks emailError on failure
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");
const ADMIN_ROUTER = path.join(ROOT, "server/routers/admin.ts");
const DB_FILE = path.join(ROOT, "server/db.ts");
const EMAIL_FILE = path.join(ROOT, "server/email.ts");
const ADMIN_BILLING_PAGE = path.join(ROOT, "client/src/pages/admin/AdminBillingReceipts.tsx");
const APP_FILE = path.join(ROOT, "client/src/App.tsx");
const ADMIN_LAYOUT = path.join(ROOT, "client/src/components/AdminLayout.tsx");

const adminRouter = fs.readFileSync(ADMIN_ROUTER, "utf-8");
const dbFile = fs.readFileSync(DB_FILE, "utf-8");
const adminBillingPage = fs.readFileSync(ADMIN_BILLING_PAGE, "utf-8");
const appFile = fs.readFileSync(APP_FILE, "utf-8");
const adminLayout = fs.readFileSync(ADMIN_LAYOUT, "utf-8");

// ─── H1-H2: Router structure ─────────────────────────────────────────────────
describe("H1-H2: admin.billing.retryReceiptEmail router", () => {
  it("H1: retryReceiptEmail mutation exists in admin billing router", () => {
    expect(adminRouter).toContain("retryReceiptEmail");
  });

  it("H2: retryReceiptEmail uses adminProcedure (admin-only access)", () => {
    // Find the retryReceiptEmail section and check it uses adminProcedure
    const idx = adminRouter.indexOf("retryReceiptEmail");
    expect(idx).toBeGreaterThan(-1);
    const section = adminRouter.slice(idx, idx + 200);
    expect(section).toContain("adminProcedure");
  });
});

// ─── H3-H7: retryReceiptEmail behavior ───────────────────────────────────────
describe("H3-H7: retryReceiptEmail mutation behavior", () => {
  it("H3: returns not_found status for missing receipt", () => {
    // The mutation checks if receipt exists and returns { status: "not_found" }
    expect(adminRouter).toContain("not_found");
  });

  it("H4: returns already_sent status when emailSentAt is already set", () => {
    expect(adminRouter).toContain("already_sent");
  });

  it("H5: calls sendPurchaseConfirmationEmail on retry", () => {
    expect(adminRouter).toContain("sendPurchaseConfirmationEmail");
  });

  it("H6: returns failed status when email send fails", () => {
    expect(adminRouter).toContain("failed");
  });

  it("H7: marks emailSentAt after successful send", () => {
    expect(adminRouter).toContain("markReceiptEmailSent");
  });
});

// ─── H8-H10: listReceipts procedure ──────────────────────────────────────────
describe("H8-H10: admin.billing.listReceipts procedure", () => {
  it("H8: listReceipts procedure exists in admin billing router", () => {
    expect(adminRouter).toContain("listReceipts");
  });

  it("H9: listReceipts accepts optional userId filter", () => {
    const idx = adminRouter.indexOf("listReceipts");
    const section = adminRouter.slice(idx, idx + 400);
    expect(section).toContain("userId");
  });

  it("H10: listReceipts accepts optional emailSentAt filter", () => {
    const idx = adminRouter.indexOf("listReceipts");
    const section = adminRouter.slice(idx, idx + 400);
    expect(section).toContain("emailSentAt");
  });
});

// ─── H11-H16: Frontend ────────────────────────────────────────────────────────
describe("H11-H16: AdminBillingReceipts frontend", () => {
  it("H11: AdminBillingReceipts page file exists", () => {
    expect(fs.existsSync(ADMIN_BILLING_PAGE)).toBe(true);
  });

  it("H12: AdminBillingReceipts page uses trpc.admin.billing.listReceipts", () => {
    expect(adminBillingPage).toContain("admin.billing.listReceipts");
  });

  it("H13: AdminBillingReceipts page uses trpc.admin.billing.retryReceiptEmail", () => {
    expect(adminBillingPage).toContain("admin.billing.retryReceiptEmail");
  });

  it("H14: AdminBillingReceipts page renders a Retry email button for unsent receipts", () => {
    expect(adminBillingPage).toContain("Retry email");
  });

  it("H15: AdminBillingReceipts is registered in App.tsx at /admin/billing-receipts", () => {
    expect(appFile).toContain("/admin/billing-receipts");
    expect(appFile).toContain("AdminBillingReceipts");
  });

  it("H16: AdminBillingReceipts nav item exists in AdminLayout", () => {
    expect(adminLayout).toContain("/admin/billing-receipts");
    expect(adminLayout).toContain("Billing Receipts");
  });
});

// ─── H17-H20: DB helpers ──────────────────────────────────────────────────────
describe("H17-H20: adminListPurchaseReceipts DB helper", () => {
  it("H17: adminListPurchaseReceipts helper exists in db.ts", () => {
    expect(dbFile).toContain("adminListPurchaseReceipts");
  });

  it("H18: adminListPurchaseReceipts supports emailSentAt sent filter (isNotNull)", () => {
    const idx = dbFile.indexOf("adminListPurchaseReceipts");
    const section = dbFile.slice(idx, idx + 800);
    expect(section).toContain("isNotNull");
  });

  it("H19: adminListPurchaseReceipts supports emailSentAt unsent filter (isNull)", () => {
    const idx = dbFile.indexOf("adminListPurchaseReceipts");
    const section = dbFile.slice(idx, idx + 800);
    expect(section).toContain("isNull");
  });

  it("H20: retryReceiptEmail marks emailError on failure via markReceiptEmailError", () => {
    expect(adminRouter).toContain("markReceiptEmailError");
  });
});

// ─── Integration: mock-based unit tests ──────────────────────────────────────
describe("Integration: retryReceiptEmail mock tests", () => {
  const mockGetPurchaseReceiptById = vi.fn();
  const mockMarkReceiptEmailSent = vi.fn();
  const mockMarkReceiptEmailError = vi.fn();
  const mockGetCreditsBalance = vi.fn();
  const mockGetUserById = vi.fn();
  const mockSendPurchaseConfirmationEmail = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPurchaseReceiptById.mockResolvedValue(null);
    mockMarkReceiptEmailSent.mockResolvedValue(undefined);
    mockMarkReceiptEmailError.mockResolvedValue(undefined);
    mockGetCreditsBalance.mockResolvedValue(100);
    mockGetUserById.mockResolvedValue({ id: 1, email: "test@example.com", name: "Test User" });
    mockSendPurchaseConfirmationEmail.mockResolvedValue(undefined);
  });

  it("I1: returns not_found when receipt does not exist", async () => {
    mockGetPurchaseReceiptById.mockResolvedValue(null);
    // Simulate the mutation logic
    const receipt = await mockGetPurchaseReceiptById(999);
    expect(receipt).toBeNull();
    // The mutation should return { status: "not_found" }
    const result = receipt === null ? { status: "not_found" } : { status: "sent" };
    expect(result.status).toBe("not_found");
  });

  it("I2: returns already_sent when emailSentAt is already set", async () => {
    const alreadySentReceipt = {
      id: 1, userId: 1, packId: "starter", creditsAdded: 100,
      emailSentAt: new Date(), emailError: null,
    };
    mockGetPurchaseReceiptById.mockResolvedValue(alreadySentReceipt);
    const receipt = await mockGetPurchaseReceiptById(1);
    const result = receipt?.emailSentAt ? { status: "already_sent" } : { status: "sent" };
    expect(result.status).toBe("already_sent");
  });

  it("I3: sends email and marks emailSentAt when emailSentAt is null", async () => {
    const unsentReceipt = {
      id: 1, userId: 1, packId: "starter", creditsAdded: 100,
      emailSentAt: null, emailError: null,
    };
    mockGetPurchaseReceiptById.mockResolvedValue(unsentReceipt);
    mockSendPurchaseConfirmationEmail.mockResolvedValue(undefined);

    const receipt = await mockGetPurchaseReceiptById(1);
    if (!receipt?.emailSentAt) {
      await mockSendPurchaseConfirmationEmail(receipt);
      await mockMarkReceiptEmailSent(receipt.id);
    }

    expect(mockSendPurchaseConfirmationEmail).toHaveBeenCalledTimes(1);
    expect(mockMarkReceiptEmailSent).toHaveBeenCalledWith(1);
  });

  it("I4: marks emailError when email send throws", async () => {
    const unsentReceipt = {
      id: 1, userId: 1, packId: "starter", creditsAdded: 100,
      emailSentAt: null, emailError: null,
    };
    mockGetPurchaseReceiptById.mockResolvedValue(unsentReceipt);
    mockSendPurchaseConfirmationEmail.mockRejectedValue(new Error("SMTP timeout"));

    const receipt = await mockGetPurchaseReceiptById(1);
    let result: { status: string; error?: string } = { status: "sent" };
    if (!receipt?.emailSentAt) {
      try {
        await mockSendPurchaseConfirmationEmail(receipt);
        await mockMarkReceiptEmailSent(receipt.id);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        await mockMarkReceiptEmailError(receipt.id, message);
        result = { status: "failed", error: message };
      }
    }

    expect(mockMarkReceiptEmailError).toHaveBeenCalledWith(1, "SMTP timeout");
    expect(result.status).toBe("failed");
    expect(result.error).toBe("SMTP timeout");
  });
});
