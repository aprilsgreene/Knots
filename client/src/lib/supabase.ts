import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set (see .env / .env.local)."
  );
}

// This app avoids browser storage for journal CONTENT (localStorage/
// sessionStorage/indexedDB) so it behaves the same inside a sandboxed
// preview iframe where those APIs are blocked for content pages. The one
// deliberate exception is the Supabase session token below: without it,
// testers would have to log back in on every visit/reload, which is worse
// for a real beta. Journal entries, ratings, and check-ins never go through
// this path -- they only ever live in Postgres, fetched per request.
//
// Inside the sandboxed /computer/a preview, localStorage is blocked by the
// opaque iframe origin, so this safely falls back to an in-memory session
// there and only actually persists once deployed to a real origin (Vercel).
let authStorage: Storage | undefined;
try {
  window.localStorage.setItem("__knots_probe__", "1");
  window.localStorage.removeItem("__knots_probe__");
  authStorage = window.localStorage;
} catch {
  authStorage = undefined; // blocked (e.g. sandboxed preview iframe) -- fall back to in-memory
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: Boolean(authStorage),
    storage: authStorage,
    autoRefreshToken: true,
    // PKCE puts the one-time code in the URL query string (?code=...), not the
    // hash. This app uses hash routing (#/path), so the older implicit flow
    // (#access_token=...) would collide with the router and land on a 404.
    // We read the code ourselves in lib/authCallback.ts, so the library's own
    // URL detection is turned off to stop it from using the link twice.
    flowType: "pkce",
    detectSessionInUrl: false,
  },
});

/**
 * Where confirmation / magic links should send people back to. Set
 * VITE_SITE_URL (for example https://knots-diary.vercel.app) so links always
 * point at the live site, even when someone signs up from a preview or from
 * inside a native app wrapper. This exact address plus "/**" must also be in
 * Supabase > Authentication > URL Configuration > Redirect URLs.
 */
export function getAuthRedirectUrl(): string {
  const base = (import.meta.env.VITE_SITE_URL as string | undefined) || window.location.origin;
  return `${base.replace(/\/$/, "")}/auth/callback`;
}
