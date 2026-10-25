# Homeward Paws Supabase Data and RLS Plan

## 1. Architecture Rules

- Supabase Auth owns authentication.
- UUIDs are internal primary keys; public references are separate.
- Store timestamps in UTC.
- Store public and private data separately.
- Separate permanent animal profiles from report snapshots.
- Use a base report table plus report-type detail tables.
- Store important state changes as append-oriented case events.
- Use soft deletion, closure and archiving for important records.
- Enable RLS on every business table before client access.
- Add explicit Data API grants in the same migration as every new public-schema table; RLS still determines which rows each role may access.
- Never ship the service-role key in the app.
- Use protected database functions/transactions for multi-record business actions.

This is a logical plan. Final SQL must be divided into ordered, reviewable migrations aligned with development checkpoints.

## 2. Roles and Accounts

### `profiles`

`id` references `auth.users.id`; `display_name`, `first_name`, `last_name`, `avatar_path`, `role`, `account_status`, `profile_completed`, accepted terms/privacy versions and timestamps.

New-user trigger defaults:

- `role = member`
- `account_status = active`
- `profile_completed = false`

Client cannot modify role or account status.

### `profile_private`

`user_id`, E.164 mobile, WhatsApp preference, country, province, city, suburb, coordinates, location source and timestamps.

### `notification_preferences`

Per-user push, direct case, nearby category, reunion, partner and quiet-hour choices.

### `watched_areas`

User, label, province, city, suburb, coordinates, radius, primary flag and active state. Version 1 initially exposes one primary area.

### `push_devices`

User, device identifier, platform, push token, active state and last-seen time. Support multiple devices and token invalidation.

## 3. Animals

### `animals`

Core searchable fields:

- Owner user
- Name
- Category, species and breed
- Mixed-breed flag
- Sex
- Estimated age in whole years and the date of estimation; the current registration UI does not ask for a birth date
- Size and approximate weight
- Primary/secondary colours as stable text codes (`primary_colours` holds at most one; `secondary_colours` holds multiple); legacy free-text descriptions are retained in pattern/markings during migration
- Pattern, coat, eye colour and distinctive features
- Sterilised and microchipped status
- Profile status
- Created, updated and archived timestamps

Statuses: `safe`, `missing`, `in_care`, `fostered`, `transferred`, `archived`, `deceased`. Reunion is a case outcome; a returned animal becomes `safe`.
Closing a missing report without reunion does not itself change the animal from `missing`. An explicitly confirmed erroneous report may return the animal to `safe` without being labelled `reunited`. Report status and animal status remain separate facts.

### `animal_photos`

Animal, storage path, thumbnail, order, photo type, visibility and archive timestamp.

### `animal_private_details`

Animal, microchip/tag/band/brand details, hidden identifying feature, private medical and ownership notes. Restricted to authorised owners and narrowly authorised administration.

### `animal_health_flags`

Animal, flag type, description, active state and whether it may be public during an incident.

### `animal_behaviour_flags`

Animal, flag type, description, active state and incident visibility.

## 4. Reports

### `reports`

Shared fields:

- ID and unique public reference
- Type: missing, found or sighting
- Status
- Reporter user
- Animal ID when applicable
- Future reporting organisation
- Title and summary
- Contact preferences and channel flags
- Public display identity
- Publication, activity, closure, archive, creation and update timestamps

Drafts use the same table with `status = draft` and remain creator-only.

### `missing_report_details`

Last-seen date/time and accuracy, circumstance, direction, incident accessories, medical urgency, approach guidance, details and reunion timestamps.

### `found_report_details`

Found date/time and accuracy, circumstance, condition, behaviour, secured status, chip scan status, care duration, public whereabouts summary and reunion timestamps.

### `sighting_report_details`

Observed time, still-visible flag, movement, direction, behaviour, condition, environmental danger, quantity and live-until timestamp.

### `report_animal_snapshots`

Report, optional source animal, name, type/species/breed, sex, size, colours, markings, features, accessories, public warnings and controlled animal-specific snapshot data. Searchable facts use columns rather than existing only in JSON.

### `report_photos`

Report, optional source animal photo, storage paths, order, type, sensitivity and visibility.

## 5. Locations

### `report_locations`

Report, type, street, landmark, suburb, city, province, country, coordinates, accuracy, source, public precision, public label, current flag, observed time and created time.

Location types:

- Last seen
- Found
- Sighting
- Current whereabouts
- Transfer destination
- Search area
- Reunion location

Public precision:

- Exact
- Approximate
- Suburb only
- Private

Public queries must return only the permitted precision. Distance search may later use PostgreSQL geospatial support and appropriate indexes.

For every public incident report, `Exact` is forbidden as a public precision. The public projection may include only a general area or an explicitly chosen street/public-landmark name without a house number; found-animal current whereabouts stay at general-area level. Private coordinates must never be returned through public report queries or used as the position of a public map pin. Enforce this in the publication function and public read surface, not only in the mobile UI. `Exact` remains usable only for private location records.

## 6. Case History and Relationships

### `case_events`

Report, event type, actor user/future organisation, visibility, structured data, public/private message, previous/new status and timestamp.

Visibility: public, case participants, owner/reporter only, admin only.

### `report_links`

Source/target report, type, status, suggesting/confirming user, confidence level, reason and timestamps.

Link types include possible match, confirmed match, sighting of, follow-up, converted to found, duplicate, related and replaces.

### `report_matches`

Missing report, candidate report/type, descriptive match level, matching/conflicting factors, distance, date compatibility, generator, suggester, participant reviews and final status.

Internal ordering may use a score; public UI uses descriptive levels.

## 7. Claims, Custody and Following

### `ownership_claims`

Found report, claimant, optional registered animal, relationship, explanation, status, finder response and timestamps.

### `ownership_evidence`

Claim, evidence type, private storage path and private description. Never public.

### `report_transfers`

Report, from/to users or future organisation, external destination, destination type/area, public text, private contact, reference, reason, transfer/acceptance timestamps and status.

### `report_follows`

Report, user, notification flag and timestamp. Unique per report/user pair.

## 8. Notifications

### `notifications`

Recipient, type, priority, title/body, report, related entity, destination route/params, deduplication key, read/action/archive timestamps and creation time.

The in-app notification exists independently from push delivery.

### `notification_deliveries` — Optional Later

Notification, device, delivery status, provider response and attempt/delivery timestamps.

## 9. Moderation

### `content_reports`

Reporter, target type/ID, reason, description, status, assigned admin, resolution and timestamps.

Checkpoint 3 starts with private flags on active public missing reports and their public report photos. Only the flagger and active admins read these flags. Child safety has first queue priority; full admin review actions and flags for later public content types follow in Checkpoint 5.

Reasons include at least: inaccurate or misleading, scam or request for money, harassment, private information exposed, inappropriate image, animal sale or advertising, **child safety**, other. `child_safety` reports are highest priority in the moderation queue and must be actioned within 24 hours (see `08_LEGAL_AND_PLAY_COMPLIANCE.md`).

### `user_blocks`

Blocking user, blocked user and timestamp. Unique pair; blocks protected direct interaction.

### `admin_actions`

Admin, action, target, reason, previous/new data and timestamp. Administrative changes are auditable.

## 10. Future Organisation Tables

Create only in the partner checkpoint:

- `organisations`
- `organisation_members`
- `organisation_permissions`
- `partner_verification_requests`
- `organisation_animals` or an agreed custody relationship
- `partner_content`
- `external_partner_links`

Reserve future organisation references on reports, events and transfers without building the whole workspace early.

## 11. Storage Buckets

### `avatars`

User-owned profile images with controlled public access.

### `animal-photos`

Permanent animal photos; owner write access. Public exposure occurs through deliberately public report data.

### `report-photos`

Published incident images with reporter upload and moderation support.

### `sighting-photos` (Checkpoint 3 linked sightings)

One optional compressed JPEG per linked missing-case sighting. The bucket is private. Only the active contributor may upload to their sighting's fixed path; after attachment, Storage read access is limited to the contributor, missing-report owner and active admin. The contributor may remove their own attached photo, including after case closure, or discard an unattached upload. The file is removed through the Storage API before a protected RPC clears its path; the sighting and owner review remain. The public report projection never includes this path or a signed URL. Account deletion removes remaining files through the Storage API before clearing photo metadata.

### `claim-evidence`

Private bucket using signed access for claimant and authorised case reviewers.

### Later

- `organisation-assets`
- `moderation-evidence`

Suggested paths:

```text
avatars/{user_id}/avatar.jpg
animals/{owner_user_id}/{animal_id}/{photo_id}.jpg
reports/{report_id}/{photo_id}.jpg
claims/{claim_id}/{evidence_id}.jpg
organisations/{organisation_id}/{asset_id}.jpg
```

Storage policies must verify entity ownership; knowing a path never grants access.

## 12. Public References

Generate unique references in the database, for example:

- `HP-MIS-EC-2026-004821`
- `HP-FND-EC-2026-003147`
- `HP-SGT-EC-2026-006214`

UUID remains the real key. Province codes in public references are presentation aids and not access controls.

## 13. Controlled Business Functions

Use protected transactional functions for:

- Complete new-user profile bootstrap where appropriate
- Publish missing/found/sighting report
- Mark animal missing
- Link sighting or match
- Record/accept transfer
- Request/confirm reunion
- Close report; publish a separately reviewed new alert after an owner's closed case
- Suspend/reactivate user
- Verify partner later

A reunion transaction may update several reports, animal status, case events, notifications and active-alert state atomically.

## 14. Core Constraints

- One active missing report per animal
- Unique public reference
- No self-referential report links
- Unique report follow per user
- No duplicate active claim from the same claimant/report
- Published incident has required details and location
- Drafts are private
- Private whereabouts cannot become public accidentally
- One primary watched area per user initially
- Valid report types and controlled status transitions

## 15. RLS Access Matrix

### Profiles

- User reads own full profile and updates ordinary fields.
- Client cannot change role/status.
- Public obtains only limited display identity through a safe public data surface.
- Admin access is protected server-side.

### Animals

- Authenticated owner creates/reads/updates/archives own animals.
- Other users do not read the private animal row.
- Public reads published report snapshots, not private source profiles.
- Private identification is owner/admin-only.

### Reports

- Anonymous reads explicitly public published reports.
- Creator reads own draft.
- Other users cannot read drafts.
- Reporter edits only permitted fields.
- Controlled status actions use protected functions.
- Admin may hide/restore with audit.

### Contributions

- Authenticated user submits own sighting, claim or structured contribution.
- Missing owner classifies match relationships but does not delete another user's legitimate sighting.
- Contributor edits only permitted own fields.

### Claims/Evidence

- Claimant and authorised found-case participant read claim.
- Evidence is never public.
- Admin access is narrowly authorised and auditable.

### Notifications

- Recipient reads/updates read state.
- Ordinary client cannot create arbitrary system notifications.

### Administration

- Protected role checks occur in the database.
- Hiding the Admin screen is not security.

## 16. Public Data Surface

Public access exposes only:

- Public report fields and snapshots
- Public report images
- Location at permitted precision
- Public timeline events
- Enabled contact actions
- Public partner identity later

It excludes phone numbers unless enabled, home/holding coordinates, microchip numbers, evidence, private events, moderation notes, device tokens and admin history.

## 17. Data Lifecycle

Use `archived_at`, `closed_at`, `hidden_at` and legally appropriate deletion/anonymisation.

### Published commitments

The privacy policy and account deletion page are now public. The schema and scheduled jobs must honour them:

| Data | Retention |
|---|---|
| Account, profile, contact, home area | Until account deletion |
| Animal profiles and private identification | Until the profile or account is deleted |
| Drafts | Until published, deleted or account deletion |
| Ownership evidence (rows and `claim-evidence` files) | Deleted 90 days after the claim closes, or on account deletion, whichever is first |
| Notifications | 12 months |
| Moderation, abuse and fraud records | Up to 24 months |
| Server/security logs | Up to 90 days |
| Backups | Rolling, up to 30 days |

### Account deletion

Deletion completes within 30 days of a confirmed request (in-app requests are confirmed by the signed-in session). A protected function performs it:

1. Close the member's active reports, stop their alerts and record a case event.
2. Delete `profiles` private fields, `profile_private`, avatar, push devices, notification preferences, watched areas, follows, drafts, animals, animal photos, private identification and ownership evidence (rows and storage objects).
3. Anonymise published reports and contributions: remove reporter name, display identity, contact details, report photos and exact locations, keeping a minimal record (report type, animal category, general area, dates, outcome) so linked cases stay accurate.
4. Keep moderation records under the retention above, keyed so they no longer expose profile data.
5. Delete the Auth user last.

Website requests by email (`info@digitack.co.za`) are actioned by an administrator through the same function.

## 18. Likely Indexes

- Report type/status/publication/activity
- Province/city/suburb
- Geographic point later
- Animal category/primary colour
- Owner/reporter IDs
- Public reference
- Report-link and match relations
- Claim status
- Notification recipient/read state
- Moderation status

Add indexes for demonstrated query patterns and inspect query plans during implementation.

## 19. Migration Phases

### A — Member Foundation

Profiles, private profiles, terms/privacy, role helpers, avatars.

### B — Animals

Animals, photos, private identification, health/behaviour flags and storage policies.

### C — Missing

Reports, missing details, snapshots, locations, report photos, case events and follows.

### D — Found and Sightings

Found/sighting details, claims, evidence, transfers, links and matches.

### E — Notifications and Administration

Preferences, devices, notifications, moderation, blocking and audit.

### F — Partners

Organisation and content tables.

## 20. Security Test Gate

Before each checkpoint APK verify:

- RLS enabled on every new table
- Anonymous sees only public data
- Member A cannot read/change Member B private data
- Drafts private
- Private addresses and identifiers hidden
- Evidence private
- Storage rejects unauthorised uploads/reads
- Member cannot promote self or suspend others
- Suspended account cannot write
- Deep links obey identical policies
- Service-role credential absent from build

