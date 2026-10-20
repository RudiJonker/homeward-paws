# Homeward Paws Design System

**Version:** 1.1 — warm visual direction adopted (see §0)

## 0. Change Record

**v1.1 (Oct 2026):** Adopted the warm, rounded look and feel of the "Pet Hero" concept mockup as the visual direction. The mockup is a mood reference, not a specification. Product rules, workflows, status vocabulary and navigation from the blueprint are unchanged.

Adopted from the mockup:

- Warm cream background, white rounded cards, soft shadows and generous whitespace
- Lighter, greener teal as the brand colour, with coral as the warm accent
- Rounded friendly typeface (Nunito)
- Soft-tinted pill status badges
- Photo-led hero card and horizontal "nearby" carousels
- Central Report tab using the same outlined icon treatment as the other tabs
- Round tinted icon tiles for features and steps
- Logo direction: house roof, heart, dog and cat silhouette

Not adopted (conflicts with blueprint):

- A single "Report Lost or Found" action. Missing, Found and Sighting remain three separate urgent actions.
- "Lost" wording. The status is MISSING.
- The "Pet Hero" greeting. Greet by display name; no titles or gamified labels.
- Tab labels Search/Alerts. Tabs remain Home, Browse, Report, Following, Profile. Notifications live in the header bell.
- "Pets" as the default noun in product copy. Use "animals", because the app covers horses, donkeys and farm animals. "Pets" is acceptable in casual marketing copy only.

## 1. Brand Direction

Homeward Paws should feel warm, compassionate, trustworthy, calm, community-driven and practical. It should be friendly without being childish. It should not feel clinical, corporate, cluttered or like a constant emergency dashboard.

Working tagline: **Helping lost animals find their way home.** Alternative under consideration: *Reuniting hearts. Bringing animals home.*

Logo: a teal roofline with chimney and a coral heart, over front-facing navy dog and cat silhouettes. A simplified roof + heart + paw mark is used below 32 px and for the notification icon. All files, sizes and usage rules are in `07_BRAND_AND_ASSETS.md`; never redraw the logo in code.

Emotive photography, such as a dog at sunset, belongs on the website, onboarding, empty states and store assets. It does not belong in report or case screens, where the reported animal's photo is the visual priority.

## 2. Colour Tokens

### Brand and neutrals

| Token | Purpose | Hex |
|---|---|---|
| `primary` | Filled buttons, active tab, links | `#227A71` |
| `primaryBright` | Icons, illustrations, Report FAB ring, decoration | `#2F9488` |
| `primaryDark` | Pressed state, strong headings on tint | `#185C55` |
| `primaryLight` | Selected backgrounds, tinted tiles | `#E3F2EF` |
| `accent` | Warm brand accent: hearts, highlights, notification dot | `#E8735F` |
| `accentLight` | Accent tiles and soft highlights | `#FCE9E4` |
| `highlight` | Mustard: alerts and notification icon tiles | `#E9B949` |
| `highlightLight` | Mustard tile background | `#FBF3DC` |
| `background` | Main warm cream background | `#FBF7F2` |
| `surface` | Cards, sheets, tab bar | `#FFFFFF` |
| `surfaceMuted` | Secondary panels, input fill | `#F5EFE7` |
| `textPrimary` | Main text (deep navy) | `#1F2D3D` |
| `textSecondary` | Supporting text | `#5E6B78` |
| `textOnPrimary` | Text on filled teal | `#FFFFFF` |
| `border` | Dividers, card and input borders | `#ECE4DA` |
| `error` | Destructive actions, field errors | `#B3363C` |

### Status colours

Each status has three tokens: `base` for icons, map pins, banners and accents; `tint` for chip and badge background; `onTint` for chip text and icon colour. Chips use the soft pill style: tint background with onTint text and icon.

| Status | `base` | `tint` | `onTint` |
|---|---|---|---|
| Missing | `#C8424A` | `#FBE6E7` | `#9A2A31` |
| Found | `#D97820` | `#FCEEDD` | `#8F4A0C` |
| Sighting | `#2F6FCE` | `#E3EDFB` | `#1D4E9A` |
| Reunited | `#2E8456` | `#E2F3E9` | `#1D5E3B` |
| Partner | `#7A5BB0` | `#EEE7F7` | `#55397F` |
| Admin | `#3E5057` | `#E6EBED` | `#2B3A40` |

Animal profile status uses the same chips: `safe` → Reunited colours with a home icon, labelled SAFE; `missing` → Missing; `in_care`, `fostered`, `transferred` → Found; `archived`, `deceased` → Admin slate.

When a status colour is used as a solid fill with white text, such as a report banner or an urgent button, use text of at least 18 sp bold or the `onTint` shade as the fill. Verify 4.5:1 for body text and 3:1 for large text during implementation.

### Colour rules

- Status colours are reserved for status meaning. Coral (`accent`) is never used on status chips, report cards or anything that could be read as MISSING or FOUND.
- Coral is decorative and brand-only: hearts, logo, notification dot, illustrations, accent tiles. It does not carry body text.
- Status is always shown through text and icon as well as colour.

## 3. Typography

Typeface: **Nunito** (rounded sans), loaded through `@expo-google-fonts/nunito`, with the platform system font as fallback. This replaces the v1.0 "system font only" decision. Load only the weights in use: 400, 600, 700, 800.

| Token | Size / line height (sp) | Weight | Use |
|---|---|---|---|
| `display` | 28 / 34 | 800 | Welcome, success screens |
| `screenTitle` | 22 / 28 | 800 | Screen headings |
| `sectionTitle` | 17 / 22 | 700 | Section headers such as "Missing near you" |
| `cardTitle` | 16 / 21 | 700 | Animal name on cards |
| `body` | 15 / 22 | 400 | Body copy |
| `bodyStrong` | 15 / 22 | 600 | Emphasis |
| `label` | 13 / 18 | 700 | Field labels |
| `caption` | 12 / 16 | 600 | Meta text: distance, time |
| `button` | 16 / 20 | 700 | Buttons |
| `status` | 11 / 14 | 800, uppercase, +0.5 letter spacing | Status chips only |

The website also uses Dancing Script for short captions on photos. It is not part of the app.

Respect Android font scaling. Critical labels wrap rather than truncate silently. Uppercase is reserved for short status labels such as MISSING, FOUND and REUNITED.

## 4. Spacing, Shape and Elevation

Spacing scale: 4, 8, 12, 16, 20, 24, 32, 40, 48. Screen horizontal margin: 20 dp. Practical touch targets: at least 48 × 48 dp.

| Radius token | Value | Use |
|---|---|---|
| `sm` | 8 | Inputs, small thumbnails |
| `md` | 14 | Buttons |
| `lg` | 18 | Cards |
| `xl` | 24 | Hero card, bottom sheets |
| `pill` | 999 | Status chips, filter chips |
| `circle` | 50% | Icon tiles, avatars, Report FAB |

Elevation is soft and warm: low-opacity navy shadows, never harsh black. Define `shadowCard` (subtle) and `shadowRaised` (sheets and other deliberately elevated controls). Cards use a white surface, a hairline `border` and `shadowCard`, with clear pressed feedback such as a slight scale or tint. Centralise radii and shadows rather than restyling per screen.

## 5. Report Identity

- **Missing:** red banner, alert/location icon, last-seen priority, primary action `I Saw This Animal`.
- **Found:** amber banner, care/shield icon, found and whereabouts priority, action `This May Be My Animal`.
- **Sighting:** blue banner, eye/direction icon, observation age/map priority, action `I Saw This Animal Too`.
- **Reunited:** green banner, home/heart icon, outcome and consented story.
- **Partner:** purple verified badge, organisation identity and official external actions.

## 6. Main Components

### General

`ScreenContainer`, `AppHeader`, `SectionHeader`, `PrimaryButton`, `SecondaryButton`, `TextButton`, `IconButton`, `IconTile`, `StatusChip`, `InfoBanner`, `ConfirmationDialog`, `EmptyState`, `LoadingState`, `ErrorState`, `HeroCard`.

- `IconTile`: a circular tinted tile with an icon, using `primaryLight`, `accentLight`, `highlightLight` or a status `tint`. Used for feature lists, "How it works" steps, urgent action cards and empty states.
- `HeroCard`: a rounded `xl` card with a photo or illustration and warm text, used on Home and Welcome. See §8.
- The centre Report tab uses the same standard icon treatment as the other tabs, with MaterialCommunityIcons `plus-circle-outline` and the accessibility label "Report an animal".

### Forms

`FormField`, `SearchablePicker`, `SelectionCard`, `ChoiceChip`, `ColourSelector`, `DateTimeField`, `LocationField`, `PhotoPicker`, `PhotoGalleryEditor`, `StepIndicator`, `FormNavigation`, `PrivacyNotice`.

### Animals

`AnimalCard`, `AnimalAvatar`, `AnimalSummary`, `AnimalStatus`, `AnimalPhotoGallery`, `IdentificationSummary`.

### Reports

`ReportCard` (vertical carousel variant and horizontal list variant), `ReportHeader`, `ReportStatusBanner`, `UrgencyBanner`, `ApproachWarning`, `ReportLocation`, `ReportActions`, `CaseTimeline`, `TimelineEvent`, `FollowButton`, `ShareButton`.

### Matching/Partners

`MatchCard`, `MatchComparison`, `MatchingFactors`, `ConflictingFactors`, `PartnerBadge`, `OrganisationCard`, `ReunionCard`, `CommunityAlertCard`, `ExternalLinkWarning`.

### Icons

Use MaterialCommunityIcons from `@expo/vector-icons` (bundled with Expo) for every icon. Status icons: Missing `alert-circle`, Found `shield-home`, Sighting `eye`, Reunited and Safe `home-heart`, Verified partner `check-decagram`. Category icons: see `07_BRAND_AND_ASSETS.md`. The Report button uses `paw` with a small `plus` badge or `paw` alone.

## 7. Button Hierarchy

- Primary: main completion action, filled `primary` teal, `md` radius, full width in forms
- Urgent: scarce and clearly labelled, never flashing; status-coloured where the action belongs to a status
- Secondary: outlined teal on white
- Destructive: `error`, only for genuinely destructive or closing actions
- Text: cancel, skip, learn more

Disable buttons and show progress during submission to prevent duplicate reports.

## 8. Home Layout

1. **Header:** greeting by display name ("Welcome back, Andre"), selected area, notification bell with `accent` dot, profile avatar.
2. **Hero card with urgent actions.** A compact photo-led `HeroCard` ("Let's bring them home") contains the three urgent actions as status-tinted `IconTile` buttons: *My Animal Is Missing*, *I Found an Animal*, *I Saw an Animal*. The hero must not push the urgent actions below the fold on a small device at default font scale. If space is short, drop the hero image before moving the actions.
3. My Animals
4. My active and action-required cases
5. Missing near you (horizontal carousel of photo cards with status chip, name, distance and time)
6. Recent sightings
7. Found near you
8. Reunions
9. Partner content (later)

AdMob appears only between non-urgent content sections, never inside the hero card or above the urgent actions.

The "How it works" 3-step strip (Report → Share → Reunite, using `IconTile`s) is used on Welcome, visitor Home and first-run empty states. It does not appear on every member Home visit.

## 9. Bottom Navigation

Five destinations: Home, Browse, **Report**, Following, Profile. Report uses the standard MaterialCommunityIcons `plus-circle-outline` at the same size and alignment as the other tab icons. The active tab uses `primary` icon and label; inactive tabs use `textSecondary`. Labels are always visible. The tab bar is a white surface with a hairline top border.

## 10. Browse Layout

A header with area, search and filter. Tabs for Missing, Found, Sightings and Reunited. A List/Map toggle, active filter chips (pill) and stable report cards. List is the default. List position is preserved.

## 11. Report Detail Layout

1. Status/reference
2. Gallery
3. Animal summary
4. Urgency/safety warnings
5. Primary contribution action
6. Time/location
7. Description
8. Map
9. Timeline
10. Contact/share/follow/report controls

A sticky action area may be used if it does not conflict with ads or Android navigation.

## 12. Forms

- Permanent labels above inputs
- Inputs on `surface` with `border`, `sm` radius, and `primary` focus border
- Inline, field-specific errors
- Cards/radios for single choice; selected cards use a `primaryLight` fill and `primary` border
- Checkboxes/chips for multiple choice
- Searchable picker for breeds
- Named chips for colours/markings
- Short steps with `Step X of Y` and a rounded progress bar
- Back, Continue and Save/Exit where appropriate
- Clear public/private explanation

## 13. Images and Illustration

Animal photos are the visual priority. Use consistent `lg`-rounded square crops on cards and a large swipeable detail gallery. Do not place essential text over busy images. Hero text needs a scrim or a clear photo area.

Illustration style: simple flat shapes in brand colours, such as a bell in a mustard circle, the dog and cat silhouettes, or a paw. Use illustration for empty states, success screens and missing-photo placeholders (a category silhouette per animal type). Compress uploads and load thumbnails lazily.

## 14. Maps and Locations

Every location screen identifies whether it represents device, home, incident, holding or public map location. A confirmation card shows the selected area and public precision. Never show private holding or home locations accidentally. Map pins use status `base` colours with an icon.

## 15. Feedback States

### Loading

Skeleton cards on `surfaceMuted`, image placeholders, progress text and upload state.

### Empty

Friendly illustration, a useful explanation and next actions. Avoid inappropriate cheerfulness on missing cases.

### Error

Explain what failed and offer retry, manual or save-later routes. Do not discard textual report data when an image or location step fails.

### Success

Confirm the reference and offer a useful next action. Celebration (warm hero, heart, "Every animal deserves to come home") is reserved for confirmed reunions.

## 16. Accessibility

- Android font scaling
- Verified colour contrast (see §2 status rules)
- Text and icon labels with status colour
- Logical screen-reader focus
- Descriptive accessibility labels, including the Report tab action
- Practical touch targets
- No flashing
- Plain language
- Manual alternatives to permissions and maps
- Essential information available outside visual maps

## 17. Theme Structure

```text
src/theme/
├── colors.js        brand, neutral and status (base/tint/onTint) tokens
├── spacing.js
├── typography.js    Nunito roles with system fallback
├── fonts.js         font loading (expo-font / @expo-google-fonts/nunito)
├── radii.js
├── shadows.js
└── index.js
```

Use the light theme for Version 1, but centralise tokens so dark mode remains possible later.

## 18. Visual Screen Map

The complete map should include a left product/legend panel and grouped screen strips:

1. Onboarding
2. Home/Navigation
3. My Animals
4. Missing
5. Found
6. Sightings
7. Browse/Matching
8. Following/Notifications
9. Profile/Support
10. Administration
11. Future Partners

Legend: teal general member, red missing, amber found, blue sighting, green reunion, purple partner, slate administration. Partner screens must be labelled later phase.
