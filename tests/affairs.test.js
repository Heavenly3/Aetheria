import { describe, it, expect, beforeEach, vi } from 'vitest'
import { G, state, newHero, setLevel } from './helpers.js'
import { AFFAIRS, AFFAIR_FIRST, AFFAIR_PERIOD, AFFAIR_TRIES } from '../src/game/data/affairs.js'
import { beamSolved, turnMirror } from '../src/game/data/enigmas.js'
import { seeded } from '../src/game/data/guilds.js'
import { t } from '../src/i18n/index.js'

// A member of the hero's own tier 1 guild
function join() {
  G.ensureGuilds()
  const g = G.guildList().find(x => x.tier === 1 && (x.focus === 'open' || x.roles.includes(state.role)))
  Object.assign(state.guilds, { member: g.id, joined: Date.now(), affairAt: 0, affair: null })
  return g
}
// Offers an affair of the given kind (an open guild brings every kind)
function offer(kind) {
  const g = join()
  if (!kind) { state.guilds.affairAt = 1; return G.ensureAffair() }
  for (let i = 1; i < 500; i++) {
    const a = G.makeAffair({ ...g, focus: 'open' }, seeded(1e6 + i * 104729))
    if (a.kind === kind) return (state.guilds.affair = a)
  }
  throw new Error('No affair of kind ' + kind)
}
// Follows every lead
function followLeads() {
  for (const l of state.guilds.affair.leads) {
    if (l.type === 'talk') G.noteTalk(l.who)
    else if (l.type === 'kill') state.bestiary.kills[l.monster] = (state.bestiary.kills[l.monster] || 0) + l.target
    else if (l.type === 'xp') state.skills[l.skill].xp += l.target
    else if (l.type === 'kills') state.stats.kills += l.target
    else if (l.type === 'elite') state.stats.elites = (state.stats.elites || 0) + l.target
    else if (l.type === 'dungeon') state.stats.dungeons = (state.stats.dungeons || 0) + l.target
    else if (l.type === 'slayer') state.slayer.completed += l.target
    else if (l.type === 'fest') state.festival.points = (state.festival.points || 0) + l.target
  }
}

describe('guild affairs', () => {
  beforeEach(() => { newHero({ role: 'rogue', difficulty: 'normal' }); setLevel('attack', 30) })

  it('come along a while after joining, and again after each one ends', () => {
    join()
    const now = Date.now()
    expect(G.ensureAffair(now)).toBe(null)
    expect(state.guilds.affairAt).toBe(now + AFFAIR_FIRST)
    const a = G.ensureAffair(now + AFFAIR_FIRST)
    expect(a.status).toBe('offered')
    expect(AFFAIRS[a.kind]).toBeTruthy()
    expect(G.declineAffair()).toBe(true)
    expect(state.guilds.affair).toBe(null)
    expect(state.guilds.affairAt).toBeGreaterThan(Date.now() + AFFAIR_PERIOD / 2 - 1000)
  })

  it('are brought by a guild mate, with leads that only count from when they are taken', () => {
    state.journal.chapters.sky_watcher = Date.now()
    const a = offer()
    expect(G.guildMembers(G.myGuild()).some(m => m.name === a.giver)).toBe(true)
    G.noteTalk('astrologer')
    expect(G.acceptAffair()).toBe(true)
    expect(a.leads.length).toBe(1 + a.level)
    expect(a.leads.some(l => l.type === 'talk')).toBe(true)
    expect(G.leadsFound()).toBe(0)
    expect(G.affairReady()).toBe(false)
    expect(G.settleAffair(0)).toBe(null)
    followLeads()
    expect(G.affairReady()).toBe(true)
    expect(G.affairKnown()).toBe(1)
  })

  it('reveal the clues of a deduction lead by lead, and pay for the right culprit', () => {
    const a = offer('theft')
    G.acceptAffair()
    const total = a.enigma.clues.length
    expect(G.affairClues().length).toBeLessThan(total + 1)
    followLeads()
    expect(G.affairClues()).toHaveLength(total)
    expect(a.ctx.suspects).toHaveLength(a.enigma.n)
    const marks = state.guilds.marks, rep = G.guildRep(state.guilds.member)
    const wrong = (a.enigma.answer + 1) % a.enigma.n
    expect(G.settleAffair(wrong)).toBe('wrong')
    expect(G.affairWait()).toBeGreaterThan(0)
    expect(G.settleAffair(a.enigma.answer)).toBe(null)
    a.waitUntil = 0
    expect(G.settleAffair(a.enigma.answer)).toBe('solved')
    expect(state.guilds.marks).toBeGreaterThan(marks)
    expect(G.guildRep(state.guilds.member)).toBeGreaterThan(rep)
    expect(state.guilds.affair).toBe(null)
    expect(state.stats.affairs).toBe(1)
  })

  it('are lost after too many wrong answers', () => {
    const a = offer('theft')
    G.acceptAffair(); followLeads()
    const wrong = (a.enigma.answer + 1) % a.enigma.n
    let r
    for (let i = 0; i < AFFAIR_TRIES[a.level]; i++) { a.waitUntil = 0; r = G.settleAffair(wrong) }
    expect(r).toBe('lost')
    expect(state.guilds.affair).toBe(null)
  })

  it('read the letter in the language being played', () => {
    const a = offer('letter')
    G.acceptAffair(); followLeads()
    expect(G.settleAffair('nowhere')).toBe('wrong')
    a.waitUntil = 0
    expect(G.settleAffair(`  ${t(`affairs.words.${a.enigma.word}`).toUpperCase()} `)).toBe('solved')
  })

  it('light the lens only once the mirrors are right, and a hint holds one in place', () => {
    const a = offer('lens')
    G.acceptAffair(); followLeads()
    expect(G.settleAffair(true)).toBe('wrong')
    state.guilds.marks = 100
    expect(G.affairHint()).toBe(1)
    expect(a.fixed).toHaveLength(1)
    const [cell] = a.fixed, r = Math.floor(cell / a.enigma.size), c = cell % a.enigma.size
    expect(G.affairTurnMirror(r, c)).toBe(false)
    const e = a.enigma
    for (let i = 0; i < e.size; i++) for (let j = 0; j < e.size; j++) if (e.grid[i][j] !== e.solution[i][j]) turnMirror(e, i, j)
    expect(beamSolved(e)).toBe(true)
    expect(G.settleAffair(true)).toBe('solved')
  })

  it('weigh coins and find the false one, with a hint for one more weighing', () => {
    const a = offer('coins')
    G.acceptAffair(); followLeads()
    const weighs = a.enigma.weighs
    state.guilds.marks = 100
    G.affairHint()
    expect(a.enigma.weighs).toBe(weighs + 1)
    expect(G.affairWeigh([a.enigma.fake], [(a.enigma.fake + 1) % a.enigma.coins])).not.toBe(0)
    expect(G.settleAffair(a.enigma.fake)).toBe('solved')
  })

  it('ask the rite back rune by rune', () => {
    const a = offer('rite')
    G.acceptAffair(); followLeads()
    expect(G.settleAffair([...a.enigma.seq].reverse().concat([9]))).toBe('wrong')
    a.waitUntil = 0
    expect(G.settleAffair([...a.enigma.seq])).toBe('solved')
  })

  it('cost more marks for every hint and shrink the reward', () => {
    const a = offer('stars')
    G.acceptAffair(); followLeads()
    state.guilds.marks = 1000
    const before = G.affairRewardNow().marks
    const first = G.hintCost()
    // The astrolabe's hint sets its first wrong ring right
    const wrongAt = a.enigma.rings.findIndex((r, k) => r[a.enigma.at[k]] !== a.enigma.target[k])
    G.affairHint()
    expect(a.enigma.rings[wrongAt][a.enigma.at[wrongAt]]).toBe(a.enigma.target[wrongAt])
    expect(G.hintCost()).toBe(first * 2)
    expect(G.affairRewardNow().marks).toBeLessThan(before)
  })

  it('get harder with the game difficulty and the standing of the guild', () => {
    newHero({ difficulty: 'easy' })
    expect(G.enigmaLevel({ tier: 2 })).toBe(0)
    newHero({ difficulty: 'hard' })
    expect(G.enigmaLevel({ tier: 2 })).toBe(2)
    expect(G.enigmaLevel({ tier: 1 })).toBe(1)
  })

  it('end when the hero leaves the guild, and their leads carry over a rebirth', () => {
    offer('theft')
    G.acceptAffair()
    G.leaveGuild()
    expect(state.guilds.affair).toBe(null)
  })

  it('set each guild its own kind of enigma for the entry trial, a notch easier', () => {
    G.ensureGuilds()
    state.gold = 1e9
    setLevel('thieving', 99); setLevel('agility', 99); state.hero.xp = 1e9
    const g = G.guildList().find(x => G.guildStatus(x) === 'open')
    expect(G.applyGuild(g.id)).toBe(true)
    const tr = state.guilds.trial
    expect(tr.puzzle).toBeUndefined()
    expect(AFFAIRS[tr.kind].enigma).toBe(tr.enigma.kind)
    expect(tr.level).toBe(Math.max(0, G.enigmaLevel(g) - 1))
    // The same guild always sets the same kind
    expect(G.trialEnigma(g, Math.random).kind).toBe(tr.kind)
    // Wrong answers wait (the beam and astrolabe just are not there yet); the right one opens the door
    const e = tr.enigma
    const wrong = { deduction: (e.answer + 1) % (e.n || 1), cipher: 'nowhere', balance: (e.fake + 1) % (e.coins || 1), echo: [99] }[e.kind]
    if (wrong !== undefined) {
      expect(G.answerTrial(wrong)).toBe('wrong')
      expect(G.puzzleWait()).toBeGreaterThan(0)
      tr.waitUntil = 0
    }
    const right = { deduction: e.answer, cipher: t(`affairs.words.${e.word}`), balance: tr.enigma.fake, echo: tr.enigma.seq }[e.kind]
    if (e.kind === 'beam') e.grid = e.solution.map(r => [...r])
    if (e.kind === 'astrolabe') for (let i = 0; i < e.rings.length; i++) for (let n = 0; n < 8 && e.rings[i][e.at[i]] !== e.target[i]; n++) G.affairTurnRing(i, 1, 'trial')
    expect(G.answerTrial(right)).toBe('right')
    expect(tr.solved).toBe(true)
  })

  it('give every kind its texts in both languages', () => {
    for (const kind of Object.keys(AFFAIRS)) for (const k of ['name', 'intro', 'question']) expect(t(`affairs.kinds.${kind}.${k}`)).not.toContain('affairs.')
    vi.restoreAllMocks()
  })
})
