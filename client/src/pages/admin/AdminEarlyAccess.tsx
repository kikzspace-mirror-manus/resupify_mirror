import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Search, ShieldCheck, ShieldOff } from "lucide-react";

export default function AdminEarlyAccess() {
  const [emailInput, setEmailInput] = useState("");
  const [searchEmail, setSearchEmail] = useState<string | null>(null);

  const { data: user, isLoading, error } = trpc.admin.earlyAccess.lookupByEmail.useQuery(
    { email: searchEmail! },
    { enabled: !!searchEmail }
  );

  const utils = trpc.useUtils();
  const setAccess = trpc.admin.earlyAccess.setAccess.useMutation({
    onSuccess: (result) => {
      if (result.enabled) {
        const msg = result.creditsGranted
          ? "Access granted — 10 starter credits added."
          : "Access granted (credits already awarded previously).";
        toast.success(msg);
      } else {
        toast.success("Early access revoked.");
      }
      utils.admin.earlyAccess.lookupByEmail.invalidate({ email: searchEmail! });
    },
    onError: (err) => {
      toast.error(`Failed: ${err.message}`);
    },
  });

  const handleSearch = () => {
    const trimmed = emailInput.trim().toLowerCase();
    if (!trimmed) return;
    setSearchEmail(trimmed);
  };

  const handleToggle = (userId: number, enabled: boolean) => {
    setAccess.mutate({ userId, enabled });
  };

  return (
    <AdminLayout>
      <div className="p-6 max-w-xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Early Access</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Grant or revoke early access for individual users by email address.
          </p>
        </div>

        {/* Search */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Look up user</CardTitle>
            <CardDescription>Search by exact email address.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="user@example.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="flex-1"
              />
              <Button onClick={handleSearch} variant="outline" size="icon">
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Result */}
        {searchEmail && (
          <Card>
            <CardContent className="pt-5">
              {isLoading && (
                <p className="text-sm text-muted-foreground">Searching…</p>
              )}
              {error && (
                <p className="text-sm text-destructive">Error: {error.message}</p>
              )}
              {!isLoading && !error && !user && (
                <p className="text-sm text-muted-foreground">
                  No user found for <span className="font-medium">{searchEmail}</span>.
                </p>
              )}
              {user && (
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{user.name ?? "(no name)"}</p>
                    <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">{user.role}</Badge>
                      <Badge
                        variant={user.earlyAccessEnabled ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {user.earlyAccessEnabled ? "Access granted" : "On waitlist"}
                      </Badge>
                      {user.earlyAccessGrantUsed && (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          Credits awarded
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {user.earlyAccessEnabled ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggle(user.id, false)}
                        disabled={setAccess.isPending}
                      >
                        <ShieldOff className="mr-1.5 h-3.5 w-3.5" />
                        Revoke
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleToggle(user.id, true)}
                        disabled={setAccess.isPending}
                      >
                        <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
                        Grant access
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
