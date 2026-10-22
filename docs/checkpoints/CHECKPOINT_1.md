# Checkpoint 1 — Member Foundation

## Status

Development-complete with documented release blockers. Email/password authentication, the future in-app email-code verification flow, profile completion, private home area, avatar upload, profile editing, support/legal screens and account deletion are implemented.

Email verification and password recovery are temporarily inactive during development because the new free-tier Supabase project requires custom SMTP before hosted email templates can be edited or production Auth mail can be delivered reliably. Development signup therefore uses Supabase with email confirmation disabled. This is a release blocker: configure production SMTP, restore confirmation, apply the OTP template and expose password recovery before launch.

## Verified

- Member foundation database and RLS suite: 26/26 passing
- Signup, profile persistence, avatar upload and account deletion on physical Android
- Account deletion removes Auth, profile, private-profile and avatar data
- Keyboard-safe profile forms and balanced five-tab navigation
- Signup password confirmation and accessible show/hide controls on secure fields
- Read-only guest entry to the public Browse placeholder; report data remains deferred to its scheduled checkpoint

## Follow-up review

- Google sign-in
- Configure production SMTP, enable confirmation, activate the prepared OTP email template and restore Forgot Password

Google sign-in remains deferred. The email items were subsequently restored as noted below.

## Completed later — Auth email restoration (22 October 2026)

- Digitack custom SMTP, Supabase URL configuration, 100-email/hour rate limit, six-digit OTP, and the Confirm signup and Reset password templates were configured manually by Rudi. Andre uploaded and checked the website bridge and public `auth-config.js`; the email-logo URL is reachable. Confirm email remains **off** until the app build is installed.
- On `feature/auth-email`, restored persistent pending-email verification, six-digit code and resend cooldown, the Forgot Password entry point, code and link-based recovery, a protected reset screen, and shared friendly Auth errors. Added an `AuthCallback` route for the custom scheme, with HTTPS parsing prepared for the later verified App Links phase.
- A development build was installed on the connected Android phone. Existing signed-in Home loaded, and an incomplete auth deep link opened the callback error screen without crashing. Real confirmation and recovery emails, cold/warm valid links, code entry, resend and restart persistence still need the joint end-to-end test; no Supabase dashboard setting was changed by the app work.

## Recovery email simplification (22 October 2026)

- Rudi confirmed that entering the six-digit recovery code in the app opens the new-password step. The reset-email button instead lands on Welcome, so password recovery is now code-only; signup confirmation is unchanged.
- The repository reset template and Forgot Password instructions reflect this decision. Rudi still needs to replace the saved Reset password template in the Supabase dashboard; editing the repository file does not publish the email.
- Recovery email delivery has worked for two test addresses so far. Its reliability and the full confirmation flow remain to be verified end to end.
- Clarified the verification screen's one-minute countdown as resend availability. It does not indicate code expiry; the Supabase Email OTP setting and signup template specify a one-hour validity period. Confirm the effective live setting and delayed-code entry during device testing.

## Signup email simplification (22 October 2026)

- Rudi confirmed a new account can verify its email using the six-digit code in the app. Signup confirmation is now code-only, matching password recovery; the old button is removed from the repository template and app instructions. The website and app retain link handling for emails sent before this change.
- Rudi must replace the saved Confirm signup email template in the Supabase dashboard. No repository edit publishes that template automatically. Retest a newly delivered confirmation email after saving it.
- Rudi subsequently confirmed both code-only templates were saved in Supabase and freshly sent signup-confirmation and password-reset emails completed successfully on the test device. The one-minute resend countdown is not code expiry. The six code-only template/app/doc files were committed and pushed on `feature/auth-email` as `567af34`.
