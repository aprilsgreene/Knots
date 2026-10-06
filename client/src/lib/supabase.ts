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
    detectSessionInUrl: true,
  },
});
