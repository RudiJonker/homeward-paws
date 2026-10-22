import assert from 'node:assert/strict';
import test from 'node:test';

import { combineTravelObservation, formatPickerDate, formatPickerTime, pickerInitialValue, validateMissingLastSeen } from '../src/utils/missingLastSeen.js';

const now = new Date(2026, 9, 22, 12, 0);
const complete = { date: '2026-10-21', time: '15:30', timeAccuracy: 'approximate', circumstance: 'wandered', absenceNoticedDate: '', absenceNoticedTime: '' };

test('native picker values retain local date and 24-hour time', () => {
  const selected = new Date(2026, 9, 21, 15, 30);
  assert.equal(formatPickerDate(selected), '2026-10-21');
  assert.equal(formatPickerTime(selected), '15:30');
  assert.equal(formatPickerTime(pickerInitialValue('2026-10-21', '15:30', now)), '15:30');
  assert.equal(formatPickerDate(pickerInitialValue('2026-10-21', '15:30', now)), '2026-10-21');
});

test('invalid older draft values fall back to current picker date', () => {
  assert.equal(pickerInitialValue('2026-02-31', '25:00', now).getTime(), now.getTime());
  assert.equal(formatPickerTime(pickerInitialValue('', '15:30', now)), '15:30');
});

test('complete valid last-seen details produce an ISO instant', () => {
  const result = validateMissingLastSeen(complete, now);
  assert.equal(result.valid, true);
  assert.equal(typeof result.lastSeenAt, 'string');
});

test('missing required details are rejected', () => {
  const result = validateMissingLastSeen({ ...complete, date: '', timeAccuracy: '', circumstance: '' }, now);
  assert.equal(result.valid, false);
  assert.ok(result.errors.date);
  assert.ok(result.errors.timeAccuracy);
  assert.ok(result.errors.circumstance);
});

test('invalid calendar dates and future times are rejected', () => {
  assert.ok(validateMissingLastSeen({ ...complete, date: '2026-02-31' }, now).errors.date);
  assert.ok(validateMissingLastSeen({ ...complete, date: '2026-10-22', time: '12:01' }, now).errors.time);
  assert.ok(validateMissingLastSeen({ ...complete, time: '25:00' }, now).errors.time);
});

test('optional noticed-missing time cannot precede last seen', () => {
  const result = validateMissingLastSeen({ ...complete, absenceNoticedDate: '2026-10-21', absenceNoticedTime: '14:00' }, now);
  assert.equal(result.valid, false);
  assert.ok(result.errors.absenceNoticedDate);
});

test('optional noticed-missing date and time must be entered together', () => {
  const result = validateMissingLastSeen({ ...complete, absenceNoticedDate: '2026-10-22' }, now);
  assert.equal(result.valid, false);
  assert.ok(result.errors.absenceNoticedTime);
});

test('a past noticed-missing time after last seen is valid', () => {
  const result = validateMissingLastSeen({ ...complete, absenceNoticedDate: '2026-10-22', absenceNoticedTime: '08:00' }, now);
  assert.equal(result.valid, true);
  assert.equal(typeof result.absenceNoticedAt, 'string');
});

test('older separate people and vehicle notes remain visible in the combined travel answer', () => {
  assert.equal(combineTravelObservation('Towards the station', 'with a person in a blue jacket'), 'Towards the station\nObserved: with a person in a blue jacket');
  assert.equal(combineTravelObservation('', 'blue vehicle'), 'Observed: blue vehicle');
  assert.equal(combineTravelObservation('Towards the station', ''), 'Towards the station');
});

test('known travel needs an observation, while unknown travel does not', () => {
  assert.ok(validateMissingLastSeen({ ...complete, travelDirection: 'known', direction: ' ' }, now).errors.direction);
  assert.equal(validateMissingLastSeen({ ...complete, travelDirection: 'unknown', direction: '' }, now).valid, true);
});
