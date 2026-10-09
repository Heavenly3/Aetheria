import { describe, it, expect } from 'vitest'
import { G, state, newHero, setLevel, fixRandom, run } from './helpers.js'
import { ITEMS, CLOTHS, ROBES, HIDES, HIDE_PIECES } from '../src/game/data/items.js'
import { ACTIONS, QUALITIES, qualityChances, withQuality, findAction } from '../src/game/data/actions.js'
import { SET_OF } from '../src/game/data/sets.js'
import { MONSTERS } from '../src/game/data/combat.js'
import { weaponProfile } from '../src/game/data/fighting.js'
import { setLocale } from '../src/i18n/index.js'

describe('crafting quality', () => {
  it('makes finer versions of every crafted piece of gear', () => {
    const gear = ['smithing', 'fletching', 'crafting'].flatMap(sk => ACTIONS[sk]).filter(a => a.quality)
    expect(gear.length).toBeGreaterThan(50)
    for (const a of gear) {
      const id = Object.keys(a.out)[0]
      for (let q = 1; q <= 3; q++) {
        const v = ITEMS[withQuality(id, q)]
        expect(v.base).toBe(id)
        expect(v.grade).toBe(q)
        expect(v.slot).toBe(ITEMS[id].slot)
        expect(v.value).toBeGreaterThan(ITEMS[id].value)
        for (const [k, x] of Object.entries(ITEMS[id].stats)) if (x > 0) expect(v.stats[k]).toBeGreaterThan(x)
      }
    }
    // Arrows, bars and resources stay as they are
    expect(findAction('fletching', 'bronze_arrow').quality).toBeFalsy()
    expect(findAction('smithing', 'bronze_bar').quality).toBeFalsy()
    expect(ITEMS.bronze_bar_q1).toBeUndefined()
  })

  it('grows the chances with mastery and only allows masterworks from mastery 50', () => {
    const low = qualityChances(1), mid = qualityChances(50), high = qualityChances(99)
    expect(low[2]).toBe(0)
    expect(mid[2]).toBeGreaterThan(0)
    for (let i = 0; i < 3; i++) expect(high[i]).toBeGreaterThan(low[i])
    expect(high.reduce((a, b) => a + b, 0)).toBeLessThan(1)
    expect(qualityChances(99, 0.25)[2]).toBeGreaterThan(high[2])
  })

  it('rolls the quality of each piece made', () => {
    newHero()
    setLevel('smithing', 10)
    G.addItem('bronze_bar', 5)
    fixRandom(0)
    G.startSkill('smithing', 'bronze_sword')
    run(30)
    // A roll of 0 is a masterwork once the recipe allows it, otherwise the best quality it can be
    const made = [0, 1, 2, 3].map(q => G.qty(withQuality('bronze_sword', q)))
    expect(made.reduce((a, b) => a + b, 0)).toBeGreaterThan(0)
    expect(made[0]).toBe(0)
  })

  it('logs and announces masterworks', () => {
    newHero()
    setLevel('smithing', 10)
    state.mastery.smithing = { bronze_sword: 1e9 }
    const seen = []
    const off = G.on('masterwork', e => seen.push(e.item))
    fixRandom(0)
    expect(G.rollQuality('smithing', 'bronze_sword')).toBe(3)
    off()
    expect(seen).toEqual(['bronze_sword_q3'])
    expect(state.stats.quality[3]).toBe(1)
  })

  it('lets finer gear be worn and still count for its set and weapon', () => {
    newHero()
    G.addItem('bronze_helm_q2', 1)
    G.addItem('bronze_sword_q3', 1)
    expect(G.equip('bronze_helm_q2')).toBe(true)
    expect(G.equip('bronze_sword_q3')).toBe(true)
    const set = SET_OF.bronze_helm
    expect(G.setPieces(set)).toBeGreaterThanOrEqual(2)
    expect(weaponProfile('bronze_sword_q3')).toBe(weaponProfile('bronze_sword'))
  })
})

describe('cloth and hides', () => {
  it('weaves robes from flax and stitches hides from monster drops', () => {
    for (const c of CLOTHS) {
      expect(ITEMS[c.id + '_cloth']).toBeTruthy()
      ROBES.forEach(r => expect(ITEMS[`${c.id}_${r.id}`].style).toBe('magic'))
      expect(SET_OF[`${c.id}_robe_top`]).toBeTruthy()
    }
    for (const h of HIDES) {
      expect(ITEMS[h.drop]).toBeTruthy()
      HIDE_PIECES.forEach(p => expect(ITEMS[`${h.id}_${p.id}`].style).toBe('ranged'))
      expect(SET_OF[`${h.id}_body`]).toBeTruthy()
    }
    // Every material can be found somewhere
    const drops = new Set(Object.values(MONSTERS).flatMap(m => m.drops.map(d => d.item)))
    HIDES.forEach(h => expect(drops.has(h.drop)).toBe(true))
    expect(findAction('crafting', 'linen_cloth').in).toEqual({ flax: 2 })
  })

  it('gets better tier by tier', () => {
    const power = id => Object.values(ITEMS[id].stats).reduce((a, b) => a + b, 0)
    for (let i = 1; i < CLOTHS.length; i++) expect(power(`${CLOTHS[i].id}_robe_top`)).toBeGreaterThan(power(`${CLOTHS[i - 1].id}_robe_top`))
    for (let i = 1; i < HIDES.length; i++) expect(power(`${HIDES[i].id}_body`)).toBeGreaterThan(power(`${HIDES[i - 1].id}_body`))
    expect(power('wolf_body')).toBeGreaterThan(power('leather_body'))
    expect(power('dhide_body')).toBeGreaterThan(power('snake_body'))
  })

  it('crafts a linen hood from the field up', () => {
    newHero()
    setLevel('crafting', 10)
    G.addItem('flax', 4)
    G.startSkill('crafting', 'linen_cloth')
    run(10)
    expect(G.qty('linen_cloth')).toBe(2)
    G.startSkill('crafting', 'linen_hood')
    run(10)
    const hoods = [0, 1, 2, 3].reduce((s, q) => s + G.qty(withQuality('linen_hood', q)), 0)
    expect(hoods).toBe(2)
  })

  it('names the finer pieces in both languages', async () => {
    await setLocale('en')
    expect(ITEMS.wolf_body_q3.name).toBe('Masterwork Wolf body')
    expect(ITEMS.linen_hood.name).toBe('Linen hood')
    await setLocale('es')
    expect(ITEMS.wolf_body_q1.name).toBe('Jubón de lobo de calidad')
    expect(ITEMS.starweave_robe_top_q2.name).toBe('Túnica de tejido estelar superior')
    await setLocale('en')
  })
})
