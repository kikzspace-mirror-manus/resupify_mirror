/**
 * AIConcurrencyContext — Phase 10B
 *
 * Provides a lightweight client-side concurrency guard for AI endpoints.
 * At most one AI request is in-flight at a time; a second attempt is queued
 * (max 1 queued item) and auto-runs when the first completes.
 *
 * Usage:
 *   const { isBusy, isQueued, runAI, markDone, cancelQueued } = useAIConcurrency();
 *
 *   // Instead of calling mutate() directly:
 *   runAI(() => myMutation.mutate(args));
 *
 *   // In onSuccess / onError of every AI mutation:
 *   markDone();
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";

export type AIAction = () => void;

interface AIConcurrencyContextValue {
  /** True while an AI request is in-flight. */
  isBusy: boolean;
  /** True when a second request is queued and waiting. */
  isQueued: boolean;
  /**
   * Run an AI action.
   * - If not busy: runs immediately and marks busy.
   * - If busy: queues the action (replaces any previous queued item).
   */
  runAI: (action: AIAction) => void;
  /**
   * Must be called in onSuccess AND onError of every AI mutation.
   * Clears the busy flag and auto-runs the queued action if present.
   */
  markDone: () => void;
  /** Clears the queued action without running it. */
  cancelQueued: () => void;
}

const AIConcurrencyContext = createContext<AIConcurrencyContextValue | undefined>(
  undefined
);

export function AIConcurrencyProvider({ children }: { children: React.ReactNode }) {
  const [isBusy, setIsBusy] = useState(false);
  const [isQueued, setIsQueued] = useState(false);
  // Use a ref for the queued action so markDone() always sees the latest value
  // without needing it as a dependency (avoids stale-closure issues).
  const queuedActionRef = useRef<AIAction | null>(null);

  const runAI = useCallback((action: AIAction) => {
    setIsBusy((busy) => {
      if (!busy) {
        // Not busy — run immediately
        // Schedule the action after the state update settles
        setTimeout(action, 0);
        return true; // mark busy
      }
      // Already busy — queue (replace any previous queued item)
      queuedActionRef.current = action;
      setIsQueued(true);
      return true; // stay busy
    });
  }, []);

  const markDone = useCallback(() => {
    const queued = queuedActionRef.current;
    if (queued) {
      // Auto-run the queued action; stay busy
      queuedActionRef.current = null;
      setIsQueued(false);
      // Run after state update
      setTimeout(queued, 0);
      // isBusy stays true — the queued action is now running
    } else {
      // Nothing queued — clear busy
      setIsBusy(false);
    }
  }, []);

  const cancelQueued = useCallback(() => {
    queuedActionRef.current = null;
    setIsQueued(false);
  }, []);

  return (
    <AIConcurrencyContext.Provider
      value={{ isBusy, isQueued, runAI, markDone, cancelQueued }}
    >
      {children}
    </AIConcurrencyContext.Provider>
  );
}

export function useAIConcurrency(): AIConcurrencyContextValue {
  const ctx = useContext(AIConcurrencyContext);
  if (!ctx) {
    throw new Error("useAIConcurrency must be used within AIConcurrencyProvider");
  }
  return ctx;
}
