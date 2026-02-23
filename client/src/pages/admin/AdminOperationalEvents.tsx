/**
 * Phase 10B-2B — Admin Operational Events
 *
 * Displays non-PII operational signals (rate limits, provider errors,
 * validation errors) for admin review. No payloads, no names, no emails.
 * Only hashed identifiers and enum fields are shown.
 */
import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ENDPOINT_GROUPS, EVENT_TYPES, type EndpointGroup, type EventType } from "@/../../shared/operational-events";

// ─── Types ────────────────────────────────────────────────────────────────────

// ─── Badge helpers ────────────────────────────────────────────────────────────

const EVENT_TYPE_COLORS: Record<EventType, string> = {
  rate_limited: "bg-yellow-100 text-yellow-800 border-yellow-200",
  provider_error: "bg-red-100 text-red-800 border-red-200",
  validation_error: "bg-orange-100 text-orange-800 border-orange-200",
  unknown: "bg-gray-100 text-gray-700 border-gray-200",
  waitlist_joined: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

const ENDPOINT_COLORS: Record<EndpointGroup, string> = {
  evidence: "bg-blue-100 text-blue-800 border-blue-200",
  outreach: "bg-purple-100 text-purple-800 border-purple-200",
  kit: "bg-indigo-100 text-indigo-800 border-indigo-200",
  url_fetch: "bg-cyan-100 text-cyan-800 border-cyan-200",
  auth: "bg-rose-100 text-rose-800 border-rose-200",
  waitlist: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

const STATUS_COLORS: Record<number, string> = {
  429: "bg-yellow-100 text-yellow-800",
  500: "bg-red-100 text-red-800",
  422: "bg-orange-100 text-orange-800",
  413: "bg-orange-100 text-orange-800",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminOperationalEvents() {
  const [endpointGroup, setEndpointGroup] = useState<EndpointGroup | "all">("all");
  const [eventType, setEventType] = useState<EventType | "all">("all");

  const { data: events, isLoading, refetch, isFetching } = trpc.admin.operationalEvents.list.useQuery({
    endpointGroup: endpointGroup === "all" ? undefined : endpointGroup,
    eventType: eventType === "all" ? undefined : eventType,
    limit: 500,
    offset: 0,
  });

  const isEmpty = !isLoading && (!events || events.length === 0);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Activity className="h-6 w-6 text-orange-500" />
              Operational Events
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Non-PII operational signals — rate limits, provider errors, validation failures.
              No payloads, names, or emails are stored.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="shrink-0"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Endpoint Group</label>
            <Select
              value={endpointGroup}
              onValueChange={(v) => setEndpointGroup(v as EndpointGroup | "all")}
            >
              <SelectTrigger className="w-40 h-9">
                <SelectValue placeholder="All endpoints" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All endpoints</SelectItem>
                <SelectItem value="evidence">evidence</SelectItem>
                <SelectItem value="outreach">outreach</SelectItem>
                <SelectItem value="kit">kit</SelectItem>
                <SelectItem value="url_fetch">url_fetch</SelectItem>
                <SelectItem value="auth">auth</SelectItem>
                <SelectItem value="waitlist">waitlist</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Event Type</label>
            <Select
              value={eventType}
              onValueChange={(v) => setEventType(v as EventType | "all")}
            >
              <SelectTrigger className="w-44 h-9">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="rate_limited">rate_limited</SelectItem>
                <SelectItem value="provider_error">provider_error</SelectItem>
                <SelectItem value="validation_error">validation_error</SelectItem>
                <SelectItem value="unknown">unknown</SelectItem>
                <SelectItem value="waitlist_joined">waitlist_joined</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Result count */}
          {!isLoading && events && (
            <div className="flex items-end pb-0.5">
              <span className="text-xs text-muted-foreground">
                {events.length} event{events.length !== 1 ? "s" : ""}
                {events.length === 500 ? " (capped at 500)" : ""}
              </span>
            </div>
          )}
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-3">
                  <div className="h-8 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : isEmpty ? (
          <div className="text-center py-16 text-muted-foreground">
            <Activity className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No operational events found</p>
            <p className="text-sm mt-1">
              Events are recorded when rate limits fire or errors occur.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_1fr_1fr_auto_auto_auto] gap-3 px-4 py-2 bg-muted/50 text-xs font-medium text-muted-foreground border-b">
              <span>Endpoint</span>
              <span>Event Type</span>
              <span>Request ID</span>
              <span>Status</span>
              <span>Retry (s)</span>
              <span>Time</span>
            </div>

            {/* Rows */}
            <div className="divide-y">
              {events?.map((ev) => (
                <div
                  key={ev.id}
                  className="grid grid-cols-[1fr_1fr_1fr_auto_auto_auto] gap-3 px-4 py-3 items-center text-sm hover:bg-muted/30 transition-colors"
                >
                  {/* Endpoint group */}
                  <Badge
                    variant="outline"
                    className={`text-xs w-fit ${ENDPOINT_COLORS[ev.endpointGroup as EndpointGroup] ?? ""}`}
                  >
                    {ev.endpointGroup}
                  </Badge>

                  {/* Event type */}
                  <Badge
                    variant="outline"
                    className={`text-xs w-fit ${EVENT_TYPE_COLORS[ev.eventType as EventType] ?? ""}`}
                  >
                    {ev.eventType}
                  </Badge>

                  {/* Request ID (truncated) */}
                  <span className="font-mono text-xs text-muted-foreground truncate" title={ev.requestId}>
                    {ev.requestId.slice(0, 12)}…
                  </span>

                  {/* Status code */}
                  <Badge
                    variant="outline"
                    className={`text-xs w-fit ${STATUS_COLORS[ev.statusCode] ?? "bg-gray-100 text-gray-700"}`}
                  >
                    {ev.statusCode}
                  </Badge>

                  {/* Retry after */}
                  <span className="text-xs text-muted-foreground text-right tabular-nums">
                    {ev.retryAfterSeconds != null ? `${ev.retryAfterSeconds}s` : "—"}
                  </span>

                  {/* Timestamp */}
                  <span className="text-xs text-muted-foreground text-right whitespace-nowrap">
                    {new Date(ev.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Privacy notice */}
        <p className="text-xs text-muted-foreground border-t pt-4">
          <strong>Privacy:</strong> This table stores only non-PII operational signals.
          User IDs and IPs are one-way SHA-256 hashed (first 16 hex chars) and are not
          displayed here. No resume, JD, outreach, or profile text is ever stored.
        </p>
      </div>
    </AdminLayout>
  );
}
