import { MISSING_CIRCUMSTANCES, validateMissingLastSeen } from './missingLastSeen.js';
import { publicLocationPreview, restoreMissingLocationDraft, validateMissingLocation } from './missingLocation.js';
import { APPROACH_OPTIONS, URGENCY_OPTIONS, restoreMissingSafetyContact, validateMissingSafetyContact } from './missingSafetyContact.js';

const text = (value) => typeof value === 'string' ? value.trim() : '';
const labelFor = (options, value) => options.find(([key]) => key === value)?.[1] ?? '';

export function selectedMissingPhotos(animal, appearance) {
  const eligible = (animal?.photos ?? []).filter((photo) => photo.visibility === 'report_eligible');
  const selectedIds = Array.isArray(appearance?.selected_photo_ids)
    ? appearance.selected_photo_ids
    : eligible.map((photo) => photo.id);
  const selected = new Set(selectedIds);
  return eligible.filter((photo) => selected.has(photo.id));
}

export function missingReviewIssues({ animal, draft }) {
  const payload = draft?.draft_payload ?? {};
  const location = restoreMissingLocationDraft(payload.last_seen_location);
  const safety = restoreMissingSafetyContact(payload.safety_contact);
  const photoIds = (animal?.photos ?? []).filter((photo) => photo.visibility === 'report_eligible').map((photo) => photo.id);
  const selectedPhotos = selectedMissingPhotos(animal, payload.appearance);
  const selectedIds = payload.appearance?.selected_photo_ids;
  const appearanceCurrent = payload.appearance?.animal_updated_at === animal?.updated_at
    && JSON.stringify(payload.appearance?.photo_ids ?? []) === JSON.stringify(photoIds);
  const issues = [];

  if (!animal || !['safe', 'missing'].includes(animal.status) || payload.appearance?.confirmed !== true || !appearanceCurrent
    || (Array.isArray(selectedIds) && selectedIds.some((id) => !selectedPhotos.some((photo) => photo.id === id)))
    || selectedPhotos.some((photo) => !photo.url)) issues.push('appearance');
  if (payload.last_seen?.complete !== true || !validateMissingLastSeen(payload.last_seen ?? {}).valid) issues.push('last_seen');
  if (payload.last_seen_location?.complete !== true || payload.last_seen_location?.publicPrecision === 'exact'
    || !validateMissingLocation(location).valid) issues.push('last_seen_location');
  if (payload.safety_contact?.complete !== true || !validateMissingSafetyContact(safety).valid) issues.push('safety_contact');

  return issues;
}

export function missingReviewStatus(localIssues, serverIssues, confirmations) {
  const verified = Array.isArray(serverIssues);
  const issues = [...new Set([...localIssues, ...(verified ? serverIssues : [])])];
  const canConfirm = verified && issues.length === 0;
  return { issues, canConfirm, reviewReady: canConfirm && confirmations.every(Boolean) };
}

// This is a display-only, allowlisted projection. The future publication
// function must independently enforce the same (or stricter) public surface.
export function buildMissingPublicPreview({ animal, draft, profile }) {
  const payload = draft.draft_payload ?? {};
  const appearance = payload.appearance ?? {};
  const lastSeen = payload.last_seen ?? {};
  const safety = restoreMissingSafetyContact(payload.safety_contact);

  return {
    title: `${text(animal.name)} is missing`,
    publicName: text(profile?.display_name) || text(profile?.first_name) || 'Animal owner',
    animal: {
      name: text(animal.name),
      category: animal.category,
      breed: text(animal.breed),
      pattern: text(animal.pattern),
      coat: text(animal.coat_description),
      features: text(animal.distinctive_features),
      accessories: text(appearance.accessories),
      currentAppearance: text(appearance.notes)
    },
    lastSeen: {
      date: text(lastSeen.date),
      time: text(lastSeen.time),
      timeAccuracy: lastSeen.timeAccuracy === 'approximate' ? 'Approximate' : 'Exact',
      circumstance: labelFor(MISSING_CIRCUMSTANCES, lastSeen.circumstance),
      travelledTowards: lastSeen.travelDirection === 'known' ? text(lastSeen.direction) : '',
      explanation: text(lastSeen.explanation)
    },
    location: publicLocationPreview(restoreMissingLocationDraft(payload.last_seen_location)),
    safety: {
      urgentNeeds: safety.urgencyFlags.map((flag) => labelFor(URGENCY_OPTIONS, flag)).filter(Boolean),
      urgentNote: text(safety.urgencyNote),
      approach: labelFor(APPROACH_OPTIONS, safety.approach),
      biteScratchKickRisk: safety.biteScratchKickRisk === true,
      approachNote: text(safety.approachNote)
    },
    contact: { inApp: true }
  };
}
