import type { EmailOtpType } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export type CallbackNotice = { kind: "error" | "info"; text: string };

/**
 * A confirmation link that has been read but NOT used yet. We hold it until the
 * person taps "Complete sign in", so mail scanners and link pre-fetchers that
 * merely open the page can never use up the one-time token.
 */
export type PendingLink = { tokenHash: string; type: EmailOtpType };

export type CallbackOutcome = { notice: CallbackNotice | null; pending: PendingLink | null };

const NOTHING: CallbackOutcome = { notice: null, pending: null };
const withNotice = (notice: CallbackNotice): CallbackOutcome => ({ notice, pending: null });

/** Finishes a held link when the person taps the button. Returns an error notice, or null on success. */
export async function completePendingLink(link: PendingLink): Promise<CallbackNotice | null> {
  try {
    const { error } = await supabase.auth.verifyOtp({ token_hash: link.tokenHash, type: link.type });
    return error ? { kind: "error", text: EXPIRED_TEXT } : null;
  } catch {
    return { kind: "error", text: EXPIRED_TEXT };
  }
}

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
  // replaceState alone doesn't tell the router anything changed, so also
  // fire a hashchange; otherwise a router that already read the old hash
  // would stay stuck on a 404.
  window.history.replaceState(null, "", `${window.location.origin}/#/`);
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}

let inFlight: Promise<CallbackOutcome> | null = null;

/**
 * Finishes an email-link sign-in, whichever shape the link has:
 *   1. PKCE:        /auth/callback?code=...
 *   2. Token hash:  /auth/callback?token_hash=...&type=signup   (works across browsers and devices)
 *   3. Implicit:    /#access_token=...&refresh_token=...        (older links)
 *   4. Error:       ?error_description=... or #error_description=...
 * Returns a message to show on the sign-in screen and/or a held link (case 2)
 * waiting for the "Complete sign in" tap. Safe to call twice (React StrictMode).
 */
export function handleAuthCallback(): Promise<CallbackOutcome> {
  if (inFlight) return inFlight;
  inFlight = run();
  return inFlight;
}

async function run(): Promise<CallbackOutcome> {
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
  if (!hasAuthParams) return NOTHING;

  // Everything we need is already copied out of the URL above, so clear it
  // right now, before signing in. Signing in notifies the app immediately,
  // and the app must never render while the address bar still holds
  // "#access_token=..." (the router would read that as an unknown page).
  cleanUrl();

  try {
    if (errorDescription || errorCode) {
      return withNotice({ kind: "error", text: errorCode === "otp_expired" ? EXPIRED_TEXT : errorDescription?.replace(/\+/g, " ") || EXPIRED_TEXT });
    }

    if (tokenHash && type && OTP_TYPES.includes(type)) {
      // Hold it. The person taps "Complete sign in" to use it.
      return { notice: null, pending: { tokenHash, type } };
    }

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      return error ? withNotice({ kind: "info", text: OTHER_DEVICE_TEXT }) : NOTHING;
    }

    if (accessToken && refreshToken) {
      const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      return error ? withNotice({ kind: "error", text: EXPIRED_TEXT }) : NOTHING;
    }
  } catch {
    return withNotice({ kind: "error", text: EXPIRED_TEXT });
  }

  return NOTHING;
}
