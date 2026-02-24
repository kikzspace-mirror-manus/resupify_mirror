import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { toast } from "sonner";
import { Search, Shield, Coins, Ban, User, ChevronLeft, ChevronRight } from "lucide-react";

export default function AdminUsers() {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "disabled">("all");
  const [role, setRole] = useState<"all" | "admin">("all");
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [grantDialog, setGrantDialog] = useState<{ userId: number; name: string } | null>(null);
  const [grantAmount, setGrantAmount] = useState("5");
  const [adminDialog, setAdminDialog] = useState<{ userId: number; name: string; isAdmin: boolean } | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(timer);
  }, [q]);

  // Reset to page 0 when filters change
  useEffect(() => {
    setCurrentPage(0);
  }, [debouncedQ, status, role, pageSize]);

  const { data: listData, isLoading: listLoading, refetch: refetchList } = trpc.admin.users.listPaged.useQuery({
    q: debouncedQ || undefined,
    status,
    role,
    limit: pageSize,
    offset: currentPage * pageSize,
  });

  const { data: userDetail, isLoading: detailLoading } = trpc.admin.users.detail.useQuery(
    { userId: selectedUserId! },
    { enabled: !!selectedUserId }
  );

  const grantCreditsMut = trpc.admin.users.grantCredits.useMutation({
    onSuccess: () => { toast.success("Credits granted"); setGrantDialog(null); refetchList(); },
    onError: (e) => toast.error(e.message),
  });
  const setAdminMut = trpc.admin.users.setAdmin.useMutation({
    onSuccess: () => { toast.success("Admin status updated"); setAdminDialog(null); refetchList(); },
    onError: (e) => toast.error(e.message),
  });
  const setDisabledMut = trpc.admin.users.setDisabled.useMutation({
    onSuccess: () => { toast.success("User status updated"); refetchList(); },
    onError: (e) => toast.error(e.message),
  });

  const totalPages = Math.ceil((listData?.total ?? 0) / pageSize);
  const hasNextPage = currentPage < totalPages - 1;
  const hasPrevPage = currentPage > 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-muted-foreground">Search users, view profiles, grant credits, manage access</p>
        </div>

        {/* Search + Filters */}
        <div className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={status} onValueChange={(v) => setStatus(v as any)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={role} onValueChange={(v) => setRole(v as any)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Result count + page size */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{listData?.total ?? 0} users found</span>
            <Select value={pageSize.toString()} onValueChange={(v) => setPageSize(parseInt(v))}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25 per page</SelectItem>
                <SelectItem value="50">50 per page</SelectItem>
                <SelectItem value="100">100 per page</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* User Table */}
          <div className="lg:col-span-2 space-y-4">
            {listLoading ? (
              <div className="border rounded-lg overflow-hidden">
                <div className="space-y-2 p-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-10 bg-muted rounded animate-pulse" />
                  ))}
                </div>
              </div>
            ) : (listData?.items.length ?? 0) === 0 ? (
              <div className="border rounded-lg text-center py-12 text-muted-foreground">
                <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No users found</p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="w-[40%]">Name</TableHead>
                      <TableHead className="w-[30%]">Email</TableHead>
                      <TableHead className="w-[15%] text-center">Role</TableHead>
                      <TableHead className="w-[15%] text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {listData?.items.map((u, idx) => (
                      <TableRow
                        key={u.id}
                        className={`cursor-pointer ${
                          selectedUserId === u.id ? "bg-orange-50/50" : idx % 2 === 0 ? "bg-white" : "bg-muted/5"
                        } hover:bg-muted/30 transition-colors`}
                        onClick={() => setSelectedUserId(u.id)}
                      >
                        <TableCell className="text-sm font-medium">{u.name ?? "Unnamed"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{u.email ?? "—"}</TableCell>
                        <TableCell className="text-center">
                          {u.isAdmin && <Badge className="bg-orange-100 text-orange-700 border-orange-300">Admin</Badge>}
                        </TableCell>
                        <TableCell className="text-center">
                          {u.disabled && <Badge variant="destructive">Disabled</Badge>}
                          {!u.disabled && <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300">Active</Badge>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination */}
            {(listData?.total ?? 0) > 0 && (
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Page {currentPage + 1} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                    disabled={!hasPrevPage}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => p + 1)}
                    disabled={!hasNextPage}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* User Detail Panel */}
          <div>
            {selectedUserId && userDetail ? (
              <Card className="sticky top-6">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-5 w-5" />
                    {userDetail.name ?? "Unnamed"}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">{userDetail.email}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 bg-muted/50 rounded-lg text-center">
                      <Coins className="h-4 w-4 mx-auto text-yellow-600 mb-1" />
                      <p className="text-lg font-bold">{userDetail.creditBalance}</p>
                      <p className="text-xs text-muted-foreground">Credits</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg text-center">
                      <p className="text-lg font-bold">{userDetail.jobCardsCount}</p>
                      <p className="text-xs text-muted-foreground">Job Cards</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2">
                    <Button
                      size="sm"
                      className="w-full"
                      variant="outline"
                      onClick={() => setGrantDialog({ userId: userDetail.id, name: userDetail.name ?? "User" })}
                    >
                      <Coins className="h-4 w-4 mr-2" /> Grant Credits
                    </Button>
                    <Button
                      size="sm"
                      className="w-full"
                      variant="outline"
                      onClick={() => setAdminDialog({ userId: userDetail.id, name: userDetail.name ?? "User", isAdmin: userDetail.isAdmin })}
                    >
                      <Shield className="h-4 w-4 mr-2" /> {userDetail.isAdmin ? "Remove Admin" : "Make Admin"}
                    </Button>
                    <Button
                      size="sm"
                      className="w-full"
                      variant={userDetail.disabled ? "default" : "destructive"}
                      onClick={() => setDisabledMut.mutate({ userId: userDetail.id, disabled: !userDetail.disabled })}
                    >
                      <Ban className="h-4 w-4 mr-2" /> {userDetail.disabled ? "Enable Account" : "Disable Account"}
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Joined: {new Date(userDetail.createdAt).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Select a user to view details</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Grant Credits Dialog */}
        <Dialog open={!!grantDialog} onOpenChange={() => setGrantDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Grant Credits to {grantDialog?.name}</DialogTitle>
              <DialogDescription>This will add credits to the user's balance and create a ledger entry.</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Input
                type="number"
                min="1"
                max="1000"
                value={grantAmount}
                onChange={(e) => setGrantAmount(e.target.value)}
                placeholder="Number of credits"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setGrantDialog(null)}>Cancel</Button>
              <Button
                onClick={() => grantDialog && grantCreditsMut.mutate({ userId: grantDialog.userId, amount: parseInt(grantAmount) || 5 })}
                disabled={grantCreditsMut.isPending}
              >
                {grantCreditsMut.isPending ? "Granting..." : "Grant Credits"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Admin Confirm Dialog */}
        <Dialog open={!!adminDialog} onOpenChange={() => setAdminDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{adminDialog?.isAdmin ? "Remove Admin" : "Make Admin"}: {adminDialog?.name}</DialogTitle>
              <DialogDescription>
                {adminDialog?.isAdmin
                  ? "This will remove admin privileges from this user."
                  : "This will grant full admin access to this user. Are you sure?"}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAdminDialog(null)}>Cancel</Button>
              <Button
                variant={adminDialog?.isAdmin ? "destructive" : "default"}
                onClick={() => adminDialog && setAdminMut.mutate({ userId: adminDialog.userId, isAdmin: !adminDialog.isAdmin })}
                disabled={setAdminMut.isPending}
              >
                {setAdminMut.isPending ? "Updating..." : "Confirm"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
