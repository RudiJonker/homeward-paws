export function normalizeSouthAfricanMobile(value) {
  const compact = value.replace(/[\s()-]/g, '');
  if (/^0[6-8]\d{8}$/.test(compact)) return `+27${compact.slice(1)}`;
  if (/^27[6-8]\d{8}$/.test(compact)) return `+${compact}`;
  if (/^\+27[6-8]\d{8}$/.test(compact)) return compact;
  return null;
}

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
