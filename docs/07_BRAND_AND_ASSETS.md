# Homeward Paws Brand and Asset Map

Every graphic the app needs is supplied in `assets/`. Use these files; do not redraw the logo, icons or markers in code. SVG masters are for reference and future regeneration; the app uses the PNGs.

## 1. App icon, splash and notification icon

| File | Size | Expo config key |
|---|---|---|
| `assets/images/icon.png` | 1024×1024, cream background | `icon` |
| `assets/images/adaptive-icon.png` | 1024×1024, transparent, mark inside the 66/108 safe circle | `android.adaptiveIcon.foregroundImage` |
| `assets/images/adaptive-icon-monochrome.png` | 1024×1024, white on transparent | `android.adaptiveIcon.monochromeImage` |
| — | `#FBF7F2` | `android.adaptiveIcon.backgroundColor` |
| `assets/images/splash-icon.png` | 1024×1024, transparent | `expo-splash-screen` plugin `image`, `imageWidth: 200`, `backgroundColor: "#FBF7F2"` |
| `assets/images/notification-icon.png` | 96×96, white alpha silhouette | `expo-notifications` plugin `icon`, `color: "#227A71"` (Checkpoint 5) |
| `assets/images/favicon.png` | 48×48 | `web.favicon` |

```js
// app.config.js excerpt
icon: './assets/images/icon.png',
android: {
  adaptiveIcon: {
    foregroundImage: './assets/images/adaptive-icon.png',
    monochromeImage: './assets/images/adaptive-icon-monochrome.png',
    backgroundColor: '#FBF7F2',
  },
  blockedPermissions: [
    'android.permission.READ_MEDIA_IMAGES',
    'android.permission.READ_MEDIA_VIDEO',
    'android.permission.READ_EXTERNAL_STORAGE',
    'android.permission.WRITE_EXTERNAL_STORAGE',
    'android.permission.ACCESS_BACKGROUND_LOCATION',
  ],
},
web: { favicon: './assets/images/favicon.png' },
plugins: [
  ['expo-splash-screen', { image: './assets/images/splash-icon.png', imageWidth: 200, resizeMode: 'contain', backgroundColor: '#FBF7F2' }],
],
```

## 2. Logo in the app

| File | Use |
|---|---|
| `assets/brand/logo-horizontal.png` | Welcome screen, About |
| `assets/brand/logo-stacked.png` | Optional onboarding hero |
| `assets/brand/logo-mark.png` | Small brand mark, empty states |
| `assets/brand/logo-small.png` | Anywhere under 32 px |
| `assets/brand/svg/*.svg` | Masters; text converted to outlines |

Keep clear space around the logo at least the width of the heart. Allowed colourways: full colour, reverse (white roof and animals on teal or photos) and single colour. Coral is for the heart only.

To render SVG directly instead, add `react-native-svg` (Expo-managed) only if a later checkpoint needs it; PNGs are enough for Version 1.

## 3. Map markers (Checkpoint 4)

`assets/markers/pin-missing.png`, `pin-found.png`, `pin-sighting.png`, `pin-reunited.png`, `pin-partner.png`, each with `@2x` and `@3x` variants (48×60 at 1x). Anchor at bottom centre (`{ x: 0.5, y: 1 }`).

`assets/markers/area-approximate.png` (96×96 at 1x, with `@2x` and `@3x`) marks reports whose public precision is approximate or suburb only. Anchor at the centre. Never show a pin at an exact point for a private location.

## 4. Animal category placeholders

Shown when a report or profile has no photo. Square tiles, 512×512.

| Category | File | MaterialCommunityIcons name |
|---|---|---|
| Dog | `assets/placeholders/animal-dog.png` | `dog` |
| Cat | `animal-cat.png` | `cat` |
| Bird | `animal-bird.png` | `bird` |
| Horse | `animal-horse.png` | `horse` |
| Donkey | `animal-donkey.png` | `horse` |
| Rabbit | `animal-rabbit.png` | `rabbit` |
| Reptile | `animal-reptile.png` | `snake` |
| Small mammal | `animal-small-mammal.png` | `rodent` |
| Farm animal | `animal-farm-animal.png` | `cow` |
| Other | `animal-other.png` | `paw` |
| Unsure | `animal-unsure.png` | `help` |

## 5. Illustrations

`assets/illustrations/`: `empty-results.png` (no search results), `no-animals.png` (My Animals empty state), `offline.png` (no connection), `reunited.png` (confirmed reunion only; celebration is reserved for reunions). 960 px wide; display at about 240–320 dp.

## 6. Store assets (not bundled in the app)

`store/play-icon-512.png` and `store/feature-graphic-1024x500.png` are for Play Console. Phone screenshots are captured from the real app at Checkpoint 5.

## 7. Photography

Report and profile photos come from members. Marketing photography (the sunset dog and other animals) lives on the website only. Do not bundle stock or marketing photos in the app.

## 8. Licences

- Nunito: SIL Open Font License 1.1 (via `@expo-google-fonts/nunito`)
- Material Design Icons glyphs in placeholders and markers: Apache License 2.0
- Logo, mark and illustrations: original work for Digitack (Pty) Ltd
