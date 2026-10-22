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
