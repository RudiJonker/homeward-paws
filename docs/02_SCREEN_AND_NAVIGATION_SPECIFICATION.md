# Homeward Paws Screen and Navigation Specification

## 1. Navigator Structure

### Root Navigator

Resolves session, profile completion, account status, role, pending deep link and notification destination.

### Public Navigator

Welcome, signup, login, recovery, public browse, public report detail, help, terms and privacy.

### Member Navigator

Main tabs plus animal, report, matching, notification and profile flows.

### Main Tabs

1. Home
2. Browse
3. Report — prominent central action
4. Following
5. Profile

### Admin Navigator

Additional workspace reached from an authorised member profile; it never replaces the member app.

### Partner Navigator — Later

Additional organisation workspace for authorised organisation members.

## 2. Navigation Rules

- Visitors who select a restricted action authenticate and return to the intended report/action.
- Incomplete profiles route to profile completion before the member app.
- Suspended accounts route to an account-status screen.
- Report wizards preserve progress on Back and app interruption.
- Browse retains tab, filters, location, view type and scroll position.
- Notifications and links open the relevant detail or action screen directly.
- Deep links never bypass database access controls.

## 3. Stable Screen IDs

These IDs must be used in mockups, tickets, tests and blueprint references.

### Group 1 — Launch and Onboarding

| ID | Screen | Checkpoint |
|---|---|---|
| 1.1 | Launch and Session Check | 0 |
| 1.2 | Welcome | 0 |
| 1.3 | Sign Up | 1 |
| 1.4 | Email Verification | 1 |
| 1.5 | Login | 1 |
| 1.6 | Forgot Password | 1 |
| 1.7 | Reset Password | 1 |
| 1.8 | Complete Profile | 1 |
| 1.9 | Set Home Area | 1 |
| 1.10 | Notification Explanation | 5 |
| 1.11 | Terms Acceptance | 1 |
| 1.12 | Suspended Account | 5 |

### Group 2 — Main Application

| ID | Screen | Checkpoint |
|---|---|---|
| 2.1 | Home | 0 then iterative |
| 2.2 | Report Menu | 0 |
| 2.3 | Notification Centre | 5 |
| 2.4 | Action Required | 5 |
| 2.5 | Nearby Alerts | 4–5 |

### Group 3 — Animals

| ID | Screen | Checkpoint |
|---|---|---|
| 3.1 | My Animals | 2 |
| 3.2 | Register: Type | 2 |
| 3.3 | Register: Identity | 2 |
| 3.4 | Register: Appearance | 2 |
| 3.5 | Register: Identification and Health | 2 |
| 3.6 | Register: Behaviour | 2 |
| 3.7 | Register: Photographs | 2 |
| 3.8 | Review Animal Profile | 2 |
| 3.9 | Animal Profile Detail | 2 |
| 3.10 | Edit Animal | 2 |
| 3.11 | Archived Animals | 2 |
| 3.12 | Animal Report History | 3 |

Registration sections 3.2–3.8 appear together on one scrollable screen. The member reviews all entries before saving at the bottom; Android Back leaves the unsaved form.

### Group 4 — Missing

| ID | Screen | Checkpoint |
|---|---|---|
| 4.1 | Select Missing Animal | 3 |
| 4.2 | Confirm Current Appearance | 3 |
| 4.3 | Last-Seen Details | 3 |
| 4.4 | Last-Seen Location | 3 |
| 4.5 | Urgency, Behaviour and Contact | 3 |
| 4.6 | Preview Missing Report | 3 |
| 4.7 | Missing Report Published | 3 |
| 4.8 | Missing Report Detail | 3 |
| 4.9 | Add Owner Update | 3 |
| 4.10 | Review Sightings | 3–4 |
| 4.11 | Confirm Reunion | 3 |
| 4.12 | Close Missing Report | 3 |
| 4.13 | Missing Case Timeline | 3 |

### Group 5 — Found

| ID | Screen | Checkpoint |
|---|---|---|
| 5.1 | Found Safety Check | 4 |
| 5.2 | Found Photographs | 4 |
| 5.3 | Describe Found Animal | 4 |
| 5.4 | Found Location and Time | 4 |
| 5.5 | Current Whereabouts | 4 |
| 5.6 | Behaviour, Care and Contact | 4 |
| 5.7 | Possible Missing Matches | 4 |
| 5.8 | Preview Found Report | 4 |
| 5.9 | Found Report Published | 4 |
| 5.10 | Found Report Detail | 4 |
| 5.11 | Submit Ownership Claim | 4 |
| 5.12 | Ownership Evidence | 4 |
| 5.13 | Review Ownership Claims | 4 |
| 5.14 | I Know This Animal | 4 |
| 5.15 | Update Current Whereabouts | 4 |
| 5.16 | Record Transfer | 4 |
| 5.17 | Confirm Found-Animal Reunion | 4 |
| 5.18 | Found Case Timeline | 4 |

### Group 6 — Sightings

| ID | Screen | Checkpoint |
|---|---|---|
| 6.1 | Sighting Location and Time | 4 |
| 6.2 | Photograph and Description | 4 |
| 6.3 | Movement, Behaviour and Condition | 4 |
| 6.4 | Possible Sighting Matches | 4 |
| 6.5 | Review Sighting | 4 |
| 6.6 | Sighting Submitted | 4 |
| 6.7 | Sighting Detail | 4 |
| 6.8 | Owner Sighting Review | 4 |
| 6.9 | Add Follow-Up Sighting | 4 |
| 6.10 | Correct Sighting | 4 |
| 6.11 | Convert Sighting to Found | 4 |
| 6.12 | Sighting History and Map | 4 |

### Group 7 — Browse and Matching

| ID | Screen | Checkpoint |
|---|---|---|
| 7.1 | Browse Missing | 3 |
| 7.2 | Browse Found | 4 |
| 7.3 | Browse Sightings | 4 |
| 7.4 | Browse Reunited | 4 |
| 7.5 | Search and Filters | 3–4 |
| 7.6 | Select Search Location | 3 |
| 7.7 | Map View | 4 |
| 7.8 | Map Report Preview | 4 |
| 7.9 | Possible Matches | 4 |
| 7.10 | Match Comparison | 4 |
| 7.11 | Suggest a Match | 4 |
| 7.12 | Saved Searches | Later |
| 7.13 | Empty Results | 3 |

### Group 8 — Following and Notifications

| ID | Screen | Checkpoint |
|---|---|---|
| 8.1 | Following | 4 |
| 8.2 | Notification Preferences | 5 |
| 8.3 | Watched Area | 5 |
| 8.4 | Quiet Hours | 5 or later |
| 8.5 | Status Reminder | 4–5 |
| 8.6 | Reunion Pending | 4 |
| 8.7 | Reunion Story Consent | 4 |
| 8.8 | Reunion Story Detail | 4 |

### Group 9 — Profile and Support

| ID | Screen | Checkpoint |
|---|---|---|
| 9.1 | Profile | 1 |
| 9.2 | Edit Profile | 1 |
| 9.3 | My Reports | 3 |
| 9.4 | My Sightings | 4 |
| 9.5 | Draft Reports | 3 |
| 9.6 | Privacy and Contact | 1–4 |
| 9.7 | Blocked Users | 5 |
| 9.8 | Help and Safety | 1 then iterative |
| 9.9 | Contact Support (`info@digitack.co.za`) | 1 |
| 9.10 | Terms of Use | 1 |
| 9.11 | Privacy Policy | 1 |
| 9.12 | About | 1 |
| 9.13 | Delete Account | 1/5 completion |

### Group 10 — Administration

| ID | Screen | Checkpoint |
|---|---|---|
| 10.1 | Admin Home | 5 |
| 10.2 | Moderation Queue | 5 |
| 10.3 | Reported Content Detail | 5 |
| 10.4 | User Management | 5 |
| 10.5 | User Detail and History | 5 |
| 10.6 | Report Management | 5 |
| 10.7 | Report Detail and Audit | 5 |
| 10.8 | Partner Verification Queue | 6 |
| 10.9 | Platform Categories | 5 |
| 10.10 | Basic Statistics | 5 |
| 10.11 | System Announcements | Later |

### Group 11 — Verified Partners

| ID | Screen | Checkpoint |
|---|---|---|
| 11.1 | Partner Application | 6 |
| 11.2 | Organisation Profile | 6 |
| 11.3 | Edit Organisation | 6 |
| 11.4 | Animals in Care | 6 |
| 11.5 | Organisation Reports | 6 |
| 11.6 | Record Animal Intake | 6 |
| 11.7 | Accept Custody Transfer | 6 |
| 11.8 | Partner Content | 6 |
| 11.9 | Create Educational Post | 6 |
| 11.10 | Create Community Alert | 6 |
| 11.11 | External Donation Link | 6 |
| 11.12 | Organisation Staff | 6 |
| 11.13 | Partner Permissions | 6 |
| 11.14 | Verification Status | 6 |

## 4. Home Screen Content Order

1. Header with selected area and notifications
2. Urgent report actions
3. My Animals
4. My active/action-required cases
5. Missing near you
6. Recent sightings
7. Found near you
8. Reunions
9. Partner content later
10. Static AdMob only between non-urgent sections

## 5. Shared Routes and Components

Screen IDs describe user-visible states, not mandatory one-file-per-screen implementation. Use shared wizard, report detail, timeline, location, photo, filter, match and outcome components.

## 6. Global Modals

- Report Menu
- Filters
- Location selector
- Image picker
- Share sheet
- Contact options
- External-link warning
- Report Content (reasons include Child safety; see `03` §9)
- Block User
- Status confirmation
- Archive/delete confirmation
- Permission explanation

## 7. Recovery Destinations

- No Connection
- Upload Waiting
- Upload Failed
- Report Unavailable
- Permission Denied
- Session Expired
- Suspended Account
- General Error

Every recovery state offers a useful next action and does not silently discard report data.

