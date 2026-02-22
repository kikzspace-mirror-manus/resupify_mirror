/**
 * Patch 8K — SnapshotDiffView
 * A two-column side-by-side diff view for JD Snapshot versions.
 * Uses a pure line-based LCS diff (no external library needed).
 */
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";

// ─── Types ────────────────────────────────────────────────────────────
export type DiffLine =
  | { type: "equal"; text: string }
  | { type: "removed"; text: string }
  | { type: "added"; text: string };

export type DiffResult = {
  leftLines: Array<{ type: "equal" | "removed" | "empty"; text: string }>;
  rightLines: Array<{ type: "equal" | "added" | "empty"; text: string }>;
  addedCount: number;
  removedCount: number;
  truncated: boolean;
};

// ─── Constants ────────────────────────────────────────────────────────
const DIFF_CHAR_LIMIT = 20_000;

// ─── LCS-based line diff ──────────────────────────────────────────────
/**
 * Compute a line-based diff between two texts using the Myers diff algorithm
 * (simplified LCS approach). Returns an array of DiffLine objects.
 */
export function computeLineDiff(oldText: string, newText: string): DiffResult {
  // Truncate if too large
  const truncated = oldText.length > DIFF_CHAR_LIMIT || newText.length > DIFF_CHAR_LIMIT;
  const a = oldText.slice(0, DIFF_CHAR_LIMIT).split("\n");
  const b = newText.slice(0, DIFF_CHAR_LIMIT).split("\n");

  // Build LCS table
  const m = a.length;
  const n = b.length;
  // Use a space-optimised approach for large inputs
  const MAX_LINES = 500;
  if (m > MAX_LINES || n > MAX_LINES) {
    // Fallback: simple line-by-line comparison without LCS for very large diffs
    return simpleDiff(a, b, truncated);
  }

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i]![j] = dp[i - 1]![j - 1]! + 1;
      } else {
        dp[i]![j] = Math.max(dp[i - 1]![j]!, dp[i]![j - 1]!);
      }
    }
  }

  // Backtrack to get diff
  const diff: DiffLine[] = [];
  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      diff.unshift({ type: "equal", text: a[i - 1]! });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i]![j - 1]! >= dp[i - 1]![j]!)) {
      diff.unshift({ type: "added", text: b[j - 1]! });
      j--;
    } else {
      diff.unshift({ type: "removed", text: a[i - 1]! });
      i--;
    }
  }

  return buildResult(diff, truncated);
}

/** Simple fallback diff for large inputs */
function simpleDiff(
  a: string[],
  b: string[],
  truncated: boolean
): DiffResult {
  const setA = new Set(a);
  const setB = new Set(b);
  const diff: DiffLine[] = [];

  // Mark lines only in A as removed, only in B as added, common as equal
  const allLines = [...a, ...b.filter((l) => !setA.has(l))];
  for (const line of allLines) {
    if (setA.has(line) && setB.has(line)) {
      diff.push({ type: "equal", text: line });
    } else if (setA.has(line) && !setB.has(line)) {
      diff.push({ type: "removed", text: line });
    } else {
      diff.push({ type: "added", text: line });
    }
  }
  return buildResult(diff, truncated);
}

function buildResult(diff: DiffLine[], truncated: boolean): DiffResult {
  const leftLines: DiffResult["leftLines"] = [];
  const rightLines: DiffResult["rightLines"] = [];
  let addedCount = 0;
  let removedCount = 0;

  for (const line of diff) {
    if (line.type === "equal") {
      leftLines.push({ type: "equal", text: line.text });
      rightLines.push({ type: "equal", text: line.text });
    } else if (line.type === "removed") {
      leftLines.push({ type: "removed", text: line.text });
      rightLines.push({ type: "empty", text: "" });
      removedCount++;
    } else {
      leftLines.push({ type: "empty", text: "" });
      rightLines.push({ type: "added", text: line.text });
      addedCount++;
    }
  }

  return { leftLines, rightLines, addedCount, removedCount, truncated };
}

// ─── Component ────────────────────────────────────────────────────────
interface SnapshotDiffViewProps {
  oldSnapshot: { version: number; capturedAt: string | Date; snapshotText: string };
  newSnapshot: { version: number; capturedAt: string | Date; snapshotText: string };
}

export function SnapshotDiffView({ oldSnapshot, newSnapshot }: SnapshotDiffViewProps) {
  const diff = useMemo(
    () => computeLineDiff(oldSnapshot.snapshotText, newSnapshot.snapshotText),
    [oldSnapshot.snapshotText, newSnapshot.snapshotText]
  );

  return (
    <div className="space-y-3">
      {/* Summary bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium">Diff summary:</span>
        <Badge variant="outline" className="text-emerald-700 border-emerald-300 bg-emerald-50">
          +{diff.addedCount} additions
        </Badge>
        <Badge variant="outline" className="text-red-700 border-red-300 bg-red-50">
          -{diff.removedCount} removals
        </Badge>
        {diff.truncated && (
          <span className="text-xs text-amber-600 italic">
            Diff truncated for performance (first 20k chars shown).
          </span>
        )}
      </div>

      {/* Two-column diff */}
      <div className="grid grid-cols-2 gap-2 rounded-lg border overflow-hidden text-xs font-mono">
        {/* Left header */}
        <div className="bg-red-50 border-b border-red-200 px-3 py-2 font-semibold text-red-800">
          Version {oldSnapshot.version} — {new Date(oldSnapshot.capturedAt).toLocaleString()}
        </div>
        {/* Right header */}
        <div className="bg-emerald-50 border-b border-emerald-200 px-3 py-2 font-semibold text-emerald-800">
          Version {newSnapshot.version} — {new Date(newSnapshot.capturedAt).toLocaleString()}
        </div>

        {/* Left column */}
        <div className="overflow-auto max-h-[480px] bg-background">
          {diff.leftLines.map((line, idx) => (
            <div
              key={idx}
              className={`px-3 py-0.5 whitespace-pre-wrap leading-5 ${
                line.type === "removed"
                  ? "bg-red-100 text-red-800 border-l-2 border-red-400"
                  : line.type === "empty"
                  ? "bg-muted/30 text-transparent select-none"
                  : "text-foreground"
              }`}
            >
              {line.type === "empty" ? "\u00a0" : line.text || "\u00a0"}
            </div>
          ))}
        </div>

        {/* Right column */}
        <div className="overflow-auto max-h-[480px] bg-background border-l">
          {diff.rightLines.map((line, idx) => (
            <div
              key={idx}
              className={`px-3 py-0.5 whitespace-pre-wrap leading-5 ${
                line.type === "added"
                  ? "bg-emerald-100 text-emerald-800 border-l-2 border-emerald-400"
                  : line.type === "empty"
                  ? "bg-muted/30 text-transparent select-none"
                  : "text-foreground"
              }`}
            >
              {line.type === "empty" ? "\u00a0" : line.text || "\u00a0"}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
