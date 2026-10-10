/* =========================================================
   GUILDS — the realm's guilds, founded with every new game.
   Apply, pass the entry trial (a task and a puzzle), take contracts, climb the ranks.
   Mixed into G (engine.js); `this` is the engine.
   ========================================================= */
import {
  foundGuilds, hashStr, seeded, guildRequirements, acceptsRole, guildPerk, renownOn, guildRoster, rankIndex, RANKS,
  TASK_TYPES, makeTask, asksOf, makePuzzle, lockFeedback, LOCK_DIGITS, LOCK_FACES, FEES, TRIAL_SIZE, PUZZLE_COOLDOWN,
  CONTRACT_SLOTS, CONTRACT_PERIOD, CONTRACT_SIZES_LIST, SWAP_COST, contractReward, GUILD_SHOP, LEAVE_COOLDOWN,
} from './data/guilds.js'

const DAY = 86400e3
const today = (now = Date.now()) => Math.floor(now / DAY)

export const guildsState = () => ({
  // list: the guilds of this world · founded: the day they were founded · member: id of the hero's guild
  // rep: reputation earned in each guild · marks: guild marks to spend · trial: the entry trial under way
  // contracts / period: the current contracts and the four-hour period they belong to · leftAt: when the hero last left a guild
  guilds: { list: [], founded: 0, member: null, joined: 0, rep: {}, marks: 0, trial: null, contracts: [], period: -1, leftAt: 0, best: {} },
})

export const guilds = {
  ensureGuilds() {
    const s = this.s.guilds
    if (!s.list?.length) {
      s.list = foundGuilds(hashStr(`${this.s.created}|${this.s.name}`), this.s.role)
      s.founded = today()
    }
    s.rep ||= {}
    s.best ||= {}
    if (!Array.isArray(s.contracts)) s.contracts = []
    return s
  },
  guildList() { return this.ensureGuilds().list },
  guildById(id) { return this.guildList().find(g => g.id === id) || null },
  myGuild() { const id = this.s.guilds.member; return id ? this.guildById(id) : null },
  guildRep(id) { return this.s.guilds.rep[id] || 0 },

  /* ================= the table ================= */
  // Renown grows on its own every day; what the hero does for a guild adds to it
  guildRenown(g) { return renownOn(g, today(), this.s.guilds.founded) + this.guildRep(g.id) * 2 },
  guildTable() {
    return this.guildList().map(g => ({ g, renown: this.guildRenown(g) }))
      .sort((a, b) => b.renown - a.renown).map((r, i) => ({ ...r, place: i + 1 }))
  },
  guildPlace(id) { return this.guildTable().find(r => r.g.id === id)?.place || 0 },
  // Members, with the hero in their place when they belong to the guild
  guildMembers(g) {
    const list = guildRoster(g, today(), this.s.guilds.founded)
    if (this.s.guilds.member === g.id) {
      list.push({ name: this.s.name, role: this.s.role, rank: this.guildRank(), level: this.heroLevel(), contrib: this.guildRep(g.id), hero: true })
    }
    return list.sort((a, b) => (b.leader ? 1 : 0) - (a.leader ? 1 : 0) || b.rank - a.rank || b.contrib - a.contrib)
  },

  /* ================= joining ================= */
  guildReqs(g) { return guildRequirements(g).map(r => ({ ...r, ok: this.guildReqMet(r) })) },
  guildReqMet(r) {
    if (r.kind === 'hero') return this.heroLevel() >= r.n
    if (r.kind === 'skill') return this.level(r.skill) >= r.n
    if (r.kind === 'total') return this.totalLevel() >= r.n
    return true
  },
  guildFee(g) { return FEES[g.tier] },
  guildCooldown() { return Math.max(0, this.s.guilds.leftAt + LEAVE_COOLDOWN - Date.now()) },
  // 'member' · 'trial' · 'busy' (in another guild or trial) · 'role' · 'cooldown' · 'locked' (requirements) · 'gold' · 'open'
  guildStatus(g) {
    const s = this.ensureGuilds()
    if (s.member === g.id) return 'member'
    if (s.trial?.guild === g.id) return 'trial'
    if (s.member || s.trial) return 'busy'
    if (!acceptsRole(g, this.s.role)) return 'role'
    if (this.guildCooldown() > 0) return 'cooldown'
    if (!this.guildReqs(g).every(r => r.ok)) return 'locked'
    if (this.s.gold < this.guildFee(g)) return 'gold'
    return 'open'
  },
  applyGuild(id) {
    const g = this.guildById(id)
    if (!g || this.guildStatus(g) !== 'open') return false
    this.s.gold -= this.guildFee(g)
    const rng = seeded(g.seed + Date.now())
    const asks = asksOf(g)
    this.s.guilds.trial = {
      guild: g.id, started: Date.now(),
      task: makeTask(this, asks[Math.floor(rng() * asks.length)], TRIAL_SIZE[g.tier], rng),
      puzzle: makePuzzle(g.puzzle, g.tier, rng), solved: false, waitUntil: 0,
    }
    this.log('scroll-quill', 'log.guildApply', { guild: '@guild:' + g.id })
    return true
  },
  abandonTrial() { this.s.guilds.trial = null },

  /* ================= tasks ================= */
  taskCur(t) {
    const type = TASK_TYPES[t.type]
    return Math.max(0, Math.min(t.target, type.read(this, t) - (type.deliver ? 0 : t.base)))
  },
  taskMet(t) { return this.taskCur(t) >= t.target },
  // Hand in what a delivery asks for
  payTask(t) {
    if (t.type === 'deliver') this.removeItem(t.item, t.target)
    else if (t.type === 'gold') this.s.gold -= t.target
  },

  /* ================= the puzzle ================= */
  puzzleWait() { const tr = this.s.guilds.trial; return tr ? Math.max(0, tr.waitUntil - Date.now()) : 0 },
  // A wrong answer brings a new puzzle after a short wait
  failPuzzle() {
    const tr = this.s.guilds.trial, g = this.guildById(tr.guild)
    tr.waitUntil = Date.now() + PUZZLE_COOLDOWN
    tr.puzzle = makePuzzle(g.puzzle, g.tier, seeded(g.seed + Date.now()))
  },
  // Riddles and sequences: pick an option. Returns 'right', 'wrong' or null
  answerPuzzle(value) {
    const tr = this.s.guilds.trial
    if (!tr || tr.solved || this.puzzleWait() > 0 || tr.puzzle.kind === 'lock') return null
    if (value === tr.puzzle.answer) { tr.solved = true; return 'right' }
    this.failPuzzle()
    return 'wrong'
  },
  // The lock: try a code. Returns the feedback, plus `solved` or `failed`
  guessLock(guess) {
    const tr = this.s.guilds.trial
    if (!tr || tr.solved || this.puzzleWait() > 0 || tr.puzzle.kind !== 'lock') return null
    if (guess.length !== LOCK_DIGITS || guess.some(d => !(d >= 1 && d <= LOCK_FACES))) return null
    const p = tr.puzzle
    const fb = lockFeedback(p.code, guess)
    p.guesses.push({ guess: [...guess], ...fb })
    if (fb.exact === LOCK_DIGITS) { tr.solved = true; return { ...fb, solved: true } }
    if (p.guesses.length >= p.tries) { this.failPuzzle(); return { ...fb, failed: true } }
    return fb
  },

  /* ================= membership ================= */
  trialReady() { const tr = this.s.guilds.trial; return !!tr && tr.solved && this.taskMet(tr.task) },
  finishTrial() {
    const s = this.s.guilds, tr = s.trial
    if (!this.trialReady()) return false
    this.payTask(tr.task)
    const g = this.guildById(tr.guild)
    Object.assign(s, { member: g.id, joined: Date.now(), trial: null, contracts: [], period: -1 })
    s.rep[g.id] ||= 0
    this.ensureContracts()
    this.log('swords-emblem', 'log.guildJoin', { guild: '@guild:' + g.id })
    this.emit('guildJoined', g)
    return true
  },
  // Leaving loses the reputation earned there, and the hero waits a while before joining another
  leaveGuild() {
    const s = this.s.guilds, g = this.myGuild()
    if (!g) return false
    s.rep[g.id] = 0
    Object.assign(s, { member: null, contracts: [], period: -1, leftAt: Date.now() })
    this.log('cross-mark', 'log.guildLeave', { guild: '@guild:' + g.id })
    return true
  },
  // The highest rank the hero has ever held in any guild
  bestGuildRank() { const s = this.s.guilds; return Math.max(-1, s?.member ? this.guildRank() : -1, ...Object.values(s?.best || {})) },
  guildRank(id = this.s.guilds.member) { return id ? rankIndex(this.guildRep(id)) : -1 },
  nextRank() { const i = this.guildRank(); return i >= 0 && i < RANKS.length - 1 ? RANKS[i + 1] : null },
  guildPerk(g = this.myGuild()) { return g ? guildPerk(g, this.guildRank(g.id)) : {} },
  guildMods(key) {
    const g = this.s.guilds?.member && this.myGuild()
    return g ? this.guildPerk(g)[key] || 0 : 0
  },
  addGuildRep(n) {
    const s = this.s.guilds, id = s.member
    const before = this.guildRank(id)
    s.rep[id] = (s.rep[id] || 0) + n
    const after = this.guildRank(id)
    if (after > before) {
      s.best[id] = Math.max(s.best[id] || 0, after)
      this.log('star-medal', 'log.guildRank', { guild: '@guild:' + id, rank: '@guildRank:' + RANKS[after].id })
      this.emit('guildRank', { guild: this.myGuild(), rank: RANKS[after].id })
    }
  },

  /* ================= contracts ================= */
  ensureContracts(now = Date.now()) {
    const s = this.s.guilds, g = this.myGuild()
    if (!g) return []
    const period = Math.floor(now / CONTRACT_PERIOD)
    if (s.period !== period) {
      // Finished contracts wait to be claimed; the rest are replaced
      const kept = s.contracts.filter(c => !c.claimed && !TASK_TYPES[c.type].deliver && this.taskMet(c))
      const rng = seeded(g.seed + period * 7919)
      const asks = asksOf(g)
      const fresh = CONTRACT_SIZES_LIST.slice(0, CONTRACT_SLOTS - kept.length).map(size => this.makeContract(g, asks, size, rng))
      s.contracts = [...kept, ...fresh]
      s.period = period
    }
    return s.contracts
  },
  makeContract(g, asks, size, rng = Math.random) {
    const t = makeTask(this, asks[Math.floor(rng() * asks.length)], size, rng)
    return { ...t, size, reward: contractReward(this, g, size), claimed: false }
  },
  contractsLeft(now = Date.now()) { return CONTRACT_PERIOD - (now % CONTRACT_PERIOD) },
  claimContract(i) {
    const c = this.s.guilds.contracts[i]
    if (!c || c.claimed || !this.taskMet(c)) return null
    this.payTask(c)
    c.claimed = true
    this.s.guilds.marks += c.reward.marks
    this.addGold(c.reward.gold)
    this.s.stats.contracts = (this.s.stats.contracts || 0) + 1
    this.addGuildRep(c.reward.rep)
    return c.reward
  },
  swapContract(i) {
    const s = this.s.guilds, c = s.contracts[i], g = this.myGuild()
    if (!g || !c || c.claimed || s.marks < SWAP_COST) return false
    s.marks -= SWAP_COST
    s.contracts[i] = this.makeContract(g, asksOf(g), c.size)
    return true
  },

  /* ================= the shop ================= */
  guildShop(g = this.myGuild()) { return g ? GUILD_SHOP.filter(e => g.tier >= e.tier) : [] },
  canBuyGuild(e) { return !!this.myGuild() && this.guildRank() >= e.rank && this.s.guilds.marks >= e.cost },
  buyGuild(id) {
    const e = this.guildShop().find(x => x.id === id)
    if (!e || !this.canBuyGuild(e)) return false
    this.s.guilds.marks -= e.cost
    Object.entries(e.items).forEach(([k, n]) => this.addItem(k, n))
    return true
  },

  // Things waiting for the hero: contracts to claim and a trial ready to finish
  guildsReady() {
    const s = this.s.guilds
    if (!s) return 0
    return (s.member ? s.contracts.filter(c => !c.claimed && this.taskMet(c)).length : 0) + (this.trialReady() ? 1 : 0)
  },

  // Skill XP starts over on ascension: keep how far the tasks had come
  guildSnapshot() {
    const s = this.s.guilds
    return { trial: s.trial ? this.taskCur(s.trial.task) : 0, contracts: s.contracts.map(c => this.taskCur(c)) }
  },
  restoreGuildTasks(snap) {
    const s = this.s.guilds
    const rebase = (t, cur) => { if (!TASK_TYPES[t.type].deliver) t.base = TASK_TYPES[t.type].read(this, t) - cur }
    if (s.trial) rebase(s.trial.task, snap.trial)
    s.contracts.forEach((c, i) => rebase(c, snap.contracts[i] || 0))
  },
}
