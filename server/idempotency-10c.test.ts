/**
 * Phase 10C — Idempotency Guard Acceptance Tests
 *
 * Covers:
 *   A. Core store: checkIdempotency, markStarted, markSucceeded, markFailed, markCreditsCharged
 *   B. Double-click / retry with same actionId → one run, one spend, second returns same result
 *   C. New actionId → new run allowed
 *   D. No actionId (undefined) → idempotency opt-out, always allowed
 *   E. TTL expiry → expired records treated as new
 *   F. Concurrent in-progress guard (started → error on second call)
 *   G. Failed action → markFailed sets status, credits NOT charged
 *   H. pruneExpiredIdempotencyEntries cleans up expired entries
 *   I. Each endpoint key is isolated (no cross-endpoint collision)
 *   J. markCreditsCharged sets flag correctly
 *   K. Frontend call sites: actionId field present in all 4 mutation input schemas
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  checkIdempotency,
  markStarted,
  markSucceeded,
  markFailed,
  markCreditsCharged,
  pruneExpiredIdempotencyEntries,
  IDEMPOTENCY_WINDOW_MS,
  _clearIdempotencyStoreForTests,
  _getStoreSize,
  _getRecord,
} from "./idempotency";

// ── Helpers ──────────────────────────────────────────────────────────────────
const USER_A = 1;
const USER_B = 2;
const EP_EVIDENCE = "evidence.run";
const EP_OUTREACH = "outreach.generatePack";
const EP_KIT = "applicationKits.generate";
const EP_JD = "jdSnapshots.extract";

function uuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// ── Setup ─────────────────────────────────────────────────────────────────────
beforeEach(() => {
  _clearIdempotencyStoreForTests();
});

afterEach(() => {
  vi.useRealTimers();
});

// ─────────────────────────────────────────────────────────────────────────────
describe("A. Core store: basic lifecycle", () => {
  it("A1: checkIdempotency returns null for unknown actionId", () => {
    const result = checkIdempotency(USER_A, EP_EVIDENCE, uuid());
    expect(result).toBeNull();
  });

  it("A2: markStarted creates a started record", () => {
    const id = uuid();
    markStarted(USER_A, EP_EVIDENCE, id);
    const rec = checkIdempotency(USER_A, EP_EVIDENCE, id);
    expect(rec).not.toBeNull();
    expect(rec!.status).toBe("started");
    expect(rec!.creditsCharged).toBe(false);
  });

  it("A3: markSucceeded transitions to succeeded and stores result", () => {
    const id = uuid();
    const payload = { runId: 42, score: 87 };
    markStarted(USER_A, EP_EVIDENCE, id);
    markSucceeded(USER_A, EP_EVIDENCE, id, payload, true);
    const rec = checkIdempotency(USER_A, EP_EVIDENCE, id);
    expect(rec!.status).toBe("succeeded");
    expect(rec!.result).toEqual(payload);
    expect(rec!.creditsCharged).toBe(true);
  });

  it("A4: markFailed transitions to failed and does NOT set creditsCharged", () => {
    const id = uuid();
    markStarted(USER_A, EP_EVIDENCE, id);
    markFailed(USER_A, EP_EVIDENCE, id, "LLM timeout");
    const rec = checkIdempotency(USER_A, EP_EVIDENCE, id);
    expect(rec!.status).toBe("failed");
    expect(rec!.errorMessage).toBe("LLM timeout");
    expect(rec!.creditsCharged).toBe(false);
  });

  it("A5: markCreditsCharged sets the flag on an existing record", () => {
    const id = uuid();
    markStarted(USER_A, EP_EVIDENCE, id);
    markCreditsCharged(USER_A, EP_EVIDENCE, id);
    const rec = _getRecord(USER_A, EP_EVIDENCE, id);
    expect(rec!.creditsCharged).toBe(true);
  });

  it("A6: markCreditsCharged is a no-op if no record exists", () => {
    // Should not throw
    markCreditsCharged(USER_A, EP_EVIDENCE, uuid());
    expect(_getStoreSize()).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("B. Double-click / retry with same actionId", () => {
  it("B1: second call with same actionId after success returns cached result", () => {
    const id = uuid();
    const payload = { runId: 10, score: 75, itemCount: 5, breakdown: {} };

    // Simulate first successful run
    markStarted(USER_A, EP_EVIDENCE, id);
    markCreditsCharged(USER_A, EP_EVIDENCE, id);
    markSucceeded(USER_A, EP_EVIDENCE, id, payload, true);

    // Second call: should get cached result without re-running
    const hit = checkIdempotency(USER_A, EP_EVIDENCE, id);
    expect(hit!.status).toBe("succeeded");
    expect(hit!.result).toEqual(payload);
    expect(hit!.creditsCharged).toBe(true);
  });

  it("B2: credits are NOT charged twice — creditsCharged stays true on repeated checks", () => {
    const id = uuid();
    markStarted(USER_A, EP_EVIDENCE, id);
    markCreditsCharged(USER_A, EP_EVIDENCE, id);
    markSucceeded(USER_A, EP_EVIDENCE, id, { runId: 1 }, true);

    // Simulate 3 retries — each should see creditsCharged = true (not re-charge)
    for (let i = 0; i < 3; i++) {
      const hit = checkIdempotency(USER_A, EP_EVIDENCE, id);
      expect(hit!.creditsCharged).toBe(true);
      expect(hit!.status).toBe("succeeded");
    }
  });

  it("B3: outreach.generatePack — same actionId returns cached pack", () => {
    const id = uuid();
    const pack = { id: 99, recruiter_email: "hi@co.com", linkedin_dm: "Hey!", follow_up_1: "FU1", follow_up_2: "FU2" };
    markStarted(USER_A, EP_OUTREACH, id);
    markCreditsCharged(USER_A, EP_OUTREACH, id);
    markSucceeded(USER_A, EP_OUTREACH, id, pack, true);

    const hit = checkIdempotency(USER_A, EP_OUTREACH, id);
    expect(hit!.status).toBe("succeeded");
    expect(hit!.result).toEqual(pack);
  });

  it("B4: applicationKits.generate — same actionId returns cached kit", () => {
    const id = uuid();
    const kit = { kitId: 5, topChanges: [], bulletRewrites: [], coverLetterText: "Dear..." };
    markStarted(USER_A, EP_KIT, id);
    markSucceeded(USER_A, EP_KIT, id, kit, false);

    const hit = checkIdempotency(USER_A, EP_KIT, id);
    expect(hit!.status).toBe("succeeded");
    expect(hit!.result).toEqual(kit);
  });

  it("B5: jdSnapshots.extract — same actionId returns cached extraction", () => {
    const id = uuid();
    const extraction = { snapshotId: 3, structuredFields: {}, requirements: [], count: 0 };
    markStarted(USER_A, EP_JD, id);
    markSucceeded(USER_A, EP_JD, id, extraction, false);

    const hit = checkIdempotency(USER_A, EP_JD, id);
    expect(hit!.status).toBe("succeeded");
    expect(hit!.result).toEqual(extraction);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("C. New actionId → new run allowed", () => {
  it("C1: different actionId is treated as a fresh request", () => {
    const id1 = uuid();
    const id2 = uuid();
    markStarted(USER_A, EP_EVIDENCE, id1);
    markSucceeded(USER_A, EP_EVIDENCE, id1, { runId: 1 }, true);

    // New actionId → no hit
    const hit = checkIdempotency(USER_A, EP_EVIDENCE, id2);
    expect(hit).toBeNull();
  });

  it("C2: store size grows with distinct actionIds", () => {
    for (let i = 0; i < 5; i++) {
      markStarted(USER_A, EP_EVIDENCE, uuid());
    }
    expect(_getStoreSize()).toBe(5);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("D. No actionId → idempotency opt-out", () => {
  it("D1: checkIdempotency returns null when actionId is undefined", () => {
    expect(checkIdempotency(USER_A, EP_EVIDENCE, undefined)).toBeNull();
  });

  it("D2: checkIdempotency returns null when actionId is null", () => {
    expect(checkIdempotency(USER_A, EP_EVIDENCE, null)).toBeNull();
  });

  it("D3: markStarted is a no-op when actionId is undefined", () => {
    markStarted(USER_A, EP_EVIDENCE, undefined);
    expect(_getStoreSize()).toBe(0);
  });

  it("D4: markSucceeded is a no-op when actionId is undefined", () => {
    markSucceeded(USER_A, EP_EVIDENCE, undefined, { runId: 1 }, true);
    expect(_getStoreSize()).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("E. TTL expiry", () => {
  it("E1: expired record is treated as null by checkIdempotency", () => {
    vi.useFakeTimers();
    const id = uuid();
    markStarted(USER_A, EP_EVIDENCE, id);
    markSucceeded(USER_A, EP_EVIDENCE, id, { runId: 1 }, true);

    // Advance past TTL
    vi.advanceTimersByTime(IDEMPOTENCY_WINDOW_MS + 1000);

    const hit = checkIdempotency(USER_A, EP_EVIDENCE, id);
    expect(hit).toBeNull();
  });

  it("E2: record within TTL is still accessible", () => {
    vi.useFakeTimers();
    const id = uuid();
    markStarted(USER_A, EP_EVIDENCE, id);
    markSucceeded(USER_A, EP_EVIDENCE, id, { runId: 2 }, true);

    // Advance to just before TTL
    vi.advanceTimersByTime(IDEMPOTENCY_WINDOW_MS - 1000);

    const hit = checkIdempotency(USER_A, EP_EVIDENCE, id);
    expect(hit).not.toBeNull();
    expect(hit!.status).toBe("succeeded");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("F. Concurrent in-progress guard", () => {
  it("F1: started status is visible to a second concurrent caller", () => {
    const id = uuid();
    markStarted(USER_A, EP_EVIDENCE, id);

    // Second caller checks — should see started
    const hit = checkIdempotency(USER_A, EP_EVIDENCE, id);
    expect(hit!.status).toBe("started");
  });

  it("F2: markStarted is idempotent — does not overwrite existing record", () => {
    const id = uuid();
    markStarted(USER_A, EP_EVIDENCE, id);
    const firstCreatedAt = _getRecord(USER_A, EP_EVIDENCE, id)!.createdAt;

    // Call markStarted again — should not change createdAt
    markStarted(USER_A, EP_EVIDENCE, id);
    const secondCreatedAt = _getRecord(USER_A, EP_EVIDENCE, id)!.createdAt;

    expect(firstCreatedAt).toBe(secondCreatedAt);
    expect(_getStoreSize()).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("G. Failed action handling", () => {
  it("G1: failed record has status=failed and no result", () => {
    const id = uuid();
    markStarted(USER_A, EP_EVIDENCE, id);
    markFailed(USER_A, EP_EVIDENCE, id, "LLM error: rate limit");

    const rec = checkIdempotency(USER_A, EP_EVIDENCE, id);
    expect(rec!.status).toBe("failed");
    expect(rec!.result).toBeUndefined();
    expect(rec!.creditsCharged).toBe(false);
  });

  it("G2: failed record is still accessible within TTL", () => {
    const id = uuid();
    markStarted(USER_A, EP_EVIDENCE, id);
    markFailed(USER_A, EP_EVIDENCE, id, "timeout");

    const rec = checkIdempotency(USER_A, EP_EVIDENCE, id);
    expect(rec).not.toBeNull();
    expect(rec!.status).toBe("failed");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("H. pruneExpiredIdempotencyEntries", () => {
  it("H1: prune removes only expired entries", () => {
    vi.useFakeTimers();
    const expiredId = uuid();
    const freshId = uuid();

    markStarted(USER_A, EP_EVIDENCE, expiredId);
    vi.advanceTimersByTime(IDEMPOTENCY_WINDOW_MS + 1000);
    markStarted(USER_A, EP_EVIDENCE, freshId);

    expect(_getStoreSize()).toBe(2);
    pruneExpiredIdempotencyEntries();
    expect(_getStoreSize()).toBe(1);

    // The fresh one should still be there
    expect(_getRecord(USER_A, EP_EVIDENCE, freshId)).toBeDefined();
    expect(_getRecord(USER_A, EP_EVIDENCE, expiredId)).toBeUndefined();
  });

  it("H2: prune on empty store does not throw", () => {
    expect(() => pruneExpiredIdempotencyEntries()).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("I. Endpoint key isolation", () => {
  it("I1: same actionId on different endpoints are independent records", () => {
    const id = uuid();
    markStarted(USER_A, EP_EVIDENCE, id);
    markSucceeded(USER_A, EP_EVIDENCE, id, { runId: 1 }, true);

    // Same actionId on a different endpoint → no hit
    const hit = checkIdempotency(USER_A, EP_OUTREACH, id);
    expect(hit).toBeNull();
  });

  it("I2: same actionId for different users are independent records", () => {
    const id = uuid();
    markStarted(USER_A, EP_EVIDENCE, id);
    markSucceeded(USER_A, EP_EVIDENCE, id, { runId: 1 }, true);

    // Different user → no hit
    const hit = checkIdempotency(USER_B, EP_EVIDENCE, id);
    expect(hit).toBeNull();
  });

  it("I3: all 4 endpoint keys are distinct", () => {
    const id = uuid();
    [EP_EVIDENCE, EP_OUTREACH, EP_KIT, EP_JD].forEach((ep) => {
      markStarted(USER_A, ep, id);
    });
    expect(_getStoreSize()).toBe(4);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("J. markCreditsCharged", () => {
  it("J1: markCreditsCharged updates the flag on a started record", () => {
    const id = uuid();
    markStarted(USER_A, EP_EVIDENCE, id);
    expect(_getRecord(USER_A, EP_EVIDENCE, id)!.creditsCharged).toBe(false);

    markCreditsCharged(USER_A, EP_EVIDENCE, id);
    expect(_getRecord(USER_A, EP_EVIDENCE, id)!.creditsCharged).toBe(true);
  });

  it("J2: markSucceeded with creditsCharged=false does not set the flag", () => {
    const id = uuid();
    markStarted(USER_A, EP_KIT, id);
    markSucceeded(USER_A, EP_KIT, id, { kitId: 1 }, false);

    const rec = _getRecord(USER_A, EP_KIT, id);
    expect(rec!.creditsCharged).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("K. Frontend call sites: actionId field in mutation inputs", () => {
  it("K1: evidence.run mutation input includes actionId field in routers.ts", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("server/routers.ts", "utf-8");
    // Check that evidence.run input schema has actionId
    const evidenceSection = src.slice(src.indexOf("run: protectedProcedure.use(evidenceRateLimit)"), src.indexOf("batchSprint:"));
    expect(evidenceSection).toContain("actionId: z.string().uuid().optional()");
  });

  it("K2: outreach.generatePack mutation input includes actionId field", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("server/routers.ts", "utf-8");
    // Slice from generatePack definition to the analytics router
    const outreachSection = src.slice(
      src.indexOf("generatePack: protectedProcedure.use(outreachRateLimit)"),
      src.indexOf("// \u2500\u2500\u2500 Analyticss")
    );
    expect(outreachSection).toContain("actionId: z.string().uuid().optional()");
  });

  it("K3: applicationKits.generate mutation input includes actionId field", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("server/routers.ts", "utf-8");
    const kitSection = src.slice(src.indexOf("generate: protectedProcedure.use(kitRateLimit)"), src.indexOf("createTasks:"));
    expect(kitSection).toContain("actionId: z.string().uuid().optional()");
  });

  it("K4: jdSnapshots.extract mutation input includes actionId field", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("server/routers.ts", "utf-8");
    const jdSection = src.slice(src.indexOf("extract: protectedProcedure.use(jdExtractRateLimit)"), src.indexOf("requirements: protectedProcedure.input(z.object({\n      jobCardId: z.number(),\n    })).query"));
    expect(jdSection).toContain("actionId: z.string().uuid().optional()");
  });

  it("K5: frontend JobCardDetail.tsx passes actionId to all 4 mutation calls", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("client/src/pages/JobCardDetail.tsx", "utf-8");

    // All 4 call sites should include actionId: crypto.randomUUID()
    const actionIdPattern = /actionId:\s*crypto\.randomUUID\(\)/g;
    const matches = src.match(actionIdPattern);
    expect(matches).not.toBeNull();
    // 6 call sites: extract(1) + runEvidence(1) + generateKit(2) + generatePack(2)
    expect(matches!.length).toBeGreaterThanOrEqual(4);
  });
});
