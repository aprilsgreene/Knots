import { Link } from "wouter";
import { BookHeart, Tag, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoLockup } from "@/components/Logo";
import { KnotsPattern } from "@/components/KnotsPattern";
import { SafetyNotice } from "@/components/SafetyNotice";
import { CORE_BRAND } from "@/lib/brand";

export default function OnboardingPage({ onComplete }: { onComplete?: () => void }) {
  return (
    <div className="flex flex-col min-h-[calc(100dvh-4rem)] justify-between max-w-lg mx-auto">
      <div className="space-y-8 pt-4">
        <div className="relative flex flex-col items-center text-center gap-4 rounded-2xl py-8 overflow-hidden">
          <KnotsPattern className="text-primary/[0.07] dark:text-primary/[0.12]" />
          <div className="relative">
            <LogoLockup size={52} orientation="stacked" showTagline />
          </div>
          <div className="relative">
            <h1 className="font-serif text-xl text-foreground">Welcome to Knots</h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm">
              A private space to notice how your relationships feel over time — in your own words, on your
              own terms.
            </p>
            <p className="text-xs text-muted-foreground mt-3 max-w-xs mx-auto leading-relaxed" data-testid="text-core-brand">
              {CORE_BRAND}
            </p>
          </div>
        </div>

        <ul role="list" className="space-y-4">
          <li className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center shrink-0">
              <BookHeart className="w-4 h-4 text-accent-foreground" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-sm text-foreground">This is a journal, not a judge</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Knots helps you describe what happened and how you felt. It never diagnoses, labels, or
                scores another person.
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center shrink-0">
              <Tag className="w-4 h-4 text-accent-foreground" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-sm text-foreground">Patterns, not verdicts</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Tags and timelines show what repeats in your own entries — always tentative, always
                traceable back to what you wrote.
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4 text-accent-foreground" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-sm text-foreground">Private by default</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Your entries are never used to train models, target ads, or build behavioral profiles
                without your explicit, opt-in consent. Export or delete everything anytime.
              </p>
            </div>
          </li>
        </ul>

        <SafetyNotice />
      </div>

      <div className="space-y-3 pt-8 pb-4">
        <Button className="w-full" onClick={() => onComplete?.()} data-testid="button-get-started">
          Get started
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          By continuing you agree to our{" "}
          <Link href="/legal/terms" className="text-primary underline underline-offset-2">
            Terms of Use
          </Link>{" "}
          and{" "}
          <Link href="/legal/privacy" className="text-primary underline underline-offset-2">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
