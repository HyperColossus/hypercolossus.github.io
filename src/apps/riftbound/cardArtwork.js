import battlefields from './battlefields.json';

const normalize = name => (name ?? '').replace(/\s*\([^)]*\)\s*$/, '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
const battlefieldNames = new Set(battlefields.names.map(normalize));

// Sheet rows do not carry card types. Match their known card names, including promos.
export function isBattlefield(card) {
  if (card.card_type) return /^(battlefield|battleground)$/i.test(card.card_type);
  return battlefieldNames.has(normalize(card.name));
}
