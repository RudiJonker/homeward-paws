import assert from 'node:assert/strict';
import test from 'node:test';

import { animalColourLabel, readAnimalColours } from '../src/config/animalColours.js';

test('legacy comma-separated primary colours become one primary and secondary codes', () => {
  assert.deepEqual(readAnimalColours(['Brown, White'], ['Gray']), {
    primaryColour: 'brown', secondaryColours: ['white', 'grey'], unknownColours: []
  });
});

test('duplicate colours are removed across primary and secondary', () => {
  assert.deepEqual(readAnimalColours(['black and tan'], ['Black', 'gold']), {
    primaryColour: 'black', secondaryColours: ['tan', 'golden'], unknownColours: []
  });
});

test('unlisted shades remain available for the markings field', () => {
  assert.deepEqual(readAnimalColours(['Brindle'], ['Cream']), {
    primaryColour: 'other', secondaryColours: ['cream'], unknownColours: ['Brindle']
  });
});

test('stored codes have human-readable labels', () => {
  assert.equal(animalColourLabel('grey'), 'Grey');
  assert.equal(animalColourLabel('other'), 'Other');
});
