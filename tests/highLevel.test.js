import { describe, it, expect } from 'vitest'
import { ACTIONS } from '../src/game/data/actions.js'
import { ITEMS } from '../src/game/data/items.js'
import { WATERS } from '../src/game/data/fishing.js'

describe('the last levels of every skill', () => {
  it('give every crafting and gathering skill something new close to 99', () => {
    for (const skill of ['mining', 'woodcutting', 'fishing', 'thieving', 'smithing', 'cooking', 'firemaking', 'fletching', 'crafting', 'herblore', 'runecrafting', 'agility'])
      expect(Math.max(...ACTIONS[skill].map(a => a.lvl)), skill).toBeGreaterThanOrEqual(88)
    expect(Math.max(...ACTIONS.prayer.map(a => a.lvl))).toBeGreaterThanOrEqual(70)
  })

  it('names every new item and only asks for tools that exist', () => {
    for (const id of ['elder_logs', 'elder_bow', 'elder_staff', 'elder_rod', 'raw_starfin', 'starfin', 'soul_rune', 'astral_bones', 'aether_overload'])
      expect(ITEMS[id]?.name, id).toBeTruthy()
    const rods = Object.values(ITEMS).filter(i => i.toolType === 'rod').map(i => i.tier)
    for (const w of WATERS) expect(rods).toContain(w.rod)
  })
})
