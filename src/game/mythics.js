/* =========================================================
   MYTHICS — the ultra rare finds: every skill action and every kill rolls for them (see
   data/mythics.js). They are locked so they are never sold by mistake, their bonuses count while
   worn (charms: while in the bag), the first of each is remembered for good, and they come
   through an ascension in the new life's bag.
   Mixed into G (engine.js); `this` is the engine.
   ========================================================= */
import { ITEMS } from './data/items.js'
import { MONSTERS } from './data/combat.js'
import { SKILL_DROPS, KILL_DROPS, MYTHIC_LUCK } from './data/mythics.js'

export const MYTHIC_IDS = Object.keys(ITEMS).filter(id => ITEMS[id].myth)
const CHARM_IDS = MYTHIC_IDS.filter(id => ITEMS[id].type === 'charm')

// id → { first: when the first was found, n: how many were found in all }
export const mythicsState = () => ({ mythics: {} })

export const mythics = {
  mythicFound(id) { return !!this.s.mythics?.[id] },
  mythicsFound() { return MYTHIC_IDS.filter(id => this.mythicFound(id)).length },
  // Bonuses of the finds: worn gear and tools, and charms in the bag
  mythicMods(key) {
    let v = 0
    const eq = this.s.equipment, tools = this.s.tools
    for (const slot in eq) v += ITEMS[eq[slot]]?.myth ? ITEMS[eq[slot]].mods?.[key] || 0 : 0
    for (const type in tools) v += ITEMS[tools[type]]?.myth ? ITEMS[tools[type]].mods?.[key] || 0 : 0
    for (const id of CHARM_IDS) if (this.s.inventory[id] > 0) v += ITEMS[id].mods[key] || 0
    return v
  },

  rollMythics(list, fits, scale = 1) {
    const luck = 1 + this.mod('loot') * MYTHIC_LUCK
    const found = []
    for (const d of list) if (fits(d) && Math.random() < d.chance * scale * luck) { this.awardMythic(d.item); found.push(d.item) }
    return found
  },
  // One action of a skill, `time` seconds long
  mythicAction(skill, time = 3) {
    return this.rollMythics(SKILL_DROPS, d => !d.skill || d.skill === skill, time / 3)
  },
  mythicKill(m, act) {
    const area = MONSTERS[m.id]?.area
    return this.rollMythics(KILL_DROPS, d => (!d.boss || !!m.boss) && (!d.tower || act?.kind === 'tower')
      && (!d.areas || d.areas.includes(area)) && (!d.monsters || d.monsters.includes(m.id) || d.monsters.includes(m.echoOf)))
  },
  awardMythic(id) {
    const rec = (this.s.mythics ||= {})
    const first = !rec[id]
    rec[id] = { first: rec[id]?.first || Date.now(), n: (rec[id]?.n || 0) + 1 }
    this.addItem(id, 1)
    this.s.locked[id] = true
    this.log(ITEMS[id].icon, 'log.mythic', { item: '@item:' + id })
    this.emit('mythic', { item: id, tier: ITEMS[id].myth, first })
  },

  // Every find the hero holds, in the bag or worn, as [id, n]
  mythicsHeld() {
    const n = {}
    for (const id of MYTHIC_IDS) if (this.qty(id) > 0) n[id] = this.qty(id)
    for (const id of [...Object.values(this.s.equipment), ...Object.values(this.s.tools)]) if (ITEMS[id]?.myth) n[id] = (n[id] || 0) + 1
    return Object.entries(n)
  },
  returnMythics(list) {
    for (const [id, n] of list) { this.addItem(id, n); this.s.locked[id] = true }
  },
}
