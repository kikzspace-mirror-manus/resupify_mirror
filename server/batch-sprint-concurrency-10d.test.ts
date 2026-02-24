/**
 * Phase 10D: Batch Sprint Concurrency — Acceptance Tests
 *
 * Tests verify:
 * A. Batch Sprint button is present in bulk action bar (source-level)
 * B. runAI() wraps batchSprint.mutate (source-level)
 * C. markDone() is called in onSuccess and onError (source-level)
 * D. Queue waiting banner is rendered when isQueued (source-level)
 * E. "Already queued" toast logic when isQueued (source-level)
 * F. Batch Sprint is disabled when isBusy (source-level)
 * G. Max 10 jobs guard — shows warning when >10 selected (source-level)
 * H. batchSprint.mutate receives correct jobCardIds and resumeId (source-level)
 * I. AIConcurrencyContext is imported in JobCards.tsx (source-level)
 * J. batchSprint procedure exists in routers.ts (source-level)
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");
const JOB_CARDS_PATH = path.join(ROOT, "client/src/pages/JobCards.tsx");
const ROUTERS_PATH = path.join(ROOT, "server/routers.ts");

const jobCardsSource = fs.readFileSync(JOB_CARDS_PATH, "utf-8");
const routersSource = fs.readFileSync(ROUTERS_PATH, "utf-8");

describe("Phase 10D: Batch Sprint Concurrency", () => {
  // ── A. Batch Sprint button present ──────────────────────────────────
  describe("A. Batch Sprint button in bulk action bar", () => {
    it("A1: batch-sprint-btn data-testid is present in JobCards.tsx", () => {
      expect(jobCardsSource).toContain('data-testid="batch-sprint-btn"');
    });

    it("A2: Batch Sprint button shows Zap icon and credit cost label", () => {
      expect(jobCardsSource).toContain("Zap");
      expect(jobCardsSource).toContain("Batch Sprint (5 credits)");
    });

    it("A3: Batch Sprint button is only shown when selectedIds.size <= 10", () => {
      expect(jobCardsSource).toContain("selectedIds.size <= 10");
    });

    it("A4: Warning message shown when >10 cards selected", () => {
      expect(jobCardsSource).toContain("selectedIds.size > 10");
      expect(jobCardsSource).toContain("Select up to 10 for Batch Sprint");
    });
  });

  // ── B. runAI() wraps batchSprint.mutate ─────────────────────────────
  describe("B. runAI() integration", () => {
    it("B1: batchSprint.mutate is wrapped in runAI()", () => {
      expect(jobCardsSource).toContain("runAI(() => batchSprint.mutate(");
    });

    it("B2: runAI is destructured from useAIConcurrency in JobCards", () => {
      expect(jobCardsSource).toContain("runAI");
      expect(jobCardsSource).toContain("useAIConcurrency");
    });

    it("B3: batchSprint mutation passes jobCardIds and resumeId", () => {
      expect(jobCardsSource).toContain("jobCardIds: ids");
      expect(jobCardsSource).toContain("resumeId");
    });
  });

  // ── C. markDone() in onSuccess and onError ──────────────────────────
  describe("C. markDone() lifecycle hooks", () => {
    it("C1: markDone() is called in batchSprint onSuccess", () => {
      // Find the batchSprint mutation block
      const batchSprintIdx = jobCardsSource.indexOf("trpc.evidence.batchSprint.useMutation");
      expect(batchSprintIdx).toBeGreaterThan(-1);
      const mutationBlock = jobCardsSource.slice(batchSprintIdx, batchSprintIdx + 600);
      expect(mutationBlock).toContain("markDone()");
    });

    it("C2: markDone() is called in batchSprint onError", () => {
      const batchSprintIdx = jobCardsSource.indexOf("trpc.evidence.batchSprint.useMutation");
      const mutationBlock = jobCardsSource.slice(batchSprintIdx, batchSprintIdx + 1000);
      // Should have markDone() in both onSuccess and onError — check it appears at least twice
      const markDoneCount = (mutationBlock.match(/markDone\(\)/g) ?? []).length;
      expect(markDoneCount).toBeGreaterThanOrEqual(2);
    });

    it("C3: markDone is destructured from useAIConcurrency", () => {
      expect(jobCardsSource).toContain("markDone");
    });
  });

  // ── D. Queue waiting banner ──────────────────────────────────────────
  describe("D. Queue waiting banner", () => {
    it("D1: batch-sprint-queue-waiting data-testid is present", () => {
      expect(jobCardsSource).toContain('data-testid="batch-sprint-queue-waiting"');
    });

    it("D2: Queue banner is conditionally rendered on isQueued", () => {
      expect(jobCardsSource).toContain("{isQueued && (");
    });

    it("D3: Queue banner shows waiting message", () => {
      expect(jobCardsSource).toContain("Waiting for previous AI action to finish");
    });

    it("D4: Cancel button is present in queue banner", () => {
      expect(jobCardsSource).toContain('data-testid="batch-sprint-queue-cancel-btn"');
      expect(jobCardsSource).toContain("cancelQueued");
    });
  });

  // ── E. Already queued toast ──────────────────────────────────────────
  describe("E. Already queued toast", () => {
    it("E1: Already queued toast message is present", () => {
      expect(jobCardsSource).toContain("Already queued");
    });

    it("E2: isQueued check gates the already-queued toast", () => {
      // The isQueued check should appear before the toast
      const isQueuedIdx = jobCardsSource.indexOf("if (isQueued)");
      const alreadyQueuedIdx = jobCardsSource.indexOf("Already queued");
      expect(isQueuedIdx).toBeGreaterThan(-1);
      expect(alreadyQueuedIdx).toBeGreaterThan(-1);
      expect(alreadyQueuedIdx).toBeGreaterThan(isQueuedIdx);
    });
  });

  // ── F. Disabled when isBusy ──────────────────────────────────────────
  describe("F. Disabled state when AI is busy", () => {
    it("F1: Batch Sprint button is disabled when isBusy", () => {
      expect(jobCardsSource).toContain("isBusy");
      // The disabled prop should include isBusy
      const batchBtnIdx = jobCardsSource.indexOf('data-testid="batch-sprint-btn"');
      const disabledIdx = jobCardsSource.indexOf("disabled={batchSprint.isPending || isBusy", batchBtnIdx);
      expect(disabledIdx).toBeGreaterThan(batchBtnIdx);
    });

    it("F2: isBusy is destructured from useAIConcurrency", () => {
      expect(jobCardsSource).toContain("isBusy");
    });
  });

  // ── G. Max 10 jobs guard ─────────────────────────────────────────────
  describe("G. Max 10 jobs guard", () => {
    it("G1: Batch Sprint button is hidden when >10 cards selected", () => {
      // Button is inside selectedIds.size <= 10 conditional
      const btnIdx = jobCardsSource.indexOf('data-testid="batch-sprint-btn"');
      const guardIdx = jobCardsSource.lastIndexOf("selectedIds.size <= 10", btnIdx);
      expect(guardIdx).toBeGreaterThan(-1);
      expect(guardIdx).toBeLessThan(btnIdx);
    });

    it("G2: Warning text appears for >10 selection", () => {
      expect(jobCardsSource).toContain("Select up to 10 for Batch Sprint");
    });
  });

  // ── H. Correct mutation args ─────────────────────────────────────────
  describe("H. Mutation arguments", () => {
    it("H1: jobCardIds is derived from selectedIds array", () => {
      expect(jobCardsSource).toContain("const ids = Array.from(selectedIds)");
      expect(jobCardsSource).toContain("jobCardIds: ids");
    });

    it("H2: resumeId falls back to first resume if none selected", () => {
      expect(jobCardsSource).toContain("batchSprintResumeId ?? resumes[0]?.id");
    });

    it("H3: No resume guard shows error toast", () => {
      expect(jobCardsSource).toContain("Upload a resume first before running Batch Sprint");
    });
  });

  // ── I. AIConcurrencyContext import ───────────────────────────────────
  describe("I. AIConcurrencyContext integration", () => {
    it("I1: useAIConcurrency is imported from AIConcurrencyContext", () => {
      expect(jobCardsSource).toContain("import { useAIConcurrency } from \"@/contexts/AIConcurrencyContext\"");
    });

    it("I2: isQueued is destructured from useAIConcurrency", () => {
      expect(jobCardsSource).toContain("isQueued");
    });

    it("I3: cancelQueued is destructured from useAIConcurrency", () => {
      expect(jobCardsSource).toContain("cancelQueued");
    });
  });

  // ── J. Backend procedure exists ──────────────────────────────────────
  describe("J. Backend batchSprint procedure", () => {
    it("J1: batchSprint procedure exists in routers.ts", () => {
      expect(routersSource).toContain("batchSprint: protectedProcedure");
    });

    it("J2: batchSprint accepts jobCardIds array", () => {
      expect(routersSource).toContain("jobCardIds: z.array(z.number())");
    });

    it("J3: batchSprint accepts resumeId", () => {
      const batchIdx = routersSource.indexOf("batchSprint: protectedProcedure");
      const block = routersSource.slice(batchIdx, batchIdx + 200);
      expect(block).toContain("resumeId: z.number()");
    });

    it("J4: batchSprint charges 5 credits", () => {
      expect(routersSource).toContain("Batch Sprint");
      expect(routersSource).toContain("5 credits");
    });
  });
});
