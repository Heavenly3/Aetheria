import { describe, it, expect } from 'vitest'
import { G, state, newHero, setLevel } from './helpers.js'
import {
  GUILD_COUNT, EMBLEMS, RANKS, CONTRACT_SLOTS, CONTRACT_PERIOD, SWAP_COST, FEES, foundGuilds, acceptsRole, lockFeedback,
  makePuzzle, seeded, guildPerk, ROLE_IDS, RIDDLES,
} from '../src/game/data/guilds.js'
import { setLocale } from '../src/i18n/index.js'
import { guildName } from '../src/i18n/names.js'

// Join the first guild that takes the hero, skipping the trial
function joinFirst() {
  const g = G.guildList().find(x => G.guildStatus(x) === 'open')
  expect(G.applyGuild(g.id)).toBe(true)
  const tr = state.guilds.trial
  tr.solved = true
  tr.task.target = 0
  if (tr.task.type === 'deliver') G.addItem(tr.task.item, 1)
  expect(G.finishTrial()).toBe(true)
  return g
}

describe('guilds', () => {
  it('founds a dozen different guilds for every new world', () => {
    newHero({ name: 'Aria' })
    const list = G.guildList()
    expect(list).toHaveLength(GUILD_COUNT)
    expect(new Set(list.map(g => g.group + g.emblem)).size).toBe(GUILD_COUNT)
    expect(new Set(list.map(g => g.emblem)).size).toBe(GUILD_COUNT)
    list.forEach(g => {
      expect(EMBLEMS[g.emblem]).toBeTruthy()
      expect(g.tier).toBeGreaterThanOrEqual(1)
      expect(g.tier).toBeLessThanOrEqual(5)
      expect(['open', 'multi', ...ROLE_IDS]).toContain(g.focus)
    })
    // Every role has a guild of its own, and some take several roles or everyone
    ROLE_IDS.forEach(r => expect(list.some(g => g.focus === r)).toBe(true))
    expect(list.some(g => g.focus === 'multi')).toBe(true)
    expect(list.some(g => g.focus === 'open')).toBe(true)
    // The same world keeps its guilds, another world gets others
    expect(foundGuilds(42, 'mage')).toEqual(foundGuilds(42, 'mage'))
    expect(foundGuilds(42, 'mage').map(g => g.emblem)).not.toEqual(foundGuilds(43, 'mage').map(g => g.emblem))
  })

  it('always leaves a first guild for the hero\'s role', () => {
    for (const role of ROLE_IDS) {
      for (let seed = 1; seed < 15; seed++) {
        const list = foundGuilds(seed * 977, role)
        expect(list.some(g => g.tier === 1 && g.focus === role)).toBe(true)
      }
    }
    newHero({ role: 'rogue' })
    state.gold = FEES[1]
    expect(G.guildList().some(g => g.tier === 1 && G.guildStatus(g) === 'open')).toBe(true)
  })

  it('names guilds in both languages', async () => {
    newHero()
    const g = G.guildList()[0]
    await setLocale('en')
    expect(guildName(g)).toMatch(/ of the /)
    await setLocale('es')
    expect(guildName(g)).toMatch(/^(La|El) .+ (del|de la|de las) /)
    await setLocale('en')
  })

  it('checks role, requirements and fee before an application', () => {
    newHero({ role: 'warrior' })
    state.gold = 10000
    const other = G.guildList().find(g => !acceptsRole(g, 'warrior'))
    expect(G.guildStatus(other)).toBe('role')
    expect(G.applyGuild(other.id)).toBe(false)
    const high = G.guildList().find(g => g.tier === 5 && acceptsRole(g, 'warrior'))
    if (high) expect(G.guildStatus(high)).toBe('locked')
    const first = G.guildList().find(g => G.guildStatus(g) === 'open')
    state.gold = 0
    expect(G.guildStatus(first)).toBe('gold')
    state.gold = 10000
    expect(G.applyGuild(first.id)).toBe(true)
    expect(state.gold).toBe(10000 - FEES[first.tier])
    expect(state.guilds.trial.guild).toBe(first.id)
    // One application at a time
    expect(G.guildList().filter(g => g.id !== first.id).every(g => ['busy'].includes(G.guildStatus(g)))).toBe(true)
  })

  it('asks for the task and the puzzle before letting the hero in', () => {
    newHero()
    state.gold = 5000
    const g = G.guildList().find(x => G.guildStatus(x) === 'open')
    G.applyGuild(g.id)
    const tr = state.guilds.trial
    expect(G.trialReady()).toBe(false)
    expect(G.finishTrial()).toBe(false)
    // A wrong answer waits and brings a new puzzle
    tr.puzzle = { kind: 'riddle', riddle: 'echo', options: ['echo', 'map', 'key', 'egg'], answer: 'echo' }
    expect(G.answerPuzzle('map')).toBe('wrong')
    expect(G.puzzleWait()).toBeGreaterThan(0)
    expect(G.answerPuzzle(tr.puzzle.answer)).toBe(null)
    tr.waitUntil = 0
    tr.puzzle = { kind: 'sequence', shown: [2, 4, 6, 8, 10], options: [11, 12, 13, 14], answer: 12 }
    expect(G.answerPuzzle(12)).toBe('right')
    expect(tr.solved).toBe(true)
    // The task counts from the application on
    tr.task = { type: 'kills', target: 3, base: state.stats.kills }
    expect(G.trialReady()).toBe(false)
    state.stats.kills += 3
    expect(G.trialReady()).toBe(true)
    expect(G.finishTrial()).toBe(true)
    expect(G.myGuild().id).toBe(g.id)
    expect(state.guilds.contracts).toHaveLength(CONTRACT_SLOTS)
  })

  it('opens the lock with the right code and gives clues on the way', () => {
    expect(lockFeedback([1, 2, 3], [1, 2, 3])).toEqual({ exact: 3, near: 0 })
    expect(lockFeedback([1, 2, 3], [3, 1, 2])).toEqual({ exact: 0, near: 3 })
    expect(lockFeedback([1, 1, 2], [1, 2, 2])).toEqual({ exact: 2, near: 0 })
    expect(lockFeedback([4, 5, 6], [1, 2, 3])).toEqual({ exact: 0, near: 0 })
    newHero()
    state.gold = 5000
    G.applyGuild(G.guildList().find(x => G.guildStatus(x) === 'open').id)
    const tr = state.guilds.trial
    tr.puzzle = { kind: 'lock', code: [2, 5, 1], guesses: [], tries: 2 }
    expect(G.guessLock([1, 2, 3])).toEqual({ exact: 0, near: 2 })
    // Running out of tries brings a new lock after a wait
    expect(G.guessLock([6, 6, 6]).failed).toBe(true)
    expect(G.puzzleWait()).toBeGreaterThan(0)
    tr.waitUntil = 0
    tr.puzzle = { kind: 'lock', code: [2, 5, 1], guesses: [], tries: 5 }
    expect(G.guessLock([2, 5, 1]).solved).toBe(true)
  })

  it('makes fair puzzles', () => {
    const rng = seeded(7)
    for (let i = 0; i < 60; i++) {
      const tier = 1 + (i % 5)
      const r = makePuzzle('riddle', tier, rng)
      expect(r.options).toContain(r.answer)
      expect(new Set(r.options).size).toBe(4)
      expect(RIDDLES.some(x => x.id === r.riddle && x.a === r.answer)).toBe(true)
      const s = makePuzzle('sequence', tier, rng)
      expect(s.options).toContain(s.answer)
      expect(new Set(s.options).size).toBe(4)
      expect(s.shown).toHaveLength(5)
      const l = makePuzzle('lock', tier, rng)
      expect(l.code).toHaveLength(3)
      l.code.forEach(d => { expect(d).toBeGreaterThanOrEqual(1); expect(d).toBeLessThanOrEqual(6) })
    }
  })

  it('pays contracts in marks, gold and reputation, and raises the rank', () => {
    newHero()
    state.gold = 5000
    const g = joinFirst()
    const c = state.guilds.contracts[0]
    Object.assign(c, { type: 'kills', target: 2, base: state.stats.kills })
    expect(G.claimContract(0)).toBe(null)
    state.stats.kills += 2
    expect(G.guildsReady()).toBeGreaterThanOrEqual(1)
    const gold = state.gold
    const r = G.claimContract(0)
    expect(r.marks).toBeGreaterThan(0)
    expect(state.guilds.marks).toBe(r.marks)
    expect(state.gold).toBeGreaterThan(gold)
    expect(G.guildRep(g.id)).toBe(r.rep)
    expect(G.claimContract(0)).toBe(null)
    // Enough reputation for the next rank
    const seen = []
    const off = G.on('guildRank', e => seen.push(e.rank))
    G.addGuildRep(RANKS[1].rep)
    off()
    expect(G.guildRank()).toBe(1)
    expect(seen).toEqual(['member'])
  })

  it('takes deliveries from the bag when claimed', () => {
    newHero()
    state.gold = 5000
    joinFirst()
    const c = state.guilds.contracts[1]
    Object.assign(c, { type: 'deliver', item: 'copper_ore', target: 10, base: 0 })
    G.addItem('copper_ore', 6)
    expect(G.taskMet(c)).toBe(false)
    G.addItem('copper_ore', 6)
    expect(G.claimContract(1)).toBeTruthy()
    expect(G.qty('copper_ore')).toBe(2)
  })

  it('renews contracts every few hours and swaps one for marks', () => {
    newHero()
    state.gold = 5000
    joinFirst()
    const first = JSON.stringify(state.guilds.contracts)
    const t0 = Date.now()
    G.ensureContracts(t0)
    expect(JSON.stringify(state.guilds.contracts)).toBe(first)
    G.ensureContracts(t0 + CONTRACT_PERIOD)
    expect(state.guilds.contracts).toHaveLength(CONTRACT_SLOTS)
    expect(G.swapContract(0)).toBe(false)
    state.guilds.marks = SWAP_COST
    expect(G.swapContract(0)).toBe(true)
    expect(state.guilds.marks).toBe(0)
  })

  it('grants a perk that grows with rank and tier', () => {
    newHero({ role: 'warrior' })
    state.gold = 5000
    const g = joinFirst()
    const key = Object.keys(G.guildPerk())[0]
    const low = G.mod(key)
    G.addGuildRep(RANKS[3].rep)
    expect(G.mod(key)).toBeGreaterThan(low)
    const a = guildPerk({ ...g, tier: 1 }, 5), b = guildPerk({ ...g, tier: 5 }, 5)
    expect(b[key]).toBeGreaterThan(a[key])
  })

  it('sells guild goods by rank and tier', () => {
    newHero()
    state.gold = 5000
    joinFirst()
    const shop = G.guildShop()
    const cheap = shop.find(e => e.rank === 0)
    state.guilds.marks = cheap.cost
    expect(G.buyGuild(cheap.id)).toBe(true)
    expect(state.guilds.marks).toBe(0)
    Object.entries(cheap.items).forEach(([id, n]) => expect(G.qty(id)).toBeGreaterThanOrEqual(n))
    const ranked = shop.find(e => e.rank > 0)
    state.guilds.marks = 999
    expect(G.buyGuild(ranked.id)).toBe(false)
  })

  it('loses the reputation on leaving and waits before joining again', () => {
    newHero()
    state.gold = 5000
    const g = joinFirst()
    G.addGuildRep(500)
    expect(G.leaveGuild()).toBe(true)
    expect(G.myGuild()).toBe(null)
    expect(G.guildRep(g.id)).toBe(0)
    expect(G.guildStatus(g)).toBe('cooldown')
    state.guilds.leftAt = Date.now() - 2 * 3600e3
    expect(G.guildStatus(g)).toBe('open')
  })

  it('ranks the guilds by renown, helped by the hero', () => {
    newHero()
    state.gold = 5000
    const g = joinFirst()
    const table = G.guildTable()
    expect(table.map(r => r.place)).toEqual(table.map((_, i) => i + 1))
    for (let i = 1; i < table.length; i++) expect(table[i - 1].renown).toBeGreaterThanOrEqual(table[i].renown)
    const before = G.guildRenown(g)
    G.addGuildRep(5000)
    expect(G.guildRenown(g)).toBe(before + 10000)
    expect(G.guildPlace(g.id)).toBe(1)
    // The hero shows up among the members
    expect(G.guildMembers(g).some(m => m.hero)).toBe(true)
  })

  it('keeps the guild and its tasks through an ascension', () => {
    newHero()
    state.gold = 5000
    const g = joinFirst()
    const c = state.guilds.contracts[0]
    Object.assign(c, { type: 'xp', skill: 'mining', target: 999999, base: state.skills.mining.xp })
    state.skills.mining.xp += 500
    G.addGuildRep(200)
    setLevel('mining', 99); setLevel('smithing', 99); setLevel('woodcutting', 99); setLevel('fishing', 99); setLevel('cooking', 99)
    ;['attack', 'strength', 'defense', 'hitpoints', 'ranged', 'magic', 'crafting', 'fletching', 'firemaking', 'herblore', 'thieving', 'agility', 'prayer', 'runecrafting', 'farming', 'slayer'].forEach(s => setLevel(s, 99))
    const cur = G.taskCur(c)
    expect(G.ascend()).toBeGreaterThan(0)
    expect(G.myGuild().id).toBe(g.id)
    expect(G.guildRep(g.id)).toBe(200)
    expect(G.taskCur(state.guilds.contracts[0])).toBe(cur)
  })
})
