import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Receipt, ArrowUpCircle, ArrowDownCircle } from "lucide-react";

export default function AdminLedger() {
  const [userIdFilter, setUserIdFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const { data: ledgerData, isLoading } = trpc.admin.ledger.list.useQuery({
    userId: userIdFilter ? parseInt(userIdFilter) : undefined,
    referenceType: typeFilter !== "all" ? typeFilter : undefined,
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Credit Ledger</h1>
          <p className="text-muted-foreground">Browse all credit transactions across users</p>
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <Input
            placeholder="Filter by User ID..."
            value={userIdFilter}
            onChange={(e) => setUserIdFilter(e.target.value)}
            className="w-48"
            type="number"
          />
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Reference type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="purchase">Purchase</SelectItem>
              <SelectItem value="evidence_run">Evidence Run</SelectItem>
              <SelectItem value="outreach_pack">Outreach Pack</SelectItem>
              <SelectItem value="admin_grant">Admin Grant</SelectItem>
              <SelectItem value="signup_bonus">Signup Bonus</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <p className="text-sm text-muted-foreground">{ledgerData?.total ?? 0} entries</p>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="animate-pulse"><CardContent className="p-4"><div className="h-10 bg-muted rounded" /></CardContent></Card>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {ledgerData?.entries.map((entry) => (
              <Card key={entry.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {entry.amount >= 0 ? (
                        <ArrowUpCircle className="h-5 w-5 text-green-500 shrink-0" />
                      ) : (
                        <ArrowDownCircle className="h-5 w-5 text-red-500 shrink-0" />
                      )}
                      <div>
                        <p className="text-sm font-medium">{entry.reason}</p>
                        <p className="text-xs text-muted-foreground">
                          User #{entry.userId} · {entry.referenceType}
                          {entry.referenceId ? ` · Ref #${entry.referenceId}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <span className={`text-lg font-bold ${entry.amount >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {entry.amount >= 0 ? "+" : ""}{entry.amount}
                      </span>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Bal: {entry.balanceAfter}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(entry.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {ledgerData?.entries.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Receipt className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No ledger entries found</p>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
