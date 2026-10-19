# Homeward Paws — Checkpoint 0: Skeleton (revised October 2026)

You are building Homeward Paws, an Android-first South African app that helps reunite missing, found and sighted animals with their people. This task covers **Checkpoint 0 (Skeleton) only**.

## 1. Read before writing

Read `AGENTS.md`, then these in full, before creating or changing files:

1. `docs/00_HOMEWARD_PAWS_MASTER_BLUEPRINT.md`
2. `docs/CODEX_PROJECT_INSTRUCTIONS.md`
3. `docs/05_DEVELOPMENT_ROADMAP.md` (Checkpoint 0)
4. `docs/02_SCREEN_AND_NAVIGATION_SPECIFICATION.md`
5. `docs/04_DESIGN_SYSTEM.md` (v1.1)
6. `docs/07_BRAND_AND_ASSETS.md`
7. `docs/08_LEGAL_AND_PLAY_COMPLIANCE.md` (§1 and the permissions table)
8. `docs/06_TESTING_AND_ACCEPTANCE.md` §3

`docs/visuals/mood-reference-flyer.jpg` is a mood reference only. Where it differs from the design system (coral buttons, "Pet Hero", "Lost", Search/Alerts tabs), the design system wins.

## 2. Inspect first, then decide

- List the repo and report what exists.
- If an Expo project or Checkpoint 0 skeleton already exists, **audit and bring it up to this prompt** (v1.1 theme, Nunito, supplied assets, config). Do not regenerate working files.
- If only docs and assets exist, scaffold the project.
- Give a short plan (files to create/change, dependencies) before large changes.

## 3. Stack

- Expo SDK 57, React Native 0.86.2, React 19.2.3. Confirm with `npx expo install --check`; install native modules with `npx expo install`; pin exact versions (no `^`/`~`).
- JavaScript only.
- React Navigation (native stack + bottom tabs), `react-native-safe-area-context`, `react-native-screens`.
- `@supabase/supabase-js` + `@react-native-async-storage/async-storage`.
- `expo-font` + `@expo-google-fonts/nunito` (weights 400, 600, 700, 800).
- `expo-splash-screen` (keep splash up until fonts and session resolve).
- Icons: `@expo/vector-icons` MaterialCommunityIcons only.
- Justify every package in the final report. Nothing else.

## 4. Configuration

- `app.config.js` reading env; never hard-code production identifiers. Copy the icon, adaptive icon, splash, favicon and `blockedPermissions` block from `docs/07_BRAND_AND_ASSETS.md` §1 exactly.
- Android package from env with dev default `com.digitack.homewardpaws.dev`. Scheme `homewardpaws`. Orientation portrait.
- Env: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_WEBSITE_URL` (default `https://homewardpaws.co.za`), `EXPO_PUBLIC_SUPPORT_EMAIL` (default `info@digitack.co.za`). Commit `.env.example`; ignore real `.env` files.
- `src/config/links.js` builds the legal URLs from `docs/08` §1.
- Missing env shows a clear configuration error screen, never a crash.
- `eas.json` with `development` and `preview` (`buildType: "apk"`) profiles.
- No service-role key anywhere.

## 5. Theme (`src/theme/`)

- `colors.js`: every token in `04` §2, including status `base`/`tint`/`onTint` for missing, found, sighting, reunited, partner, admin, plus the animal-status mapping in §2.
- `typography.js`: the §3 roles, using Nunito family names per weight, system fallback. Respect font scaling.
- `spacing.js`, `radii.js` (sm 8, md 14, lg 18, xl 24, pill 999), `shadows.js` (`card`, `raised`, warm navy, low opacity), `fonts.js` (loader), `index.js`.

## 6. Components (`src/components/`)

`ScreenContainer`, `AppHeader`, `SectionHeader`, `PrimaryButton`, `SecondaryButton`, `TextButton`, `IconButton`, `IconTile`, `StatusChip`, `InfoBanner`, `EmptyState` (accepts an illustration from `assets/illustrations`), `LoadingState`, `ErrorState`, `ErrorBoundary`, `HeroCard`, `ReportFab`, `CheckpointNotice`, `BrandLogo` (renders the supplied PNGs).

- `StatusChip`: soft pill (tint background, onTint text and icon), uppercase label, MaterialCommunityIcons per `04` §6 Icons. Never colour alone.
- Touch targets ≥ 48 dp; accessibility labels on icon-only controls; `ReportFab` labelled "Report an animal".

## 7. Navigation (spec §1–2)

- **RootNavigator** resolves session → Public or Member. `SessionContext` exposes `session`, `isLoading` and explicit `null` placeholders for `profileCompleted`, `accountStatus`, `role`.
- **PublicNavigator**: Welcome (1.2, with `BrandLogo`, Create account, Log in, Browse without an account, How it works strip), public browse and report-detail placeholders, Help and Safety, Terms, Privacy (screens show a short summary and open the website URL).
- **MemberNavigator**: MainTabs + placeholder stacks for animal, report, matching, notification and profile flows.
- **MainTabs**: Home, Browse, Report (raised `ReportFab`), Following, Profile. The Report tab press opens the Report Menu (2.2) modal without changing tab; its three actions open checkpoint-labelled placeholders.
- **Home (2.1)** per `04` §8: header greeting by display name, `HeroCard` containing the three status-tinted urgent actions, then section placeholders. Urgent reporting within two taps.
- **AdminNavigator** placeholder reached from Profile only when `role === 'admin'` (comment: UI visibility only, not security).
- Every placeholder shows screen ID, name and checkpoint via `CheckpointNotice`.
- Android Back: modal closes; non-Home tabs return toward Home; Back on Home exits. Document the rules.
- `linking.js` for public report detail and main tabs.

## 8. Supabase in Checkpoint 0

Client only (AsyncStorage persistence, `autoRefreshToken`, AppState-aware refresh). **No migrations, tables or RLS yet.**

## 9. Out of scope

Auth logic, profiles, schema, real data, maps, location, image picking, notifications, AdMob, matching, partners, dark mode, iOS work.

## 10. Housekeeping

- Keep `AGENTS.md` at the repo root as supplied (update only the Commands section if a command differs).
- README: setup, env, run and APK steps.
- `docs/checkpoints/CHECKPOINT_0.md`: what was built, pinned dependency list, Back-behaviour rules, exit-gate status.
- Update Blueprint §21 with the confirmed SDK and pins.

## 11. Verify before reporting done

- `npx expo install --check`, `npx expo-doctor`, ESLint: clean or explained.
- Android emulator walk-through of Testing §3: cold/warm launch, all placeholders, five tabs, Report modal, Back behaviour, error boundary via a `__DEV__`-only trigger, fonts load, splash hides correctly.
- Inspect the generated Android manifest (`npx expo prebuild --platform android --no-install` in a scratch copy, or the EAS build log) and confirm none of the blocked permissions are present.

## 12. Final report

1. Audit or scaffold, and why
2. File tree
3. Dependencies with exact versions and reasons
4. Exit gate: launches reliably / no broken destinations / predictable Back / APK installs on a physical device (mark "pending hardware" with the exact EAS command)
5. Conflicts, assumptions, open questions

Stop after Checkpoint 0.
