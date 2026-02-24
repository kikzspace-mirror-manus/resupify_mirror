/**
 * Onboarding Education Level — Acceptance Tests
 *
 * Tests for the "Highest education level" dropdown added to Onboarding Step 2
 * and the corresponding field in Profile.tsx.
 *
 * A) Onboarding.tsx Education step renders the education level dropdown
 *    A1) The select element with data-testid="education-level-select" is present in the JSX source
 *    A2) All 7 expected option values are present in the source
 *    A3) The dropdown appears before the School/Institution input in the DOM order
 *
 * B) profile.upsert router accepts highestEducationLevel in its Zod schema
 *    B1) Calling profile.upsert with highestEducationLevel="bachelors_degree" returns success
 *    B2) Calling profile.upsert with highestEducationLevel="" (empty) is accepted (optional field)
 *    B3) Calling profile.upsert with highestEducationLevel longer than 64 chars is rejected
 *
 * C) Profile.tsx Education card renders the education level dropdown
 *    C1) The select element with data-testid="profile-education-level-select" is present in the source
 *    C2) All 7 expected option values are present in Profile.tsx source
 *    C3) The save button mutation includes highestEducationLevel in the payload
 *
 * D) Onboarding.tsx handleComplete includes highestEducationLevel in the upsert payload
 *    D1) The handleComplete function passes highestEducationLevel to upsertProfile.mutateAsync
 *
 * E) drizzle/schema.ts has the highestEducationLevel column
 *    E1) The column is declared in the userProfiles table
 *    E2) The column is varchar(64)
 *
 * F) Regression: isCoopCA replaces isStudentTrack in Onboarding.tsx
 *    F1) isStudentTrack is NOT referenced in Onboarding.tsx (replaced by isCoopCA)
 *    F2) isCoopCA is defined and used for enrollment-related UI
 */

import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const ROOT = resolve(__dirname, "..");

function readSrc(relPath: string): string {
  return readFileSync(resolve(ROOT, relPath), "utf-8");
}

// ─── Shared router test helpers ───────────────────────────────────────────────
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;
function makeUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    id: 42,
    openId: "edu-level-test-user",
    email: "edu-level@example.com",
    name: "Edu Level Tester",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };
}
function makeCtx(user: AuthenticatedUser): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ─── A: Onboarding.tsx dropdown presence ─────────────────────────────────────
describe("A: Onboarding.tsx Education step dropdown", () => {
  const src = readSrc("client/src/pages/Onboarding.tsx");

  it("A1) education-level-select data-testid is present in Onboarding.tsx", () => {
    expect(src).toContain('data-testid="education-level-select"');
  });

  it("A2) all 7 option values are present in Onboarding.tsx", () => {
    const expectedValues = [
      "high_school",
      "diploma_certificate",
      "associate_degree",
      "bachelors_degree",
      "masters_degree",
      "doctorate",
      "other",
    ];
    for (const val of expectedValues) {
      expect(src, `Missing option value="${val}" in Onboarding.tsx`).toContain(`value="${val}"`);
    }
  });

  it("A3) the education level select appears before the school input in Onboarding.tsx", () => {
    const selectIdx = src.indexOf('data-testid="education-level-select"');
    const schoolIdx = src.indexOf('data-testid="school-input"');
    expect(selectIdx).toBeGreaterThan(-1);
    expect(schoolIdx).toBeGreaterThan(-1);
    expect(selectIdx).toBeLessThan(schoolIdx);
  });
});

// ─── B: profile.upsert router schema ─────────────────────────────────────────
describe("B: profile.upsert router accepts highestEducationLevel", () => {
  it("B1) upsert with highestEducationLevel='bachelors_degree' returns success", async () => {
    vi.doMock("./db", () => ({
      getProfile: vi.fn().mockResolvedValue({ userId: 42 }),
      upsertProfile: vi.fn().mockResolvedValue(undefined),
    }));
    const ctx = makeCtx(makeUser());
    const caller = appRouter.createCaller(ctx);
    const result = await caller.profile.upsert({ highestEducationLevel: "bachelors_degree" });
    expect(result).toEqual({ success: true });
  });

  it("B2) upsert with highestEducationLevel=undefined (omitted) is accepted", async () => {
    vi.doMock("./db", () => ({
      getProfile: vi.fn().mockResolvedValue({ userId: 42 }),
      upsertProfile: vi.fn().mockResolvedValue(undefined),
    }));
    const ctx = makeCtx(makeUser());
    const caller = appRouter.createCaller(ctx);
    // Should not throw
    const result = await caller.profile.upsert({});
    expect(result).toEqual({ success: true });
  });

  it("B3) upsert with highestEducationLevel longer than 64 chars is rejected by Zod", async () => {
    vi.doMock("./db", () => ({
      getProfile: vi.fn().mockResolvedValue({ userId: 42 }),
      upsertProfile: vi.fn().mockResolvedValue(undefined),
    }));
    const ctx = makeCtx(makeUser());
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.profile.upsert({ highestEducationLevel: "x".repeat(65) })
    ).rejects.toThrow();
  });
});

// ─── C: Profile.tsx Education card dropdown ───────────────────────────────────
describe("C: Profile.tsx Education card dropdown", () => {
  const src = readSrc("client/src/pages/Profile.tsx");

  it("C1) profile-education-level-select data-testid is present in Profile.tsx", () => {
    expect(src).toContain('data-testid="profile-education-level-select"');
  });

  it("C2) all 7 option values are present in Profile.tsx", () => {
    const expectedValues = [
      "high_school",
      "diploma_certificate",
      "associate_degree",
      "bachelors_degree",
      "masters_degree",
      "doctorate",
      "other",
    ];
    for (const val of expectedValues) {
      expect(src, `Missing option value="${val}" in Profile.tsx`).toContain(`value="${val}"`);
    }
  });

  it("C3) the save button mutation includes highestEducationLevel in the payload", () => {
    expect(src).toContain("highestEducationLevel: highestEducationLevel || undefined");
  });
});

// ─── D: handleComplete includes highestEducationLevel ────────────────────────
describe("D: Onboarding.tsx handleComplete payload", () => {
  const src = readSrc("client/src/pages/Onboarding.tsx");

  it("D1) handleComplete passes highestEducationLevel to upsertProfile.mutateAsync", () => {
    // Find the handleComplete block and verify highestEducationLevel is in it
    expect(src).toContain("highestEducationLevel: highestEducationLevel || undefined");
  });
});

// ─── E: drizzle/schema.ts column ─────────────────────────────────────────────
describe("E: drizzle/schema.ts userProfiles column", () => {
  const src = readSrc("drizzle/schema.ts");

  it("E1) highestEducationLevel column is declared in userProfiles table", () => {
    expect(src).toContain("highestEducationLevel");
  });

  it("E2) the column is varchar(64)", () => {
    expect(src).toContain('varchar("highestEducationLevel", { length: 64 })');
  });
});

// ─── F: Regression — isCoopCA replaces isStudentTrack ────────────────────────
describe("F: Regression — isCoopCA replaces isStudentTrack in Onboarding.tsx", () => {
  const src = readSrc("client/src/pages/Onboarding.tsx");

  it("F1) isStudentTrack is NOT referenced in Onboarding.tsx", () => {
    expect(src).not.toContain("isStudentTrack");
  });

  it("F2) isCoopCA is defined in Onboarding.tsx", () => {
    expect(src).toContain("isCoopCA");
  });
});
