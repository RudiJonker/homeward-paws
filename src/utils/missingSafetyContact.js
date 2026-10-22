export const URGENCY_OPTIONS = [
  ['medication', 'Needs medication'],
  ['injury', 'Injured or unwell'],
  ['age', 'Very young or old'],
  ['pregnancy', 'Pregnant or nursing'],
  ['sensory', 'Vision or hearing difficulty'],
  ['mobility', 'Mobility difficulty'],
  ['weather', 'At risk from the weather']
];

export const APPROACH_OPTIONS = [
  ['unknown', 'I am not sure'],
  ['safe', 'Safe to approach'],
  ['slowly', 'Approach slowly'],
  ['do_not_chase', 'Do not chase'],
  ['do_not_catch', 'Do not try to catch']
];

export const blankMissingSafetyContact = {
  urgencyFlags: [],
  urgencyNote: '',
  approach: '',
  biteScratchKickRisk: false,
  approachNote: '',
  contact: { inApp: true, phone: false, whatsapp: false }
};

export function restoreMissingSafetyContact(saved) {
  return {
    ...blankMissingSafetyContact,
    ...saved,
    urgencyFlags: Array.isArray(saved?.urgencyFlags) ? saved.urgencyFlags : [],
    contact: { ...blankMissingSafetyContact.contact, ...saved?.contact }
  };
}

export function validateMissingSafetyContact(values, { hasMobile = false, hasWhatsapp = false } = {}) {
  const errors = {};
  const allowedUrgency = URGENCY_OPTIONS.map(([value]) => value);
  const allowedApproach = APPROACH_OPTIONS.map(([value]) => value);
  if (!Array.isArray(values.urgencyFlags) || values.urgencyFlags.some((flag) => !allowedUrgency.includes(flag))) {
    errors.urgencyFlags = 'Choose only the listed urgent needs.';
  }
  if (!allowedApproach.includes(values.approach)) errors.approach = 'Choose how people should approach the animal.';
  if ((values.urgencyNote ?? '').length > 500) errors.urgencyNote = 'Keep the urgent note under 500 characters.';
  if ((values.approachNote ?? '').length > 500) errors.approachNote = 'Keep the approach note under 500 characters.';

  const { inApp, phone, whatsapp } = values.contact ?? {};
  if (!inApp && !phone && !whatsapp) errors.contact = 'Choose at least one way people can respond.';
  if (phone && !hasMobile) errors.phone = 'Add a mobile number to your profile before allowing calls.';
  if (whatsapp && !hasWhatsapp) errors.whatsapp = 'Enable WhatsApp for your profile number before offering it on a report.';

  return { valid: Object.keys(errors).length === 0, errors };
}
