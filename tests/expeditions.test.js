import { describe, it, expect, vi, afterEach } from 'vitest'
import { G, state, newHero } from './helpers.js'
import { XP_TABLE } from '../src/game/data/skills.js'
import { EXPEDITIONS, TRIP_EVENTS, TRIP_ROLES, crewSize, VETERAN_LEVELS, PROMOTIONS, TRUST_TRIP, INJURY_TIME } from '../src/game/data/tavern.js'
import { UNIQUE_MERCS } from '../src/game/data/company.js'
import { te } from '../src/i18n/index.js'

const forest = EXPEDITIONS.find(e => e.id === 'forest')
const W = uid => ({ k: 'w', uid })
const C = id => ({ k: 'c', id })
function adventurer(uid, lvl = 10, traits = []) {
  const w = { uid, name: 'Hand' + uid, avatar: 'hood', spec: 'adventurer', rarity: 'common', xp: XP_TABLE[lvl], traits, task: null, status: 'idle', injured: 0, exp: null, made: 0, vet: 0 }
  state.tavern.workers.push(w)
  return w
}
function hero() {
  newHero()
  state.gold = 1e7
  state.tavern.level = 3
}
afterEach(() => vi.restoreAllMocks())

describe('expedition crews', () => {
  it('sets out with adventurers and company members, up to the tavern\'s crew size', () => {
    hero()
    adventurer(1); adventurer(2); adventurer(3); adventurer(4)
    G.hireMerc('squire')
    expect(G.crewSize()).toBe(crewSize(3))
    expect(G.sendExpedition([W(1), W(2), W(3), W(4)], 'forest', 0)).toBe(false)
    const trip = G.sendExpedition([W(1), C('squire')], 'forest', 0)
    expect(trip).toBeTruthy()
    expect(state.tavern.workers[0].status).toBe('expedition')
    // Nobody goes twice, and an away companion stays out of the fights
    expect(G.sendExpedition([W(1)], 'forest', 0)).toBe(false)
    expect(G.memberAway('squire')).toBe(true)
    expect(G.partyReady().some(m => m.id === 'squire')).toBe(false)
    expect(G.crewChoices().filter(r => G.handFree(r))).toHaveLength(3)
  })

  it('counts every hand and trade towards the odds', () => {
    hero()
    adventurer(1, 10); adventurer(2, 10)
    G.hireMerc('cleric')
    const alone = G.expeditionChance([W(1)], forest)
    const pair = G.expeditionChance([W(1), W(2)], forest)
    const withCleric = G.expeditionChance([W(1), C('cleric')], forest)
    expect(pair).toBeGreaterThan(alone)
    expect(withCleric).toBeGreaterThan(alone)
    expect(TRIP_ROLES.cleric.chance).toBeGreaterThan(0)
  })

  it('pays out, hurts a crew without a squire on failure and spares one with', () => {
    hero()
    const a = adventurer(1); adventurer(2)
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    const trip = G.sendExpedition([W(1)], 'forest', 0)
    const rep = G.resolveTrip(trip, [])
    expect(rep.ok).toBe(false)
    expect(a.injured).toBe(INJURY_TIME)
    expect(state.tavern.trips).toHaveLength(0)

    G.hireMerc('squire')
    const t2 = G.sendExpedition([W(2), C('squire')], 'forest', 0)
    const r2 = G.resolveTrip(t2, [])
    expect(r2.ok).toBe(false)
    expect(r2.hurt).toBe(false)
    expect(state.tavern.workers[1].injured).toBe(0)
  })

  it('lets the right trade turn a mishap away, and that earns trust', () => {
    hero()
    adventurer(1)
    G.hireMerc('squire')
    const trip = G.sendExpedition([W(1), C('squire')], 'forest', 1)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const events = G.rollTripEvents(trip)
    expect(events.length).toBeGreaterThan(0)
    const rep = G.resolveTrip(trip, [{ id: 'ambush', saved: 'csquire' }])
    expect(rep.ok).toBe(true)
    expect(G.companyMember('squire').trust).toBe(TRUST_TRIP + 1)
    expect(TRIP_EVENTS.ambush.by).toContain('squire')
  })

  it('does better with a companion on home ground', () => {
    hero()
    adventurer(1)
    const id = Object.keys(UNIQUE_MERCS).find(k => UNIQUE_MERCS[k].home === 'swamp')
    state.company.members.push({ id, role: UNIQUE_MERCS[id].role, unique: id, name: null, lvl: 10, xp: 0, hurtUntil: 0 })
    const swamp = EXPEDITIONS.find(e => e.id === 'swamp')
    const b = G.crewBonus([W(1), C(id)], swamp)
    expect(b.home).toEqual([id])
    expect(te(`company.uniques.${id}.trip`)).toBe(true)
  })

  it('sets out again when asked to repeat, and recalls with nothing', () => {
    hero()
    adventurer(1, 40)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const trip = G.sendExpedition([W(1)], 'meadows', 0, true)
    G.updateTrips(3601)
    expect(state.tavern.reports[0].ok).toBe(true)
    expect(state.tavern.trips).toHaveLength(1)
    expect(state.tavern.trips[0].uid).not.toBe(trip.uid)
    const gold = state.gold
    expect(G.recallTrip(state.tavern.trips[0].uid)).toBe(true)
    expect(state.gold).toBe(gold)
    expect(state.tavern.workers[0].status).toBe('idle')
  })

  it('turns an adventurer out alone in an older save into a trip', () => {
    hero()
    const w = adventurer(1)
    w.exp = { id: 'forest', hours: 1, mult: 1, t: 100, total: 3600 }
    state.tavern.trips = []
    G.ensureTrips()
    expect(state.tavern.trips).toHaveLength(1)
    expect(G.tripOf(W(1)).exp).toBe('forest')
    G.fire(1)
    expect(state.tavern.trips).toHaveLength(0)
  })
})

describe('staff growth', () => {
  it('sheds a bad trait at a veteran level, then learns good ones', () => {
    hero()
    const w = adventurer(1, 20, ['lazy'])
    w.xp = XP_TABLE[VETERAN_LEVELS[0]]
    G.workerGrew(w, 20)
    expect(w.traits).toEqual([])
    w.xp = XP_TABLE[VETERAN_LEVELS[1]]
    G.workerGrew(w, VETERAN_LEVELS[0])
    expect(w.traits).toHaveLength(1)
    expect(w.vet).toBe(2)
  })

  it('promotes a worker who has the level, the gold and the tokens', () => {
    hero()
    const w = adventurer(1, 5)
    state.tavern.tokens = 100
    expect(G.promotion(w).blocker).toBe('level')
    w.xp = XP_TABLE[PROMOTIONS.rare.lvl]
    const p = G.promotion(w)
    expect(p.blocker).toBe(null)
    const gold = state.gold
    expect(G.promote(1)).toBe(true)
    expect(w.rarity).toBe('rare')
    expect(state.gold).toBe(gold - p.gold)
    expect(state.tavern.tokens).toBe(100 - PROMOTIONS.rare.tokens)
  })

  it('has texts for every event and trade on the road', () => {
    for (const id of Object.keys(TRIP_EVENTS)) expect(te(`tavern.trip.events.${id}.name`)).toBe(true)
    for (const id of Object.keys(TRIP_ROLES)) expect(te(`tavern.trip.roles.${id}`)).toBe(true)
  })
})
