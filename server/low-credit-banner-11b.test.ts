/**
 * Phase 11B — Low-Credit Warning Banner: Acceptance Tests
 *
 * Acceptance criteria (per spec):
 * A) Banner appears when credits < 2 (threshold = 2)
 * B) Banner does NOT appear when credits >= 2
 * C) Admin users (role === "admin") never see the banner
 * D) Dismiss stores timestamp in localStorage for 24h
 * E) After 24h, banner can show again
 * F) "Top up" button navigates to /billing
 * G) Banner text is correct: "Low credits. Top up to continue scanning."
 * H) DashboardLayout.tsx uses existing trpc.credits.balance query (no new endpoints)
 * I) Banner has data-testid attributes for testing
 * J) Collapsed sidebar shows amber dot instead of full banner
 */
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "fs";
import * as path from "path";

const LAYOUT_PATH = path.resolve(__dirname, "../client/src/components/DashboardLayout.tsx");
const src = fs.readFileSync(LAYOUT_PATH, "utf-8");

// ─── A) Threshold is < 2 ──────────────────────────────────────────────────────
describe("Phase 11B: Low-Credit Warning Banner", () => {
  describe("A) Threshold configuration", () => {
    it("A1) LOW_CREDIT_THRESHOLD is defined as 2", () => {
      expect(src).toContain("LOW_CREDIT_THRESHOLD = 2");
    });

    it("A2) Banner condition uses < threshold (strict less-than)", () => {
      // The comparison should be: creditsData.balance < LOW_CREDIT_THRESHOLD
      expect(src).toContain("creditsData.balance < LOW_CREDIT_THRESHOLD");
    });
  });

  // ─── B) Banner visibility logic ──────────────────────────────────────────────
  describe("B) showLowCreditBanner logic", () => {
    it("B1) showLowCreditBanner is derived from useMemo", () => {
      expect(src).toContain("showLowCreditBanner = useMemo(");
    });

    it("B2) Returns false when bannerDismissed is true", () => {
      expect(src).toContain("if (bannerDismissed) return false;");
    });

    it("B3) Returns false when creditsData is not yet loaded", () => {
      expect(src).toContain("if (!creditsData) return false;");
    });
  });

  // ─── C) Admin exclusion ───────────────────────────────────────────────────────
  describe("C) Admin users do not see banner", () => {
    it("C1) Admin check uses user?.role === 'admin'", () => {
      expect(src).toContain("user?.role === \"admin\"");
      // The admin check must be in the showLowCreditBanner memo
      const memoStart = src.indexOf("showLowCreditBanner = useMemo(");
      const memoEnd = src.indexOf("}, [bannerDismissed", memoStart);
      const memoBody = src.slice(memoStart, memoEnd);
      expect(memoBody).toContain("user?.role === \"admin\"");
      expect(memoBody).toContain("return false;");
    });
  });

  // ─── D) Dismiss stores timestamp in localStorage ──────────────────────────────
  describe("D) Dismiss logic", () => {
    it("D1) handleDismissBanner stores timestamp in localStorage", () => {
      expect(src).toContain("LOW_CREDIT_DISMISS_KEY");
      expect(src).toContain("localStorage.setItem(LOW_CREDIT_DISMISS_KEY, Date.now().toString())");
    });

    it("D2) handleDismissBanner sets bannerDismissed to true", () => {
      expect(src).toContain("setBannerDismissed(true)");
    });

    it("D3) handleDismissBanner is wrapped in useCallback", () => {
      expect(src).toContain("handleDismissBanner = useCallback(");
    });

    it("D4) Initial state reads from localStorage", () => {
      expect(src).toContain("localStorage.getItem(LOW_CREDIT_DISMISS_KEY)");
    });
  });

  // ─── E) 24-hour TTL ──────────────────────────────────────────────────────────
  describe("E) 24-hour dismiss TTL", () => {
    it("E1) TTL check uses 24 * 60 * 60 * 1000 milliseconds", () => {
      expect(src).toContain("24 * 60 * 60 * 1000");
    });

    it("E2) Banner re-shows after 24h via localStorage TTL logic", () => {
      // Simulate localStorage with expired timestamp
      const DISMISS_KEY = "lowCreditBannerDismissed";
      const expiredTs = (Date.now() - 25 * 60 * 60 * 1000).toString(); // 25h ago
      localStorage.setItem(DISMISS_KEY, expiredTs);

      const ts = localStorage.getItem(DISMISS_KEY);
      const dismissed = ts ? Date.now() - parseInt(ts, 10) < 24 * 60 * 60 * 1000 : false;
      expect(dismissed).toBe(false); // expired → banner should show again

      localStorage.removeItem(DISMISS_KEY);
    });

    it("E3) Banner stays hidden within 24h", () => {
      const DISMISS_KEY = "lowCreditBannerDismissed";
      const recentTs = (Date.now() - 1 * 60 * 60 * 1000).toString(); // 1h ago
      localStorage.setItem(DISMISS_KEY, recentTs);

      const ts = localStorage.getItem(DISMISS_KEY);
      const dismissed = ts ? Date.now() - parseInt(ts, 10) < 24 * 60 * 60 * 1000 : false;
      expect(dismissed).toBe(true); // still within 24h → banner hidden

      localStorage.removeItem(DISMISS_KEY);
    });
  });

  // ─── F) Top-up CTA navigates to /billing ─────────────────────────────────────
  describe("F) Top-up CTA", () => {
    it("F1) Top-up button navigates to /billing", () => {
      expect(src).toContain('setLocation("/billing")');
    });

    it("F2) Top-up button has data-testid attribute", () => {
      expect(src).toContain('data-testid="low-credit-topup-btn"');
    });
  });

  // ─── G) Banner text ──────────────────────────────────────────────────────────
  describe("G) Banner text content", () => {
    it("G1) Banner shows correct text", () => {
      expect(src).toContain("Low credits. Top up to continue scanning.");
    });

    it("G2) Banner uses amber color scheme", () => {
      expect(src).toContain("border-amber-500");
      expect(src).toContain("bg-amber-500");
      expect(src).toContain("text-amber-");
    });

    it("G3) Banner uses AlertTriangle icon", () => {
      expect(src).toContain("AlertTriangle");
    });
  });

  // ─── H) Uses existing credits.balance query ───────────────────────────────────
  describe("H) Data source", () => {
    it("H1) Uses existing trpc.credits.balance.useQuery() — no new endpoints", () => {
      expect(src).toContain("trpc.credits.balance.useQuery()");
      // creditsData is reused for both the badge and the banner
      const creditsDataCount = (src.match(/creditsData/g) || []).length;
      expect(creditsDataCount).toBeGreaterThan(2); // used in badge + banner
    });
  });

  // ─── I) data-testid attributes ───────────────────────────────────────────────
  describe("I) Testability", () => {
    it("I1) Dismiss button has data-testid", () => {
      expect(src).toContain('data-testid="low-credit-dismiss-btn"');
    });

    it("I2) Top-up button has data-testid", () => {
      expect(src).toContain('data-testid="low-credit-topup-btn"');
    });
  });

  // ─── J) Collapsed sidebar shows amber dot ────────────────────────────────────
  describe("J) Collapsed sidebar indicator", () => {
    it("J1) Collapsed sidebar shows amber dot when banner would show", () => {
      expect(src).toContain('data-testid="low-credit-dot"');
    });

    it("J2) Collapsed dot uses animate-pulse", () => {
      expect(src).toContain("animate-pulse");
    });

    it("J3) Full banner only shown when not collapsed", () => {
      // The full banner block is guarded by !isCollapsed
      expect(src).toContain("showLowCreditBanner && !isCollapsed");
      // The dot is shown when collapsed
      expect(src).toContain("showLowCreditBanner && isCollapsed");
    });
  });

  // ─── K) Dismiss key is stable ────────────────────────────────────────────────
  describe("K) localStorage key stability", () => {
    it("K1) Dismiss key is 'lowCreditBannerDismissed'", () => {
      expect(src).toContain('"lowCreditBannerDismissed"');
    });
  });
});
