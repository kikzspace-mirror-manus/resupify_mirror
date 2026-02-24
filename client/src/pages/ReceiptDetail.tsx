import { Link, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Receipt,
  Package,
  Clock,
  CreditCard,
  ExternalLink,
  Hash,
  Zap,
} from "lucide-react";

export default function ReceiptDetail() {
  const { id } = useParams<{ id: string }>();
  const receiptId = parseInt(id ?? "0", 10);

  const { data: receipt, isLoading, error } = trpc.credits.getReceipt.useQuery(
    { id: receiptId },
    { enabled: receiptId > 0 }
  );
  const { data: credits } = trpc.credits.balance.useQuery();

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-3">
          <Link href="/billing">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Billing
            </Button>
          </Link>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="animate-pulse space-y-4">
              <div className="h-6 bg-muted rounded w-1/3" />
              <div className="h-4 bg-muted rounded w-2/3" />
              <div className="h-4 bg-muted rounded w-1/2" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-3">
          <Link href="/billing">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Billing
            </Button>
          </Link>
        </div>
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <Receipt className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="font-medium">Receipt not found</p>
            <p className="text-sm text-muted-foreground mt-1">
              This receipt does not exist or you do not have access to it.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const packLabel = receipt.packId
    ? `${receipt.packId.charAt(0).toUpperCase()}${receipt.packId.slice(1)} Pack`
    : "Credit Pack";

  const shortSessionId = receipt.stripeCheckoutSessionId
    ? receipt.stripeCheckoutSessionId.slice(-12)
    : null;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Back nav */}
      <div className="flex items-center gap-3">
        <Link href="/billing">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Billing
          </Button>
        </Link>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Receipt</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Purchase confirmation for your credit top-up
        </p>
      </div>

      {/* Receipt Card */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Purchase Receipt
            </CardTitle>
            <Badge variant="secondary" className="text-emerald-600 bg-emerald-50">
              Completed
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-5">
          {/* Pack + Credits */}
          <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/40">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-primary/10 text-primary shrink-0">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold capitalize">{packLabel}</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                +{receipt.creditsAdded} credits added to your account
              </p>
            </div>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Amount */}
            {receipt.amountCents != null && receipt.currency && (
              <div className="flex items-start gap-3">
                <CreditCard className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Amount charged</p>
                  <p className="text-sm font-medium mt-0.5">
                    {(receipt.amountCents / 100).toFixed(2)}{" "}
                    {receipt.currency.toUpperCase()}
                  </p>
                </div>
              </div>
            )}

            {/* Date */}
            <div className="flex items-start gap-3">
              <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Purchase date</p>
                <p className="text-sm font-medium mt-0.5">
                  {new Date(receipt.createdAt).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Credits added */}
            <div className="flex items-start gap-3">
              <Zap className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Credits added</p>
                <p className="text-sm font-medium mt-0.5">+{receipt.creditsAdded}</p>
              </div>
            </div>

            {/* Current balance */}
            {credits != null && (
              <div className="flex items-start gap-3">
                <Zap className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Current balance</p>
                  <p className="text-sm font-medium mt-0.5 text-emerald-600">
                    {credits.balance} credits
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Reference IDs */}
          <div className="border-t pt-4 space-y-2">
            <div className="flex items-start gap-3">
              <Hash className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Receipt ID</p>
                <p className="text-xs font-mono text-muted-foreground mt-0.5">#{receipt.id}</p>
              </div>
            </div>
            {shortSessionId && (
              <div className="flex items-start gap-3">
                <Hash className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Session reference</p>
                  <p className="text-xs font-mono text-muted-foreground mt-0.5">…{shortSessionId}</p>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="border-t pt-4 flex flex-wrap gap-3">
            <Link href="/billing">
              <Button variant="outline" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Billing
              </Button>
            </Link>
            {receipt.stripeReceiptUrl && (
              <a
                href={receipt.stripeReceiptUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="sm" className="gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Stripe receipt
                </Button>
              </a>
            )}
            <Link href="/refund-policy">
              <Button variant="ghost" size="sm" className="text-muted-foreground text-xs gap-1">
                Refund policy
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
