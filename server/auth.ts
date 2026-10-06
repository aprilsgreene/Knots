import type { Request, Response, NextFunction } from "express";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import ws from "ws";

// Server-side client, using the service role key, only ever used to verify
// a caller's access token and to look up the associated user id -- never
// exposed to the browser and never used to bypass a specific user's RLS
// scope in application code (every storage query still filters by userId).
//
// Built lazily (not at module load) so a missing env var on a serverless
// platform surfaces as a clean 500 JSON response from requireAuth below,
// instead of crashing the whole function with an opaque platform error page.
let supabaseAdmin: SupabaseClient | null = null;
export function getSupabaseAdmin(): SupabaseClient {
  if (supabaseAdmin) return supabaseAdmin;

  if (!process.env.VITE_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (in .env locally, or in your hosting platform's Environment Variables) to verify signed-in users on the server."
    );
  }

  supabaseAdmin = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: { autoRefreshToken: false, persistSession: false },
      // We only ever use this client to verify access tokens (auth.getUser) --
      // never Realtime -- but supabase-js still constructs a RealtimeClient
      // internally, which needs a WebSocket implementation on Node < 22.
      realtime: { transport: ws as unknown as typeof WebSocket },
    }
  );
  return supabaseAdmin;
}

declare module "express-serve-static-core" {
  interface Request {
    userId?: string;
  }
}

// Verifies the Supabase access token sent as `Authorization: Bearer <token>`
// and attaches the authenticated user's id to the request. Every route that
// touches user content must sit behind this so storage calls are always
// scoped to the right person.
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

  if (!token) {
    return res.status(401).json({ message: "Missing Authorization header" });
  }

  let admin: SupabaseClient;
  try {
    admin = getSupabaseAdmin();
  } catch (err: any) {
    console.error("Auth misconfigured:", err.message);
    return res.status(500).json({ message: err.message });
  }

  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) {
    return res.status(401).json({ message: "Invalid or expired session" });
  }

  req.userId = data.user.id;
  next();
}
