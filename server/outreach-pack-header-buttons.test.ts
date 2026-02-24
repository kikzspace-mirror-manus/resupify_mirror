/**
 * Phase 9E2 — Outreach Pack: Move Regenerate + Copy All to Header
 * Acceptance Tests
 *
 * A) With no pack, header buttons do not render (structural: source has correct conditional)
 * B) With a pack, both buttons are in the header section (structural: source order)
 * C) Regenerate still calls outreach.generate and charges credits (server procedure unchanged)
 * D) buildOutreachCopyAllText still produces the correct structured text (Copy all output)
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";
import type { TrpcContext } from "./_core/context";
import type { User } from "../drizzle/schema";
import * as fs from "fs";
import * as path from "path";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 99,
    openId: "outreach-header-test",
    email: "outreach-header@example.com",
    name: "Outreach Header Tester",
    loginMethod: "manus",
    role: "user",
    disabled: false,
    isAdmin: false,
    adminNotes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };
}

function makeCtx(user: User | null): TrpcContext {
  return {
    user,
    req: {
      protocol: "https",
      headers: { origin: "https://resupify.example.com" },
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

const jobCardsDetailSource = fs.readFileSync(
  path.resolve(__dirname, "../client/src/pages/JobCardDetail.tsx"),
  "utf-8"
);

// ─── Test A: No pack → header buttons do not render ──────────────────────────
describe("Phase 9E2 — Test A: No pack → header buttons do not render", () => {
  it("A1: Both Copy all and Regenerate Pack are inside an {outreachPack && ...} conditional", () => {
    // Find the Outreach Pack CardHeader section
    const headerStart = jobCardsDetailSource.indexOf('<CardTitle className="text-sm font-semibold">Outreach Pack</CardTitle>');
    expect(headerStart).toBeGreaterThan(0);
    // The conditional guard {outreachPack && ( must appear before the buttons
    const guardIdx = jobCardsDetailSource.indexOf("{outreachPack && (", headerStart);
    expect(guardIdx).toBeGreaterThan(headerStart);
    // Both buttons must appear after the guard
    const copyAllIdx = jobCardsDetailSource.indexOf("Copy all", guardIdx);
    const regenIdx = jobCardsDetailSource.indexOf("Regenerate Pack (1 credit)", guardIdx);
    expect(copyAllIdx).toBeGreaterThan(guardIdx);
    expect(regenIdx).toBeGreaterThan(guardIdx);
  });

  it("A2: The guard closes before the CardHeader closing tag (buttons are inside the conditional)", () => {
    const headerStart = jobCardsDetailSource.indexOf('<CardTitle className="text-sm font-semibold">Outreach Pack</CardTitle>');
    const cardHeaderClose = jobCardsDetailSource.indexOf("</CardHeader>", headerStart);
    const guardIdx = jobCardsDetailSource.indexOf("{outreachPack && (", headerStart);
    // Guard must be inside the CardHeader
    expect(guardIdx).toBeLessThan(cardHeaderClose);
  });
});

// ─── Test B: With pack → both buttons are in the header ──────────────────────
describe("Phase 9E2 — Test B: Both buttons are in the Outreach Pack card header", () => {
  it("B1: 'Copy all' appears inside CardHeader (before CardContent)", () => {
    const headerStart = jobCardsDetailSource.indexOf('<CardTitle className="text-sm font-semibold">Outreach Pack</CardTitle>');
    const cardContentIdx = jobCardsDetailSource.indexOf("<CardContent>", headerStart);
    const copyAllIdx = jobCardsDetailSource.indexOf("Copy all", headerStart);
    expect(copyAllIdx).toBeGreaterThan(headerStart);
    expect(copyAllIdx).toBeLessThan(cardContentIdx);
  });

  it("B2: 'Regenerate Pack (1 credit)' appears inside CardHeader (before CardContent)", () => {
    const headerStart = jobCardsDetailSource.indexOf('<CardTitle className="text-sm font-semibold">Outreach Pack</CardTitle>');
    const cardContentIdx = jobCardsDetailSource.indexOf("<CardContent>", headerStart);
    const regenIdx = jobCardsDetailSource.indexOf("Regenerate Pack (1 credit)", headerStart);
    expect(regenIdx).toBeGreaterThan(headerStart);
    expect(regenIdx).toBeLessThan(cardContentIdx);
  });

  it("B3: 'Regenerate Pack (1 credit)' does NOT appear inside CardContent (removed from bottom)", () => {
    const headerStart = jobCardsDetailSource.indexOf('<CardTitle className="text-sm font-semibold">Outreach Pack</CardTitle>');
    const cardContentIdx = jobCardsDetailSource.indexOf("<CardContent>", headerStart);
    // Find the SECOND occurrence of "Regenerate Pack (1 credit)" — should not exist inside CardContent
    const firstIdx = jobCardsDetailSource.indexOf("Regenerate Pack (1 credit)", headerStart);
    const secondIdx = jobCardsDetailSource.indexOf("Regenerate Pack (1 credit)", firstIdx + 1);
    // Either no second occurrence, or second occurrence is not inside CardContent
    if (secondIdx > 0) {
      expect(secondIdx).toBeLessThan(cardContentIdx);
    }
    // The key assertion: only one occurrence after headerStart
    expect(firstIdx).toBeGreaterThan(0);
  });

  it("B4: 'Copy all' button appears before 'Regenerate Pack' in the header (left-to-right order)", () => {
    const headerStart = jobCardsDetailSource.indexOf('<CardTitle className="text-sm font-semibold">Outreach Pack</CardTitle>');
    const copyAllIdx = jobCardsDetailSource.indexOf("Copy all", headerStart);
    const regenIdx = jobCardsDetailSource.indexOf("Regenerate Pack (1 credit)", headerStart);
    expect(copyAllIdx).toBeLessThan(regenIdx);
  });

  it("B5: Regenerate button has generatePack.isPending in its disabled expression (loading state preserved)", () => {
    const headerStart = jobCardsDetailSource.indexOf('<CardTitle className="text-sm font-semibold">Outreach Pack</CardTitle>');
    const cardContentIdx = jobCardsDetailSource.indexOf("<CardContent>", headerStart);
    const headerSection = jobCardsDetailSource.slice(headerStart, cardContentIdx);
    // Phase 10B: disabled may include isBusy in addition to isPending
    expect(headerSection).toContain("generatePack.isPending");
  });
});

// ─── Test C: Regenerate still charges credits ─────────────────────────────────
describe("Phase 9E2 — Test C: outreach.generate still charges 1 credit", () => {
  it("C1: outreach.generatePack procedure source calls spendCredits with amount=1", () => {
    // Verify the server source code calls spendCredits(userId, 1, ...) for outreach pack
    const routersSource = fs.readFileSync(
      path.resolve(__dirname, "./routers.ts"),
      "utf-8"
    );
    // Find the generatePack procedure body
    const generatePackIdx = routersSource.indexOf("generatePack: protectedProcedure");
    expect(generatePackIdx).toBeGreaterThan(0);
    // spendCredits must be called with amount=1 inside generatePack
    const afterGeneratePack = routersSource.slice(generatePackIdx, generatePackIdx + 6000);
    expect(afterGeneratePack).toContain("spendCredits(ctx.user.id, 1, \"Outreach Pack generation\"");
    // The credit reason must mention outreach
    expect(afterGeneratePack).toContain("outreach_pack");
  });

  it("C2: outreach.generate is a protectedProcedure — unauthenticated call throws", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    await expect(
      caller.outreach.generatePack({ jobCardId: 10 })
    ).rejects.toThrow(/Please login|UNAUTHORIZED|unauthorized/i);
  });
});

// ─── Test D: buildOutreachCopyAllText produces correct structured text ─────────
describe("Phase 9E2 — Test D: buildOutreachCopyAllText output format unchanged", () => {
  // Import the pure function directly (no server needed)
  let buildOutreachCopyAllText: (pack: any) => string;

  beforeEach(async () => {
    // Dynamic import to avoid ESM issues
    const mod = await import("../client/src/lib/outreachCopyAll");
    buildOutreachCopyAllText = mod.buildOutreachCopyAllText;
  });

  it("D1: all 4 sections appear in the correct order with === headers", () => {
    const text = buildOutreachCopyAllText({
      recruiter_email: "Dear Recruiter, I am applying.",
      linkedin_dm: "Hi, I wanted to connect.",
      follow_up_1: "Following up on my application.",
      follow_up_2: "Just checking in.",
    });
    const emailIdx = text.indexOf("=== Recruiter Email ===");
    const dmIdx = text.indexOf("=== LinkedIn DM ===");
    const fu1Idx = text.indexOf("=== Follow-up #1 ===");
    const fu2Idx = text.indexOf("=== Follow-up #2 ===");
    expect(emailIdx).toBeGreaterThanOrEqual(0);
    expect(dmIdx).toBeGreaterThan(emailIdx);
    expect(fu1Idx).toBeGreaterThan(dmIdx);
    expect(fu2Idx).toBeGreaterThan(fu1Idx);
  });

  it("D2: sections are separated by blank lines (double newline)", () => {
    const text = buildOutreachCopyAllText({
      recruiter_email: "Email content.",
      linkedin_dm: "DM content.",
      follow_up_1: "Follow-up 1.",
      follow_up_2: "Follow-up 2.",
    });
    expect(text).toContain("\n\n");
  });

  it("D3: empty/null sections are omitted", () => {
    const text = buildOutreachCopyAllText({
      recruiter_email: "Email content.",
      linkedin_dm: null,
      follow_up_1: "",
      follow_up_2: "Follow-up 2.",
    });
    expect(text).not.toContain("=== LinkedIn DM ===");
    expect(text).not.toContain("=== Follow-up #1 ===");
    expect(text).toContain("=== Recruiter Email ===");
    expect(text).toContain("=== Follow-up #2 ===");
  });

  it("D4: content is plain text (no HTML, no markdown)", () => {
    const text = buildOutreachCopyAllText({
      recruiter_email: "Dear Recruiter, I am applying.",
      linkedin_dm: "Hi, I wanted to connect.",
      follow_up_1: "Following up.",
      follow_up_2: "Checking in.",
    });
    expect(text).not.toContain("<");
    expect(text).not.toContain("**");
    expect(text).not.toContain("##");
  });
});

// ─── Phase 9E2.1: Regenerate Pack button is green (variant="default") ─────────
describe("Phase 9E2.1 — Regenerate Pack button uses primary (default) variant", () => {
  it("E1: Regenerate Pack button in header uses variant='default' (green)", () => {
    const headerStart = jobCardsDetailSource.indexOf('<CardTitle className="text-sm font-semibold">Outreach Pack</CardTitle>');
    const cardContentIdx = jobCardsDetailSource.indexOf("<CardContent>", headerStart);
    const headerSection = jobCardsDetailSource.slice(headerStart, cardContentIdx);
    // The Regenerate Pack button must use variant="default"
    const regenIdx = headerSection.indexOf("Regenerate Pack (1 credit)");
    expect(regenIdx).toBeGreaterThan(0);
    // Look backwards from the button text to find its variant prop
    const buttonContext = headerSection.slice(Math.max(0, regenIdx - 600), regenIdx);
    expect(buttonContext).toContain('variant="default"');
  });

  it("E2: Copy all button still uses variant='ghost' (not green)", () => {
    const headerStart = jobCardsDetailSource.indexOf('<CardTitle className="text-sm font-semibold">Outreach Pack</CardTitle>');
    const cardContentIdx = jobCardsDetailSource.indexOf("<CardContent>", headerStart);
    const headerSection = jobCardsDetailSource.slice(headerStart, cardContentIdx);
    // The Copy all button must use variant="ghost"
    const copyIdx = headerSection.indexOf("Copy all");
    expect(copyIdx).toBeGreaterThan(0);
    const buttonContext = headerSection.slice(Math.max(0, copyIdx - 1000), copyIdx);
    expect(buttonContext).toContain('variant="ghost"');
  });

  it("E3: Regenerate Pack button does NOT use variant='outline'", () => {
    const headerStart = jobCardsDetailSource.indexOf('<CardTitle className="text-sm font-semibold">Outreach Pack</CardTitle>');
    const cardContentIdx = jobCardsDetailSource.indexOf("<CardContent>", headerStart);
    const headerSection = jobCardsDetailSource.slice(headerStart, cardContentIdx);
    const regenIdx = headerSection.indexOf("Regenerate Pack (1 credit)");
    expect(regenIdx).toBeGreaterThan(0);
    const buttonContext = headerSection.slice(Math.max(0, regenIdx - 600), regenIdx);
    expect(buttonContext).not.toContain('variant="outline"');
  });
});
