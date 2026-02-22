import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Clock, LogIn, UserPlus, LogOut } from "lucide-react";

function getSignupUrl() {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);

  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signUp");

  return url.toString();
}

export default function Waitlist() {
  const { user, loading, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    window.location.href = getLoginUrl();
  };

  // While auth state is resolving, show a neutral loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-10 text-center text-muted-foreground text-sm">
            Loading…
          </CardContent>
        </Card>
      </div>
    );
  }

  // State A: Logged-out visitor — no account implication
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <Clock className="h-7 w-7 text-muted-foreground" />
            </div>
            <CardTitle className="text-2xl">Early access</CardTitle>
            <CardDescription className="mt-2 text-base">
              Resupify is currently in early access. Sign in if you already have
              an account, or sign up to request access.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              className="w-full"
              onClick={() => { window.location.href = getLoginUrl(); }}
            >
              <LogIn className="mr-2 h-4 w-4" />
              Sign in
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => { window.location.href = getSignupUrl(); }}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Sign up
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // State B: Logged-in but earlyAccessEnabled=false — waitlist screen
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Clock className="h-7 w-7 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl">You're on the waitlist</CardTitle>
          <CardDescription className="mt-2 text-base">
            Resupify is currently in early access. You'll receive access once
            your account is approved.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md bg-muted px-4 py-3 text-sm text-muted-foreground text-center">
            Signed in as{" "}
            <span className="font-medium text-foreground">
              {user.email ?? user.name ?? "your account"}
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
