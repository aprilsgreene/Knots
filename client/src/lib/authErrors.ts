/**
 * Turns raw Supabase/network errors into short, plain sentences. Never shows
 * stack traces or internal codes, and never reveals whether an email exists.
 */
export function friendlyAuthError(err: unknown, fallback = "Something went wrong. Please try again."): string {
  const e = err as { message?: string; status?: number; code?: string; name?: string } | null | undefined;
  const msg = (e?.message ?? (typeof err === "string" ? err : "")).trim();
  const code = e?.code ?? "";
  const lower = msg.toLowerCase();

  if (
    e?.name === "AuthRetryableFetchError" ||
    e?.status === 0 ||
    /failed to fetch|networkerror|network request failed|load failed|timed out|timeout/i.test(msg)
  ) {
    return "We can't reach the server right now. Check your internet connection and try again.";
  }
  if (code === "over_email_send_rate_limit" || code === "over_request_rate_limit" || e?.status === 429 || /rate limit|too many/i.test(msg)) {
    return "Too many tries in a short time. Please wait a minute, then try again.";
  }
  if (code === "invalid_credentials" || /invalid login credentials/i.test(msg)) {
    return "That email and password don't match. Check them and try again.";
  }
  if (code === "email_not_confirmed" || /not confirmed/i.test(msg)) {
    return "Email not confirmed yet.";
  }
  if (code === "otp_expired" || /token has expired|otp.*expired|invalid or has expired|expired or is invalid/i.test(lower)) {
    return "That code is wrong or has expired. Check it, or ask for a new one.";
  }
  if (code === "weak_password" || /password should be at least|weak password/i.test(msg)) {
    return "Choose a longer password, at least 6 characters.";
  }
  if (code === "validation_failed" || /unable to validate email|invalid email/i.test(msg)) {
    return "That email address doesn't look right. Check it and try again.";
  }
  if (code === "signup_disabled" || /signups not allowed/i.test(msg)) {
    return "New sign-ups are paused right now. Please try again later.";
  }
  return msg ? msg : fallback;
}

/** Rejects if a call hangs, so the form never spins forever on a bad connection. */
export function withTimeout<T>(promise: Promise<T>, ms = 20000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("Request timed out")), ms);
    promise.then(
      (v) => { clearTimeout(t); resolve(v); },
      (err) => { clearTimeout(t); reject(err); }
    );
  });
}
