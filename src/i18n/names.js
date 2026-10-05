// Resolvers for "@kind:id" message parameters (see resolveParams in ./index.js)
import { registerNames } from './index.js'
import { SKILLS } from '../game/data/skills.js'
import { ITEMS, CROPS, SLOTS } from '../game/data/items.js'
import { findAction } from '../game/data/actions.js'
import { MONSTERS, BOSSES, DUNGEONS, AREAS } from '../game/data/combat.js'
import { QUESTS, ACHIEVEMENTS, ROOMS, BLESSINGS } from '../game/data/progression.js'
import { ROLES } from '../game/data/character.js'
import { SPECIALTIES, RARITIES, EXPEDITIONS, DRINKS, TAVERN_LEVELS } from '../game/data/tavern.js'
import { PRAYERS, EVENTS } from '../game/data/extras.js'
import { PET_MAP } from '../game/data/pets.js'
import { BESTIARY } from '../game/data/bestiary.js'
import { SET_MAP } from '../game/data/sets.js'

const byId = list => id => list.find(x => x.id === id)?.name ?? id
const allMonsters = id => MONSTERS[id]?.name ?? BOSSES.find(b => b.id === id)?.name ?? DUNGEONS.find(d => d.boss.id === id)?.boss.name ?? id

registerNames('item', id => ITEMS[id]?.name ?? id)
registerNames('skill', id => SKILLS[id]?.name ?? id)
registerNames('monster', allMonsters)
registerNames('quest', byId(QUESTS))
registerNames('ach', byId(ACHIEVEMENTS))
registerNames('room', byId(ROOMS))
registerNames('blessing', byId(BLESSINGS))
registerNames('dungeon', byId(DUNGEONS))
registerNames('area', byId(AREAS))
registerNames('exp', byId(EXPEDITIONS))
registerNames('drink', byId(DRINKS))
registerNames('prayer', byId(PRAYERS))
registerNames('event', byId(EVENTS))
registerNames('crop', byId(CROPS))
registerNames('pet', id => PET_MAP[id]?.name ?? id)
registerNames('beasts', byId(BESTIARY))
registerNames('set', id => SET_MAP[id]?.name ?? id)
registerNames('slot', id => SLOTS[id]?.name ?? id)
registerNames('spec', id => SPECIALTIES[id]?.name ?? id)
registerNames('rarity', id => RARITIES[id]?.name ?? id)
registerNames('role', id => ROLES[id]?.name ?? id)
registerNames('tavern', id => TAVERN_LEVELS[Number(id) - 1]?.name ?? id)
registerNames('action', ref => { const [skill, id] = ref.split('/'); return findAction(skill, id)?.name ?? id })
