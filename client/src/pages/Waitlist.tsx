import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Clock, Mail, LogOut } from "lucide-react";

export default function Waitlist() {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    window.location.href = getLoginUrl();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Clock className="h-7 w-7 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl">You're on the waitlist</CardTitle>
          <CardDescription className="mt-2 text-base">
            Resupify is currently in early access. Your account has been created
            and you'll be notified when access is granted.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {user && (
            <div className="rounded-md bg-muted px-4 py-3 text-sm text-muted-foreground text-center">
              Signed in as <span className="font-medium text-foreground">{user.email ?? user.name ?? "your account"}</span>
            </div>
          )}
          <div className="flex items-start gap-3 rounded-md border p-3 text-sm text-muted-foreground">
            <Mail className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              We'll reach out to your registered email when early access is
              available for your account.
            </span>
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
