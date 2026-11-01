// Single source of truth for the game library.
// Only real projects. Leave a field null until there's real info for it —
// the UI hides empty fields instead of inventing copy.
//
// Fields:
//   id, title, number            required
//   status                       'in-development' | 'released'
//   year, category, desc         string | null
//   tags                         string[]
//   engine, role                 string | null
//   playUrl                      string | null  (only shown when set)
export const games = [
  {
    id: 'slots-and-ladders',
    number: '01',
    title: 'Slots And Ladders',
    status: 'in-development',
    year: null,
    category: null,
    desc: null,
    tags: [],
    engine: null,
    role: null,
    playUrl: null,
  },
  {
    id: 'zombies',
    number: '02',
    title: 'Unnamed Zombies Project',
    status: 'in-development',
    year: null,
    category: null,
    desc: null,
    tags: [],
    engine: null,
    role: null,
    playUrl: null,
  },
];
