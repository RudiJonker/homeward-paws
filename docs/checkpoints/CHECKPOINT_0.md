# Checkpoint 0 — Skeleton

## Status

Complete.

## Included

- Expo SDK 57 JavaScript application with exactly pinned dependencies
- Public, member, main-tab and placeholder admin navigation
- Home, Browse, Report, Following and Profile skeleton screens
- Central raised Report action with Missing, Found and Sighting choices
- Shared theme tokens and reusable base components
- Supplied brand and Android assets
- Loading screen and general error boundary
- Environment-variable pattern and dormant Supabase client
- Development and preview APK profiles
- Android blocked-permission configuration

## Verification

- `npm run lint` — passed
- `npx expo install --check` — passed; React Native 0.86.2 intentionally excluded from update checks because it is the approved exact project version
- `npx expo-doctor` — 21/21 checks passed
- `npx expo export --platform android --output-dir dist` — passed
- Android debug APK — built and installed successfully on a physical RMX3938 device
- Welcome, Home, Browse and Report destinations — visually verified on device
- Android Back from Browse — returned predictably to Home
- Bottom navigation safe area — corrected and verified above the device system navigation bar
- `npm audit --omit=dev` — reports inherited Expo/Metro advisories (8 moderate, 15 high, 0 critical); npm's proposed fixes downgrade the approved Expo/React Native stack and were not applied

## Notes

- Supabase variables intentionally remain empty until the cloud project is created for Checkpoint 1.
- Expo SDK 57 currently recommends React Native 0.86.3, but `AGENTS.md` fixes the project at 0.86.2. The approved version is retained and documented rather than changed silently.
