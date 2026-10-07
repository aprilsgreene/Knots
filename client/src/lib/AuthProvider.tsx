import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, getAuthRedirectUrl } from "@/lib/supabase";
import { handleAuthCallback, completePendingLink, type CallbackNotice, type PendingLink } from "@/lib/authCallback";
import { friendlyAuthError, withTimeout } from "@/lib/authErrors";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  signInWithPassword: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string) => Promise<{ error?: string; needsEmailConfirmation?: boolean }>;
  signOut: () => Promise<void>;
  resendConfirmation: (email: string) => Promise<{ error?: string }>;
  /** Emails a 6-digit sign-in code (also creates the account the first time). */
  sendEmailCode: (email: string) => Promise<{ error?: string }>;
  /** Checks the 6-digit code. `type` is "email" for sign-in codes, "signup" for confirm-your-account codes. */
  verifyEmailCode: (email: string, code: string, type: "email" | "signup") => Promise<{ error?: string }>;
  /** An emailed confirmation link that is waiting for the person to tap "Complete sign in". */
  pendingLink: PendingLink | null;
  completeSignIn: () => Promise<void>;
  /** Message left over from an email link (expired, opened elsewhere, etc.). */
  callbackNotice: CallbackNotice | null;
  clearCallbackNotice: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [callbackNotice, setCallbackNotice] = useState<CallbackNotice | null>(null);
  const [pendingLink, setPendingLink] = useState<PendingLink | null>(null);

  useEffect(() => {
    // Finish any email-link sign-in first, then read the session.
    handleAuthCallback()
      .then((outcome) => {
        setCallbackNotice(outcome.notice);
        setPendingLink(outcome.pending);
      })
      .catch(() => {})
      .then(() => supabase.auth.getSession())
      .then((res) => {
        setSession(res?.data.session ?? null);
        setIsLoading(false);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      isLoading,
      signInWithPassword: async (email, password) => {
        try {
          const { error } = await withTimeout(supabase.auth.signInWithPassword({ email, password }));
          return error ? { error: friendlyAuthError(error) } : {};
        } catch (err) {
          return { error: friendlyAuthError(err) };
        }
      },
      signUp: async (email, password) => {
        let result;
        try {
          result = await withTimeout(
            supabase.auth.signUp({ email, password, options: { emailRedirectTo: getAuthRedirectUrl() } })
          );
        } catch (err) {
          return { error: friendlyAuthError(err) };
        }
        const { data, error } = result;
        if (error) return { error: friendlyAuthError(error) };
        // Supabase hides whether an address is taken, but returns a user with
        // no identities when it already exists. Say so plainly.
        if (data.user && (data.user.identities?.length ?? 1) === 0) {
          return { error: "An account with this email already exists. Try signing in instead." };
        }
        // If email confirmation is required, Supabase returns a user but no
        // session yet -- the caller should show a "check your email" state.
        return { needsEmailConfirmation: !data.session };
      },
      signOut: async () => {
        // Local scope: end this device's session. It also works after the
        // account itself has been deleted, when the server no longer knows the user.
        await supabase.auth.signOut({ scope: "local" }).catch(() => {});
      },
      resendConfirmation: async (email) => {
        try {
          const { error } = await withTimeout(
            supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: getAuthRedirectUrl() } })
          );
          return error ? { error: friendlyAuthError(error) } : {};
        } catch (err) {
          return { error: friendlyAuthError(err) };
        }
      },
      sendEmailCode: async (email) => {
        try {
          const { error } = await withTimeout(
            supabase.auth.signInWithOtp({
              email,
              options: { shouldCreateUser: true, emailRedirectTo: getAuthRedirectUrl() },
            })
          );
          return error ? { error: friendlyAuthError(error) } : {};
        } catch (err) {
          return { error: friendlyAuthError(err) };
        }
      },
      verifyEmailCode: async (email, code, type) => {
        try {
          const { error } = await withTimeout(supabase.auth.verifyOtp({ email, token: code, type }));
          return error ? { error: friendlyAuthError(error) } : {};
        } catch (err) {
          return { error: friendlyAuthError(err) };
        }
      },
      pendingLink,
      completeSignIn: async () => {
        if (!pendingLink) return;
        const notice = await completePendingLink(pendingLink);
        setPendingLink(null);
        if (notice) setCallbackNotice(notice);
      },
      callbackNotice,
      clearCallbackNotice: () => setCallbackNotice(null),
    }),
    [session, isLoading, callbackNotice, pendingLink]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
