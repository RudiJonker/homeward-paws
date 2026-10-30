import { SOUTH_AFRICAN_PROVINCES } from '../config/constants';
import { formatPickerDate, formatPickerTime } from './missingLastSeen';
import { normalizeSouthAfricanMobile } from './validation';

export const SIGHTING_MOVEMENTS = [
  ['moving', 'Moving'], ['stationary', 'Standing or sitting'],
  ['hiding', 'Hiding'], ['trapped', 'Trapped'],
  ['picked_up', 'Picked up by someone'], ['no_longer_visible', 'No longer visible'],
  ['unsure', 'Not sure']
];

export const SIGHTING_CONDITIONS = [
  ['unsure', 'Not sure'], ['appeared_well', 'Appeared well'],
  ['injured', 'Appeared injured'], ['distressed', 'Appeared distressed'],
  ['other', 'Other']
];

export function blankLinkedSighting() {
  const now = new Date();
  return {
    date: formatPickerDate(now), time: formatPickerTime(now),
    province: '', city: '', suburb: '', streetOrLandmark: '',
    locationSource: 'manual', latitude: null, longitude: null, accuracyMetres: null,
    movement: '', direction: '', condition: 'unsure', stillVisible: false,
    notes: '', sharePhone: false, phone: ''
  };
}

export function validateLinkedSighting(values, lastSeenAt, now = new Date()) {
  const errors = {};
  const [year, month, day] = (values.date || '').split('-').map(Number);
  const [hour, minute] = (values.time || '').split(':').map(Number);
  const observed = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(values.date || '') || !/^\d{2}:\d{2}$/.test(values.time || '')
    || observed.getFullYear() !== year || observed.getMonth() !== month - 1
    || observed.getDate() !== day || observed.getHours() !== hour || observed.getMinutes() !== minute) {
    errors.date = 'Choose a valid observation date and time.';
  } else if (observed.getTime() > now.getTime() + 5 * 60 * 1000) {
    errors.date = 'The observation cannot be in the future.';
  } else if (lastSeenAt && observed.getTime() < new Date(lastSeenAt).getTime()) {
    errors.date = 'Choose a time after this animal was last seen.';
  }
  const province = SOUTH_AFRICAN_PROVINCES.find((item) => item.toLowerCase() === values.province?.trim().toLowerCase());
  if (!province) errors.province = 'Enter a South African province.';
  if (!values.city?.trim()) errors.city = 'Enter the city or town.';
  if (!values.suburb?.trim()) errors.suburb = 'Enter the suburb or area.';
  if (!SIGHTING_MOVEMENTS.some(([code]) => code === values.movement)) errors.movement = 'Choose what the animal was doing.';
  if (!SIGHTING_CONDITIONS.some(([code]) => code === values.condition)) errors.condition = 'Choose the observed condition.';
  if (values.streetOrLandmark?.length > 200) errors.streetOrLandmark = 'Keep this under 200 characters.';
  if (values.direction?.length > 300) errors.direction = 'Keep this under 300 characters.';
  if (values.notes?.length > 1000) errors.notes = 'Keep this under 1,000 characters.';
  const phone = values.sharePhone ? normalizeSouthAfricanMobile(values.phone ?? '') : null;
  if (values.sharePhone && !phone) errors.phone = 'Enter a valid South African mobile number to share with the owner.';
  if (values.locationSource === 'device' && (values.latitude == null || values.longitude == null)) {
    errors.location = 'Capture the device location again, or enter the area manually.';
  }
  return {
    valid: Object.keys(errors).length === 0,
    errors,
    payload: {
      observedAt: errors.date ? null : observed.toISOString(),
      province, city: values.city?.trim(), suburb: values.suburb?.trim(),
      streetOrLandmark: values.streetOrLandmark?.trim() || null,
      locationSource: values.locationSource,
      latitude: values.locationSource === 'device' ? values.latitude : null,
      longitude: values.locationSource === 'device' ? values.longitude : null,
      accuracyMetres: values.locationSource === 'device' ? values.accuracyMetres : null,
      movement: values.movement, direction: values.direction?.trim() || null,
      condition: values.condition, stillVisible: values.stillVisible,
      notes: values.notes?.trim() || null, sharePhone: values.sharePhone,
      contactPhone: phone
    }
  };
}
