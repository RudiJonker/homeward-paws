import assert from 'node:assert/strict';
import test from 'node:test';

import { blankMissingSafetyContact, restoreMissingSafetyContact, validateMissingSafetyContact } from '../src/utils/missingSafetyContact.js';

test('in-app response and explicit approach make a valid default private draft', () => {
  const values = { ...blankMissingSafetyContact, approach: 'unknown' };
  assert.equal(validateMissingSafetyContact(values).valid, true);
  assert.equal(values.contact.phone, false);
  assert.equal(values.contact.whatsapp, false);
});

test('approach and at least one contact channel are required', () => {
  assert.ok(validateMissingSafetyContact(blankMissingSafetyContact).errors.approach);
  const none = { ...blankMissingSafetyContact, approach: 'slowly', contact: { inApp: false, phone: false, whatsapp: false } };
  assert.ok(validateMissingSafetyContact(none).errors.contact);
});

test('phone and WhatsApp require corresponding profile capabilities', () => {
  const values = { ...blankMissingSafetyContact, approach: 'safe', contact: { inApp: false, phone: true, whatsapp: true } };
  const unavailable = validateMissingSafetyContact(values);
  assert.ok(unavailable.errors.phone);
  assert.ok(unavailable.errors.whatsapp);
  assert.equal(validateMissingSafetyContact(values, { hasMobile: true, hasWhatsapp: true }).valid, true);
});

test('unknown flags and excessive public notes are rejected', () => {
  const values = { ...blankMissingSafetyContact, approach: 'safe', urgencyFlags: ['unknown'], urgencyNote: 'a'.repeat(501) };
  const result = validateMissingSafetyContact(values);
  assert.ok(result.errors.urgencyFlags);
  assert.ok(result.errors.urgencyNote);
});

test('saved drafts restore contact choices without inserting a phone number', () => {
  const saved = restoreMissingSafetyContact({ contact: { inApp: false, phone: true }, urgencyFlags: ['medication'] });
  assert.deepEqual(saved.contact, { inApp: false, phone: true, whatsapp: false });
  assert.equal(saved.approach, '');
  assert.equal(saved.phoneNumber, undefined);
});
