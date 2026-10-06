import type { EmailOtpType } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export type CallbackNotice = { kind: "error" | "info"; text: string };

const OTP_TYPES: EmailOtpType[] = ["signup", "invite", "magiclink", "recovery", "email_change", "email"];

const EXPIRED_TEXT =
  "That email link has expired or was already used (some mail apps open links once to scan them). " +
  "If you already confirmed your email, just sign in below. Otherwise, create the account again or tap " +
  "\"Resend confirmation email\" on the sign-up screen.";

const OTHER_DEVICE_TEXT =
  "We couldn't finish signing you in on this browser. This usually means the link was opened in a different " +
  "browser or app than the one you signed up in. Your email is probably confirmed already, so try signing in " +
  "with your email and password.";

/** Hash values like "#/settings" belong to the router; "#access_token=..." belong to Supabase. */
function authHashParams(): URLSearchParams | null {
  const hash = window.location.hash;
  if (!hash || hash.startsWith("#/")) return null;
  return new URLSearchParams(hash.replace(/^#/, ""));
}

function cleanUrl() {
  // Land on the app's normal home route so the hash router never sees
  // "?code=..." or "#access_token=..." and shows a not-found page.
  window.history.replaceState(null, "", `${window.location.origin}/#/`);
}

let inFlight: Promise<CallbackNotice | null> | null = null;

/**
 * Finishes an email-link sign-in, whichever shape the link has:
 *   1. PKCE:        /auth/callback?code=...
 *   2. Token hash:  /auth/callback?token_hash=...&type=signup   (works across browsers and devices)
 *   3. Implicit:    /#access_token=...&refresh_token=...        (older links)
 *   4. Error:       ?error_description=... or #error_description=...
 * Returns a message to show on the sign-in screen, or null when there was
 * nothing to do or everything worked. Safe to call twice (React StrictMode).
 */
export function handleAuthCallback(): Promise<CallbackNotice | null> {
  if (inFlight) return inFlight;
  inFlight = run();
  return inFlight;
}

async function run(): Promise<CallbackNotice | null> {
  const query = new URLSearchParams(window.location.search);
  const hash = authHashParams();
  const get = (k: string) => query.get(k) ?? hash?.get(k) ?? null;

  const code = query.get("code");
  const tokenHash = get("token_hash");
  const type = get("type") as EmailOtpType | null;
  const accessToken = hash?.get("access_token") ?? null;
  const refreshToken = hash?.get("refresh_token") ?? null;
  const errorDescription = get("error_description");
  const errorCode = get("error_code");

  const hasAuthParams = Boolean(code || tokenHash || accessToken || errorDescription || errorCode);
  if (!hasAuthParams) return null;

  try {
    if (errorDescription || errorCode) {
      cleanUrl();
      return { kind: "error", text: errorCode === "otp_expired" ? EXPIRED_TEXT : errorDescription?.replace(/\+/g, " ") || EXPIRED_TEXT };
    }

    if (tokenHash && type && OTP_TYPES.includes(type)) {
      const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
      cleanUrl();
      return error ? { kind: "error", text: EXPIRED_TEXT } : null;
    }

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      cleanUrl();
      return error ? { kind: "info", text: OTHER_DEVICE_TEXT } : null;
    }

    if (accessToken && refreshToken) {
      const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      cleanUrl();
      return error ? { kind: "error", text: EXPIRED_TEXT } : null;
    }
  } catch {
    cleanUrl();
    return { kind: "error", text: EXPIRED_TEXT };
  }

  cleanUrl();
  return null;
}
