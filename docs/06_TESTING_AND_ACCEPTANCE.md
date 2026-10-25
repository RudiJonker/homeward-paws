# Homeward Paws Testing and Acceptance Plan

## 1. Testing Principles

- Test complete user outcomes, not only individual buttons.
- Test success, empty, invalid, denied-permission, offline and retry states.
- Use at least two ordinary users plus an administrator.
- Test on physical Android devices at meaningful checkpoints.
- Re-run prior checkpoint workflows before advancing.
- RLS and storage policies are release-blocking requirements.

## 2. Test Accounts and Data

Maintain:

- Member A: animal owner
- Member B: finder/community helper
- Administrator
- Later: verified organisation manager and ordinary organisation staff
- At least one dog, cat, bird and horse/donkey profile
- Active, draft, reunited, closed and archived reports
- Exact private device locations and street-or-broader public missing locations
- One invalid/suspended account

Use test-only animals and contact information.

## 3. Checkpoint 0 — Skeleton

- App cold/warm launch
- All placeholder routes
- Five bottom tabs
- Report menu
- Android Back behaviour
- No circular/broken navigation
- General error boundary
- Development APK install and relaunch

## 4. Checkpoint 1 — Member Foundation

- Signup and duplicate email
- Weak/invalid password messages
- Email verification
- Correct/incorrect login
- Session persistence
- Incomplete profile routing
- E.164 mobile validation
- Manual location when permission denied
- Avatar success/failure
- Terms/privacy required
- Logout/login
- User can edit ordinary fields but not role/status
- Account deletion request
- Suspended-account routing

## 5. Checkpoint 2 — Animals

- Register each supported category
- Conditional fields
- Unknown values
- Numeric estimated age (including 0 for under one year) and numeric estimated weight with the visible `Kg` suffix
- Scrolling between sections preserves all entered values; leaving the form without saving discards them
- Multiple colours/markings
- Structured health needs: description required, private by default, edit and clear without exposing private notes
- Three-image limit, reorder, replacement and compression
- Upload failure recovery
- Private identifier not public
- Edit, archive and restore
- Delete a safe or archived animal profile and its photos after explicit confirmation; reject deletion of an animal with an active case; preserve other animals and photos
- Member A cannot read/change Member B animal
- Archived animal cannot accidentally create an invalid incident

## 6. Checkpoint 3 — Missing Vertical Slice

### Owner

- Select animal
- Prevent duplicate active missing report
- Appearance snapshot
- Incident accessories
- Date/time validation
- Missing location at suburb or street/public-landmark-name level; private coordinates and house numbers never appear in public views or map pins
- Urgency and approach warnings
- Contact visibility
- Draft save/recovery
- Preview accuracy
- Duplicate-tap prevention
- Publish changes animal to missing
- Owner update and timeline

### Community Member

- Browse and filter missing reports
- Open detail
- Follow/share
- Submit linked sighting
- Contributor removes an attached sighting photo after submission or case closure; the sighting and owner review remain, while owner and other member cannot delete the photo
- Cannot edit owner's report

### Resolution

- Owner reviews sighting
- Reunion returns animal to safe
- Alerts stop
- History remains
- Close without reunion
- Second disappearance creates a new incident

## 7. Checkpoint 4 — Found

- Roaming animal routes to Sighting
- Secured animal continues Found
- Report with uncertain breed/sex/age
- Optional photos
- Original location differs from current whereabouts
- Private holding address hidden
- Possible matches
- Ownership claim and private evidence
- Unauthorised user cannot read evidence
- Claim statuses
- Transfer preserves custody chain
- Reunion links reports and requires appropriate confirmation

## 8. Checkpoint 4 — Sightings

- Submit in approximately one minute
- Location captured at flow start and corrected
- Observation time differs from submission time
- No-photo submission
- Movement/direction/condition
- Live label expires
- Standalone sighting later matches missing report
- Owner classifications
- Rejected sighting available to other cases
- Follow-up creates new observation
- Convert to found preserves both records
- Failed network preserves pending report and avoids duplicates

## 9. Browse and Matching

- Visitor browse without login
- Restricted action resumes after login
- Province/city/suburb filtering
- Radius filtering
- Device permission denied
- Multi-colour and type filters
- Sort nearest/recent
- Older active cases discoverable
- List state preserved
- Map hides private addresses and handles clusters where implemented
- New reports compare with earlier data
- Descriptive match levels and reasons
- Human confirmation required
- Community-suggested match moderation

## 10. Notifications

- Permission explanation before system prompt
- Token registration/update/logout invalidation
- Direct case, nearby, match, claim and reunion alerts
- Notification opens correct route
- Logged-out user returns after authentication
- Push failure still leaves in-app notification
- Deduplication/grouping
- Preferences and quiet hours where included
- User cannot read another user's notifications

## 11. Moderation

- Report content
- Block interaction
- Admin queue and filters
- Hide/restore report
- Suspend/reactivate user
- Suspended user cannot write through cached screen
- Admin actions audited
- Ordinary member cannot access admin actions through API or deep link
- Sensitive evidence access remains narrow

## 12. Storage and Privacy

- Avatar ownership
- Animal-photo ownership
- Public report image access
- Private claim evidence signed access
- Guessed paths rejected
- Private profile location hidden
- Exact current whereabouts hidden
- Full identifiers hidden
- Public contact appears only when enabled
- Drafts private
- Deleted/pending account handling

## 13. AdMob

- Test IDs during development
- Production IDs only for release
- No banner in urgent form steps
- No banner above urgent actions
- Stable placement
- Layout remains usable if ad fails or changes height
- No accidental overlap with sticky actions

## 14. Performance and Reliability

- Compressed thumbnails
- Lazy image loading
- Paginated report lists
- Pull-to-refresh
- Slow/failed connection
- Large image rejection/compression
- App interruption during form
- Session expiration
- Repeated button taps
- Database query/index review
- No substantial regression on lower-powered Android test device where available

## 15. Accessibility

- Increased Android font size
- Screen-reader labels
- Logical focus
- Status understandable without colour
- Touch target checks
- Map has textual equivalent
- Permission denial has manual alternative
- Error text is specific and readable

## 16. Google Play Compliance

- Built manifest contains no `READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO`, `READ_EXTERNAL_STORAGE` or background location permission
- Photo selection works through the Android photo picker with no permission prompt
- Each permission is explained in the app before the system prompt, and each denial has a working alternative
- Privacy policy and terms open from signup, Profile and Help
- Profile › Delete account deletes the account and the data listed on the deletion page; Auth sign-in fails afterwards
- Every report, photo and profile has Report with a Child safety reason; child safety reports appear first in the moderation queue
- Block user hides that user's contributions and prevents direct contact
- Ads never appear on report wizard screens or above urgent actions; test ad IDs in development builds
- Data safety form answers match `08_LEGAL_AND_PLAY_COMPLIANCE.md`

## 17. Version 1 Release Gate

Release requires:

- Missing, found and sighting end-to-end paths pass
- Reunion/closure/transfer history correct
- RLS and storage matrix pass
- Moderation works without manual Supabase editing
- Notification routing passes
- No private information leakage
- Account deletion and legal links function
- Static ads respect placement rules
- Android release build installs and relaunches
- App icon, splash, store screenshots and descriptions complete
- User manual and support contact complete
- Known limitations documented

## 18. Partner Release Gate

- Organisation verification controlled by admin
- Staff permissions enforced server-side
- Removed staff loses access
- Organisation animals and reports auditable
- Custody acceptance works
- External links show leaving-app warning
- No donation/payment data is collected
- Partner content can be reported and moderated

