# Homeward Paws — Checkpoint 1: Member Foundation

Use this only after Checkpoint 0 is signed off. This task covers **Checkpoint 1 only**: a new member can create, complete, revisit and securely manage their own profile, and can delete their account.

## 1. Read before writing

`AGENTS.md`, then: Blueprint; `CODEX_PROJECT_INSTRUCTIONS.md`; Roadmap Checkpoint 1; Flows `01` §1–2; Screens `02` groups 1 and 9 and §2 navigation rules; Data `03` §1, §2, §11 (avatars), §13, §15 (profiles), §17 (deletion), §19 phase A, §20; Design `04`; Legal `08` in full; Testing `06` §4 and §16.

## 2. Database (Supabase migration phase A)

Create ordered, reviewable migrations in `supabase/migrations/`:

- `profiles` (public-safe fields: display name, first and last name, avatar path, `role` default `member`, `account_status` default `active`, `profile_completed` default false, accepted terms/privacy versions and timestamps, `age_confirmed_at`, timestamps).
- `profile_private` (E.164 mobile, WhatsApp flag, country `ZA`, province, city/town, suburb, optional coordinates, location source, timestamps).
- New-user trigger creating the `profiles` row with the defaults above.
- Helper functions `is_admin()` and `is_active_member()` (security definer, fixed `search_path`).
- Clients can never change `role` or `account_status`: enforce with column privileges or a guard trigger, not the UI.
- A public read surface (view or function) exposing display identity only.
- `avatars` storage bucket with policies: a user writes only `avatars/{auth.uid()}/…`; reads per `03` §11.
- RLS enabled and tested on every table.

## 3. Account deletion (required by the published deletion page)

- **Profile › Delete account** screen (9.13): explains what is deleted and kept (mirror `delete-account.html`), requires typing or tapping a clear confirmation, then calls the server.
- Implement deletion as a Supabase **Edge Function** (`delete-account`, JavaScript) that verifies the caller's JWT, runs a database function removing everything this checkpoint stores (`profile_private`, profile fields, avatar objects, terms records), then deletes the Auth user with the service-role key held **only** in the function's environment.
- Structure it so later checkpoints add their tables to the same function (follow `03` §17 step order). Add a test that proves no row or object for the user remains.
- Show a final confirmation and return to Welcome.

## 4. Screens and flows

1.3 Sign Up · 1.4 Email Verification · 1.5 Login · 1.6 Forgot Password · 1.7 Reset Password · 1.8 Complete Profile · 1.9 Set Home Area · 1.11 Terms Acceptance · 9.1 Profile · 9.2 Edit Profile · 9.6 Privacy and Contact (Checkpoint 1 parts) · 9.8 Help and Safety · 9.9 Contact Support · 9.10 Terms · 9.11 Privacy · 9.12 About · 9.13 Delete Account.

- Signup: email + password, an **"I am 18 or older"** confirmation, and acceptance of terms and privacy (links open the website URLs from `src/config/links.js`). Record versions (`TERMS_VERSION`, `PRIVACY_VERSION` constants, `1.0`).
- Email verification and password reset use the `homewardpaws://` deep link; handle expired and reused links with clear recovery.
- Complete Profile: first and last name, optional display name, South African mobile (accept `082 123 4567`, `0821234567` or `+27…`; store E.164 `+27XXXXXXXXX`; inline validation), WhatsApp flag, optional avatar.
- Set Home Area: province from the 9 South African provinces; city/town and suburb as validated text. Optional "Use my location" (foreground permission via `expo-location`, explained first) pre-fills through `reverseGeocodeAsync`; the member confirms. Coordinates stay private. A map/geocoding provider is not chosen yet; do not add one.
- Avatar: `expo-image-picker` (Android photo picker, no media permission), compress and resize with `expo-image-manipulator` before upload; failure keeps the rest of the form.
- Routing: incomplete profiles go to completion before the member app; a suspended `account_status` routes to a plain account-status screen; a restricted action chosen as a visitor resumes after login.
- Contact Support shows `info@digitack.co.za` as selectable text with a mail action (subject prefilled "Homeward Paws support").
- Profile shows My Animals / My Reports / My Sightings as checkpoint-labelled placeholders.

## 5. Out of scope

Animals, reports, notifications, push tokens, AdMob, moderation tools, partner features.

## 6. Verify

- `supabase db reset` and RLS tests (pgTAP via `supabase test db`, or SQL scripts against a dev project if Docker is unavailable) covering: anonymous, Member A, Member B, admin; A cannot read or change B's private data; a member cannot change their own role or status; avatar path ownership; deletion removes everything.
- Testing `06` §4 in full, plus the Checkpoint 1 rows of §16.
- Android emulator walk-through; physical device APK at the milestone.

## 7. Report

Migrations list, policies summary, screens built, dependencies with reasons, test results, the deletion test output, and open questions. Update `docs/checkpoints/CHECKPOINT_1.md`.

Stop after Checkpoint 1.
