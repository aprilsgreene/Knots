import { Link } from "wouter";
import { LifeBuoy } from "lucide-react";

// Compact, non-alarming safety notice shown on sensitive flows (new entry,
// boundary reflections, onboarding). Always links through to the full
// Support & Safety page rather than trying to say everything inline.
export function SafetyNotice({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className="rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground flex items-start gap-2.5"
      data-testid="notice-safety"
    >
      <LifeBuoy className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
      <p>
        If you're in immediate danger, call 911 or your local emergency number. If you're
        thinking about harming yourself or need support right now, call or text{" "}
        <a href="tel:988" className="text-primary underline underline-offset-2">
          988
        </a>{" "}
        to reach the 988 Suicide &amp; Crisis Lifeline.
        {!compact && (
          <>
            {" "}
            <Link href="/support" className="text-primary underline underline-offset-2" data-testid="link-safety-more">
              More support resources
            </Link>
            .
          </>
        )}
      </p>
    </div>
  );
}
