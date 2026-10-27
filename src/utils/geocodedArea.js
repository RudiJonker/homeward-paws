function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function usableSuburb(value, city) {
  const candidate = clean(value);
  if (!candidate || candidate.toLocaleLowerCase() === city.toLocaleLowerCase()) return false;
  // Android may return a municipality or district in these fields. Never
  // present an administrative region as a confirmed suburb.
  return !/\b(municipality|municipal|metropolitan|metro|district|county|province|region|council|city)\b/i.test(candidate);
}

export function suggestGeocodedArea(address) {
  const city = clean(address?.city) || clean(address?.district);
  const suburb = [address?.district, address?.subregion]
    .map(clean)
    .find((candidate) => usableSuburb(candidate, city)) ?? '';
  return { province: clean(address?.region), city, suburb };
}

export function deviceAccuracyMessage(accuracyMetres) {
  return Number.isFinite(accuracyMetres)
    ? `Device position accuracy is about ${Math.max(1, Math.round(accuracyMetres))} m. `
    : '';
}
