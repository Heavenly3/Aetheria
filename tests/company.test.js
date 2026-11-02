import { describe, it, expect } from 'vitest'
import { G, state, newHero, setLevel } from './helpers.js'
import { MERC_ROLES, PARTY_SLOTS, HURT_TIME, UNIQUE_MERCS, TRUST_MAX, LOYAL_AT, COMPANION_TALKS, wageOf, mercXpNeed, mercTrade, companionTalks } from '../src/game/data/company.js'
import { trackedGoals } from '../src/ui/tracker.js'
import { CHAPTER_MAP } from '../src/game/data/journal.js'
import { MECHS } from '../src/game/data/fighting.js'
import { te } from '../src/i18n/index.js'
import { SKILLS } from '../src/game/data/skills.js'
import { ASCEND_MIN_TOTAL } from '../src/game/data/ascension.js'

function hero() {
  newHero()
  for (const s of ['attack', 'strength', 'defense', 'hitpoints']) setLevel(s, 60)
  state.hp = G.maxHp()
  state.gold = 1e6
}

describe('the company', () => {
  it('hires one of each trade, fills the party up to its slots and has its texts', () => {
    hero()
    const gold = state.gold
    const sq = G.hireMerc('squire')
    expect(sq.name).toBeTruthy()
    expect(state.gold).toBe(gold - G.mercHireCost())
    expect(G.hireMerc('squire')).toBe(null)
    G.hireMerc('archer'); G.hireMerc('cleric')
    expect(state.company.party).toHaveLength(PARTY_SLOTS)
    expect(G.toggleParty('cleric')).toBe(false)
    G.toggleParty('squire')
    expect(G.toggleParty('cleric')).toBe(true)
    for (const r in MERC_ROLES) for (const k of ['name', 'desc']) expect(te(`company.roles.${r}.${k}`), r).toBe(true)
  })

  it('comes along to bosses and dungeons for a wage, but not to the open field', () => {
    hero()
    G.hireMerc('squire'); G.hireMerc('mage')
    const gold = state.gold
    G.startCombat('boss', 'goblin_king')
    expect(state.activity.party).toEqual(['squire', 'mage'])
    expect(state.gold).toBe(gold - 2 * wageOf(1))
    G.stop()
    G.startCombat('area', 'goblin')
    expect(state.activity.party).toEqual([])
  })

  it('stays behind when the wages cannot be paid', () => {
    hero()
    G.hireMerc('archer')
    state.gold = 0
    G.startCombat('boss', 'goblin_king')
    expect(state.activity.party).toEqual([])
  })

  it('fights: draws blows, deals damage, and an archer can cut off a move', () => {
    hero()
    G.hireMerc('squire'); G.hireMerc('archer')
    G.startCombat('dungeon', 'goblin_warren')
    const act = state.activity, m = G.getMonster(act)
    expect(G.heroDrawShare(act)).toBeCloseTo(1 / 4)
    expect(G.partyGuard(act)).toBe(MERC_ROLES.squire.guard)
    const hp = act.mHp
    for (let i = 0; i < 10; i++) G.companyTick(act, m, 2.4, G.playerStats(m))
    expect(act.mHp).toBeLessThan(hp)
    act.mHp = hp
    // A move of the goblin, with the archer sure to answer it
    const real = Math.random
    Math.random = () => 0
    act.mech = { timers: {}, charge: { id: 'steal', left: MECHS.steal.charge, total: MECHS.steal.charge, dealt: 0 } }
    G.companyTick(act, m, 0.1, G.playerStats(m))
    Math.random = real
    expect(act.mech.charge).toBe(null)
    expect(act.notes.some(n => n.kind === 'mercInterrupt')).toBe(true)
  })

  it('grows with every creature defeated, and is hurt for a while if the hero falls', () => {
    hero()
    G.hireMerc('cleric')
    G.startCombat('boss', 'goblin_king')
    const act = state.activity, m = G.getMonster(act)
    const mem = G.companyMember('cleric')
    mem.xp = mercXpNeed(1) - 1
    G.companyKill(m, act)
    expect(mem.lvl).toBeGreaterThan(1)
    G.companyFell(act)
    expect(G.mercHurt(mem)).toBe(true)
    expect(mem.hurtUntil - Date.now()).toBeLessThanOrEqual(HURT_TIME)
    expect(G.partyReady()).toEqual([])
  })

  it('stays with the hero through rebirth', () => {
    hero()
    G.hireMerc('mage')
    const per = Math.ceil(ASCEND_MIN_TOTAL / Object.keys(SKILLS).length) + 1
    for (const k of Object.keys(SKILLS)) setLevel(k, Math.min(99, per))
    for (const id of Object.keys(state.inventory)) delete state.inventory[id]
    G.ascend()
    expect(G.companyMember('mage')?.role).toBe('mage')
    expect(state.company.party).toEqual(['mage'])
  })

  it('meets companions along the story and the guild, who join for free and bring a gift', () => {
    hero()
    for (const [id, u] of Object.entries(UNIQUE_MERCS)) {
      if (u.unlock.chapter) expect(CHAPTER_MAP[u.unlock.chapter], id).toBeTruthy()
      for (const k of ['name', 'title', 'bio', 'hint']) expect(te(`company.uniques.${id}.${k}`), id).toBe(true)
    }
    expect(G.uniquesWaiting()).toEqual([])
    expect(G.recruitUnique('maelis')).toBe(null)
    state.journal.chapters.living_mire = Date.now()
    expect(G.uniquesWaiting()).toEqual(['maelis'])
    const gold = state.gold, xp = G.mod('xp.herblore')
    const m = G.recruitUnique('maelis')
    expect(state.gold).toBe(gold)
    expect(mercTrade(m).breaker).toBe(UNIQUE_MERCS.maelis.boost.breaker)
    expect(G.mod('xp.herblore')).toBeCloseTo(xp + 0.05)
    // A hired mage can still join alongside her
    expect(G.hireMerc('mage')).toBeTruthy()
    state.stats.affairs = 10
    expect(G.uniquesWaiting()).toEqual(['vela'])
  })

  it('takes a third companion along with the War Banner', () => {
    hero()
    G.hireMerc('squire'); G.hireMerc('archer'); G.hireMerc('mage')
    expect(G.partySlots()).toBe(PARTY_SLOTS)
    expect(G.toggleParty('mage')).toBe(false)
    state.ascension.upgrades.war_banner = 1
    expect(G.partySlots()).toBe(PARTY_SLOTS + 1)
    expect(G.toggleParty('mage')).toBe(true)
  })

  it('grows trust with every kill together, and full trust opens a companion’s own quest', () => {
    hero()
    state.journal.chapters.empty_tomb = Date.now()
    const m = G.recruitUnique('hollis')
    G.startCombat('dungeon', 'crypt')
    const act = state.activity
    const king = G.getMonster({ ...act, room: 4 })
    expect(king.id).toBe('skeleton_king')
    G.companyKill(G.getMonster(act), act)
    expect(m.trust).toBe(1)
    expect(G.questOpen(m)).toBe(false)
    m.trust = LOYAL_AT
    expect(G.mercLoyal(m)).toBe(true)
    m.trust = TRUST_MAX
    expect(G.questOpen(m)).toBe(true)
    // It shows among the hero's goals, pointing at the crypt
    const goal = trackedGoals().find(g => g.key === 'c:hollis')
    expect(goal.go.focus).toBe('dungeon:crypt')
    for (let i = 0; i < UNIQUE_MERCS.hollis.quest.n; i++) G.companyKill(king, act)
    expect(m.questDone).toBe(true)
    expect(mercTrade(m).guard).toBe(UNIQUE_MERCS.hollis.quest.boost.guard)
    expect(trackedGoals().some(g => g.key === 'c:hollis')).toBe(false)
  })

  it('counts guild affairs for a quest that asks for them', () => {
    hero()
    state.stats.affairs = 10
    const m = G.recruitUnique('vela')
    m.trust = TRUST_MAX
    for (let i = 0; i < UNIQUE_MERCS.vela.quest.n; i++) G.companyAffairSettled()
    expect(m.questDone).toBe(true)
  })

  it('says more as trust grows, and has every line written', () => {
    const m = { trust: 0 }
    expect(companionTalks(m)).toEqual(['hello'])
    m.trust = TRUST_MAX
    expect(companionTalks(m)).toEqual(['hello', 'past', 'ask'])
    m.questDone = true
    expect(companionTalks(m)).toEqual(['hello', 'past', 'after'])
    for (const id in UNIQUE_MERCS) {
      for (const l of COMPANION_TALKS) expect(te(`company.talk.${id}.${l.id}`), id + '.' + l.id).toBe(true)
      expect(te(`company.uniques.${id}.reward`), id).toBe(true)
    }
  })
})
