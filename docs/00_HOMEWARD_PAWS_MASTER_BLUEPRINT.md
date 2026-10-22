# Homeward Paws Master Development Blueprint

**Document status:** Planning baseline, revised October 2026 (brand, assets, website and Play compliance decisions)  
**Initial market:** South Africa  
**Initial platform:** Android  
**Working product name:** Homeward Paws  
**Tagline:** Helping lost animals find their way home.  
**Proposed owner:** Digitack (PTY) Ltd  

## 1. Purpose of This Blueprint

This document is the controlling product and development reference for Homeward Paws. It defines the agreed product boundaries, users, workflows, architecture, build order and quality expectations. Supporting documents contain the implementation detail.

Codex and all other development assistants must read `CODEX_PROJECT_INSTRUCTIONS.md` and the documents relevant to the active checkpoint before changing the project.

## 2. Product Definition

Homeward Paws is a South African, community-driven mobile platform that helps owners, finders, community members and verified animal-welfare organisations share structured information about missing, found and sighted animals so that they can be safely reunited.

Homeward Paws is a connection platform. It does not guarantee recovery, provide veterinary or emergency services, determine legal ownership, process donations, or act as a general social network.

## 3. Product Principles

1. **Urgency without panic.** A distressed owner must be able to create an accurate alert quickly.
2. **Register once, report quickly.** Permanent animal profiles provide the foundation for future missing reports.
3. **Location matters.** Province, city/town, suburb and coordinates support local discovery while protecting private addresses.
4. **Structured help beats noise.** Sightings, matches, claims and case updates replace unmoderated public comments.
5. **Humans confirm identity.** Automated matching may suggest candidates but never determines ownership or reunion.
6. **Security belongs in Supabase.** Navigation is not an access-control system. Row Level Security protects all business tables.
7. **Build incrementally.** Normal-member workflows are completed before verified-partner features.
8. **Low-data friendly.** List views, compressed images and recoverable uploads are prioritised.
9. **History is valuable.** Important cases, status changes and custody transfers are archived, not casually deleted.
10. **Financial separation.** Donations and transactions happen entirely outside Homeward Paws.

## 4. Initial Scope

- South Africa only
- Android first; iOS later
- English first
- Expo and React Native
- JavaScript, not TypeScript
- Supabase Auth, PostgreSQL and Storage
- Expo-compatible push notifications
- Google AdMob static banners
- Nunito typeface via `@expo-google-fonts/nunito`; icons from `@expo/vector-icons` MaterialCommunityIcons
- South African location hierarchy: Province → City/Town → Suburb
- Phone numbers stored in international E.164 format

The database should remain adaptable to future countries, but global UI and localisation are outside Version 1.

## 5. User Types

### 5.1 Visitor

Can browse, search, open and share public reports inside the installed app. Must authenticate before registering an animal, publishing, following, claiming ownership or contributing to a case.

### 5.2 Member

Default account type. Can manage a profile and animals; create missing, found and sighting reports; follow cases; submit sightings and ownership claims; share reports; and manage their own cases.

### 5.3 Administrator

Retains every member capability and additionally manages users, reports, moderation, audit history, configuration and later partner verification.

### 5.4 Verified Partner Member — Later Phase

An ordinary member who has authorised access to a verified organisation. Partner access adds organisation tools rather than replacing member functionality. Users cannot select this status during signup.

## 6. Core Domain Model

### Animal Profile

A permanent private record maintained by an owner or, later, an organisation. It contains identity, appearance, photographs, behaviour, health warnings and private proof-of-ownership information.

### Missing Report

A public incident linked to a registered animal. It contains a snapshot of the animal at the time of disappearance plus last-seen information, contact preferences, warnings, updates and sightings.

### Found Report

A public incident created when an unknown animal has been secured or placed in known care. Original found location and current whereabouts are stored separately.

### Sighting

An observation of an animal that remains roaming or whose current whereabouts are unknown. It prioritises observation time, location and direction.

### Case Timeline

An append-oriented history of publication, updates, sightings, matches, claims, transfers, status changes and resolution.

### Match

A relationship between reports suggested by structured rules or a community member. It is never proof of identity.

## 7. Primary Member Navigation

The member app uses five bottom-navigation destinations:

1. Home
2. Browse
3. Report
4. Following
5. Profile

The central Report action offers:

- My Animal Is Missing
- I Found an Animal
- I Saw an Animal

Public visitors use a separate navigator that permits browsing and public report details.

## 8. Main Workflows

### 8.1 Missing

Select registered animal → confirm current appearance → enter last-seen details → select location → set urgency, behaviour and contact options → preview → publish → receive sightings and updates → confirm reunion or close.

### 8.2 Found

Confirm animal is secured → assess immediate safety → add photographs → describe animal → record found location → record protected current whereabouts → set behaviour and contact options → review possible matches → preview → publish → review claims or transfer → confirm outcome.

### 8.3 Sighting

Capture observation location and time → add optional photograph and basic description → record direction, behaviour and condition → review possible matches → submit. Target completion time is approximately one minute.

See `01_PRODUCT_AND_USER_FLOWS.md` for full requirements.

## 9. Privacy Decisions

- Home coordinates and private addresses are never copied automatically into public reports.
- Public incident locations show no more than a street or public-landmark name; the default for missing reports is suburb only. Exact coordinates and house numbers remain private, even when the reporter uses device location. Found-animal current whereabouts remain at general-area level only.
- A found animal's private holding address is hidden; the public report shows a general area.
- Full microchip, tag and ownership identifiers remain private.
- Ownership evidence is private and stored separately.
- Phone and WhatsApp actions appear only when enabled for that report.
- Structured case responses are included; open in-app chat is excluded from Version 1.

## 10. Matching Decisions

Version 1 uses explainable structured matching based on animal type, date, distance, colour, size, sex, breed and markings. The interface uses descriptive levels rather than percentages:

- Strong Possible Match
- Possible Match
- Weak Possible Match
- Community-Suggested Match
- Confirmed Match
- Not a Match

Only human participants can confirm identity and reunion.

## 11. Community Decisions

Included:

- Follow reports
- Share reports
- Submit sightings
- Suggest matches
- Submit ownership claims
- Provide structured information
- Consent-based reunion acknowledgements

Excluded:

- Public comments
- Likes and follower counts
- General user posts
- Competitive leaderboards or points
- Open chat
- Public speculation about owners

## 12. Partner Direction

After the member application is stable, verified organisations such as SPCA branches, veterinary practices, shelters and animal rescues may receive:

- Verified organisation profile
- Animals in care
- Organisation reports
- Custody transfers
- Authorised staff access
- Educational posts
- Community alerts
- Official website and social links
- External donation-information links

Homeward Paws never receives, processes, administers, verifies or benefits financially from donations. External links must display a leaving-app notice.

## 13. Monetisation

- Free app
- Static AdMob banners only
- No interstitial, rewarded or video ads
- No ads interrupting urgent reporting
- No ads above the primary urgent actions
- Stable placements to reduce accidental taps

## 14. Version 1 Must Include

- Authentication and profile completion
- South African location handling
- Animal profiles and up to three photographs
- Missing reports
- Found reports
- Sightings
- Browse and filters
- List View and a basic Map View
- Explainable rule-based matching
- Ownership claims and private evidence
- Transfers and custody history
- Timelines and case outcomes
- Following and push notifications
- Sharing
- Report/block controls
- Basic admin moderation
- Static AdMob
- Legal and account-deletion flows

## 15. Explicitly Deferred

- iOS and global launch
- AI image matching and breed recognition
- Route prediction
- Public comments and open chat
- Payments, donations, rewards and subscriptions
- Adoption or shelter-management systems
- Veterinary records and appointment booking
- QR/Bluetooth tracking tags
- Full public web platform
- Advanced offline synchronisation
- Dark mode
- Partner workspace until member workflows are stable

## 16. Development Checkpoints

| Checkpoint | Deliverable |
|---|---|
| 0 | Skeleton navigation APK |
| 1 | Authentication and member-profile APK |
| 2 | Animal-profile APK |
| 3 | Core missing-to-reunited APK |
| 4 | Community beta with found, sighting and matching |
| 5 | Launch candidate with notifications, moderation, AdMob and legal readiness |
| 6 | Verified-partner expansion |

Each checkpoint requires working RLS, error states, physical Android testing and updated documentation.

## 17. Data Architecture Summary

The backend uses:

- Supabase Auth for identity
- Separate public and private profile information
- Permanent animal profiles and private identification data
- A base reports table with missing/found/sighting detail tables
- Historical animal snapshots on reports
- Multiple location records with privacy precision
- Case events and report relationships
- Ownership claims and private evidence
- Transfers, follows, notifications and moderation
- Database-controlled business actions for multi-record state changes

See `03_SUPABASE_DATA_AND_RLS_PLAN.md`.

## 18. Design Summary

Design system v1.1 adopts a warm, friendly look:

- Warm cream background (`#FBF7F2`), white rounded cards and soft shadows
- Green-teal primary (`#227A71`) with coral (`#E8735F`) as a decorative accent only
- Deep navy text (`#1F2D3D`)
- Red: missing · Amber: found · Blue: sighting · Green: reunited · Purple: verified partner
- Soft pill status badges: tinted background with darker text and icon
- Nunito typeface (system font fallback)
- Raised circular central Report button
- Animal photography as primary visual content
- Status communicated through text, icon and colour
- Minimum practical touch target approximately 48 × 48 dp
- Light theme first

The logo is a teal roof with a coral heart over a navy dog and cat. Final app icons, splash and marker assets are in `assets/`.

See `04_DESIGN_SYSTEM.md` and `07_BRAND_AND_ASSETS.md`.

## 19. Source-of-Truth Order

If documents appear to conflict, use this order:

1. `00_HOMEWARD_PAWS_MASTER_BLUEPRINT.md`
2. `CODEX_PROJECT_INSTRUCTIONS.md`
3. The relevant detailed specification
4. Current checkpoint plan
5. Existing implementation, only where it does not contradict approved documentation

Material changes require an explicit decision and documentation update.

## 20. Supporting Documents

- `01_PRODUCT_AND_USER_FLOWS.md`
- `02_SCREEN_AND_NAVIGATION_SPECIFICATION.md`
- `03_SUPABASE_DATA_AND_RLS_PLAN.md`
- `04_DESIGN_SYSTEM.md`
- `05_DEVELOPMENT_ROADMAP.md`
- `06_TESTING_AND_ACCEPTANCE.md`
- `07_BRAND_AND_ASSETS.md`
- `08_LEGAL_AND_PLAY_COMPLIANCE.md`
- `CODEX_PROJECT_INSTRUCTIONS.md`

## 21. Outstanding Items

### Decided (October 2026)

| Item | Decision |
|---|---|
| Product name | Homeward Paws |
| Logo, app icon, splash | Done; see `07_BRAND_AND_ASSETS.md` |
| Support and privacy contact | `info@digitack.co.za` (the only address used publicly) |
| Website | `https://digitack.co.za/paws/` temporarily; move to `homewardpaws.co.za` when live |
| Privacy policy URL | `https://digitack.co.za/paws/privacy-policy.html` |
| Terms of use URL | `https://digitack.co.za/paws/terms.html` |
| Account deletion URL | `https://digitack.co.za/paws/delete-account.html` |
| Child safety standards URL | `https://digitack.co.za/paws/child-safety.html` |
| Minimum account age | 18 |
| Play listing developer name | Digitack (Pty) Ltd |

### Still open (non-blocking)

- Exact Expo SDK confirmation and pinned dependencies (planned: SDK 57)
- Map/geocoding provider
- Email delivery provider for Auth emails
- Supabase hosting region
- AdMob identifiers
- Information Officer and child-safety contact names
- Poster-style sharing timing

These do not block skeleton or member-foundation development.
