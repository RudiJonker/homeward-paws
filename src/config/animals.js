export const ANIMAL_CATEGORIES = [
  { value: 'dog', label: 'Dog', icon: 'dog' },
  { value: 'cat', label: 'Cat', icon: 'cat' },
  { value: 'bird', label: 'Bird', icon: 'bird' },
  { value: 'horse', label: 'Horse', icon: 'horse' },
  { value: 'donkey', label: 'Donkey', icon: 'horse' },
  { value: 'rabbit', label: 'Rabbit', icon: 'rabbit' },
  { value: 'reptile', label: 'Reptile', icon: 'snake' },
  { value: 'small_mammal', label: 'Small mammal', icon: 'rodent' },
  { value: 'farm_animal', label: 'Farm animal', icon: 'cow' },
  { value: 'other', label: 'Other', icon: 'paw' },
  { value: 'unsure', label: 'Unsure', icon: 'help-circle-outline' }
];

export const ANIMAL_PLACEHOLDERS = {
  dog: require('../../assets/placeholders/animal-dog.png'),
  cat: require('../../assets/placeholders/animal-cat.png'),
  bird: require('../../assets/placeholders/animal-bird.png'),
  horse: require('../../assets/placeholders/animal-horse.png'),
  donkey: require('../../assets/placeholders/animal-donkey.png'),
  rabbit: require('../../assets/placeholders/animal-rabbit.png'),
  reptile: require('../../assets/placeholders/animal-reptile.png'),
  small_mammal: require('../../assets/placeholders/animal-small-mammal.png'),
  farm_animal: require('../../assets/placeholders/animal-farm-animal.png'),
  other: require('../../assets/placeholders/animal-other.png'),
  unsure: require('../../assets/placeholders/animal-unsure.png')
};

export function animalCategoryLabel(value) {
  return ANIMAL_CATEGORIES.find((item) => item.value === value)?.label ?? 'Animal';
}

export const ANIMAL_HEALTH_FLAGS = [
  ['medication', 'Medication'], ['allergy', 'Allergy'], ['injury', 'Injury'],
  ['medical_condition', 'Medical condition'], ['special_diet', 'Special diet'], ['other', 'Other health need']
];

export function animalHealthFlagLabel(value) {
  return ANIMAL_HEALTH_FLAGS.find(([type]) => type === value)?.[1] ?? 'Health need';
}
