import { AREAS } from './combat.js'

/*
  The hero's journal: the story told in short chapters that unlock as the hero explores, plus the
  people met along the way and the memories of past lives (one per ascension).
  Texts live in the locales under `journal.*`; a chapter's text is `journal.chapters.<id>.text`, an
  array of paragraphs that may use the save's names ({keeper}, {astrologer}, {smith}, {king}).
  The journal is kept when the hero ascends: the hero remembers.
*/

// Names of the new characters are rolled once per save, so every playthrough meets different people
const SYL = {
  start: ['Al', 'Bel', 'Cor', 'Dar', 'El', 'Fen', 'Gal', 'Hal', 'Is', 'Jor', 'Kel', 'Lor', 'Mar', 'Ner', 'Or', 'Per', 'Quel', 'Ros', 'Sel', 'Tor', 'Ul', 'Val', 'Wen', 'Yr', 'Zar', 'Ae', 'Bran', 'Cael', 'Dor', 'Eth', 'Ser', 'Thal', 'Ves', 'Ash', 'Mir', 'Riv'],
  mid: ['', '', '', 'a', 'e', 'i', 'o', 'an', 'ar', 'el', 'en', 'is', 'or', 'ul', 'ia'],
  he: ['ren', 'dric', 'mund', 'ric', 'an', 'or', 'en', 'us', 'ald', 'win', 'gar', 'th', 'on', 'ian', 'mar'],
  she: ['a', 'ia', 'is', 'wyn', 'elle', 'ara', 'ine', 'ys', 'eth', 'ira', 'ene', 'lyn', 'ora', 'issa', 'ae'],
}
// Who gets a rolled name, and which name endings suit them in the texts
export const NAMED = { keeper: 'he', astrologer: 'she', smith: 'she', king: 'he' }

export function rollName(rng, kind) {
  const pick = a => a[Math.floor(rng() * a.length)]
  for (let i = 0; i < 20; i++) {
    const n = pick(SYL.start) + pick(SYL.mid) + pick(SYL[kind])
    if (n.length >= 4 && n.length <= 9 && !/(.)\1\1/i.test(n)) return n
  }
  return pick(SYL.start) + pick(SYL[kind])
}
export function rollNames(rng = Math.random) {
  const names = {}
  for (const [id, kind] of Object.entries(NAMED)) {
    let n
    do n = rollName(rng, kind)
    while (Object.values(names).includes(n))
    names[id] = n
  }
  return names
}

const areaMonsters = id => AREAS.find(a => a.id === id).monsters.map(m => m.id)
const beat = id => g => (g.s.bestiary.kills[id] || 0) > 0
const beatArea = id => { const ms = areaMonsters(id); return g => ms.some(m => (g.s.bestiary.kills[m] || 0) > 0) }

// Acts follow the regions of the realm; acts without chapters yet are still being written
export const ACTS = [
  { id: 'prologue', icon: 'candle-light' },
  { id: 'act1', icon: 'pine-tree' },
  { id: 'act2', icon: 'stone-block' },
  { id: 'act3', icon: 'crowned-skull', soon: true },
  { id: 'act4', icon: 'ice-spell-cast', soon: true },
  { id: 'act5', icon: 'vortex', soon: true },
  { id: 'act6', icon: 'sun', soon: true },
]

// `hint` is the key under journal.hints shown while the chapter is still locked
export const CHAPTERS = [
  { id: 'awakening', act: 'prologue', icon: 'candle-light', check: () => true },
  { id: 'crown_tale', act: 'prologue', icon: 'crown', hint: 'firstQuest', check: g => Object.values(g.s.quests).some(q => q?.status === 'done') || (g.s.ascension?.count || 0) > 0 },
  { id: 'sky_watcher', act: 'act1', icon: 'crystal-ball', hint: 'firstOmen', check: g => g.omensSeen() > 0 },
  { id: 'kings_road', act: 'act1', icon: 'pine-tree', hint: 'forest', check: beatArea('forest') },
  { id: 'night_path', act: 'act1', icon: 'goblin-head', hint: 'warrenChief', check: beat('warren_chief') },
  { id: 'iron_heart', act: 'act2', icon: 'anvil-impact', hint: 'caves', check: beatArea('caves') },
  { id: 'brins_secret', act: 'act2', icon: 'gem-pendant', hint: 'smithing', check: g => g.level('smithing') >= 40 },
  { id: 'living_mire', act: 'act2', icon: 'mushroom', hint: 'swamp', check: beatArea('swamp') },
  { id: 'serpent_priestess', act: 'act2', icon: 'snake', hint: 'naga', check: beat('naga') },
]
export const CHAPTER_MAP = Object.fromEntries(CHAPTERS.map(c => [c.id, c]))

// The people of the story; `met` is the chapter that introduces them
export const CHARACTERS = [
  { id: 'keeper', icon: 'beer-horn', tint: '#e2b65a', met: 'awakening' },
  { id: 'edmund', icon: 'crown', tint: '#c9a24a', met: 'crown_tale' },
  { id: 'king', icon: 'sun', tint: '#f6dc9a', met: 'crown_tale' },
  { id: 'astrologer', icon: 'crystal-ball', tint: '#a98bff', met: 'sky_watcher' },
  { id: 'smith', icon: 'anvil-impact', tint: '#ff9a3c', met: 'iron_heart' },
  { id: 'morwen', icon: 'crowned-skull', tint: '#7ad7ff', met: 'serpent_priestess' },
]

// One memory of a past life comes back with each ascension
export const MEMORIES = [1, 2, 3, 4, 5].map(n => ({ id: `life${n}`, n }))
