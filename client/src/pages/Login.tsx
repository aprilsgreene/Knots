import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogoLockup } from "@/components/Logo";
import { KnotsPattern } from "@/components/KnotsPattern";
import { useAuth } from "@/lib/AuthProvider";
import { CORE_BRAND } from "@/lib/brand";
import { Loader2, MailCheck, Info } from "lucide-react";

type Mode = "sign_in" | "sign_up";

export default function LoginPage() {
  const { signInWithPassword, signUp, resendConfirmation, callbackNotice, clearCallbackNotice } = useAuth();
  const [mode, setMode] = useState<Mode>("sign_in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent">("idle");

  async function handleResend() {
    setResendState("sending");
    const { error } = await resendConfirmation(email);
    if (error) {
      setError(error);
      setResendState("idle");
    } else {
      setResendState("sent");
    }
  }

  // Supabase says "Email not confirmed" when someone signs in before tapping
  // the link. Offer a resend and the spam-folder tip right there.
  const needsConfirmation = Boolean(error && /not confirmed/i.test(error));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      if (mode === "sign_in") {
        const { error } = await signInWithPassword(email, password);
        if (error) setError(error);
      } else {
        const { error, needsEmailConfirmation } = await signUp(email, password);
        if (error) setError(error);
        else if (needsEmailConfirmation) setConfirmationSent(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col min-h-dvh justify-center max-w-sm mx-auto px-4">
      <div className="relative flex flex-col items-center text-center gap-4 rounded-2xl py-8 mb-4 overflow-hidden">
        <KnotsPattern className="text-primary/[0.07] dark:text-primary/[0.12]" />
        <div className="relative">
          <LogoLockup size={52} orientation="stacked" showTagline />
          <p className="text-xs text-muted-foreground max-w-[17rem] mx-auto leading-relaxed mt-4" data-testid="text-core-brand">
            {CORE_BRAND}
          </p>
        </div>
      </div>

      {confirmationSent ? (
        <div className="text-center space-y-3 py-6">
          <MailCheck className="w-8 h-8 mx-auto text-primary" strokeWidth={1.5} aria-hidden="true" />
          <h1 className="font-serif text-lg text-foreground">Check your email</h1>
          <p className="text-sm text-muted-foreground">
            We sent a confirmation link to {email}. Tap it and you will be signed in.
          </p>
          <div
            className="rounded-md border border-border bg-muted/50 px-3.5 py-3 text-left"
            data-testid="note-check-spam"
            role="note"
          >
            <p className="text-xs text-muted-foreground leading-relaxed">
              Don't see it? It can take a minute. Check your spam, junk, or promotions folder, and
              look for a message from Supabase Auth or Knots. If you find it there, mark it as
              "not spam" so future emails arrive normally.
            </p>
          </div>
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          <div className="flex flex-col gap-2 pt-1">
            <Button
              variant="outline"
              onClick={handleResend}
              disabled={resendState !== "idle"}
              data-testid="button-resend-confirmation"
            >
              {resendState === "sending" && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {resendState === "sent" ? "Sent. Check your inbox again" : "Resend confirmation email"}
            </Button>
            <Button variant="ghost" onClick={() => { setConfirmationSent(false); setResendState("idle"); setError(null); setMode("sign_in"); }}>
              Back to sign in
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {callbackNotice && (
            <div
              className="flex items-start gap-2.5 rounded-md border border-border bg-muted/50 px-3.5 py-3"
              role="status"
              data-testid="note-auth-callback"
            >
              <Info className="w-4 h-4 mt-0.5 shrink-0 text-primary" aria-hidden="true" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground leading-relaxed">{callbackNotice.text}</p>
                <button type="button" className="text-xs text-foreground underline underline-offset-2 mt-1.5" onClick={clearCallbackNotice}>
                  Dismiss
                </button>
              </div>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete={mode === "sign_in" ? "current-password" : "new-password"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
            />
          </div>

          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

          {needsConfirmation && (
            <div className="rounded-md border border-border bg-muted/50 px-3.5 py-3 space-y-2" data-testid="note-not-confirmed">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your email isn't confirmed yet. Open the link we emailed you, and check your spam, junk,
                or promotions folder if it isn't in your inbox.
              </p>
              <Button type="button" variant="outline" size="sm" onClick={handleResend} disabled={resendState !== "idle" || !email}>
                {resendState === "sent" ? "Sent. Check your inbox" : "Resend confirmation email"}
              </Button>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {mode === "sign_in" ? "Sign in" : "Create account"}
          </Button>

          <p className="text-xs text-muted-foreground text-center leading-relaxed" data-testid="hint-email-delivery">
            {mode === "sign_up"
              ? "We'll email you a confirmation link. If it doesn't show up in a minute, check your spam, junk, or promotions folder."
              : "Signed up recently? Your confirmation email may be in your spam, junk, or promotions folder."}
          </p>

          <p className="text-center text-sm text-muted-foreground">
            {mode === "sign_in" ? "New to Knots?" : "Already have an account?"}{" "}
            <button
              type="button"
              className="text-foreground underline underline-offset-2"
              onClick={() => { setMode(mode === "sign_in" ? "sign_up" : "sign_in"); setError(null); }}
            >
              {mode === "sign_in" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </form>
      )}

      <p className="text-center text-xs text-muted-foreground mt-8">
        Your entries are private and tied to your account only.
      </p>
    </div>
  );
}
