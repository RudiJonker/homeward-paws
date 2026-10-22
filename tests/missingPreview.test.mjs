import assert from 'node:assert/strict';
import test from 'node:test';

import { buildMissingPublicPreview, missingReviewIssues, missingReviewStatus, selectedMissingPhotos } from '../src/utils/missingPreview.js';

const animal = {
  id: 'animal-a', status: 'safe', updated_at: '2026-10-22T08:00:00Z',
  name: 'Nala', category: 'dog', breed: 'Mixed breed', pattern: 'White and brown',
  coat_description: 'Long coat', distinctive_features: 'Fluffy tail',
  microchip_number: 'private-identifier', animal_private_details: { ownership_notes: 'private ownership evidence' },
  photos: [{ id: 'photo-a', url: 'https://example.test/signed-photo', storage_path: 'private/storage/path', visibility: 'report_eligible' }]
};

const draft = { draft_payload: {
  appearance: { confirmed: true, animal_updated_at: animal.updated_at, photo_ids: ['photo-a'], accessories: 'Red collar', notes: 'Shorter fur on left ear' },
  last_seen: { complete: true, date: '2026-10-20', time: '08:30', timeAccuracy: 'approximate', circumstance: 'wandered', travelDirection: 'unknown', explanation: 'Near the park' },
  last_seen_location: { complete: true, method: 'device', province: 'Gauteng', city: 'Johannesburg', suburb: 'Melville', streetOrLandmark: '12 Main Road', publicPrecision: 'suburb', latitude: -26.1764, longitude: 28.0097 },
  safety_contact: { complete: true, urgencyFlags: ['medication'], urgencyNote: 'Needs daily medicine', approach: 'slowly', biteScratchKickRisk: false, approachNote: '', contact: { inApp: true, phone: false, whatsapp: false } }
} };

const profile = { first_name: 'Rudi', display_name: 'RudiJ', email: 'private@example.test' };
const privateProfile = { mobile_e164: '+27821234567', whatsapp_enabled: true, home_latitude: -26.1234 };

test('public preview allowlists report fields and omits private coordinates, identifiers and unapproved contact', () => {
  const preview = buildMissingPublicPreview({ animal, draft, profile, privateProfile });
  const serialized = JSON.stringify(preview);
  assert.equal(preview.location, 'Melville, Johannesburg, Gauteng');
  assert.equal(preview.publicName, 'RudiJ');
  assert.equal(preview.contact.inApp, true);
  for (const secret of ['-26.1764', '28.0097', '12 Main Road', 'private-identifier', 'private ownership evidence', 'private/storage/path', 'signed-photo', 'private@example.test', '+27821234567']) {
    assert.equal(serialized.includes(secret), false, `${secret} must not be in the preview`);
  }
});

test('phone and WhatsApp appear only for explicitly enabled channels', () => {
  const enabled = { draft_payload: { ...draft.draft_payload, safety_contact: { ...draft.draft_payload.safety_contact, contact: { inApp: false, phone: true, whatsapp: false } } } };
  const preview = buildMissingPublicPreview({ animal, draft: enabled, profile, privateProfile });
  assert.equal(preview.contact.phone, '+27821234567');
  assert.equal(preview.contact.whatsapp, '');
});

test('completed current draft has no review issues', () => {
  assert.deepEqual(missingReviewIssues({ animal, draft, privateProfile }), []);
});

test('stale appearance, exact-public legacy location and unavailable WhatsApp need review', () => {
  const changedAnimal = { ...animal, updated_at: '2026-10-22T09:00:00Z' };
  const changedDraft = { draft_payload: {
    ...draft.draft_payload,
    last_seen_location: { ...draft.draft_payload.last_seen_location, publicPrecision: 'exact' },
    safety_contact: { ...draft.draft_payload.safety_contact, contact: { inApp: false, phone: false, whatsapp: true } }
  } };
  assert.deepEqual(missingReviewIssues({ animal: changedAnimal, draft: changedDraft, privateProfile: { ...privateProfile, whatsapp_enabled: false } }), ['appearance', 'last_seen_location', 'safety_contact']);
});

test('photo selection uses only report-eligible photos and keeps profile order', () => {
  const withPrivatePhoto = { ...animal, photos: [
    animal.photos[0],
    { id: 'private-photo', url: 'https://example.test/private-photo', visibility: 'private' },
    { id: 'photo-b', url: 'https://example.test/photo-b', visibility: 'report_eligible' }
  ] };
  const chosen = selectedMissingPhotos(withPrivatePhoto, { selected_photo_ids: ['photo-b', 'private-photo', 'photo-a'] });
  assert.deepEqual(chosen.map((photo) => photo.id), ['photo-a', 'photo-b']);
  assert.deepEqual(selectedMissingPhotos(withPrivatePhoto, { selected_photo_ids: [] }), []);
  assert.deepEqual(selectedMissingPhotos(withPrivatePhoto, {}).map((photo) => photo.id), ['photo-a', 'photo-b']);
});

test('invalid or unavailable selected photos require appearance review', () => {
  const invalid = { draft_payload: {
    ...draft.draft_payload,
    appearance: { ...draft.draft_payload.appearance, selected_photo_ids: ['not-this-animal'] }
  } };
  assert.deepEqual(missingReviewIssues({ animal, draft: invalid, privateProfile }), ['appearance']);

  const unavailableAnimal = { ...animal, photos: [{ ...animal.photos[0], url: null }] };
  assert.deepEqual(missingReviewIssues({ animal: unavailableAnimal, draft, privateProfile }), ['appearance']);
});

test('server readiness and local checks both block incomplete private review', () => {
  assert.deepEqual(missingReviewStatus([], null, [true, true, true]), {
    issues: [], canConfirm: false, reviewReady: false
  });
  assert.deepEqual(missingReviewStatus(['appearance'], ['last_seen', 'appearance'], [true, true, true]), {
    issues: ['appearance', 'last_seen'], canConfirm: false, reviewReady: false
  });
  assert.deepEqual(missingReviewStatus([], [], [true, true, false]), {
    issues: [], canConfirm: true, reviewReady: false
  });
  assert.deepEqual(missingReviewStatus([], [], [true, true, true]), {
    issues: [], canConfirm: true, reviewReady: true
  });
});
