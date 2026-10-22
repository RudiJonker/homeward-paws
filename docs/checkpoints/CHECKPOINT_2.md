# Checkpoint 2 — Animal Profiles

**Status:** Functional exit gate passed on 21 October 2026. Preview APK produced on 22 October 2026 at the user's request.

## Progress

- Added the permanent animal profile schema, private identification and health data, behaviour flags, and ordered photographs.
- Added a private `animal-photos` Storage bucket with owner-scoped policies.
- Restricted authenticated Data API grants so members cannot directly change server-managed animal status fields.
- Added the protected archive and restore database function.
- Added explicit Data API grants for all new public tables to remain compatible with Supabase's October 2026 grant changes.
- Started the My Animals app screen and data service.
- Added a single scrolling animal registration form with seven sections, compressed photo selection/upload, animal detail, and archive/restore screens.
- Replaced birth-date entry with numeric estimated age and a fixed `Kg` suffix for numeric estimated weight. Registration values remain on screen while scrolling and editing; leaving without saving discards the form.
- Reviewed app button labels and shortened the My Animals action to `Add animal` to avoid clipped text on a phone.
- Added a protected creation transaction so the public profile, private details, health flags, and behaviour flags are created together.
- Centred primary button text explicitly after the Android My Animals review.
- A physical Android attempt created the animal row but Storage rejected the selected photographs with an RLS error. Added a matching Storage read/upload owner check, safe photo-upload retries, and an `Add photo` action on existing animal profiles.
- Added an edit flow for saved animal details using a protected update function, plus saved-photo replacement, removal and reordering controls. Migration `202610210008_edit_animal_profiles.sql` was deployed and the expanded suite passed in production.
- Replaced free-text appearance colours with named primary (single-select) and secondary (multi-select) chips. The app saves stable colour codes and displays readable names. Migration `202610210009_named_animal_colours.sql` converts existing entries, moving extra primary colours to secondary and retaining unrecognised shade wording in Pattern and markings before constraining future values.
- Added structured health needs to animal registration and editing, with a required description and a separate opt-in flag for future public-report eligibility. Private health notes remain separate. Migration `202610210010_edit_animal_health_flags.sql` makes edits transactional and the expanded test suite checks creation, editing, clearing, privacy and cross-member isolation.

## Verification

- The production migration corrections were applied successfully through the Supabase SQL Editor on 20 October 2026.
- `002_animal_profiles.test.sql`: all 26 tests passed, including anonymous, Member A, Member B, administrator, controlled status, archive/restore, Storage, and grant checks.
- Migration `202610200006_create_animal_profile.sql` was applied successfully through the production SQL Editor on 20 October 2026.
- The extended `002_animal_profiles.test.sql` suite passes all 29 assertions, including the protected creation transaction and its private related record.
- The corrected photo metadata and Storage path ownership suite passed all 37 assertions in production on 21 October 2026.
- Physical Android checks passed: adding a photo to an existing profile, creating another animal with photographs, and archiving and restoring an animal. Storage objects and My Animals thumbnails were confirmed.
- The 48-assertion suite includes protected edits, cross-member denial and transactional photo ordering.
- On 21 October 2026 the user reported all 48 animal-profile tests passing and that editing and photo management seemed to work well on Android. The detailed cross-account check was completed later that day.
- On 21 October 2026 the user reported all 50 animal-profile assertions passing and named-colour tests passing on Android. Migration 009 has therefore been applied in production.
- The account-deletion Edge Function now enumerates and removes the signed-in member's avatar and nested animal-photo objects through the Storage API before database and Auth deletion. On 21 October 2026 the user deployed the update and verified with a disposable account that the Auth user, animal table entries and animal-photo Storage objects were removed.
- On 21 October 2026 the user reported all 56 animal-profile assertions passing after migration 010, followed by successful Android tests for adding, editing and clearing a structured health need.
- On 21 October 2026 a second test account saw no animals belonging to the original tester, and the original account's animal photos remained unchanged.
- The published deletion page also promises individual animal-profile deletion. Added an owner-only protected deletion function for safe or archived animals, plus app-side Storage photo removal and a confirmation action. The user applied migration 011, reported all 67 SQL assertions passing, and confirmed the disposable-animal deletion flow on Android on 21 October 2026.
- Final local checks passed: ESLint, `expo install --check`, Expo Doctor (21/21 checks), Android export, four colour tests, and `git diff --check`. Local Supabase DB tests were unavailable because Docker was not running; the user ran the SQL suite in Supabase instead.
- At the agreed milestone, linked the project to EAS (`@rudij/homeward-paws`), set the three public Expo preview variables, and built an internally distributed Android APK: [EAS build 678fa9e9-3e47-4957-a921-1c3f9ed6c48f](https://expo.dev/accounts/rudij/projects/homeward-paws/builds/678fa9e9-3e47-4957-a921-1c3f9ed6c48f). The build finished successfully on 22 October 2026; its [direct APK](https://expo.dev/artifacts/eas/_sxxJUPNMlK1Cp3fqHwSBZ2qg9yhk8e6W2lU8uyy3hI.apk) returned HTTP 200. A local release APK also built, but the EAS artifact is the intended shareable version. The APK has not yet been installed on Andre's phone.
- After reviewing Andre's Checkpoint 2 handoff, added the missing My Animals section to Home: up to four status-marked animal tiles, a View all route, an Add animal tile, and loading/empty/error/retry states. Physical Android verification of this addition is still pending.
- On 22 October 2026, committed and pushed the current Checkpoint 2 and in-progress Checkpoint 3 work as `445583a` on `wip/checkpoint-2` before further changes. This is a safety snapshot, not a Checkpoint 2-only pull request.

## Handoff to Checkpoint 3

- The functional exit gate is met: multiple animal profiles can be managed securely, and the second test member cannot see the first member's private animals or change their photos.
- Share the EAS preview APK with Andre for independent device testing. Its artifact URL is temporary; the EAS build page is the durable reference.
- Next active work is Checkpoint 3: the missing-animal-to-reunited vertical slice.
