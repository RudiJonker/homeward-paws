# Homeward Paws Auth Email and Deep Links

Specification for email verification, password recovery and links back into the app. Read with `01` §2, `02` group 1 and `08`.

## 0. Website address

The Homeward Paws website currently lives at **`https://digitack.co.za/paws/`** (temporary). All email links, the bridge page and the app's website links use that base. When the site moves to its own domain, change the two templates, Supabase Site URL and Redirect URLs, `EXPO_PUBLIC_WEBSITE_URL`, and the App Links host (§7).

## 1. Principles

- Email links must survive link scanners and being opened on a different device than the one that signed up.
- Every email offers two ways to finish: a button and a 6-digit code.
- The website page never verifies anything on page load. Verification happens only after a person taps a button.
- The app never reveals whether an email address has an account; password reset shows the same message.
- Auth email comes from `noreply@digitack.co.za` through `smtp.digitack.co.za:465`. People are told to write to `info@digitack.co.za`.

## 2. Email content

| Email | Button link | Code | `verifyOtp` type |
|---|---|---|---|
| Confirm signup | `https://digitack.co.za/paws/auth/confirm.html?token_hash={{ .TokenHash }}&type=email` | `{{ .Token }}` | `email` |
| Reset password | `https://digitack.co.za/paws/auth/confirm.html?token_hash={{ .TokenHash }}&type=recovery` | `{{ .Token }}` | `recovery` |

Templates live in `supabase/email-templates/`. Links and codes expire after 1 hour (Supabase Email OTP expiration 3600 s).

## 3. Website bridge page (`/paws/auth/confirm.html`)

- Reads `token_hash` and `type` from the query string. Accepts `email` and `recovery` only.
- Primary action: **Open Homeward Paws**, a link to `homewardpaws://auth/confirm?token_hash=…&type=…`.
- For `email` only, secondary action: **Confirm on this computer**. Calls `supabase.auth.verifyOtp({ token_hash, type: 'email' })` in the browser, shows that the email is confirmed and tells the member to log in on their phone, then signs the browser session out.
- For `recovery`, explains that the password must be reset in the app: open the email on the phone with the app, or type the 6-digit code in the app.
- Missing or invalid parameters show a clear error with a link to Help.
- Uses the website's styles and self-hosted supabase-js. No analytics.

## 4. App routes

The app accepts these as the same destination:

- `homewardpaws://auth/confirm?token_hash=…&type=…`
- `https://digitack.co.za/paws/auth/confirm.html?token_hash=…&type=…` once Android App Links are verified (§7)

Handling, in an `AuthCallback` route registered in `linking.js`:

| `type` | Call | On success | On failure |
|---|---|---|---|
| `email` | `verifyOtp({ token_hash, type: 'email' })` | Session is set → normal routing (profile completion if incomplete) | Error screen per §6 |
| `recovery` | `verifyOtp({ token_hash, type: 'recovery' })` | Navigate to 1.7 Reset Password with the recovery session | Error screen per §6 |

The link must be handled when the app is cold-started or already open. Tokens are never logged.

## 5. Screens

### 1.3 Sign Up

`signUp({ email, password, options: { emailRedirectTo: 'homewardpaws://auth/confirm' } })`. On success without a session, store the address as `pendingEmail` in AsyncStorage and go to 1.4. Never log passwords or tokens.

### 1.4 Email Verification

- Shows the pending address, an instruction to open the email on the phone or type its code, a 6-digit code field, **Resend email** with a 60-second countdown, and **Use a different email**.
- No "Open email app" button: `mailto:` composes a message and does not open the inbox. This resolves the conflict in the initial dev-pack draft.
- Code entry: `verifyOtp({ email: pendingEmail, token: code, type: 'email' })`.
- Resend: `resend({ type: 'signup', email: pendingEmail })`.
- If the member closes the app and returns, 1.4 reopens from `pendingEmail`.
- Login with an unconfirmed address (`email_not_confirmed`) routes here with that address.

### 1.6 Forgot Password

- Email field → `resetPasswordForEmail(email, { redirectTo: 'homewardpaws://auth/confirm' })`.
- Always show: "If there is an account for this address, we have sent a reset email." Then show a 6-digit code field and **Resend** with a 60-second countdown.
- Code entry: `verifyOtp({ email, token: code, type: 'recovery' })` → 1.7.

### 1.7 Reset Password

- New password + confirm, with the same rules and show/hide controls as sign-up.
- `updateUser({ password })`. On success: "Password updated", keep the member signed in and route normally.
- If the recovery session is missing or expired, explain and offer **Send a new reset email**.

### 1.5 Login

Show the **Forgot password?** link.

## 6. Errors

| Supabase code / situation | Message | Action |
|---|---|---|
| `otp_expired` | This link or code has expired. | Send a new email |
| Invalid token or code | That link or code is not valid. Check the latest email. | Try again / Send a new email |
| `over_email_send_rate_limit` | Please wait a minute before asking for another email. | Countdown |
| `email_not_confirmed` | Please confirm your email first. | Go to 1.4 |
| Already confirmed | Your email is already confirmed. | Log in |
| Network error | You appear to be offline. Please try again when connected. | Try again |

## 7. Android App Links (phase 2, not yet implemented)

The verified HTTPS App Links intent filter and `https://digitack.co.za/.well-known/assetlinks.json` are deferred until explicitly requested. The website bridge and custom scheme work without them. Fingerprints must match the actual development/preview and Play-signing packages and keys.

## 8. Supabase settings

SMTP, URL configuration, Confirm email on, OTP expiry 3600 s, OTP length 6, email rate limit within the mailbox's limit, and templates from this repo. See `RUNBOOK_SUPABASE_EMAIL_SETUP.md` in the reviewed dev pack. Keep Confirm email off until the verification build is installed on test phones.
