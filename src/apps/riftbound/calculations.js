export const MODEL_VERSION = 'origins-slots-v1';
export const MODEL_SOURCE = 'https://playriftbound.com/en-us/news/announcements/collectability-in-riftbound-origins/';
export const DEFAULT_ASSUMPTIONS = { epic: 0.125, foilCommon: 0.7, foilUncommon: 0.2, foilRare: 0.08, foilEpic: 0.02 };

export function packModel(a = DEFAULT_ASSUMPTIONS) {
  if (['epic','foilCommon','foilUncommon','foilRare','foilEpic'].some(key => !Number.isFinite(a[key]) || a[key] < 0 || a[key] > 1)
    || Math.abs(a.foilCommon + a.foilUncommon + a.foilRare + a.foilEpic - 1) > 0.000001) throw new Error('Foil probabilities must add to 100%, and probabilities must be from 0 to 100%.');
  return [
    { count: 7, choices: [{ category: 'Common', foil: false, weight: 1 }] },
    { count: 3, choices: [{ category: 'Uncommon', foil: false, weight: 1 }] },
    { count: 2, choices: [{ category: 'Rare', foil: true, weight: 1-a.epic }, { category: 'Epic', foil: true, weight: a.epic }] },
    { count: 1, choices: ['Common','Uncommon','Rare','Epic'].map(category => ({ category, foil: true, weight: a[`foil${category}`] })) },
    { count: 1, choices: [{ category: 'Token/Rune', foil: false, weight: 1 }] },
  ];
}

export function cardCategory(card) {
  if (!card.card_type || card.is_alt || card.is_overnumbered || card.is_signature || /\(Oversized\)/i.test(card.name ?? '')) return null;
  if (/^(token|rune)$/i.test(card.card_type) || /^token$/i.test(card.card_supertype ?? '')) return 'Token/Rune';
  return ['Common','Uncommon','Rare','Epic'].find(rarity => rarity.toLowerCase() === card.rarity.toLowerCase()) ?? null;
}

export function priceFor(card, foil) {
  const value = foil ? card.foil_price : card.normal_price;
  return value == null || value === '' || !Number.isFinite(Number(value)) || Number(value) < 0 ? null : Number(value);
}
export function modelPool(cards, category) { return cards.filter(card => cardCategory(card) === category); }

export function expectedPackValue(cards, assumptions = DEFAULT_ASSUMPTIONS) {
  let knownValue = 0;
  let missingExpectedCopies = 0;
  const coverage = [];
  for (const slot of packModel(assumptions)) for (const choice of slot.choices) {
    if (!choice.weight) continue;
    const pool = modelPool(cards, choice.category);
    const available = pool.map(card => priceFor(card, choice.foil)).filter(price => price !== null);
    const expectedCopies = slot.count * choice.weight;
    knownValue += expectedCopies * available.reduce((sum, price) => sum+price, 0) / (pool.length || 1);
    missingExpectedCopies += expectedCopies * (1 - (pool.length ? available.length/pool.length : 0));
    coverage.push({ ...choice, cards: pool.length, priced: available.length, expectedCopies });
  }
  return { value: missingExpectedCopies > 0.000001 ? null : knownValue, knownValue, missingExpectedCopies, coverage };
}
export function calculateBoxEV(value, packs = 24) {
  return Number.isFinite(value) && value >= 0 && Number.isInteger(packs) && packs > 0 && packs <= 1000 ? value*packs : null;
}
export function calculateROI(value, cost) {
  return Number.isFinite(value) && value >= 0 && Number.isFinite(cost) && cost > 0 ? ((value-cost)/cost)*100 : null;
}
export function simulatePackOpen(cards, assumptions = DEFAULT_ASSUMPTIONS, random = Math.random) {
  const model = packModel(assumptions);
  for (const slot of model) for (const choice of slot.choices) if (choice.weight && !modelPool(cards, choice.category).length) throw new Error(`This set is missing ${choice.category} cards. Import their metadata before simulating.`);
  const roll = () => { const value = random(); if (!Number.isFinite(value) || value < 0 || value >= 1) throw new Error('Invalid random value'); return value; };
  const pulled = [];
  for (const slot of model) for (let i=0; i<slot.count; i++) {
    let value = roll();
    const choices = slot.choices.filter(choice => choice.weight > 0);
    let choice = choices.at(-1);
    for (const candidate of choices) { value -= candidate.weight; if (value < 0) { choice=candidate; break; } }
    const pool = modelPool(cards, choice.category);
    const card = pool[Math.floor(roll()*pool.length)];
    pulled.push({ ...card, isFoil: choice.foil, simulatedPrice: priceFor(card, choice.foil) });
  }
  return pulled;
}
