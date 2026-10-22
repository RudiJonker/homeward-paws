import assert from 'node:assert/strict';
import test from 'node:test';

import { blankMissingLocation, publicLocationPreview, restoreMissingLocationDraft, validateMissingLocation } from '../src/utils/missingLocation.js';

const complete = { ...blankMissingLocation, province: 'Gauteng', city: 'Johannesburg', suburb: 'Melville' };

test('manual suburb-level location is valid without device coordinates', () => {
  assert.equal(validateMissingLocation(complete).valid, true);
  assert.equal(publicLocationPreview(complete), 'Melville, Johannesburg, Gauteng');
});

test('area and public precision must be complete', () => {
  const result = validateMissingLocation({ ...blankMissingLocation, publicPrecision: '' });
  assert.equal(result.valid, false);
  assert.ok(result.errors.province);
  assert.ok(result.errors.city);
  assert.ok(result.errors.suburb);
  assert.ok(result.errors.publicPrecision);
});

test('street-level sharing requires a street or public landmark without numbers', () => {
  assert.ok(validateMissingLocation({ ...complete, publicPrecision: 'approximate' }).errors.streetOrLandmark);
  assert.ok(validateMissingLocation({ ...complete, publicPrecision: 'approximate', streetOrLandmark: '12 Main Road' }).errors.streetOrLandmark);
  const withStreet = { ...complete, publicPrecision: 'approximate', streetOrLandmark: 'Main Road' };
  assert.equal(validateMissingLocation(withStreet).valid, true);
  assert.equal(publicLocationPreview(withStreet), 'Near Main Road, Melville, Johannesburg, Gauteng');
});

test('home area cannot become a street-level public location', () => {
  assert.ok(validateMissingLocation({ ...complete, method: 'home_area', publicPrecision: 'approximate', streetOrLandmark: 'Main Road' }).errors.publicPrecision);
});

test('device location requires private coordinates, which never appear in the public preview', () => {
  assert.ok(validateMissingLocation({ ...complete, method: 'device' }).errors.method);
  const device = { ...complete, method: 'device', publicPrecision: 'approximate', streetOrLandmark: 'Main Road', latitude: -26.1764, longitude: 28.0097 };
  assert.equal(validateMissingLocation(device).valid, true);
  assert.equal(publicLocationPreview(device), 'Near Main Road, Melville, Johannesburg, Gauteng');
  assert.doesNotMatch(publicLocationPreview(device), /-26|28\.0097/);
});

test('legacy exact-public drafts are downgraded to suburb only', () => {
  const legacy = { ...complete, publicPrecision: 'exact', safeToShareExact: true, streetOrLandmark: '12 Main Road', latitude: -26.1764, longitude: 28.0097 };
  assert.ok(validateMissingLocation(legacy).errors.publicPrecision);
  assert.equal(publicLocationPreview(legacy), 'Melville, Johannesburg, Gauteng');
  const restored = restoreMissingLocationDraft(legacy);
  assert.equal(restored.publicPrecision, 'suburb');
  assert.equal(restored.safeToShareExact, undefined);
  assert.equal(restored.latitude, legacy.latitude);
  assert.equal(validateMissingLocation(restored).valid, true);
});

test('a number in a street field is not shown even before validation', () => {
  const entered = { ...complete, publicPrecision: 'approximate', streetOrLandmark: '12 Main Road' };
  assert.equal(publicLocationPreview(entered), 'Melville, Johannesburg, Gauteng');
});
