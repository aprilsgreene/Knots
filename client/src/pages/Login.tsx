import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogoLockup } from "@/components/Logo";
import { KnotsPattern } from "@/components/KnotsPattern";
import { useAuth } from "@/lib/AuthProvider";
import { Loader2 } from "lucide-react";

type Mode = "sign_in" | "sign_up";

export default function LoginPage() {
  const { signInWithPassword, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>("sign_in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);

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
        </div>
      </div>

      {confirmationSent ? (
        <div className="text-center space-y-3 py-6">
          <h1 className="font-serif text-lg text-foreground">Check your email</h1>
          <p className="text-sm text-muted-foreground">
            We sent a confirmation link to {email}. Follow it, then come back and sign in.
          </p>
          <Button variant="outline" onClick={() => { setConfirmationSent(false); setMode("sign_in"); }}>
            Back to sign in
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
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

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {mode === "sign_in" ? "Sign in" : "Create account"}
          </Button>

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
