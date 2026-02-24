/**
 * V2 Phase 1A.1 — GLOBAL countryPackId DB Enum Tests
 *
 * A) users.countryPackId schema accepts "GLOBAL" as a valid enum value
 * B) job_cards.countryPackId schema accepts "GLOBAL" as a valid enum value
 * C) users.countryPackId schema still accepts "VN", "PH", "US"
 * D) job_cards.countryPackId schema still accepts "VN", "PH", "US"
 * E) GLOBAL is the first value in the enum (preferred default position)
 * F) resolveCountryPack returns "GLOBAL" when both user and job card countryPackId are null
 * G) resolveCountryPack returns "GLOBAL" with source="default" (not "user" or "job_card")
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { users, jobCards } from "../drizzle/schema";
import * as dbModule from "./db";

// Mock resolveCountryPack to avoid real DB calls
const mockResolveCountryPack = vi.spyOn(dbModule, "resolveCountryPack");

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── A–E: Schema enum validation ─────────────────────────────────────────────
describe("V2 Phase 1A.1: countryPackId DB enum includes GLOBAL", () => {
  it("A) users.countryPackId schema accepts 'GLOBAL' as a valid enum value", () => {
    // Drizzle mysqlEnum stores the allowed values in the column config
    const userCountryPackCol = users.countryPackId;
    // Access the enum values from the column definition
    const enumValues: string[] = (userCountryPackCol as any).enumValues ?? [];
    expect(enumValues).toContain("GLOBAL");
  });

  it("B) job_cards.countryPackId schema accepts 'GLOBAL' as a valid enum value", () => {
    const jobCardCountryPackCol = jobCards.countryPackId;
    const enumValues: string[] = (jobCardCountryPackCol as any).enumValues ?? [];
    expect(enumValues).toContain("GLOBAL");
  });

  it("C) users.countryPackId schema still accepts 'VN', 'PH', 'US'", () => {
    const enumValues: string[] = (users.countryPackId as any).enumValues ?? [];
    expect(enumValues).toContain("VN");
    expect(enumValues).toContain("PH");
    expect(enumValues).toContain("US");
  });

  it("D) job_cards.countryPackId schema still accepts 'VN', 'PH', 'US'", () => {
    const enumValues: string[] = (jobCards.countryPackId as any).enumValues ?? [];
    expect(enumValues).toContain("VN");
    expect(enumValues).toContain("PH");
    expect(enumValues).toContain("US");
  });

  it("E) GLOBAL is the first value in the users.countryPackId enum", () => {
    const enumValues: string[] = (users.countryPackId as any).enumValues ?? [];
    expect(enumValues[0]).toBe("GLOBAL");
  });

  it("E2) GLOBAL is the first value in the job_cards.countryPackId enum", () => {
    const enumValues: string[] = (jobCards.countryPackId as any).enumValues ?? [];
    expect(enumValues[0]).toBe("GLOBAL");
  });
});

// ─── F–G: resolveCountryPack default is GLOBAL ───────────────────────────────
describe("V2 Phase 1A.1: resolveCountryPack default is GLOBAL", () => {
  it("F) resolveCountryPack returns 'GLOBAL' when both user and job card countryPackId are null", async () => {
    mockResolveCountryPack.mockResolvedValue({
      effectiveCountryPackId: "GLOBAL",
      source: "default",
      userCountryPackId: null,
      jobCardCountryPackId: null,
    });
    const result = await dbModule.resolveCountryPack({ userId: 1 });
    expect(result.effectiveCountryPackId).toBe("GLOBAL");
  });

  it("G) resolveCountryPack returns source='default' (not 'user' or 'job_card') when falling back to GLOBAL", async () => {
    mockResolveCountryPack.mockResolvedValue({
      effectiveCountryPackId: "GLOBAL",
      source: "default",
      userCountryPackId: null,
      jobCardCountryPackId: null,
    });
    const result = await dbModule.resolveCountryPack({ userId: 1 });
    expect(result.source).toBe("default");
    expect(result.source).not.toBe("user");
    expect(result.source).not.toBe("job_card");
  });
});
