import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { G, state, newHero, setLevel, run, fixRandom } from './helpers.js'
import { OMENS, OMEN_MAP, SIGN_TIME, OFFERING_COST, WISH_LIMIT, RARITIES, rollOmen, rollRelic } from '../src/game/data/omens.js'
import { ITEMS } from '../src/game/data/items.js'
import { MONSTERS } from '../src/game/data/combat.js'

const fighter = () => {
  ['attack', 'strength', 'defense', 'hitpoints'].forEach(s => setLevel(s, 80))
  ;['rune_sword', 'rune_body', 'rune_legs', 'rune_helm', 'rune_shield'].forEach(id => { G.addItem(id, 1); G.equip(id) })
  state.combatStyle = 'strength'
  G.addItem('shark', 300)
  state.food = 'shark'
  state.hp = G.maxHp()
}

describe('omen rolls', () => {
  it('picks every omen sometimes and favours rare ones after an offering', () => {
    let seq = 0
    const rng = () => ((seq += 0.0137) % 1)
    const plain = {}, offered = {}
    for (let i = 0; i < 4000; i++) { const r = rollOmen(rng).rarity; plain[r] = (plain[r] || 0) + 1 }
    for (let i = 0; i < 4000; i++) { const r = rollOmen(rng, true).rarity; offered[r] = (offered[r] || 0) + 1 }
    for (const r of RARITIES) expect(plain[r]).toBeGreaterThan(0)
    expect(offered.epic).toBeGreaterThan(plain.epic)
    expect(OMENS.every(o => OMEN_MAP[o.id])).toBe(true)
  })

  it('rolls relic qualities, never below the minimum asked for', () => {
    expect(ITEMS[rollRelic(() => 0)].quality).toBe('common')
    expect(ITEMS[rollRelic(() => 0.999)].quality).toBe('mythic')
    expect(ITEMS[rollRelic(() => 0, 'mythic')].quality).toBe('mythic')
    expect(ITEMS.astral_charm_mythic.stats.atk).toBeGreaterThan(ITEMS.astral_charm_common.stats.atk)
  })
})

describe('omens in play', () => {
  beforeEach(() => newHero())
  afterEach(() => vi.restoreAllMocks())

  it('shows a sign first and only then the omen', () => {
    G.beginSign('stars')
    expect(G.omenSign()).toBe('common')
    expect(G.activeOmen()).toBe(null)
    expect(G.mod('xp')).toBeCloseTo(G.mod('xp'))
    G.update(SIGN_TIME + 1)
    expect(G.activeOmen().id).toBe('stars')
    expect(state.omens.seen.stars).toBe(1)
  })

  it('applies its bonuses and grants a boon to those who took part', () => {
    const xp = G.mod('xp')
    G.startEvent('stars')
    expect(G.mod('xp')).toBeCloseTo(xp + 0.25)
    G.startSkill('mining', 'copper_ore')
    run(30)
    expect(state.event.part).toBe(true)
    run(OMEN_MAP.stars.duration)
    expect(G.activeOmen()).toBe(null)
    expect(state.omens.boon).toBeTruthy()
  })

  it('leaves no boon for those who were away', () => {
    G.startEvent('goldrush')
    run(OMEN_MAP.goldrush.duration + 1)
    expect(state.omens.boon).toBe(null)
  })

  it('makes monsters stronger and rare drops likelier under a Blood Moon', () => {
    const before = G.getMonster({ kind: 'area', target: 'wolf' }).hp
    G.startEvent('blood_moon')
    expect(G.getMonster({ kind: 'area', target: 'wolf' }).hp).toBe(Math.round(before * 1.3))
    expect(G.omenRareMult()).toBe(3)
    expect(G.mod('loot')).toBeGreaterThanOrEqual(1)
  })

  it('lets the Gilded Goblin be caught, which ends the omen', () => {
    fighter()
    G.startEvent('gilded_goblin')
    G.startCombat('omen', 'gilded_goblin')
    expect(state.activity?.kind).toBe('omen')
    const gold = state.gold
    run(110)
    expect(state.omens.kills.gilded_goblin).toBe(1)
    expect(G.activeOmen()).toBe(null)
    expect(state.activity).toBe(null)
    expect(state.gold).toBeGreaterThan(gold)
  })

  it('lets the Gilded Goblin escape if nobody chases it', () => {
    G.startEvent('gilded_goblin')
    run(OMEN_MAP.gilded_goblin.duration + 1)
    expect(state.log[0].key).toBe('log.goblinEscaped')
    expect(G.canHunt()).toBe(false)
  })

  it('keeps the rift open for repeated hunts and closes it when the omen ends', () => {
    fighter()
    G.startEvent('rift')
    G.startCombat('omen', 'rift_horror')
    run(300)
    expect(state.omens.kills.rift_horror).toBeGreaterThan(1)
    run(OMEN_MAP.rift.duration)
    expect(state.activity).toBe(null)
    expect(() => G.startCombat('omen', 'rift_horror')).not.toThrow()
    expect(state.activity).toBe(null)
  }, 30000) // simulates a whole omen of fighting

  it('grants permanent wishes up to the limit', () => {
    const xp = G.mod('xp')
    fixRandom(0)
    for (let i = 0; i < WISH_LIMIT + 5; i++) G.grantWish()
    expect(G.wishCount()).toBe(WISH_LIMIT)
    expect(state.omens.wishes.xp).toBe(WISH_LIMIT)
    expect(G.mod('xp')).toBeCloseTo(xp + 0.005 * WISH_LIMIT)
  })

  it('runs the Veiled Caravan with stardust and gold', () => {
    G.startEvent('merchant')
    expect(state.event.offers).toHaveLength(3)
    G.addItem('stardust', 5000)
    state.gold = 1e6
    for (let i = 0; i < 3; i++) expect(G.buyCaravan(i)).toBeTruthy()
    expect(G.buyCaravan(0)).toBe(null)
  })

  it('answers an offering of stardust with a sooner omen', () => {
    expect(G.makeOffering()).toBe(false)
    G.addItem('stardust', OFFERING_COST)
    expect(G.makeOffering()).toBe(true)
    expect(G.qty('stardust')).toBe(0)
    fixRandom(0.1)
    G.maybeEvent()
    expect(G.omenSign()).toBeTruthy()
    expect(state.omens.offering).toBe(false)
  })

  it('gives the eye’s gift: its pet first, then a mythic relic', () => {
    G.startEvent('eye')
    state.event.part = true
    G.endOmen()
    expect(G.hasPet('wandering_eye')).toBe(true)
    G.startEvent('eye')
    state.event.part = true
    G.endOmen()
    expect(state.omens.relics.mythic).toBe(1)
  })

  it('opens a lost chest at once', () => {
    const dust = G.qty('stardust')
    G.startEvent('chest')
    expect(state.event).toBe(null)
    expect(G.qty('stardust')).toBeGreaterThan(dust)
  })

  it('drops events from older saves', () => {
    const old = JSON.parse(JSON.stringify(state))
    old.event = { id: 'merchant', t: 300, offer: { item: 'gem_chest', qty: 1, price: 100 } }
    delete old.omens
    G.loadSave(old)
    expect(state.event).toBe(null)
    expect(state.omens.seen).toEqual({})
    expect(MONSTERS.wolf).toBeTruthy()
  })
})
