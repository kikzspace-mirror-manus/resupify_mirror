/**
 * /admin/refunds — Admin-only Refund Queue page.
 *
 * Phase 11D: Displays pending/processed/ignored refund queue items.
 * Admin can review each item and either:
 *   A) Debit credits (with confirmation step)
 *   B) Ignore (with required reason)
 *
 * Idempotency is enforced server-side: same stripeRefundId cannot create
 * multiple debits. The UI reflects this by disabling actions on non-pending items.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw, RotateCcw, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────
type RefundStatus = "pending" | "processed" | "ignored";

interface RefundQueueItem {
  id: number;
  userId: number | null;
  stripeChargeId: string;
  stripeRefundId: string;
  stripeCheckoutSessionId: string | null;
  amountRefunded: number | null;
  currency: string | null;
  packId: string | null;
  creditsToReverse: number | null;
  status: RefundStatus;
  adminUserId: number | null;
  ignoreReason: string | null;
  ledgerEntryId: number | null;
  processedAt: Date | null;
  createdAt: Date;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatCents(cents: number | null, currency: string | null): string {
  if (cents == null) return "—";
  const curr = (currency ?? "usd").toUpperCase();
  return `${curr} ${(cents / 100).toFixed(2)}`;
}

function formatDate(d: Date | null | string): string {
  if (!d) return "—";
  return new Date(d).toLocaleString();
}

const STATUS_COLORS: Record<RefundStatus, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  processed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  ignored: "bg-gray-100 text-gray-500 border-gray-200",
};

const STATUS_ICONS: Record<RefundStatus, React.ReactNode> = {
  pending: <AlertTriangle className="h-3 w-3" />,
  processed: <CheckCircle2 className="h-3 w-3" />,
  ignored: <XCircle className="h-3 w-3" />,
};

// ─── Review Modal ─────────────────────────────────────────────────────────────
interface ReviewModalProps {
  item: RefundQueueItem;
  onClose: () => void;
  onRefresh: () => void;
}

function ReviewModal({ item, onClose, onRefresh }: ReviewModalProps) {
  const utils = trpc.useUtils();

  // Debit flow
  const [debitAmount, setDebitAmount] = useState<number>(item.creditsToReverse ?? 0);
  const [confirmDebit, setConfirmDebit] = useState(false);

  // Ignore flow
  const [showIgnore, setShowIgnore] = useState(false);
  const [ignoreReason, setIgnoreReason] = useState("");

  const processMutation = trpc.admin.refunds.process.useMutation({
    onSuccess: (data) => {
      if (data.alreadyProcessed) {
        toast.error("Already processed — this refund was already handled.");
      } else {
        toast.success(`Credits debited. Ledger entry #${data.ledgerEntryId} created.`);
      }
      utils.admin.refunds.list.invalidate();
      onRefresh();
      onClose();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const ignoreMutation = trpc.admin.refunds.ignore.useMutation({
    onSuccess: (data) => {
      if (data.alreadyProcessed) {
        toast.error("Already processed — this refund was already handled.");
      } else {
        toast.success("Refund marked as ignored.");
      }
      utils.admin.refunds.list.invalidate();
      onRefresh();
      onClose();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const isPending = item.status === "pending";

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-orange-500" />
            Review Refund
          </DialogTitle>
          <DialogDescription>
            Refund ID: <code className="text-xs bg-muted px-1 rounded">{item.stripeRefundId}</code>
          </DialogDescription>
        </DialogHeader>

        {/* Details */}
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 bg-muted/40 rounded-lg p-3">
            <div className="text-muted-foreground">User ID</div>
            <div className="font-mono">{item.userId ?? "—"}</div>
            <div className="text-muted-foreground">Amount Refunded</div>
            <div>{formatCents(item.amountRefunded, item.currency)}</div>
            <div className="text-muted-foreground">Pack</div>
            <div>{item.packId ?? "—"}</div>
            <div className="text-muted-foreground">Credits to Reverse</div>
            <div>{item.creditsToReverse != null ? `${item.creditsToReverse} credits` : "Unknown — enter manually"}</div>
            <div className="text-muted-foreground">Charge ID</div>
            <div className="font-mono text-xs truncate">{item.stripeChargeId}</div>
            <div className="text-muted-foreground">Session ID</div>
            <div className="font-mono text-xs truncate">{item.stripeCheckoutSessionId ?? "—"}</div>
            <div className="text-muted-foreground">Created</div>
            <div>{formatDate(item.createdAt)}</div>
            <div className="text-muted-foreground">Status</div>
            <div>
              <Badge variant="outline" className={`gap-1 ${STATUS_COLORS[item.status]}`}>
                {STATUS_ICONS[item.status]}
                {item.status}
              </Badge>
            </div>
          </div>

          {!isPending && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-700 text-sm">
              This item has already been <strong>{item.status}</strong>.
              {item.ignoreReason && <> Reason: <em>{item.ignoreReason}</em></>}
            </div>
          )}
        </div>

        {isPending && !showIgnore && (
          <>
            {/* Debit Credits section */}
            <div className="space-y-3 border-t pt-4">
              <h3 className="font-semibold text-sm">A) Debit Credits</h3>
              <div className="space-y-1">
                <Label htmlFor="debit-amount">Credits to debit</Label>
                <Input
                  id="debit-amount"
                  type="number"
                  min={0}
                  max={1000}
                  value={debitAmount}
                  onChange={(e) => {
                    setDebitAmount(parseInt(e.target.value, 10) || 0);
                    setConfirmDebit(false);
                  }}
                  className="w-32"
                />
                <p className="text-xs text-muted-foreground">
                  Default derived from pack. Override if this is a partial refund.
                  Balance may go negative.
                </p>
              </div>

              {!confirmDebit ? (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setConfirmDebit(true)}
                  disabled={debitAmount < 0}
                >
                  Debit {debitAmount} credits from user
                </Button>
              ) : (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-3">
                  <p className="text-sm font-medium text-destructive">
                    This will create a ledger entry and reduce the user&apos;s balance by{" "}
                    <strong>{debitAmount} credits</strong>. Continue?
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() =>
                        processMutation.mutate({ refundQueueId: item.id, debitAmount })
                      }
                      disabled={processMutation.isPending}
                    >
                      {processMutation.isPending ? "Processing…" : "Confirm Debit"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setConfirmDebit(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Ignore section */}
            <div className="space-y-3 border-t pt-4">
              <h3 className="font-semibold text-sm">B) Ignore</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowIgnore(true)}
              >
                Mark as Ignored
              </Button>
            </div>
          </>
        )}

        {isPending && showIgnore && (
          <div className="space-y-3 border-t pt-4">
            <h3 className="font-semibold text-sm">Ignore Reason (required)</h3>
            <Textarea
              placeholder="e.g. Test purchase, fraud handled elsewhere, duplicate event…"
              value={ignoreReason}
              onChange={(e) => setIgnoreReason(e.target.value)}
              rows={3}
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  ignoreMutation.mutate({ refundQueueId: item.id, reason: ignoreReason })
                }
                disabled={ignoreMutation.isPending || ignoreReason.trim().length === 0}
              >
                {ignoreMutation.isPending ? "Saving…" : "Confirm Ignore"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowIgnore(false)}
              >
                Back
              </Button>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminRefunds() {
  const [statusFilter, setStatusFilter] = useState<RefundStatus | "all">("all");
  const [reviewItem, setReviewItem] = useState<RefundQueueItem | null>(null);

  const { data: items, isLoading, refetch } = trpc.admin.refunds.list.useQuery(
    { status: statusFilter === "all" ? undefined : statusFilter }
  );

  const isEmpty = !isLoading && (!items || items.length === 0);

  const pendingCount = items?.filter((i) => i.status === "pending").length ?? 0;

  return (
    <AdminLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-orange-500" />
              Refund Queue
              {pendingCount > 0 && (
                <Badge className="bg-amber-500 text-white ml-1">{pendingCount} pending</Badge>
              )}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Review Stripe refunds and manually debit credits. All actions are logged.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <Label className="text-sm text-muted-foreground">Status:</Label>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as RefundStatus | "all")}
          >
            <SelectTrigger className="w-36 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processed">Processed</SelectItem>
              <SelectItem value="ignored">Ignored</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground animate-pulse">Loading…</div>
            ) : isEmpty ? (
              <div className="p-8 text-center text-muted-foreground">
                No refund queue items found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">User ID</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Refund Amount</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Pack</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Credits to Reverse</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(items as RefundQueueItem[]).map((item) => (
                      <tr key={item.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {formatDate(item.createdAt)}
                        </td>
                        <td className="px-4 py-3 font-mono">
                          {item.userId ?? <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          {formatCents(item.amountRefunded, item.currency)}
                        </td>
                        <td className="px-4 py-3">
                          {item.packId ? (
                            <Badge variant="outline" className="text-xs">{item.packId}</Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {item.creditsToReverse != null ? (
                            <span className="font-medium">{item.creditsToReverse}</span>
                          ) : (
                            <span className="text-amber-600 text-xs">Enter manually</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={`gap-1 text-xs ${STATUS_COLORS[item.status]}`}
                          >
                            {STATUS_ICONS[item.status]}
                            {item.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => setReviewItem(item)}
                          >
                            Review
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Review Modal */}
      {reviewItem && (
        <ReviewModal
          item={reviewItem}
          onClose={() => setReviewItem(null)}
          onRefresh={() => refetch()}
        />
      )}
    </AdminLayout>
  );
}
