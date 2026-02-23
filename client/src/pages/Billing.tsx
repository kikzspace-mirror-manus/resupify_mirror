import { useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  Zap,
  ArrowDown,
  ArrowUp,
  Clock,
  Package,
  ExternalLink,
  Receipt,
} from "lucide-react";
import { toast } from "sonner";

// ─── Pack type (mirrors server CREDIT_PACKS) ─────────────────────────────────
type PackId = "starter" | "pro" | "power";

export default function Billing() {
  const [location] = useLocation();
  const utils = trpc.useUtils();

  const { data: credits, isLoading } = trpc.credits.balance.useQuery();
  const { data: ledger } = trpc.credits.ledger.useQuery();
  const { data: receipts } = trpc.credits.listReceipts.useQuery();
  const { data: packs } = trpc.stripe.packs.useQuery();
  const { data: testModeData } = trpc.stripe.isTestMode.useQuery();
  const isTestMode = testModeData?.isTestMode ?? false;

  // Show success / cancelled toast based on ?checkout= query param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("checkout");
    if (status === "success") {
      toast.success("Payment successful! Your credits have been added.");
      // Refresh balance after a short delay to allow webhook processing
      setTimeout(() => utils.credits.balance.invalidate(), 2000);
      // Clean up the URL without a full reload
      window.history.replaceState({}, "", "/billing");
    } else if (status === "cancelled") {
      toast.info("Checkout was cancelled. No charge was made.");
      window.history.replaceState({}, "", "/billing");
    }
  }, [location]);

  const checkout = trpc.stripe.createCheckoutSession.useMutation({
    onSuccess: ({ url }) => {
      toast.info("Redirecting to secure checkout…");
      window.open(url, "_blank");
    },
    onError: (error) => toast.error(error.message),
  });

  const handleBuy = (packId: PackId) => {
    checkout.mutate({ packId, origin: window.location.origin });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Billing & Credits</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your credit balance and purchases
        </p>
      </div>

      {/* Balance Card */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Current Balance</p>
              <p className="text-4xl font-bold mt-1">
                {isLoading ? "..." : credits?.balance ?? 0}
              </p>
              <p className="text-sm text-muted-foreground mt-1">credits</p>
            </div>
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Zap className="h-8 w-8 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Credit Packs */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Buy Credits</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {(packs ?? []).map((pack) => (
            <Card
              key={pack.packId}
              className={`relative ${pack.popular ? "border-primary shadow-md" : ""}`}
            >
              {pack.popular && (
                <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                  Most Popular
                </Badge>
              )}
              <CardContent className="pt-6 text-center">
                <Package className="h-8 w-8 mx-auto mb-3 text-primary" />
                <h3 className="font-semibold text-lg">{pack.label}</h3>
                <p className="text-3xl font-bold mt-2">{pack.credits}</p>
                <p className="text-xs text-muted-foreground mt-1">credits</p>
                <p className="text-sm text-muted-foreground mt-2">{pack.desc}</p>
                <p className="text-lg font-semibold mt-3">{pack.priceDisplay}</p>
                <Button
                  className="w-full mt-4 gap-2"
                  variant={pack.popular ? "default" : "outline"}
                  onClick={() => handleBuy(pack.packId as PackId)}
                  disabled={checkout.isPending}
                >
                  <ExternalLink className="h-4 w-4" />
                  Buy {pack.label}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
        {isTestMode && (
          <p className="text-xs text-muted-foreground mt-3 text-center">
            Test mode: use card <strong>4242 4242 4242 4242</strong> to simulate a purchase.
          </p>
        )}
      </div>

      {/* Transaction History */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Transaction History</CardTitle>
            {ledger && ledger.length > 0 && (
              <span className="text-xs text-muted-foreground">
                Showing latest {ledger.length} transaction{ledger.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {ledger && ledger.length > 0 ? (
            <div
              className="space-y-2 overflow-y-auto pr-1"
              style={{ maxHeight: "380px" }}
            >
              {ledger.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 p-3 rounded-lg border"
                >
                  <div
                    className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                      entry.amount > 0
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-red-50 text-red-600"
                    }`}
                  >
                    {entry.amount > 0 ? (
                      <ArrowDown className="h-4 w-4" />
                    ) : (
                      <ArrowUp className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{entry.reason}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(entry.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-semibold tabular-nums ${
                      entry.amount > 0 ? "text-emerald-600" : "text-red-600"
                    }`}
                  >
                    {entry.amount > 0 ? "+" : ""}
                    {entry.amount}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
              <p className="text-sm">No transactions yet.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Purchase Receipts */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Purchase Receipts
            </CardTitle>
            {receipts && receipts.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {receipts.length} purchase{receipts.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {receipts && receipts.length > 0 ? (
            <div className="space-y-2 overflow-y-auto pr-1" style={{ maxHeight: "320px" }}>
              {receipts.map((r) => (
                <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg border">
                  <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-emerald-50 text-emerald-600">
                    <Package className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium capitalize">{r.packId} Pack &mdash; +{r.creditsAdded} credits</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(r.createdAt).toLocaleString()}
                      {r.amountCents != null && r.currency && (
                        <span className="ml-2">
                          {(r.amountCents / 100).toFixed(2)} {r.currency.toUpperCase()}
                        </span>
                      )}
                    </p>
                  </div>
                  {r.stripeReceiptUrl ? (
                    <a
                      href={r.stripeReceiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Receipt
                    </a>
                  ) : (
                    <span className="text-xs text-muted-foreground">No receipt</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Receipt className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
              <p className="text-sm">No purchases yet.</p>
            </div>
          )}
        </CardContent>
      </Card>
      {/* Info */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-2">How credits work</h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">Evidence+ATS Scan:</strong> 1 credit per scan.
              Analyzes your resume against a JD and produces 10-20 evidence items with explainable scoring.
            </p>
            <p>
              <strong className="text-foreground">Outreach Pack:</strong> 1 credit per pack.
              Generates recruiter email, LinkedIn DM, and follow-up templates.
            </p>
            <p>
              <strong className="text-foreground">Free tier:</strong> Every new account starts with 3 free credits.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
