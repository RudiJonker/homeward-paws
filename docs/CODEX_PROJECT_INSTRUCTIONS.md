# Codex Project Instructions — Homeward Paws

## Required Reading

Before changing the project, read:

1. `00_HOMEWARD_PAWS_MASTER_BLUEPRINT.md`
2. `05_DEVELOPMENT_ROADMAP.md`
3. The detailed document relevant to the current checkpoint
4. `04_DESIGN_SYSTEM.md` and `07_BRAND_AND_ASSETS.md` before any UI work
5. `08_LEGAL_AND_PLAY_COMPLIANCE.md` before touching permissions, accounts, reporting, ads or legal screens
6. Existing project instructions and current task notes

## Non-Negotiable Product Rules

- Use JavaScript, not TypeScript.
- Build Android first.
- Target South Africa in Version 1.
- Every new account is a normal member; no signup role selector.
- Administrators retain all member functionality.
- Build ordinary member workflows before verified-partner features.
- Homeward Paws does not handle payments, donations or rewards.
- Do not add public comments, social likes, leaderboards or open chat.
- Do not expose private addresses, microchip numbers, ownership evidence or unapproved contact information.
- Automated matching suggests candidates only; humans confirm identity and reunion.
- Preserve important history through timelines, closure and archiving.
- Accounts are for people aged 18 and older.
- The only public contact address is `info@digitack.co.za`.
- Never request broad photo access (`READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO`, `READ_EXTERNAL_STORAGE`). Use the Android photo picker.
- Never request background location. Location is foreground-only and optional, with a manual alternative.
- What the app does must match the published privacy policy, terms and account deletion page. If a feature would contradict them, stop and ask.

## Development Rules

1. Work in the current checkpoint only.
2. Do not implement deferred features because they appear useful.
3. Confirm the installed Expo SDK and use compatible dependencies.
4. Pin dependencies after validation.
5. Avoid unnecessary packages.
6. Prefer reusable components and shared services.
7. Keep screen files focused; do not place the entire app in one file.
8. Keep theme values in shared tokens.
9. Do not hard-code secrets, keys, URLs or production identifiers.
10. Use environment variables for public client configuration.
11. Never place a Supabase service-role key in the mobile app.
12. Use complete, reviewable database migrations.
13. Enable and test RLS with every new business table.
14. Use database transactions/functions for multi-record status changes.
15. Do not trust client-side role or ownership checks.
16. Preserve working user changes and unrelated project files.
17. Explain any requested dependency or architectural change before applying it.

## UI Rules

- Use the shared theme and reusable components.
- Use the supplied logo, icon, marker, placeholder and illustration files in `assets/`. Do not redraw or recolour the logo.
- Use MaterialCommunityIcons from `@expo/vector-icons` for all icons, so in-app icons match the category placeholders and map pins.
- Use Nunito for all app text. The script face on the website is not used in the app.
- Keep urgent reporting reachable within two taps.
- Use plain, empathetic English.
- Use permanent field labels, inline validation and clear recovery actions.
- Status must use text and icon as well as colour.
- Respect Android font scaling and practical touch targets.
- Do not place ads above or inside urgent reporting actions.
- Compress images before upload.
- Provide loading, empty, offline, error and success states.

## Data and Privacy Rules

- Permanent animal profiles are separate from incident reports.
- Published reports preserve animal snapshots.
- Original found location and current whereabouts are separate.
- Home and holding addresses are private by default.
- Ownership evidence is private.
- Draft reports are creator-only.
- Public access uses a deliberately limited data surface.
- Important status changes create case events.
- Ordinary users archive or close important records; they do not hard-delete public case history.

## Workflow Rules

- A missing report requires a registered animal.
- A found report means the animal is secured or in known care.
- A sighting means the animal remains roaming or its whereabouts are unknown.
- Repeat disappearances create new incidents linked to the same animal.
- A transfer does not automatically mean reunion or closure.
- Rejected sightings and matches remain available to other appropriate cases.
- A reunion may be confirmed by both parties, the owner, a verified partner or an administrator under documented rules.

## Verification Required Before Completing a Checkpoint

- Relevant unit or integration checks pass.
- Physical Android testing is completed where practical.
- Navigation and Android Back behaviour are correct.
- Member A cannot read or change Member B's private data.
- Anonymous access is limited to public content.
- Upload failures can be recovered.
- Existing completed workflows still function.
- Documentation reflects any approved change.
- An APK is produced only at an agreed milestone.

## Change Control

If a request conflicts with the blueprint:

1. Identify the conflict.
2. Do not silently reinterpret the product.
3. Ask for a decision when the difference is material.
4. Update the relevant documentation after approval.
5. Implement the approved direction.

