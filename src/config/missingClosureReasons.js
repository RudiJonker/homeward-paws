export const MISSING_CLOSURE_REASONS = [
  { code: 'mistake', label: 'Reported by mistake' },
  { code: 'duplicate', label: 'Duplicate report' },
  { code: 'incorrect_information', label: 'Important details were incorrect' },
  { code: 'withdrawn', label: 'Stop the public search' },
  { code: 'sensitive_other', label: 'Another private reason' }
];

export function missingClosureReasonLabel(code) {
  return MISSING_CLOSURE_REASONS.find((reason) => reason.code === code)?.label ?? 'Private reason';
}
