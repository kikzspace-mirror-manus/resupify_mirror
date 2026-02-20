import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Search, Shield, Coins, Ban, User, Briefcase, FlaskConical, ListTodo } from "lucide-react";

export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [grantDialog, setGrantDialog] = useState<{ userId: number; name: string } | null>(null);
  const [grantAmount, setGrantAmount] = useState("5");
  const [adminDialog, setAdminDialog] = useState<{ userId: number; name: string; isAdmin: boolean } | null>(null);

  const { data: usersData, isLoading, refetch } = trpc.admin.users.list.useQuery({ search: search || undefined });
  const { data: userDetail } = trpc.admin.users.detail.useQuery(
    { userId: selectedUserId! },
    { enabled: !!selectedUserId }
  );

  const grantCreditsMut = trpc.admin.users.grantCredits.useMutation({
    onSuccess: () => { toast.success("Credits granted"); setGrantDialog(null); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const setAdminMut = trpc.admin.users.setAdmin.useMutation({
    onSuccess: () => { toast.success("Admin status updated"); setAdminDialog(null); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const setDisabledMut = trpc.admin.users.setDisabled.useMutation({
    onSuccess: () => { toast.success("User status updated"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-muted-foreground">Search users, view profiles, grant credits, manage access</p>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* User List */}
          <div className="lg:col-span-2 space-y-2">
            <p className="text-sm text-muted-foreground">{usersData?.total ?? 0} users found</p>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Card key={i} className="animate-pulse"><CardContent className="p-4"><div className="h-12 bg-muted rounded" /></CardContent></Card>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {usersData?.users.map((u) => (
                  <Card
                    key={u.id}
                    className={`cursor-pointer transition-colors ${selectedUserId === u.id ? "border-orange-300 bg-orange-50/50" : "hover:bg-accent/50"}`}
                    onClick={() => setSelectedUserId(u.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                            {(u.name ?? u.email ?? "?")[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{u.name ?? "Unnamed"}</p>
                            <p className="text-xs text-muted-foreground">{u.email ?? "No email"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {u.isAdmin && <Badge variant="outline" className="text-orange-600 border-orange-300">Admin</Badge>}
                          {u.disabled && <Badge variant="destructive">Disabled</Badge>}
                          <span className="text-xs text-muted-foreground">
                            {new Date(u.lastSignedIn).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {usersData?.users.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No users found</p>
                )}
              </div>
            )}
          </div>

          {/* User Detail */}
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
                  {/* Profile */}
                  {userDetail.profile && (
                    <div className="space-y-1 text-sm">
                      <p><span className="text-muted-foreground">Region/Track:</span> {userDetail.profile.regionCode}/{userDetail.profile.trackCode}</p>
                      <p><span className="text-muted-foreground">School:</span> {userDetail.profile.school ?? "—"}</p>
                      <p><span className="text-muted-foreground">Program:</span> {userDetail.profile.program ?? "—"}</p>
                      <p><span className="text-muted-foreground">Graduation:</span> {userDetail.profile.graduationDate ?? "—"}</p>
                    </div>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 bg-muted/50 rounded-lg text-center">
                      <Coins className="h-4 w-4 mx-auto text-yellow-600 mb-1" />
                      <p className="text-lg font-bold">{userDetail.creditBalance}</p>
                      <p className="text-xs text-muted-foreground">Credits</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg text-center">
                      <Briefcase className="h-4 w-4 mx-auto text-blue-600 mb-1" />
                      <p className="text-lg font-bold">{userDetail.jobCardsCount}</p>
                      <p className="text-xs text-muted-foreground">Job Cards</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg text-center">
                      <FlaskConical className="h-4 w-4 mx-auto text-orange-600 mb-1" />
                      <p className="text-lg font-bold">{userDetail.evidenceRunsCount}</p>
                      <p className="text-xs text-muted-foreground">Runs</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg text-center">
                      <ListTodo className="h-4 w-4 mx-auto text-green-600 mb-1" />
                      <p className="text-lg font-bold">{userDetail.tasksCount}</p>
                      <p className="text-xs text-muted-foreground">Tasks</p>
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
                    Joined: {new Date(userDetail.createdAt).toLocaleDateString()}<br />
                    Last active: {new Date(userDetail.lastSignedIn).toLocaleDateString()}
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
