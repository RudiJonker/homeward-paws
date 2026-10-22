import { SOUTH_AFRICAN_PROVINCES } from '../config/constants.js';

export const blankMissingLocation = {
  method: 'manual',
  province: '',
  city: '',
  suburb: '',
  streetOrLandmark: '',
  latitude: null,
  longitude: null,
  accuracyMetres: null,
  publicPrecision: 'suburb'
};

const PRECISIONS = ['approximate', 'suburb'];

export function restoreMissingLocationDraft(saved) {
  const restored = { ...blankMissingLocation, ...saved };
  delete restored.safeToShareExact;
  // Old private drafts may contain an exact-public choice. Never carry it forward.
  if (restored.publicPrecision === 'exact' || restored.method === 'home_area') restored.publicPrecision = 'suburb';
  return restored;
}

function hasCoordinates(location) {
  return Number.isFinite(location.latitude) && Number.isFinite(location.longitude)
    && location.latitude >= -90 && location.latitude <= 90
    && location.longitude >= -180 && location.longitude <= 180;
}

export function validateMissingLocation(location) {
  const errors = {};
  const province = location.province?.trim() ?? '';
  const city = location.city?.trim() ?? '';
  const suburb = location.suburb?.trim() ?? '';
  const streetOrLandmark = location.streetOrLandmark?.trim() ?? '';

  if (!SOUTH_AFRICAN_PROVINCES.includes(province)) errors.province = 'Choose a South African province.';
  if (!city) errors.city = 'Enter the city or town where the animal was last seen.';
  if (!suburb) errors.suburb = 'Enter the suburb or area where the animal was last seen.';
  if (!PRECISIONS.includes(location.publicPrecision)) errors.publicPrecision = 'Choose what location detail may become public.';
  if (location.method === 'device' && !hasCoordinates(location)) errors.method = 'The device location is incomplete. Try again or enter the place manually.';
  if (location.method === 'home_area' && location.publicPrecision !== 'suburb') errors.publicPrecision = 'Home area can only be shared at suburb level.';
  if (location.publicPrecision === 'approximate') {
    if (!streetOrLandmark) errors.streetOrLandmark = 'Enter a public street or landmark name, or choose suburb only.';
    else if (/\d/.test(streetOrLandmark)) errors.streetOrLandmark = 'Remove numbers and house details from the public street or landmark.';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function publicLocationPreview(location) {
  const area = [location.suburb?.trim(), location.city?.trim(), location.province?.trim()].filter(Boolean).join(', ');
  const streetOrLandmark = location.streetOrLandmark?.trim();

  if (location.publicPrecision === 'approximate' && streetOrLandmark && !/\d/.test(streetOrLandmark)) {
    return `Near ${[streetOrLandmark, area].filter(Boolean).join(', ')}`;
  }
  return area || 'Enter an area to preview it.';
}
