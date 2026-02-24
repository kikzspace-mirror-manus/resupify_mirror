/**
 * /admin/stripe-events — Admin-only, read-only Stripe Events view.
 *
 * Phase 10C-2: Displays stripe_events table rows with filters for status
 * and eventType. No PII, no free text — only fields in the stripe_events table.
 *
 * Phase 12S: Fixed table layout with explicit column widths for consistent alignment.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw, CreditCard } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Status = "processed" | "manual_review" | "skipped";
type EventType = "checkout.session.completed" | "charge.refunded" | string;

// ─── Color maps ───────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<Status, string> = {
  processed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  manual_review: "bg-amber-50 text-amber-700 border-amber-200",
  skipped: "bg-gray-100 text-gray-500 border-gray-200",
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  "checkout.session.completed": "bg-blue-50 text-blue-700 border-blue-200",
  "charge.refunded": "bg-orange-50 text-orange-700 border-orange-200",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminStripeEvents() {
  const [status, setStatus] = useState<Status | "all">("all");
  const [eventType, setEventType] = useState<string>("all");
  const { data: events, isLoading, refetch } = trpc.admin.stripeEvents.list.useQuery(
    {
      status: status === "all" ? undefined : status,
      eventType: eventType === "all" ? undefined : eventType,
      limit: 500,
      offset: 0,
    }
  );

  const isEmpty = !isLoading && (!events || events.length === 0);

  return (
    <AdminLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Stripe Events</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Read-only view of processed Stripe webhook events. No PII stored.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { refetch(); }}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-4">
          {/* Status filter */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Status</label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as Status | "all")}
            >
              <SelectTrigger className="w-44 h-9">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="processed">processed</SelectItem>
                <SelectItem value="manual_review">manual_review</SelectItem>
                <SelectItem value="skipped">skipped</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Event type filter */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Event Type</label>
            <Select
              value={eventType}
              onValueChange={(v) => setEventType(v)}
            >
              <SelectTrigger className="w-56 h-9">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="checkout.session.completed">checkout.session.completed</SelectItem>
                <SelectItem value="charge.refunded">charge.refunded</SelectItem>
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
            <CreditCard className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No Stripe events found</p>
            <p className="text-sm mt-1">
              Events are recorded when Stripe webhooks are received.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            {/* Phase 12S: Fixed table layout with explicit column widths */}
            <div style={{ display: "table", width: "100%", tableLayout: "fixed" }}>
              {/* Table header */}
              <div
                style={{ display: "table-row", backgroundColor: "hsl(var(--muted))" }}
                className="text-xs font-medium text-muted-foreground border-b"
              >
                <div style={{ display: "table-cell", width: "40%", padding: "8px 12px", verticalAlign: "middle" }}>
                  Stripe Event ID
                </div>
                <div style={{ display: "table-cell", width: "25%", padding: "8px 12px", verticalAlign: "middle" }}>
                  Event Type
                </div>
                <div style={{ display: "table-cell", width: "15%", padding: "8px 12px", verticalAlign: "middle", textAlign: "center" }}>
                  Status
                </div>
                <div style={{ display: "table-cell", width: "8%", padding: "8px 12px", verticalAlign: "middle", textAlign: "right" }}>
                  Credits
                </div>
                <div style={{ display: "table-cell", width: "12%", padding: "8px 12px", verticalAlign: "middle", textAlign: "right" }}>
                  Time
                </div>
              </div>

              {/* Rows */}
              {events?.map((ev, idx) => (
                <div
                  key={ev.id}
                  style={{ display: "table-row" }}
                  className={`text-sm hover:bg-muted/30 transition-colors ${
                    idx !== events.length - 1 ? "border-b" : ""
                  }`}
                >
                  {/* Stripe Event ID (truncated) */}
                  <div
                    style={{
                      display: "table-cell",
                      width: "40%",
                      padding: "8px 12px",
                      verticalAlign: "middle",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    className="font-mono text-xs text-muted-foreground"
                    title={ev.stripeEventId}
                  >
                    {ev.stripeEventId.slice(0, 24)}…
                  </div>

                  {/* Event type */}
                  <div
                    style={{
                      display: "table-cell",
                      width: "25%",
                      padding: "8px 12px",
                      verticalAlign: "middle",
                    }}
                  >
                    <Badge
                      variant="outline"
                      className={`text-xs w-fit ${EVENT_TYPE_COLORS[ev.eventType] ?? "bg-gray-100 text-gray-600"}`}
                    >
                      {ev.eventType}
                    </Badge>
                  </div>

                  {/* Status */}
                  <div
                    style={{
                      display: "table-cell",
                      width: "15%",
                      padding: "8px 12px",
                      verticalAlign: "middle",
                      textAlign: "center",
                    }}
                  >
                    <Badge
                      variant="outline"
                      className={`text-xs w-fit ${STATUS_COLORS[ev.status as Status] ?? "bg-gray-100 text-gray-600"}`}
                    >
                      {ev.status}
                    </Badge>
                  </div>

                  {/* Credits purchased */}
                  <div
                    style={{
                      display: "table-cell",
                      width: "8%",
                      padding: "8px 12px",
                      verticalAlign: "middle",
                      textAlign: "right",
                    }}
                    className="text-xs tabular-nums"
                  >
                    {ev.creditsPurchased != null ? (
                      <span className="text-emerald-600 font-medium">+{ev.creditsPurchased}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>

                  {/* Timestamp */}
                  <div
                    style={{
                      display: "table-cell",
                      width: "12%",
                      padding: "8px 12px",
                      verticalAlign: "middle",
                      textAlign: "right",
                      whiteSpace: "nowrap",
                    }}
                    className="text-xs text-muted-foreground"
                  >
                    {new Date(ev.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Privacy notice */}
        <p className="text-xs text-muted-foreground border-t pt-4">
          <strong>Privacy:</strong> This table contains only Stripe event IDs, event types,
          status flags, and credit amounts. No card data, no customer PII, and no webhook
          payloads are stored. User IDs are stored as internal integer references only.
        </p>
      </div>
    </AdminLayout>
  );
}
