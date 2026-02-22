/**
 * Patch 8G — Dashboard Score Trends Widget
 *
 * Compact multi-card mini sparklines showing ATS score trends across
 * all active job cards (Bookmarked / Applying / Applied / Interviewing).
 */
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, BarChart2 } from "lucide-react";
import { useLocation } from "wouter";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────
type TrendCard = {
  id: number;
  title: string;
  company: string | null;
  stage: string;
  runs: Array<{ id: number; overallScore: number | null; createdAt: Date }>;
};

// ─── Mini sparkline (no axes, just the line) ──────────────────────────
function MiniSparkline({ runs }: { runs: TrendCard["runs"] }) {
  const data = runs.map((r) => ({ score: r.overallScore ?? 0 }));
  if (data.length < 2) return null;
  const latestScore = data[data.length - 1].score;
  const lineColor =
    latestScore >= 75
      ? "#10b981" // emerald
      : latestScore >= 50
      ? "#f59e0b" // amber
      : "#ef4444"; // red
  return (
    <ResponsiveContainer width={80} height={32}>
      <LineChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
        <Tooltip
          contentStyle={{
            fontSize: 11,
            padding: "2px 6px",
            borderRadius: 4,
            background: "var(--popover)",
            border: "1px solid var(--border)",
            color: "var(--popover-foreground)",
          }}
          formatter={(v: number) => [`${v}`, "Score"]}
          labelFormatter={() => ""}
        />
        <Line
          type="monotone"
          dataKey="score"
          stroke={lineColor}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ─── Delta badge ──────────────────────────────────────────────────────
function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null) return null;
  if (delta === 0)
    return (
      <Badge variant="outline" className="text-xs text-muted-foreground px-1.5 py-0">
        <Minus className="h-2.5 w-2.5 mr-0.5" />0
      </Badge>
    );
  if (delta > 0)
    return (
      <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-300 bg-emerald-50 px-1.5 py-0">
        <TrendingUp className="h-2.5 w-2.5 mr-0.5" />+{delta}
      </Badge>
    );
  return (
    <Badge variant="outline" className="text-xs text-red-600 border-red-300 bg-red-50 px-1.5 py-0">
      <TrendingDown className="h-2.5 w-2.5 mr-0.5" />{delta}
    </Badge>
  );
}

// ─── Title clamp helper ───────────────────────────────────────────────
function clampTitle(title: string, max = 80): string {
  return title.length > max ? title.slice(0, max) + "\u2026" : title;
}

// ─── Single card row ──────────────────────────────────────────────────
function TrendRow({ card }: { card: TrendCard }) {
  const [, setLocation] = useLocation();
  const runs = card.runs;
  const latestScore = runs.length > 0 ? (runs[runs.length - 1].overallScore ?? null) : null;
  const prevScore = runs.length > 1 ? (runs[runs.length - 2].overallScore ?? null) : null;
  const delta = latestScore !== null && prevScore !== null ? latestScore - prevScore : null;

  const scoreColor =
    latestScore === null
      ? "text-muted-foreground"
      : latestScore >= 75
      ? "text-emerald-600"
      : latestScore >= 50
      ? "text-amber-600"
      : "text-red-600";

  return (
    <div
      className="flex items-center gap-3 py-2 px-1 rounded-md hover:bg-accent/50 transition-colors cursor-pointer group"
      onClick={() => setLocation(`/jobs/${card.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && setLocation(`/jobs/${card.id}`)}
    >
      {/* Company + role */}
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-medium leading-tight"
          style={{ overflowWrap: "anywhere", wordBreak: "break-word" }}
        >
          {clampTitle(card.title)}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {card.company ?? "Unknown Company"}
        </p>
      </div>

      {/* Sparkline (only shown when ≥2 runs; 1-run shows score only) */}
      <div className="shrink-0 w-20 flex items-center justify-center">
        {runs.length >= 2 ? (
          <MiniSparkline runs={runs} />
        ) : (
          <span className="text-xs text-muted-foreground/60 whitespace-nowrap">
            1 run
          </span>
        )}
      </div>

      {/* Score + delta */}
      <div className="shrink-0 flex items-center gap-1.5 w-20 justify-end">
        {latestScore !== null ? (
          <>
            <span className={`text-sm font-bold tabular-nums ${scoreColor}`}>
              {latestScore}
            </span>
            <DeltaBadge delta={delta} />
          </>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </div>
    </div>
  );
}

// ─── Main widget ──────────────────────────────────────────────────────
export function ScoreTrendsWidget() {
  const { data: cards, isLoading } = trpc.evidence.activeTrends.useQuery();

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <BarChart2 className="h-4 w-4 text-primary" />
          ATS Score Trends
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 rounded-md bg-muted animate-pulse" />
            ))}
          </div>
        ) : !cards || cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <BarChart2 className="h-8 w-8 mb-2 opacity-30" />
            <p className="text-sm">No active job cards yet.</p>
            <p className="text-xs mt-1">Add a job card to start tracking ATS scores.</p>
          </div>
        ) : (() => {
          const withRuns = cards.filter((c) => c.runs.length > 0);
          if (withRuns.length === 0) {
            return (
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                <TrendingUp className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm">No scans yet. Run your first scan to see trends.</p>
                <p className="text-xs mt-1">Open a job card and run Evidence+ATS.</p>
              </div>
            );
          }
          return (
            <div className="divide-y divide-border/50">
              {withRuns.map((card) => (
                <TrendRow key={card.id} card={card} />
              ))}
            </div>
          );
        })()}
      </CardContent>
    </Card>
  );
}
