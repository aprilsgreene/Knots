import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, getAuthRedirectUrl } from "@/lib/supabase";
import { handleAuthCallback, type CallbackNotice } from "@/lib/authCallback";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  signInWithPassword: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string) => Promise<{ error?: string; needsEmailConfirmation?: boolean }>;
  signOut: () => Promise<void>;
  resendConfirmation: (email: string) => Promise<{ error?: string }>;
  /** Message left over from an email link (expired, opened elsewhere, etc.). */
  callbackNotice: CallbackNotice | null;
  clearCallbackNotice: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [callbackNotice, setCallbackNotice] = useState<CallbackNotice | null>(null);

  useEffect(() => {
    // Finish any email-link sign-in first, then read the session.
    handleAuthCallback()
      .then((notice) => setCallbackNotice(notice))
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
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return error ? { error: error.message } : {};
      },
      signUp: async (email, password) => {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: getAuthRedirectUrl() },
        });
        if (error) return { error: error.message };
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
        const { error } = await supabase.auth.resend({
          type: "signup",
          email,
          options: { emailRedirectTo: getAuthRedirectUrl() },
        });
        return error ? { error: error.message } : {};
      },
      callbackNotice,
      clearCallbackNotice: () => setCallbackNotice(null),
    }),
    [session, isLoading, callbackNotice]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
