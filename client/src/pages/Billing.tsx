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
} from "lucide-react";
import { toast } from "sonner";

export default function Billing() {
  const { data: credits, isLoading } = trpc.credits.balance.useQuery();
  const { data: ledger } = trpc.credits.ledger.useQuery();

  const purchase = trpc.credits.purchase.useMutation({
    onSuccess: () => {
      toast.success("Credits added!");
    },
    onError: (error: any) => toast.error(error.message),
  });

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
          {[
            { amount: 5, label: "Starter", desc: "5 Evidence+ATS scans", price: "$4.99" },
            { amount: 15, label: "Pro", desc: "15 scans + outreach packs", price: "$12.99", popular: true },
            { amount: 50, label: "Power", desc: "50 scans for heavy users", price: "$34.99" },
          ].map((pack) => (
            <Card
              key={pack.amount}
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
                <p className="text-3xl font-bold mt-2">{pack.amount}</p>
                <p className="text-xs text-muted-foreground mt-1">credits</p>
                <p className="text-sm text-muted-foreground mt-2">{pack.desc}</p>
                <p className="text-lg font-semibold mt-3">{pack.price}</p>
                <Button
                  className="w-full mt-4"
                  variant={pack.popular ? "default" : "outline"}
                  onClick={() => {
                    toast.info("Payment integration coming soon. Credits added for demo.");
                    purchase.mutate({ amount: pack.amount });
                  }}
                  disabled={purchase.isPending}
                >
                  Buy {pack.label}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Transaction History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {ledger && ledger.length > 0 ? (
            <div className="space-y-2">
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
