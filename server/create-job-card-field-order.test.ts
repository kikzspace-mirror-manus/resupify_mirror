/**
 * Phase 9E1 — Create Job Card Modal: URL Fetch Above Company/Location
 * Acceptance Tests
 *
 * A) URL field is rendered before Company/Location in the form (UI order)
 *    — verified via DOM order in the JSX source (structural test)
 * B) Fetch behavior unchanged: jobCards.create still accepts url + jdText
 *    — server accepts url field and creates a JD snapshot
 * C) Auto-fill remains non-destructive: company/location not overwritten if already set
 *    — server: create with pre-filled company+location → values preserved
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
    id: 88,
    openId: "field-order-test",
    email: "field-order@example.com",
    name: "Field Order Tester",
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

// ─── Test A: URL field appears before Company/Location in JSX source ──────────
describe("Phase 9E1 — Test A: URL field is above Company/Location in JSX source", () => {
  const jobCardsSource = fs.readFileSync(
    path.resolve(__dirname, "../client/src/pages/JobCards.tsx"),
    "utf-8"
  );

  it("A1: htmlFor='url' appears before htmlFor='company' in the source", () => {
    const urlIdx = jobCardsSource.indexOf('htmlFor="url"');
    const companyIdx = jobCardsSource.indexOf('htmlFor="company"');
    expect(urlIdx).toBeGreaterThan(0);
    expect(companyIdx).toBeGreaterThan(0);
    expect(urlIdx).toBeLessThan(companyIdx);
  });

  it("A2: htmlFor='url' appears before htmlFor='location' in the source", () => {
    const urlIdx = jobCardsSource.indexOf('htmlFor="url"');
    const locationIdx = jobCardsSource.indexOf('htmlFor="location"');
    expect(urlIdx).toBeGreaterThan(0);
    expect(locationIdx).toBeGreaterThan(0);
    expect(urlIdx).toBeLessThan(locationIdx);
  });

  it("A3: 'Fetch JD' button appears before Company label in the source", () => {
    const fetchIdx = jobCardsSource.indexOf('"Fetch JD"');
    const companyIdx = jobCardsSource.indexOf('<Label htmlFor="company">');
    expect(fetchIdx).toBeGreaterThan(0);
    expect(companyIdx).toBeGreaterThan(0);
    expect(fetchIdx).toBeLessThan(companyIdx);
  });

  it("A4: Job Title field appears before URL field in the source", () => {
    const titleIdx = jobCardsSource.indexOf('htmlFor="title"');
    const urlIdx = jobCardsSource.indexOf('htmlFor="url"');
    expect(titleIdx).toBeGreaterThan(0);
    expect(urlIdx).toBeGreaterThan(0);
    expect(titleIdx).toBeLessThan(urlIdx);
  });

  it("A5: Enter key handler on URL field is still present (keyboard fetch preserved)", () => {
    expect(jobCardsSource).toContain('e.key === "Enter" && isValidHttpsUrl(url)');
  });
});

// ─── Test B: jobCards.create still accepts url + jdText ──────────────────────
describe("Phase 9E1 — Test B: jobCards.create accepts url and jdText fields", () => {
  beforeEach(() => {
    vi.spyOn(db, "createJobCard").mockResolvedValue(42 as any);
    vi.spyOn(db, "createJdSnapshot").mockResolvedValue(undefined as any);
    vi.spyOn(db, "getProfile").mockResolvedValue(null as any);
  });

  it("B1: create with url and jdText succeeds and returns an id", async () => {
    const caller = appRouter.createCaller(makeCtx(makeUser()));
    const result = await caller.jobCards.create({
      title: "Software Engineer Intern",
      url: "https://jobs.example.com/swe-intern",
      jdText: "We are looking for a software engineer intern with Python skills.",
    });
    expect(result).toHaveProperty("id");
    expect(result.id).toBe(42);
  });

  it("B2: createJdSnapshot is called when jdText is provided", async () => {
    const snapshotSpy = vi.spyOn(db, "createJdSnapshot").mockResolvedValue(undefined as any);
    const caller = appRouter.createCaller(makeCtx(makeUser()));
    await caller.jobCards.create({
      title: "Product Manager",
      url: "https://jobs.example.com/pm",
      jdText: "Lead product strategy and roadmap.",
    });
    expect(snapshotSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        jobCardId: 42,
        snapshotText: "Lead product strategy and roadmap.",
        sourceUrl: "https://jobs.example.com/pm",
      })
    );
  });

  it("B3: create without url still works (url is optional)", async () => {
    const caller = appRouter.createCaller(makeCtx(makeUser()));
    const result = await caller.jobCards.create({
      title: "Data Analyst",
      jdText: "Analyze data and produce reports.",
    });
    expect(result.id).toBe(42);
  });

  it("B4: create without jdText does not call createJdSnapshot", async () => {
    const snapshotSpy = vi.spyOn(db, "createJdSnapshot").mockResolvedValue(undefined as any);
    const caller = appRouter.createCaller(makeCtx(makeUser()));
    await caller.jobCards.create({ title: "Designer" });
    expect(snapshotSpy).not.toHaveBeenCalled();
  });
});

// ─── Test C: Auto-fill is non-destructive (company/location not overwritten) ──
describe("Phase 9E1 — Test C: auto-fill non-destructive — company/location preserved", () => {
  beforeEach(() => {
    vi.spyOn(db, "createJobCard").mockResolvedValue(55 as any);
    vi.spyOn(db, "createJdSnapshot").mockResolvedValue(undefined as any);
    vi.spyOn(db, "getProfile").mockResolvedValue(null as any);
  });

  it("C1: create with pre-filled company preserves the provided company value", async () => {
    const createSpy = vi.spyOn(db, "createJobCard").mockResolvedValue(55 as any);
    const caller = appRouter.createCaller(makeCtx(makeUser()));
    await caller.jobCards.create({
      title: "Marketing Manager",
      company: "Shopify",
      location: "Ottawa, ON",
      url: "https://jobs.shopify.com/mm",
      jdText: "Drive marketing campaigns for Shopify.",
    });
    // The company passed to createJobCard must be exactly what the user typed
    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({ company: "Shopify", location: "Ottawa, ON" })
    );
  });

  it("C2: create without company passes undefined (auto-fill can populate it)", async () => {
    const createSpy = vi.spyOn(db, "createJobCard").mockResolvedValue(55 as any);
    const caller = appRouter.createCaller(makeCtx(makeUser()));
    await caller.jobCards.create({
      title: "UX Designer",
      jdText: "Design user experiences.",
    });
    // company should be absent (undefined) — auto-fill can set it
    const callArg = createSpy.mock.calls[0][0] as any;
    expect(callArg.company).toBeUndefined();
  });

  it("C3: create with empty-string company is treated as no company (optional field)", async () => {
    // The server schema has company as optional; empty string is valid
    const caller = appRouter.createCaller(makeCtx(makeUser()));
    const result = await caller.jobCards.create({
      title: "Operations Lead",
      company: "",
    });
    expect(result.id).toBe(55);
  });

  it("C4: unauthenticated create throws UNAUTHORIZED", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    await expect(
      caller.jobCards.create({ title: "Analyst" })
    ).rejects.toThrow(/Please login|UNAUTHORIZED|unauthorized/i);
  });
});
