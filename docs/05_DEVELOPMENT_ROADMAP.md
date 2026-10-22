# Homeward Paws Development Roadmap

## Development Strategy

Build complete vertical workflows incrementally. Each checkpoint adds a coherent capability on top of a stable foundation. Partner functionality is intentionally delayed until normal-member workflows are proven.

## Checkpoint 0 — Skeleton

### Build

- Expo React Native JavaScript project
- Compatible pinned dependencies
- Environment-variable pattern
- Supabase client
- Root, Public, Member, Main Tab and placeholder Admin navigation
- Home, Browse, Report, Following and Profile placeholders
- Shared theme and base components
- Loading and general error boundary
- Android configuration and development APK

### Exit Gate

- App launches reliably.
- Navigation has no broken destinations.
- Android Back behaviour is predictable.
- Skeleton APK installs on a physical device.

## Checkpoint 1 — Member Foundation

### Build

- Signup, verification, login, logout and session persistence
- Profile trigger and completion
- E.164 mobile storage
- Province, city/town and suburb
- Optional device location and avatar
- Terms/privacy acceptance
- Member role and controlled admin recognition
- Edit profile, account status and in-app account deletion (Profile › Delete account) matching the published deletion page
- Age confirmation (18+) at signup
- Terms and privacy links opening the website URLs, with accepted versions recorded
- Contact Support (`info@digitack.co.za`) and Help and Safety content

### Exit Gate

A new member can create, complete, revisit and securely manage their own profile.

## Checkpoint 2 — Animal Profiles

### Build

- My Animals
- Scrollable animal registration with all sections and a final review
- Conditional fields for animal categories
- Named colour selection
- Identification, behaviour and health flags
- Up to three compressed photographs
- Private proof-of-ownership information
- Edit, archive and restore
- Supabase Storage and RLS

### Exit Gate

A member can securely manage multiple animals and no other member can access private animal information.

## Checkpoint 3 — Core Missing Workflow

### Build

- Missing-report wizard
- Draft recovery
- Animal snapshot
- Last-seen location and privacy
- Publish and Missing Report Detail
- Missing browse list and location filters
- Sharing
- Owner updates and timeline
- Basic linked sighting
- Reunion and closure
- My Reports and basic report-content flag

### Exit Gate

Two test users complete: register → missing → browse → sighting → owner update → reunion → safe animal status.

## Checkpoint 4 — Community Beta

### Build

- Complete found workflow
- Ownership claims and private evidence
- Transfers and current whereabouts
- Complete standalone sighting workflow
- Missing, Found, Sightings and Reunited tabs
- Basic Map View
- Following
- Structured matching and comparison
- Two-party and exceptional reunion paths
- Status reminders

### Exit Gate

The following paths work:

1. Missing → sighting → reunion
2. Found → claim → verification → reunion
3. Standalone sighting → match → found → reunion

## Checkpoint 5 — Launch Candidate

### Build

- Push devices and direct/nearby alerts
- Notification Centre and basic preferences
- Weak-connectivity and pending-upload recovery
- Moderation Queue, user/report management and audit
- Blocking and content reporting
- Static AdMob on approved surfaces
- Legal, support and account-deletion completion
- App icon, splash, screenshots, testing checklist and user manual
- Release APK/AAB validation
- Google Play compliance pass (`08_LEGAL_AND_PLAY_COMPLIANCE.md`): Data safety answers, permissions audit of the built manifest, advertising ID declaration, account deletion end to end, Child safety report reason, website URLs live

### Exit Gate

- Full regression test passes.
- Privacy and RLS tests pass.
- Admin can moderate without manual database editing.
- Production build runs on physical Android devices.
- Store assets and policies are ready.

## Checkpoint 6 — Verified Partners

### Build

- Organisation profiles and verification
- Organisation membership and permissions
- Animals in care and organisation reports
- Custody acceptance
- Educational posts and community alerts
- Official external links and leaving-app warning
- External donation-information links only
- Partner moderation

### Exit Gate

A verified organisation can safely collaborate through the existing animal and report workflows without creating a duplicate system.

## Delivery Rhythm

For each feature:

1. Confirm the relevant specification.
2. Add the migration and RLS.
3. Build a complete user flow.
4. Test success, empty, error and permission states.
5. Test on Android.
6. Run regression checks.
7. Update documentation.
8. Create a checkpoint APK only when the stage is coherent.

## Backlog Labels

- **Must Have:** required for the active checkpoint
- **Should Have:** important but movable without breaking the workflow
- **Later:** intentionally deferred
- **Rejected for Current Scope:** conflicts with agreed boundaries

## Dependency Order

Skeleton → Member profiles → Animal profiles → Missing → Found and sightings → Browsing/matching → Notifications/moderation → Launch → Partners

## Features Excluded From Version 1

- AI image recognition
- Open chat and public comments
- Payments, donations and rewards
- Adoption/shelter-management suite
- Medical records and bookings
- Tracking hardware
- iOS and global localisation
- Full public web platform
- Advanced offline synchronisation
- Competitive community gamification

