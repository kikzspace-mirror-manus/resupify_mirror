/**
 * ProfileNudgeBanner — shared component
 *
 * Shows an amber banner prompting users to complete their work status profile.
 * Displayed only when work_status is unknown/null AND the banner has not been
 * dismissed within the last 30 days (localStorage TTL).
 *
 * Used on: Dashboard, Today
 */
import { Button } from "@/components/ui/button";
import { ShieldCheck, X } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useCallback } from "react";

export const NUDGE_KEY = "profileNudgeDismissed";
export const NUDGE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function isNudgeDismissed(): boolean {
  try {
    const raw = localStorage.getItem(NUDGE_KEY);
    if (!raw) return false;
    const ts = parseInt(raw, 10);
    if (isNaN(ts)) return false;
    return Date.now() - ts < NUDGE_TTL_MS;
  } catch {
    return false;
  }
}

export function dismissNudge(): void {
  try {
    localStorage.setItem(NUDGE_KEY, String(Date.now()));
  } catch {
    // localStorage unavailable (private browsing) — silently ignore
  }
}

/** Inline banner UI — call onDismiss to hide */
export function ProfileNudgeBanner({ onDismiss }: { onDismiss: () => void }) {
  const [, setLocation] = useLocation();
  return (
    <div
      role="alert"
      aria-label="Profile completeness nudge"
      className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-900/20 px-4 py-3 text-sm"
    >
      <ShieldCheck className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" aria-hidden />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-amber-900 dark:text-amber-200">
          Complete your profile for more accurate eligibility checks
        </p>
        <p className="text-amber-700 dark:text-amber-400 mt-0.5 text-xs">
          Add your work status and sponsorship needs so Resupify can flag potential eligibility requirements earlier.
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 dark:border-amber-700 dark:bg-transparent dark:text-amber-300 dark:hover:bg-amber-900/30"
          onClick={() => setLocation("/profile")}
        >
          Complete profile
        </Button>
        <button
          aria-label="Dismiss"
          className="p-1 rounded hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-600 dark:text-amber-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          onClick={onDismiss}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/**
 * useProfileNudge — hook that manages show/dismiss state.
 * workStatus: the value from userProfiles.work_status
 */
export function useProfileNudge(workStatus: string | null | undefined) {
  const isUnknown = !workStatus || workStatus === "unknown";
  const [dismissed, setDismissed] = useState(() => isNudgeDismissed());

  const handleDismiss = useCallback(() => {
    dismissNudge();
    setDismissed(true);
  }, []);

  const showNudge = isUnknown && !dismissed;
  return { showNudge, handleDismiss };
}
