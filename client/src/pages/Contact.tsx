import PublicNav from "@/components/PublicNav";
import PublicFooter from "@/components/PublicFooter";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";

export default function Contact() {
  return (
    <div className="min-h-screen bg-background">
      <PublicNav />

      <section className="py-16 md:py-24">
        <div className="container">
          <div className="max-w-lg mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-5">
              Contact
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed mb-8">
              Questions, feedback, or a bug? Send a note.
            </p>

            <div className="bg-card rounded-xl border p-8 shadow-sm">
              <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <Button
                size="lg"
                className="text-base px-8"
                onClick={() =>
                  (window.location.href = "mailto:support@resupify.com")
                }
              >
                Email support
              </Button>
              <p className="text-sm text-muted-foreground mt-5">
                If it's a bug, include the job link and a screenshot.
              </p>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
