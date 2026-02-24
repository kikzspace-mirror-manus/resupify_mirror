import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Receipt } from "lucide-react";

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

        {/* Phase 12Q: Compact table layout */}
        {isLoading ? (
          <div className="border rounded-lg overflow-hidden">
            <div className="space-y-2 p-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-10 bg-muted rounded animate-pulse" />
              ))}
            </div>
          </div>
        ) : ledgerData?.entries.length === 0 ? (
          <div className="border rounded-lg text-center py-12 text-muted-foreground">
            <Receipt className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No ledger entries found</p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="w-[180px]">Type</TableHead>
                  <TableHead className="w-[220px]">User</TableHead>
                  <TableHead className="w-[80px] text-right">Delta</TableHead>
                  <TableHead className="w-[80px] text-right">Balance</TableHead>
                  <TableHead className="w-[160px] text-right">Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledgerData?.entries.map((entry, idx) => (
                  <TableRow
                    key={entry.id}
                    className={idx % 2 === 0 ? "bg-white hover:bg-muted/30" : "bg-muted/5 hover:bg-muted/30"}
                  >
                    <TableCell className="text-sm font-medium">
                      {entry.reason}
                    </TableCell>
                    <TableCell className="text-sm truncate">
                      {(entry as any).userDisplay?.email
                        ?? (entry as any).userDisplay?.name
                        ?? `User #${entry.userId}`}
                    </TableCell>
                    <TableCell className="text-right text-sm font-semibold">
                      <span className={entry.amount >= 0 ? "text-green-600" : "text-red-600"}>
                        {entry.amount >= 0 ? "+" : ""}{entry.amount}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {entry.balanceAfter}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {new Date(entry.createdAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
