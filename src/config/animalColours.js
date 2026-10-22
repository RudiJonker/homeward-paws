export const ANIMAL_COLOURS = [
  { value: 'black', label: 'Black' },
  { value: 'white', label: 'White' },
  { value: 'grey', label: 'Grey' },
  { value: 'brown', label: 'Brown' },
  { value: 'tan', label: 'Tan' },
  { value: 'cream', label: 'Cream' },
  { value: 'golden', label: 'Golden' },
  { value: 'ginger', label: 'Ginger' },
  { value: 'red', label: 'Red' },
  { value: 'orange', label: 'Orange' },
  { value: 'yellow', label: 'Yellow' },
  { value: 'green', label: 'Green' },
  { value: 'blue', label: 'Blue' },
  { value: 'other', label: 'Other' },
  { value: 'unsure', label: 'Unsure' }
];

const COLOUR_ALIASES = {
  gray: 'grey', silver: 'grey', beige: 'cream', buff: 'tan',
  blonde: 'golden', gold: 'golden', rust: 'ginger', auburn: 'red'
};

export function animalColourLabel(value) {
  return ANIMAL_COLOURS.find((item) => item.value === value)?.label ?? value;
}

// Old forms stored free text. Keep unrecognised descriptions in markings when
// an existing profile is next saved, so replacing its colours loses no detail.
export function readAnimalColours(primary = [], secondary = []) {
  const seen = new Set();
  const primaryCodes = [];
  const secondaryCodes = [];
  const unknown = [];
  for (const [values, destination] of [[primary, primaryCodes], [secondary, secondaryCodes]]) {
    for (const raw of values) {
      if (raw == null) continue;
      for (const part of String(raw).split(/\s*(?:,|\/|&|\band\b)\s*/i)) {
        const value = part.trim();
        if (!value) continue;
        const lower = value.toLowerCase();
        const code = COLOUR_ALIASES[lower] ?? lower;
        if (!ANIMAL_COLOURS.some((item) => item.value === code)) unknown.push(value);
        const stored = ANIMAL_COLOURS.some((item) => item.value === code) ? code : 'other';
        if (!seen.has(stored)) { destination.push(stored); seen.add(stored); }
      }
    }
  }
  const selectedPrimary = primaryCodes[0] ?? (secondaryCodes.includes('unsure') ? 'unsure' : '');
  return {
    primaryColour: selectedPrimary,
    secondaryColours: [...primaryCodes.slice(1), ...secondaryCodes].filter((code) => code !== 'unsure'),
    unknownColours: [...new Set(unknown)]
  };
}
