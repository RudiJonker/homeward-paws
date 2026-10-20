# Homeward Paws Product and User Flows

## 1. Shared Workflow Rules

- Visitors may browse; publishing and contributing require a completed member profile.
- Member-only actions selected by a visitor must resume after authentication.
- Multistep forms preserve progress and validate each step.
- Published reports retain a snapshot of the animal and incident at publication.
- Important corrections and status changes enter the case timeline.
- Public/private visibility is explained before publication.
- No workflow exposes a private home or holding address automatically.
- Report publication must be idempotent: repeated taps cannot create duplicates.
- Failed uploads preserve textual data and offer retry.

## 2. Onboarding

### Flow

Welcome → Create Account → Enter Email Verification Code → Complete Profile → Set Home Area → Notification Explanation → Home.

Email verification uses a one-time code entered inside the app. Signup must not depend on a browser successfully handing a custom deep link back to Android.

Development exception: hosted email verification and password recovery remain inactive until a production SMTP provider is configured. They must be restored before launch; this does not change the production flow above.

### Required Profile Data

- First name
- Last name
- Mobile number stored as E.164
- Province
- City or town
- Suburb
- Terms and privacy acceptance

### Optional

- Public display name
- Avatar
- Device-derived location
- WhatsApp availability
- Notification permission

No role is selected. New accounts are members.

## 3. Register an Animal

### Entry Points

- Home → My Animals
- Profile → My Animals
- Missing flow when no animal exists

### Steps

#### 3.1 Type

Choose Dog, Cat, Bird, Horse, Donkey, Rabbit, Reptile, Small Mammal, Farm Animal, Other or Unsure. Conditional fields appear by category.

#### 3.2 Identity

- Name
- Species and breed
- Mixed breed
- Sex
- Date of birth when known, otherwise approximate age and estimation date
- Size
- Approximate weight where useful
- Relationship: My animal, Family animal, Foster, Other; organisation relationships later

#### 3.3 Appearance

- Primary and secondary colours
- Pattern and markings
- Coat/feather/skin description
- Eye colour
- Ears and tail where relevant
- Distinctive features, scars or old injuries

#### 3.4 Identification and Health

- Microchipped status; number private
- Tag, band, tattoo or brand; full identifiers private
- Sterilised status
- Public incident health flags
- Private health notes
- Veterinary practice, optional and private

#### 3.5 Behaviour

- Friendly, nervous, likely to run, may bite/scratch/kick
- Safe approach guidance
- Responds to name or commands
- Animal-specific handling fields

#### 3.6 Photographs

Up to three primary photos: face/head, full body and distinctive feature. Images are compressed before upload and may be reordered.

#### 3.7 Review

Display public-profile information and identify private fields. Save as a permanent animal profile with status `safe`.

## 4. My Animal Is Missing

### Preconditions

- Authenticated member
- Completed profile
- Registered animal
- No other active missing report for that animal

### Entry Points

- Home urgent action
- Central Report menu
- Animal Profile
- My Animals

### Step 1 — Select Animal

Show eligible animal cards. If the chosen animal already has an active report, open it instead of creating a duplicate.

### Step 2 — Confirm Current Appearance

Confirm profile photos and description. Capture incident-only accessories such as collar, harness, blanket or clothing. Permanent corrections may update the animal; the report stores its own snapshot.

### Step 3 — Last-Seen Details

Required:

- Date and approximate/exact time
- Time accuracy
- Circumstance: escaped from home/walk/vehicle, noise/weather, wandered, suspected stolen, another property, transport incident, other or unknown

Optional:

- Direction
- When absence was noticed
- Other people/vehicles observed
- Additional explanation

Future dates/times are invalid. Suspected theft shows advice to contact SAPS separately.

### Step 4 — Last-Seen Location

Methods: current location, map, manual address or home area. Store street/landmark, suburb, city, province, coordinates and accuracy. The reporter chooses exact or approximate public precision.

### Step 5 — Urgency, Behaviour and Contact

Urgency may include medication, injury, age, pregnancy/nursing, sensory or mobility impairment, and weather vulnerability. Approach guidance includes safe to approach, approach slowly, do not chase, do not catch, or bite/scratch/kick risk.

Contact options: structured in-app response, WhatsApp and phone. At least one channel is required. Phone/WhatsApp appear publicly only when enabled.

### Step 6 — Preview

Show the actual public report, visibility notice and confirmations of accuracy, public location/contact and responsibility to update the case.

### Publish Transaction

- Publish report
- Save animal snapshot and report photos
- Change animal status to `missing`
- Set report status `active`
- Generate public reference
- Create timeline event
- Queue relevant notifications later
- Open success screen with Share and View Report

### Public Missing Detail

Status, reference, gallery, animal summary, warnings, last-seen time/location/map, description, timeline, Follow, Share, Contact and `I Saw This Animal`.

### Sighting on a Missing Case

Capture observation time/location, direction, behaviour, condition, optional photo and contact permission. Notify the owner; the owner marks it likely, possible, unlikely, not the animal or needs more information.

### Owner Updates

Structured updates include new confirmed area, medical warning, description correction and search note. Historical facts are not silently overwritten.

### Reunion

Capture reunion date/time, place, assistance, veterinary need, public-story consent and optional photo. Stop alerts, mark report `reunited`, return animal to `safe`, notify followers and preserve history.

### Close Without Reunion

Allow mistake, duplicate, incorrect information, withdrawal or sensitive other reason. Public wording states only that the report is no longer active unless the owner shares more.

## 5. I Found an Animal

### Definition

The animal is secured or in known care. If still roaming, route to Sighting.

### Step 1 — Safety Check

Ask whether the animal is contained, with someone else, at a vet/shelter/rescue, at risk of escape, still roaming or unknown. Record observed condition. Dangerous or seriously injured cases show contact-professional guidance without pretending to provide emergency or medical services.

### Step 2 — Photographs

Up to three photos. Strongly encouraged, not compulsory. Safety takes priority; distressing imagery may be marked sensitive.

### Step 3 — Description

Require animal type, primary colour and size. Optional: species/breed, sex, age, additional colours, markings, coat, eye colour, accessories, visible ID and condition. `Unsure` is valid. Record microchip scan status without exposing the number.

### Step 4 — Found Location and Time

Capture where and when first found, not where the reporter is currently located. Include circumstances, landmark, danger and direction.

### Step 5 — Current Whereabouts

Options include private care, another individual, vet, shelter, rescue, SPCA, community/security organisation, released area, other or unknown. Store exact private details separately; show only a general public area. Record how long temporary care is available.

### Step 6 — Behaviour, Care and Contact

Record observed behaviour and care needs without medical diagnosis. Allow structured claims, protected responses, WhatsApp or phone. Public identity may be first name, display name, verified organisation later, or anonymous finder.

### Step 7 — Possible Matches

Compare active missing reports using type, date, distance, colour, size, sex, breed and markings. Finder may mark candidate, unsure or not a match; nothing is auto-confirmed.

### Step 8 — Preview and Publish

Display public report and a private-data summary. Confirm accuracy, visibility, safe ownership verification and responsibility to update. Publish, generate reference, create timeline, compare matches and notify relevant users.

### Ownership Claim

Authenticated claimant states relationship, selects registered animal when available, explains match and submits private evidence such as photos, microchip information, hidden marking, records or collar detail. Claim statuses: submitted, more information required, possible, meeting arranged, confirmed, rejected, suspicious or withdrawn.

Homeward Paws supports contact and evidence exchange but does not legally decide ownership.

### Transfer

Record destination type/name, date/time, public area, private contact, reference and reason. A transfer changes current whereabouts but does not automatically close the report. Verified partners may later accept custody digitally.

### Reunion

Finder records handover and verification method; owner confirms when possible. Link the missing/found cases, return registered animal to `safe`, stop alerts, notify participants and preserve both timelines.

## 6. I Saw an Animal

### Goal

Collect useful data in approximately one minute. Location and time take priority over perfect identification.

### Step 1 — Location and Time

Capture device location when flow opens, allow correction and record observation time separately from submission time. Options include just now, last 15 minutes, last hour, earlier today or manual.

### Step 2 — Photograph and Description

Photo optional; never encourage unsafe pursuit, driving photography or trespassing. Require animal type, primary colour and size. Optional breed/species, markings, sex, accessories and quantity.

### Step 3 — Movement, Behaviour and Condition

Record moving/stationary/hiding/trapped/lying/entered property or vehicle/picked up/no longer visible; direction; behaviour; condition; environmental danger; and whether still visible.

### Step 4 — Possible Match

Confirm an originating missing report or review candidates. Match relationships remain suggested until reviewed.

### Step 5 — Submit

Review map, time, direction, description, warnings and contact preference. Preserve local data on connection failure.

### Live Status

- Live for approximately 30 minutes
- Recent up to 24 hours
- Historical thereafter

Historical sightings remain searchable for later matching.

### Follow-Up and Conversion

Every new observation creates a separate linked record. If the animal is later secured, copy useful data into a linked found workflow; do not delete the sighting.

## 7. Browse and Discovery

Tabs: Missing, Found, Sightings and Reunited. Default to List View; Map View arrives in Community Beta. Location methods include current, home, Province/City/Suburb and map. Default radius is 10 km and is remembered.

Primary filters: animal type, area/distance, date, colour and size. Additional filters: breed/species, sex, pattern, accessories, chip status, urgency, status and verified-partner involvement later.

Default sort: nearest for coordinate searches and most recent for administrative-area searches. Older active missing reports remain discoverable.

## 8. Matching

Matching runs both directions: new missing versus earlier found/sightings, and new found/sighting versus active missing. Candidate generation requires compatible type and plausible date/location but allows broader searching.

The comparison screen presents side-by-side photos/details, matching factors, conflicting factors, locations, dates and human-review actions. Avoid precise percentages.

## 9. Following and Notifications

Members may follow reports. Important updates include sightings, search-area changes, transfers, matches, reunions and closure. Push alerts always have an in-app notification record.

Initial preferences: primary area, radius, animal types, report types, direct case alerts and basic quiet hours where feasible. Group similar community alerts and suppress duplicates.

## 10. Community and Partner Content

Version 1 community actions are structured. No public comment feed. Reunion stories require consent.

Future verified partners may post care guidance, safety alerts, campaigns, animals in care, rescue updates, events and external donation information. Every post shows organisation, verification, category, service area and report-content control.

## 11. Status Reminders

- Missing: day 3, day 7, then every 14 days
- Found: after 24 hours, day 3, day 7, then weekly
- Reunion pending: reminder after 12–24 hours and again after 3 days

Reports are never marked reunited merely because a participant did not respond.

