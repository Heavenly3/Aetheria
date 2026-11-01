/* =========================================================
   AFFAIRS — the matters a guild brings to its members, beyond contracts.
   One affair at a time: offered on the contract board, followed up out in the realm through its
   leads, and settled with an enigma. Every lead found reveals part of what the enigma needs.
   Mixed into G (engine.js); `this` is the engine.
   ========================================================= */
import { t } from '../i18n/index.js'
import { seeded, asksOf, makeTask, PUZZLE_COOLDOWN } from './data/guilds.js'
import { AREAS } from './data/combat.js'
import { CHARACTERS } from './data/journal.js'
import {
  AFFAIRS, AFFAIRS_BY, AFFAIR_ITEMS, AFFAIR_PERIOD, AFFAIR_FIRST, AFFAIR_WAIT, AFFAIR_TRIES, LEAD_SIZE, HINT_COST, affairReward,
} from './data/affairs.js'
import { makeEnigma, cipherSolved, beamSolved, turnMirror, turnRing, astrolabeSolved, weigh, RING_FACES } from './data/enigmas.js'

const pick = (rng, a) => a[Math.floor(rng() * a.length)]
const shuffle = (rng, a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [b[i], b[j]] = [b[j], b[i]] } return b }
// Leads ask for things that are counted, not handed in: an affair never takes the hero's items
const LEAD_ASKS = ask => !ask.startsWith('deliver') && ask !== 'gold'

export const affairs = {
  // How hard the enigmas are: the game's difficulty, nudged by the guild's standing
  enigmaLevel(g = this.myGuild()) {
    const base = { easy: 0, normal: 1, hard: 2 }[this.s.difficulty] ?? 1
    const nudge = !g ? 0 : g.tier >= 4 ? 1 : g.tier <= 1 ? -1 : 0
    return Math.max(0, Math.min(2, base + nudge))
  },
  affair() { return this.s.guilds?.affair || null },

  // Offers a new affair once the wait since the last one is over
  ensureAffair(now = Date.now()) {
    const s = this.s.guilds, g = this.myGuild()
    if (!g || s.affair) return s.affair
    if (!s.affairAt) { s.affairAt = now + AFFAIR_FIRST; return null }
    if (now < s.affairAt) return null
    s.affair = this.makeAffair(g, seeded(g.seed + Math.floor(now / 60e3)))
    this.emit('affairOffered', s.affair)
    return s.affair
  },
  makeAffair(g, rng) {
    const pool = g.focus === 'open' || g.focus === 'multi' ? Object.keys(AFFAIRS) : AFFAIRS_BY[g.focus]
    const kind = pick(rng, pool)
    const level = this.enigmaLevel(g)
    const members = this.guildMembers(g).filter(m => !m.hero && !m.leader)
    const from = pick(rng, members.length ? members : [{ name: g.leader, role: g.leaderRole }])
    const giver = from.name
    const seed = Math.floor(rng() * 1e9)
    const enigma = makeEnigma(AFFAIRS[kind].enigma, seeded(seed), level)
    const ctx = {}
    if (enigma.kind === 'deduction') {
      ctx.suspects = shuffle(rng, members.map(m => m.name).filter(n => n !== giver)).slice(0, enigma.n)
      while (ctx.suspects.length < enigma.n) ctx.suspects.push(t('affairs.stranger', { n: ctx.suspects.length + 1 }))
      ctx.places = shuffle(rng, AREAS.map(a => a.id)).slice(0, enigma.n)
      ctx.items = shuffle(rng, AFFAIR_ITEMS).slice(0, enigma.n)
    }
    return { kind, level, giver, giverRole: from.role, guild: g.id, seed, status: 'offered', enigma, ctx, leads: [], hints: 0, tries: 0, waitUntil: 0 }
  },
  declineAffair() {
    const s = this.s.guilds
    if (s.affair?.status !== 'offered') return false
    s.affair = null
    s.affairAt = Date.now() + AFFAIR_PERIOD / 2
    return true
  },
  // Taking it on: the leads are set now, so what was done before does not count
  acceptAffair() {
    const s = this.s.guilds, a = s.affair, g = this.myGuild()
    if (!a || a.status !== 'offered' || !g) return false
    const rng = seeded(a.seed + 17)
    const n = 1 + a.level
    const asks = asksOf(g).filter(LEAD_ASKS)
    const leads = []
    // One lead is always a word with someone from the journal, once the hero has met anyone
    const met = CHARACTERS.filter(c => c.id !== 'keeper' && this.chapterUnlocked(c.met))
    if (met.length) leads.push(this.talkLead(pick(rng, met).id))
    while (leads.length < n) leads.push(makeTask(this, pick(rng, asks), LEAD_SIZE[a.level], rng))
    a.leads = shuffle(rng, leads)
    a.status = 'active'
    a.started = Date.now()
    this.log(AFFAIRS[a.kind].icon, 'log.affairTaken', { affair: '@affair:' + a.kind })
    return true
  },
  talkLead(who) {
    const s = this.s.guilds
    s.talked ||= {}
    return { type: 'talk', who, target: 1, base: s.talked[who] || 0 }
  },
  // Called by the journal when the hero talks to someone
  noteTalk(who) {
    const s = this.s.guilds
    s.talked ||= {}
    s.talked[who] = (s.talked[who] || 0) + 1
  },
  leadsFound() { const a = this.affair(); return a ? a.leads.filter(l => this.taskMet(l)).length : 0 },
  affairReady() { const a = this.affair(); return !!a && a.status === 'active' && this.leadsFound() >= a.leads.length },
  affairWait() { const a = this.affair(); return a ? Math.max(0, a.waitUntil - Date.now()) : 0 },
  affairRewardNow() {
    const a = this.affair(), g = a && this.guildById(a.guild)
    return a && g ? affairReward(this, g, a.level, a.hints) : null
  },

  /* ---------- where an enigma is: a guild affair, or the entry trial of a guild ---------- */
  enigmaHolder(where = 'affair') {
    if (where !== 'trial') return this.affair()
    const tr = this.s.guilds?.trial
    return tr?.enigma ? tr : null
  },
  // Whether its enigma can be worked on now: an affair once its leads are followed, a trial until solved
  enigmaOpen(where = 'affair') {
    if (where !== 'trial') return this.affairReady()
    const tr = this.enigmaHolder('trial')
    return !!tr && !tr.solved
  },

  /* ---------- what is known: grows with every lead found ---------- */
  // The share of the enigma's secrets known so far, from 0 to 1. Some are known from the start;
  // everything about a trial's is known
  affairKnown(where = 'affair') {
    if (where === 'trial') return 1
    const a = this.affair()
    if (!a) return 0
    const total = a.leads.length + 1
    return (1 + this.leadsFound()) / total
  },
  // Deduction: the clues heard so far
  affairClues(where = 'affair') {
    const a = this.enigmaHolder(where)
    if (a?.enigma.kind !== 'deduction') return []
    const known = Math.ceil(a.enigma.clues.length * this.affairKnown(where))
    return [...a.enigma.clues.slice(0, known), ...(a.extra || [])]
  },
  // Astrolabe: which rings' stars are known
  affairStarsKnown(where = 'affair') {
    const a = this.enigmaHolder(where)
    if (a?.enigma.kind !== 'astrolabe') return []
    const n = a.enigma.rings.length
    const known = Math.ceil(n * this.affairKnown(where))
    return a.enigma.target.map((s, i) => (i < known ? s : null))
  },

  /* ---------- hints: a guild mate helps, for marks and a smaller reward ---------- */
  hintCost() { const a = this.affair(); return a ? HINT_COST * (a.hints + 1) : 0 },
  canHint() {
    const a = this.affair()
    return !!a && a.status === 'active' && this.s.guilds.marks >= this.hintCost() && this.affairHintAvailable()
  },
  affairHintAvailable() {
    const a = this.affair(), e = a?.enigma
    if (!e) return false
    if (e.kind === 'deduction') return (a.extra || []).length < e.n - 1
    if (e.kind === 'cipher') return (a.lettersShown || 0) < 2
    if (e.kind === 'beam') return e.grid.some((row, r) => row.some((cell, c) => cell !== e.solution[r][c] && !(a.fixed || []).includes(r * e.size + c)))
    if (e.kind === 'astrolabe') return !astrolabeSolved(e)
    if (e.kind === 'balance') return !a.extraWeigh
    if (e.kind === 'echo') return (a.lives || 0) < 2
    return false
  },
  affairHint() {
    if (!this.canHint()) return null
    const a = this.affair(), e = a.enigma
    this.s.guilds.marks -= this.hintCost()
    a.hints++
    if (e.kind === 'deduction') {
      // Where one more suspect was, the culprit last
      const told = new Set((a.extra || []).map(c => c.s))
      const s = [...Array(e.n).keys()].find(i => i !== e.culprit && !told.has(i))
      ;(a.extra ||= []).push({ t: 'at', s, place: e.place[s] })
    } else if (e.kind === 'cipher') a.lettersShown = (a.lettersShown || 0) + 1
    else if (e.kind === 'beam') {
      // One mirror is set right and held there
      const wrong = []
      e.grid.forEach((row, r) => row.forEach((cell, c) => { if (cell !== e.solution[r][c]) wrong.push([r, c]) }))
      const [r, c] = wrong[0]
      e.grid[r][c] = e.solution[r][c]
      ;(a.fixed ||= []).push(r * e.size + c)
    } else if (e.kind === 'astrolabe') {
      // The first ring that is wrong is set right (turning it only moves the rings after it)
      const i = e.rings.findIndex((ring, k) => ring[e.at[k]] !== e.target[k])
      for (let n = 0; n < RING_FACES && e.rings[i][e.at[i]] !== e.target[i]; n++) turnRing(e, i, 1)
    } else if (e.kind === 'balance') { a.extraWeigh = true; e.weighs++ }
    else if (e.kind === 'echo') a.lives = (a.lives || 0) + 1
    return a.hints
  },

  /* ---------- the enigma ---------- */
  // The hero's own marks on the deduction grid, kept with the affair
  setAffairNote(key, value, where = 'affair') {
    const a = this.enigmaHolder(where)
    if (!a) return
    a.notes ||= {}
    if (value) a.notes[key] = value
    else delete a.notes[key]
  },
  // Moves that change the enigma as the hero works on it
  affairTurnMirror(r, c, where = 'affair') {
    const a = this.enigmaHolder(where)
    if (!this.enigmaOpen(where) || a.enigma.kind !== 'beam' || (a.fixed || []).includes(r * a.enigma.size + c)) return false
    return turnMirror(a.enigma, r, c)
  },
  affairTurnRing(i, dir, where = 'affair') {
    const a = this.enigmaHolder(where)
    if (!this.enigmaOpen(where) || a.enigma.kind !== 'astrolabe') return false
    turnRing(a.enigma, i, dir)
    return true
  },
  affairWeigh(left, right, where = 'affair') {
    const a = this.enigmaHolder(where)
    const waiting = where === 'trial' ? this.puzzleWait() > 0 : this.affairWait() > 0
    if (!this.enigmaOpen(where) || a.enigma.kind !== 'balance' || waiting) return null
    return weigh(a.enigma, left, right)
  },
  // The answer: a suspect, the typed word, a coin, the echoed runes; the beam and the astrolabe are
  // read from how they stand. Returns 'solved', 'wrong' (try again after a wait), 'lost' or null
  settleAffair(answer) {
    const a = this.affair()
    if (!this.affairReady() || this.affairWait() > 0) return null
    const e = a.enigma
    if (enigmaRight(e, answer)) return this.closeAffair(true)
    // The beam and the astrolabe are simply not there yet
    if (e.kind === 'beam' || e.kind === 'astrolabe') return 'wrong'
    a.tries++
    const allowed = AFFAIR_TRIES[a.level] + (e.kind === 'echo' ? a.lives || 0 : 0)
    if (a.tries >= allowed) return this.closeAffair(false)
    a.waitUntil = Date.now() + AFFAIR_WAIT[a.level]
    // A coin or a rite starts afresh; clues and letters stay as they are
    if (e.kind === 'balance') { e.log = []; e.fake = Math.floor(seeded(a.seed + a.tries)() * e.coins) }
    if (e.kind === 'echo') a.enigma = { ...makeEchoAgain(e, a) }
    return 'wrong'
  },
  closeAffair(solved) {
    const s = this.s.guilds, a = s.affair, g = this.guildById(a.guild)
    const reward = solved && g ? affairReward(this, g, a.level, a.hints) : null
    if (reward) {
      s.marks += reward.marks
      this.addGold(reward.gold)
      this.addGuildRep(reward.rep)
      this.s.stats.affairs = (this.s.stats.affairs || 0) + 1
      if (!a.hints) this.s.stats.affairsAlone = (this.s.stats.affairsAlone || 0) + 1
      this.log(AFFAIRS[a.kind].icon, 'log.affairSolved', { affair: '@affair:' + a.kind })
    } else this.log('cross-mark', 'log.affairLost', { affair: '@affair:' + a.kind })
    this.emit('affairClosed', { kind: a.kind, solved, reward })
    s.affair = null
    s.affairAt = Date.now() + AFFAIR_PERIOD
    return solved ? 'solved' : 'lost'
  },
  /* ---------- the entry trial ---------- */
  // Every guild sets the same kind of enigma to those who would join it, one notch easier than its affairs
  trialEnigma(g, rng) {
    const pool = g.focus === 'open' || g.focus === 'multi' ? Object.keys(AFFAIRS) : AFFAIRS_BY[g.focus]
    const kind = pool[g.seed % pool.length]
    const level = Math.max(0, this.enigmaLevel(g) - 1)
    const enigma = makeEnigma(AFFAIRS[kind].enigma, seeded(Math.floor(rng() * 1e9)), level)
    const ctx = {}
    if (enigma.kind === 'deduction') {
      ctx.suspects = shuffle(rng, this.guildMembers(g).filter(m => !m.hero).map(m => m.name)).slice(0, enigma.n)
      ctx.places = shuffle(rng, AREAS.map(a => a.id)).slice(0, enigma.n)
      ctx.items = shuffle(rng, AFFAIR_ITEMS).slice(0, enigma.n)
    }
    return { kind, level, enigma, ctx }
  },
  // Returns 'right', 'wrong' (after a wait the enigma can be tried again) or null
  answerTrial(answer) {
    const tr = this.enigmaHolder('trial')
    if (!tr || tr.solved || this.puzzleWait() > 0) return null
    const e = tr.enigma
    if (enigmaRight(e, answer)) { tr.solved = true; return 'right' }
    if (e.kind === 'beam' || e.kind === 'astrolabe') return 'wrong'
    tr.waitUntil = Date.now() + PUZZLE_COOLDOWN
    tr.tries = (tr.tries || 0) + 1
    if (e.kind === 'balance') { e.log = []; e.fake = Math.floor(seeded(tr.started + tr.tries)() * e.coins) }
    if (e.kind === 'echo') tr.enigma = makeEchoAgain(e, { seed: tr.started, tries: tr.tries })
    return 'wrong'
  },

  // Leaving a guild drops its affair
  dropAffair() { const s = this.s.guilds; s.affair = null; s.affairAt = 0 },
}

// Whether an answer settles an enigma: a suspect, the typed word, a coin or the echoed runes; the beam
// and the astrolabe are read from how they stand
export function enigmaRight(e, answer) {
  if (e.kind === 'deduction') return answer === e.answer
  if (e.kind === 'cipher') return cipherSolved(e, answer, t(`affairs.words.${e.word}`))
  if (e.kind === 'beam') return beamSolved(e)
  if (e.kind === 'astrolabe') return astrolabeSolved(e)
  if (e.kind === 'balance') return answer === e.fake
  if (e.kind === 'echo') return Array.isArray(answer) && answer.length === e.seq.length && answer.every((r, i) => r === e.seq[i])
  return false
}

// A new rite of the same length after a wrong echo
function makeEchoAgain(e, a) {
  const rng = seeded(a.seed + 31 * (a.tries + 1))
  return { ...e, seq: e.seq.map(() => Math.floor(rng() * e.runes)) }
}

