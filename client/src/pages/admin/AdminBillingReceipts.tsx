/**
 * /admin/billing-receipts — Admin-only Purchase Receipts page.
 *
 * Phase 11I: Adds a search input that filters receipts server-side by:
 *   - User email (partial match, case-insensitive)
 *   - Receipt ID (exact numeric match)
 * The email filter (sent/unsent/all) is combined with the search query.
 * A "User Email" column is shown in the table (populated via LEFT JOIN).
 *
 * Phase 11H: Lists all purchase receipts across all users.
 * Admin can filter by emailSentAt status and retry sending the
 * confirmation email for receipts where emailSentAt is null.
 */
import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw, Mail, MailCheck, MailX, AlertCircle, Search, X } from "lucide-react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────
type EmailFilter = "all" | "sent" | "unsent";

interface PurchaseReceipt {
  id: number;
  userId: number;
  stripeCheckoutSessionId: string | null;
  packId: string;
  creditsAdded: number;
  amountCents: number | null;
  currency: string | null;
  emailSentAt: Date | null;
  emailError: string | null;
  createdAt: Date;
  userEmail?: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(d: Date | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleString();
}

function formatAmount(cents: number | null, currency: string | null): string {
  if (cents === null) return "—";
  const c = (currency ?? "usd").toUpperCase();
  return `${(cents / 100).toFixed(2)} ${c}`;
}

function EmailStatusBadge({ receipt }: { receipt: PurchaseReceipt }) {
  if (receipt.emailSentAt) {
    return (
      <Badge variant="outline" className="text-green-600 border-green-300 gap-1">
        <MailCheck className="h-3 w-3" />
        Sent
      </Badge>
    );
  }
  if (receipt.emailError) {
    return (
      <Badge variant="outline" className="text-red-600 border-red-300 gap-1">
        <MailX className="h-3 w-3" />
        Failed
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-yellow-600 border-yellow-300 gap-1">
      <Mail className="h-3 w-3" />
      Not sent
    </Badge>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminBillingReceipts() {
  const [emailFilter, setEmailFilter] = useState<EmailFilter>("all");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [retryingIds, setRetryingIds] = useState<Set<number>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce the search input by 350 ms
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(searchInput.trim());
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput]);

  const { data: receipts = [], isLoading, refetch } = trpc.admin.billing.listReceipts.useQuery({
    emailSentAt: emailFilter === "all" ? undefined : emailFilter,
    query: debouncedQuery || undefined,
    limit: 100,
    offset: 0,
  });

  const retryMutation = trpc.admin.billing.retryReceiptEmail.useMutation({
    onSuccess: (result, variables) => {
      setRetryingIds((prev) => {
        const next = new Set(prev);
        next.delete(variables.receiptId);
        return next;
      });
      if (result.status === "sent") {
        toast.success(`Email sent for receipt #${variables.receiptId}`);
        refetch();
      } else if (result.status === "already_sent") {
        toast.info(`Email was already sent for receipt #${variables.receiptId}`);
        refetch();
      } else if (result.status === "not_found") {
        toast.error(`Receipt #${variables.receiptId} not found`);
      } else {
        toast.error(`Email failed for receipt #${variables.receiptId}: ${result.error ?? "Unknown error"}`);
        refetch();
      }
    },
    onError: (err, variables) => {
      setRetryingIds((prev) => {
        const next = new Set(prev);
        next.delete(variables.receiptId);
        return next;
      });
      toast.error(`Retry failed: ${err.message}`);
    },
  });

  function handleRetry(receiptId: number) {
    setRetryingIds((prev) => new Set(prev).add(receiptId));
    retryMutation.mutate({ receiptId });
  }

  function clearSearch() {
    setSearchInput("");
    setDebouncedQuery("");
  }

  const unsentCount = receipts.filter((r) => !r.emailSentAt).length;
  const isFiltered = !!debouncedQuery || emailFilter !== "all";

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">Billing Receipts</h1>
            <p className="text-sm text-muted-foreground mt-1">
              All purchase receipts across all users.
              {unsentCount > 0 && (
                <span className="ml-2 text-yellow-600 font-medium">
                  {unsentCount} receipt{unsentCount !== 1 ? "s" : ""} without confirmation email.
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                id="receipt-search"
                data-testid="receipt-search"
                placeholder="Search by email or receipt ID…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-8 pr-8 w-64"
              />
              {searchInput && (
                <button
                  aria-label="Clear search"
                  onClick={clearSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {/* Email status filter */}
            <Select
              value={emailFilter}
              onValueChange={(v) => setEmailFilter(v as EmailFilter)}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by email" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All receipts</SelectItem>
                <SelectItem value="unsent">Email not sent</SelectItem>
                <SelectItem value="sent">Email sent</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Active filter indicator */}
        {isFiltered && (
          <p className="text-xs text-muted-foreground">
            Showing filtered results
            {debouncedQuery && <> for <span className="font-mono font-medium">"{debouncedQuery}"</span></>}
            {emailFilter !== "all" && <> · email {emailFilter}</>}
            {" "}({receipts.length} result{receipts.length !== 1 ? "s" : ""})
          </p>
        )}

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading receipts…</div>
            ) : receipts.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                {isFiltered ? "No receipts match your search." : "No receipts found."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/40">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium">ID</th>
                      <th className="text-left px-4 py-3 font-medium">User ID</th>
                      <th className="text-left px-4 py-3 font-medium">User Email</th>
                      <th className="text-left px-4 py-3 font-medium">Pack</th>
                      <th className="text-left px-4 py-3 font-medium">Credits</th>
                      <th className="text-left px-4 py-3 font-medium">Amount</th>
                      <th className="text-left px-4 py-3 font-medium">Purchased</th>
                      <th className="text-left px-4 py-3 font-medium">Email Status</th>
                      <th className="text-left px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receipts.map((receipt) => (
                      <tr key={receipt.id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          #{receipt.id}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">
                          {receipt.userId}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {receipt.userEmail ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary">{receipt.packId}</Badge>
                        </td>
                        <td className="px-4 py-3 font-medium">
                          +{receipt.creditsAdded}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatAmount(receipt.amountCents, receipt.currency)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {formatDate(receipt.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            <EmailStatusBadge receipt={receipt} />
                            {receipt.emailError && (
                              <span
                                className="text-xs text-red-500 flex items-center gap-1 max-w-[180px] truncate"
                                title={receipt.emailError}
                              >
                                <AlertCircle className="h-3 w-3 shrink-0" />
                                {receipt.emailError}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {!receipt.emailSentAt ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={retryingIds.has(receipt.id)}
                              onClick={() => handleRetry(receipt.id)}
                            >
                              {retryingIds.has(receipt.id) ? (
                                <>
                                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                                  Sending…
                                </>
                              ) : (
                                <>
                                  <Mail className="h-3 w-3 mr-1" />
                                  Retry email
                                </>
                              )}
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {formatDate(receipt.emailSentAt)}
                            </span>
                          )}
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
    </AdminLayout>
  );
}
