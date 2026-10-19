# Homeward Paws Legal and Google Play Compliance

The website (`https://homewardpaws.co.za/`) now publishes the privacy policy, terms, account deletion page and child safety standards. Google checks that the app behaves as those pages say. Treat this document as a requirement list: if a build would contradict it, stop and ask.

## 1. Published URLs

| Page | URL | Where the app links to it |
|---|---|---|
| Privacy policy | `https://homewardpaws.co.za/privacy-policy.html` | Signup (with acceptance), Profile › Privacy policy, Help |
| Terms of use | `https://homewardpaws.co.za/terms.html` | Signup (with acceptance), Profile › Terms of use |
| Delete account | `https://homewardpaws.co.za/delete-account.html` | Profile › Delete account (info line), Help |
| Child safety standards | `https://homewardpaws.co.za/child-safety.html` | Help and Safety |
| Help and safety | `https://homewardpaws.co.za/safety.html` | Help and Safety, Contact Support |

Store these as environment-driven constants (`EXPO_PUBLIC_WEBSITE_URL` plus paths), not hard-coded strings scattered across screens. Open them in the in-app browser or system browser.

Contact: `info@digitack.co.za` everywhere. Subject conventions: "Privacy", "Delete my Homeward Paws account", "Child safety".

## 2. What the public pages promise the app does

### Accounts
- Accounts are for people aged 18 and older; signup asks the person to confirm their age.
- Terms and privacy acceptance is recorded with the version accepted.
- **Profile › Delete account** exists. It explains what happens to active reports, asks for confirmation, then runs the deletion function described in `03` §17. No subscriptions or payments exist to cancel.
- Members can delete an animal profile, a draft or a photo individually.

### Visibility
- Home address, home map location, private holding addresses, full microchip/tag numbers, ownership evidence, drafts and email address are never public.
- Phone and WhatsApp appear on a report only when the reporter enables them for that report.
- Each incident location is public at the precision the reporter chooses (exact, approximate, suburb only); found-animal whereabouts show a general area only.
- Found reports may use "anonymous finder" as the public identity.
- Visitors can browse public reports without an account.

### Safety and moderation
- Every report, sighting, photo and profile has **Report**, with reasons including **Child safety**.
- Members can **block** other users.
- There is no open chat, private messaging or public comment thread.
- Ownership evidence is visible only to the claimant, the reviewing case participant and narrowly authorised admins.
- Matching only suggests; people confirm.
- No payments, rewards or donations are handled.

### Permissions
| Permission | Rule |
|---|---|
| Location | Foreground only (`ACCESS_FINE_LOCATION`/`COARSE` while in use). Optional. Manual place entry always available. Never background. |
| Camera | Only for taking a photo inside the app. Choosing an existing photo must still work if denied. |
| Photos | **No permission.** Use the Android photo picker (`expo-image-picker` launches it on Android 13+). Block `READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO`, `READ_EXTERNAL_STORAGE` in `app.config.js`. |
| Notifications | `POST_NOTIFICATIONS` after an in-app explanation screen (1.10). In-app notification centre works without it. |
| Advertising ID | `com.google.android.gms.permission.AD_ID`, added by AdMob; declare in Play Console. |

Not collected: contacts, call logs, SMS, installed-app list, background location.

### Ads
- Static AdMob banners only, never on report wizard screens or above urgent actions.
- Test ad unit IDs in all non-production builds.

## 3. Data safety form (Play Console)

Answer from this table; it matches the privacy policy.

| Data type | Collected | Shared with third parties | Optional | Purpose |
|---|---|---|---|---|
| Name | Yes | No | No | Account management, app functionality |
| Email address | Yes | No | No | Account management |
| Phone number | Yes | No | No (public display optional) | Account management, app functionality |
| Precise location | Yes | No | Yes | App functionality |
| Approximate location | Yes | Yes (AdMob, from IP) | No | App functionality, advertising |
| Photos | Yes | No | Yes | App functionality |
| Other user-generated content (reports, sightings, claims) | Yes | No | Yes | App functionality |
| App interactions | Yes | No | No | Analytics, fraud prevention, security |
| Crash logs and diagnostics | Yes | No | No | App functionality |
| Device or other IDs (push token, advertising ID) | Yes | Yes (AdMob) | No | App functionality, advertising |

Data is encrypted in transit. Users can request deletion. Public reports are visible to everyone by design; this is "app functionality", not sharing. Service providers (Supabase, Expo push, Firebase Cloud Messaging) process data for us and are not counted as "sharing" under Google's definitions. Re-check the answers against the final build before submission.

## 4. Play Console declarations checklist

- Privacy policy URL
- Data safety form (section 3) and account deletion URL
- Advertising ID: yes, for advertising
- Ads: contains ads
- Target audience: 18 and over (keeps the app out of the Families policy)
- Content rating questionnaire: user-generated content, users can interact (structured responses), shares location optionally
- App category: Lifestyle recommended. If Social is chosen, the child safety standards URL and named contact are mandatory (they are published either way).
- `app-ads.txt` at the website root with the AdMob publisher line

## 5. Retention and deletion

See `03_SUPABASE_DATA_AND_RLS_PLAN.md` §17. The published periods are commitments, not suggestions.
