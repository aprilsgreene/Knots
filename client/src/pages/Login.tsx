import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { LogoLockup } from "@/components/Logo";
import { KnotsPattern } from "@/components/KnotsPattern";
import { useAuth } from "@/lib/AuthProvider";
import { CORE_BRAND } from "@/lib/brand";
import { Loader2, MailCheck, Info, AlertCircle, KeyRound } from "lucide-react";

type Mode = "sign_in" | "sign_up";
type View = "password" | "code_request" | "code_entry";
type CodeType = "email" | "signup";

const SPAM_HINT = "Didn't receive the email? Check your Spam or Promotions folder.";
const RESEND_SECONDS = 30;

export default function LoginPage() {
  const {
    signInWithPassword,
    signUp,
    resendConfirmation,
    sendEmailCode,
    verifyEmailCode,
    pendingLink,
    completeSignIn,
    callbackNotice,
    clearCallbackNotice,
  } = useAuth();

  const [view, setView] = useState<View>("password");
  const [mode, setMode] = useState<Mode>("sign_in");
  const [codeType, setCodeType] = useState<CodeType>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent">("idle");
  const [cooldown, setCooldown] = useState(0);
  const [completing, setCompleting] = useState(false);
  const otpRef = useRef<HTMLInputElement>(null);

  // A disabled box loses the cursor. Put it back after each check so the
  // person can retype right away.
  useEffect(() => {
    if (view === "code_entry" && !isLoading) otpRef.current?.focus();
  }, [view, isLoading]);

  // Count down the "send again" wait.
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  function goTo(next: View) {
    setView(next);
    setError(null);
    setCode("");
    setResendState("idle");
  }

  // Supabase says "not confirmed" when someone signs in before confirming.
  const needsConfirmation = Boolean(error && /not confirmed/i.test(error));

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      if (mode === "sign_in") {
        const { error } = await signInWithPassword(email.trim(), password);
        if (error) setError(error);
      } else {
        const { error, needsEmailConfirmation } = await signUp(email.trim(), password);
        if (error) setError(error);
        else if (needsEmailConfirmation) {
          setCodeType("signup");
          goTo("code_entry");
          setCooldown(RESEND_SECONDS);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSendCode(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const { error } = await sendEmailCode(email.trim());
      if (error) {
        setError(error);
        return;
      }
      setCodeType("email");
      goTo("code_entry");
      setCooldown(RESEND_SECONDS);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleVerify(value: string) {
    if (value.length !== 6 || isLoading) return;
    setError(null);
    setIsLoading(true);
    try {
      // On success the session arrives and the app takes over from here.
      const { error } = await verifyEmailCode(email.trim(), value, codeType);
      if (error) {
        setError(error);
        setCode("");
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResend() {
    setResendState("sending");
    setError(null);
    const { error } = codeType === "signup" ? await resendConfirmation(email.trim()) : await sendEmailCode(email.trim());
    if (error) {
      setError(error);
      setResendState("idle");
    } else {
      setResendState("sent");
      setCooldown(RESEND_SECONDS);
    }
  }

  async function handleComplete() {
    setCompleting(true);
    try {
      await completeSignIn();
    } finally {
      setCompleting(false);
    }
  }

  const errorBox = error ? (
    <div
      className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2.5"
      role="alert"
      data-testid="text-auth-error"
    >
      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-destructive" aria-hidden="true" />
      <p className="text-sm text-foreground">{error}</p>
    </div>
  ) : null;

  const spamNote = (
    <div className="rounded-md border border-border bg-muted/50 px-3.5 py-3 text-left" data-testid="note-check-spam" role="note">
      <p className="text-xs text-muted-foreground leading-relaxed">
        {SPAM_HINT} If you find it there, mark it as "not spam" so future emails arrive normally.
      </p>
    </div>
  );

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

      {/* A confirmation link was opened. Wait for an explicit tap before using it. */}
      {pendingLink && (
        <div className="text-center space-y-3 py-6" data-testid="panel-complete-sign-in">
          <MailCheck className="w-8 h-8 mx-auto text-primary" strokeWidth={1.5} aria-hidden="true" />
          <h1 className="font-serif text-lg text-foreground">One last step</h1>
          <p className="text-sm text-muted-foreground">Tap the button to finish signing in to Knots.</p>
          <Button className="w-full" onClick={handleComplete} disabled={completing} data-testid="button-complete-sign-in">
            {completing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {completing ? "Signing you in..." : "Complete sign in"}
          </Button>
        </div>
      )}

      {!pendingLink && view === "code_entry" && (
        <div className="text-center space-y-4 py-4" data-testid="panel-code-entry">
          <MailCheck className="w-8 h-8 mx-auto text-primary" strokeWidth={1.5} aria-hidden="true" />
          <h1 className="font-serif text-lg text-foreground">Check your email</h1>
          <p className="text-sm text-muted-foreground">
            {codeType === "signup"
              ? `We sent a confirmation email to ${email}. Tap the link, or type the 6-digit code from the email here.`
              : `We sent a 6-digit code to ${email}. Type it here to sign in.`}
          </p>

          <div className="flex justify-center" data-testid="input-otp-wrap">
            <InputOTP
              ref={otpRef}
              maxLength={6}
              value={code}
              onChange={setCode}
              onComplete={handleVerify}
              disabled={isLoading}
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="^[0-9]*$"
              autoFocus
              aria-label="6-digit code"
              data-testid="input-otp"
            >
              <InputOTPGroup>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <InputOTPSlot key={i} index={i} />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>

          {errorBox}

          <Button className="w-full" onClick={() => handleVerify(code)} disabled={isLoading || code.length !== 6} data-testid="button-verify-code">
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isLoading ? "Checking..." : "Sign in"}
          </Button>

          {spamNote}

          <div className="flex flex-col gap-2 pt-1">
            <Button
              variant="outline"
              onClick={handleResend}
              disabled={resendState === "sending" || cooldown > 0}
              data-testid="button-resend-confirmation"
            >
              {resendState === "sending" && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {cooldown > 0 ? `Send again in ${cooldown}s` : resendState === "sent" ? "Sent. Send again" : "Send a new code"}
            </Button>
            <Button variant="ghost" onClick={() => { setMode("sign_in"); goTo("password"); }} data-testid="button-back-to-sign-in">
              Back to sign in
            </Button>
          </div>
        </div>
      )}

      {!pendingLink && view === "code_request" && (
        <form onSubmit={handleSendCode} className="space-y-4" data-testid="form-code-request">
          <div className="text-center space-y-1">
            <h1 className="font-serif text-lg text-foreground">Sign in with an email code</h1>
            <p className="text-sm text-muted-foreground">No password needed. We will email you a 6-digit code.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email-code">Email</Label>
            <Input
              id="email-code"
              type="email"
              autoComplete="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              data-testid="input-email-code"
            />
          </div>
          {errorBox}
          <Button type="submit" className="w-full" disabled={isLoading || !email.trim()} data-testid="button-send-code">
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isLoading ? "Sending..." : "Email me a code"}
          </Button>
          <p className="text-xs text-muted-foreground text-center leading-relaxed" data-testid="hint-email-delivery">
            {SPAM_HINT}
          </p>
          <p className="text-center text-sm text-muted-foreground">
            <button type="button" className="text-foreground underline underline-offset-2" onClick={() => goTo("password")} data-testid="button-use-password">
              Use a password instead
            </button>
          </p>
        </form>
      )}

      {!pendingLink && view === "password" && (
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
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

          {errorBox}

          {needsConfirmation && (
            <div className="rounded-md border border-border bg-muted/50 px-3.5 py-3 space-y-2" data-testid="note-not-confirmed">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your email isn't confirmed yet. Open the email we sent you, or get a 6-digit code instead.
                {" "}{SPAM_HINT}
              </p>
              <Button type="button" variant="outline" size="sm" onClick={() => handleSendCode()} disabled={isLoading || !email}>
                Email me a code
              </Button>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-submit-password">
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isLoading ? (mode === "sign_in" ? "Signing in..." : "Creating account...") : mode === "sign_in" ? "Sign in" : "Create account"}
          </Button>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => goTo("code_request")}
            data-testid="button-use-code"
          >
            <KeyRound className="w-4 h-4 mr-2" aria-hidden="true" />
            Sign in with an email code
          </Button>

          <p className="text-xs text-muted-foreground text-center leading-relaxed" data-testid="hint-email-delivery">
            {SPAM_HINT}
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
