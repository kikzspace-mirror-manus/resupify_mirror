import { Zap } from "lucide-react";
import { Link } from "wouter";

export default function PublicFooter() {
  return (
    <footer className="border-t bg-muted/20">
      <div className="container py-10">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center">
              <Zap className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sm">Resupify</span>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <Link href="/how-it-works" className="hover:text-foreground transition-colors">
              How it works
            </Link>
            <Link href="/pricing" className="hover:text-foreground transition-colors">
              Pricing
            </Link>
            <Link href="/trust" className="hover:text-foreground transition-colors">
              Trust
            </Link>
            <Link href="/faq" className="hover:text-foreground transition-colors">
              FAQ
            </Link>
            <Link href="/contact" className="hover:text-foreground transition-colors">
              Contact
            </Link>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Resupify. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
