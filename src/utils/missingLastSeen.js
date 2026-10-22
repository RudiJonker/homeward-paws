export const MISSING_CIRCUMSTANCES = [
  ['escaped_home', 'Escaped from home'],
  ['escaped_walk', 'Escaped during a walk'],
  ['escaped_vehicle', 'Escaped from a vehicle'],
  ['noise_weather', 'Frightened by noise or weather'],
  ['wandered', 'Wandered off'],
  ['suspected_stolen', 'Suspected stolen'],
  ['another_property', 'Last seen at another property'],
  ['transport_incident', 'Transport incident'],
  ['other', 'Other'],
  ['unknown', 'I am not sure']
];

export function combineTravelObservation(direction, peopleVehicles) {
  const where = typeof direction === 'string' ? direction.trim() : '';
  const observedWith = typeof peopleVehicles === 'string' ? peopleVehicles.trim() : '';
  if (!observedWith) return where;
  return [where, `Observed: ${observedWith}`].filter(Boolean).join('\n');
}

export function formatPickerDate(value) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatPickerTime(value) {
  return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
}

export function pickerInitialValue(dateText, timeText, now = new Date()) {
  const hasDate = /^\d{4}-\d{2}-\d{2}$/.test(dateText);
  const [year, month, day] = hasDate
    ? dateText.split('-').map(Number)
    : [now.getFullYear(), now.getMonth() + 1, now.getDate()];
  const hasTime = /^\d{2}:\d{2}$/.test(timeText);
  const [hour, minute] = hasTime ? timeText.split(':').map(Number) : [now.getHours(), now.getMinutes()];
  const selected = new Date(year, month - 1, day, hour, minute);
  if (selected.getFullYear() !== year || selected.getMonth() !== month - 1 || selected.getDate() !== day
    || selected.getHours() !== hour || selected.getMinutes() !== minute) return new Date(now);
  return selected;
}

function parseDateTime(dateText, timeText, now) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText)) return { field: 'date', error: 'Enter a full date as YYYY-MM-DD.' };
  if (!/^\d{2}:\d{2}$/.test(timeText)) return { field: 'time', error: 'Enter a time as HH:MM using the 24-hour clock.' };
  const [year, month, day] = dateText.split('-').map(Number);
  const [hour, minute] = timeText.split(':').map(Number);
  if (hour > 23 || minute > 59) return { field: 'time', error: 'Enter a real time using the 24-hour clock.' };
  const value = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (value.getFullYear() !== year || value.getMonth() !== month - 1 || value.getDate() !== day) return { field: 'date', error: 'Enter a real calendar date.' };
  if (value.getHours() !== hour || value.getMinutes() !== minute) return { field: 'time', error: 'Enter a real time using the 24-hour clock.' };
  if (value.getTime() > now.getTime()) return { field: 'time', error: 'The date and time cannot be in the future.' };
  return { iso: value.toISOString() };
}

export function validateMissingLastSeen(values, now = new Date()) {
  const errors = {};
  let lastSeenAt = null;
  let absenceNoticedAt = null;

  if (!values.date) errors.date = 'Enter the date the animal was last seen.';
  if (!values.time) errors.time = 'Enter the time the animal was last seen.';
  if (values.date && values.time) {
    const parsed = parseDateTime(values.date, values.time, now);
    if (parsed.error) errors[parsed.field] = parsed.error;
    else lastSeenAt = parsed.iso;
  }
  if (!['exact', 'approximate'].includes(values.timeAccuracy)) errors.timeAccuracy = 'Choose whether the time is exact or approximate.';
  if (!MISSING_CIRCUMSTANCES.some(([code]) => code === values.circumstance)) errors.circumstance = 'Choose what happened, or select “I am not sure”.';
  if (values.travelDirection === 'known' && !values.direction?.trim()) errors.direction = 'Describe where the animal went, or choose Unknown.';

  if (values.absenceNoticedDate || values.absenceNoticedTime) {
    const parsed = parseDateTime(values.absenceNoticedDate, values.absenceNoticedTime, now);
    if (parsed.error) errors[parsed.field === 'time' ? 'absenceNoticedTime' : 'absenceNoticedDate'] = parsed.error;
    else {
      absenceNoticedAt = parsed.iso;
      if (lastSeenAt && new Date(absenceNoticedAt).getTime() < new Date(lastSeenAt).getTime()) {
        errors.absenceNoticedDate = 'Noticed missing cannot be before the last-seen time.';
      }
    }
  }

  return { errors, lastSeenAt, absenceNoticedAt, valid: Object.keys(errors).length === 0 };
}
