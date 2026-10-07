# Knots sign-in setup (Supabase dashboard)

The app code handles three ways in: password, a 6-digit email code, and a
confirmation link that needs one tap ("Complete sign in"). Three settings in
the Supabase dashboard make them all work. Nothing here needs a redeploy.

## 1. Site URL and Redirect URLs

Supabase > Authentication > URL Configuration

- Site URL: your live address, for example `https://knots-diary.vercel.app`
  (no trailing slash). When you move to your own domain, change it here.
- Redirect URLs: add `https://knots-diary.vercel.app/**`
  Add your custom domain the same way (`https://yourdomain.com/**`), and keep the
  Vercel one while you test.

Optional: in Vercel > Settings > Environment Variables add `VITE_SITE_URL` with the
same address, then redeploy. Links in emails then always point at the live site.

## 2. Email templates (6-digit code plus a safe link)

Supabase > Authentication > Email Templates (called "Emails" in newer dashboards).

Open Confirm signup, replace the body with the text below, and Save:

```html
<h2>Confirm your Knots account</h2>
<p>Your 6-digit code:</p>
<p style="font-size:28px;letter-spacing:6px"><strong>{{ .Token }}</strong></p>
<p>Or open this link in the same browser you signed up in:</p>
<p><a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=signup">Confirm my email</a></p>
<p>Didn't ask for this? You can ignore this email.</p>
```

Open Magic Link (this is the template used for "Sign in with an email code"):

```html
<h2>Your Knots sign-in code</h2>
<p>Your 6-digit code:</p>
<p style="font-size:28px;letter-spacing:6px"><strong>{{ .Token }}</strong></p>
<p>Or open this link in the same browser:</p>
<p><a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email">Sign in to Knots</a></p>
<p>Didn't ask for this? You can ignore this email.</p>
```

Why this fixes "The link has expired": mail scanners open every link in an email
and use up one-time tokens. The code cannot be used up that way. The link goes to
the app, which waits for a tap on "Complete sign in" before using the token, so a
scanner that only opens the page does not use it either.

## 3. Longer expiry (optional)

Supabase > Authentication > Sign In / Providers > Email > Email OTP expiration.
The default is 3600 seconds (1 hour). 3600 to 7200 is plenty. Supabase advises
against going above 86400 (one day).

## 4. Custom SMTP (this is what stops missing emails)

Supabase's built-in email sender is only for testing. It sends about 2 emails per
hour, and only to addresses on your Supabase team. Everyone else gets an error or
nothing. Before real testers join, connect a real sender:

1. Create an account with an email service: Resend, Postmark, or SendGrid.
2. Verify your sending domain there (it gives you a few DNS records to paste at
   the place you bought your domain). Sending from a verified domain is what keeps
   emails out of spam.
3. Supabase > Authentication > Emails > SMTP Settings (or Project Settings >
   Authentication, depending on the dashboard version). Turn on Custom SMTP.
4. Fill in: sender email (for example `hello@yourdomain.com`), sender name
   `Knots`, host, port, username, and password from the email service.
5. Save, then raise the limit at Authentication > Rate Limits. After custom SMTP
   is saved, Supabase starts at 30 emails per hour.
6. Test: sign up with an address that is not on your team.

## 5. Quick test list

- Create an account with a new email. You see "Check your email" and a 6-digit box.
- Type the code. You are signed in.
- Close the browser, open the site again. You are still signed in.
- Open an old or used link. You see a plain message on the sign-in screen, not a 404.
