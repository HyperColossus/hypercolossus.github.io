// Group treatments of one named card within a set, while keeping the first
// printing's collector position and the existing normal/foil order.
export function adjacentOwnedVersions(cards) {
  const groups = new Map();
  for (const card of cards) {
    const name = card.name.replace(/\s*\((?:[^()]*(?:promo|alternate|alt art|signature|oversized|showcase)[^()]*)\)\s*$/i, '').trim().toLowerCase();
    const key = JSON.stringify([card.set_id, name]);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(card);
  }
  return [...groups.values()].flat();
}

// One visual card per printing; finishes remain inventory information.
export function combineOwnedFinishes(cards) {
  const printings = new Map();
  for (const card of cards) {
    if (!printings.has(card.id)) printings.set(card.id, { ...card, is_foil: null, quantity: 0, normal_quantity: 0, foil_quantity: 0 });
    const printing = printings.get(card.id);
    printing.quantity += Number(card.quantity);
    printing[card.is_foil ? 'foil_quantity' : 'normal_quantity'] += Number(card.quantity);
  }
  return [...printings.values()];
}
