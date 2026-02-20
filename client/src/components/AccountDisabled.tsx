import { Button } from "@/components/ui/button";
import { ShieldOff } from "lucide-react";
import { Link } from "wouter";

/**
 * Full-page blocking screen shown when the server returns ACCOUNT_DISABLED.
 * Displayed instead of the normal app UI — no navigation, no sidebar.
 * The user must contact support to have their account re-enabled.
 */
export default function AccountDisabled() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="p-4 rounded-full bg-red-100 text-red-600">
            <ShieldOff className="h-10 w-10" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Account Disabled</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Your account has been disabled and you cannot access Resupify at this time.
            If you believe this is a mistake, please contact our support team.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild variant="default">
            <Link href="/contact">Contact Support</Link>
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              // Clear session by navigating to logout — the server clears the cookie
              window.location.href = "/";
            }}
          >
            Sign Out
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Error code: ACCOUNT_DISABLED (10003)
        </p>
      </div>
    </div>
  );
}
