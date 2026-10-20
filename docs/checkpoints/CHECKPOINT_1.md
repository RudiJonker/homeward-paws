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

These items are not yet implemented.
