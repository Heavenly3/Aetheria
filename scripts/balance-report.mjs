// Balance report: runs the real engine formulas to estimate, level by level,
// the best XP/hour of every skill, how long each stretch takes, the gold/hour
// of gathering and thieving, and how each combat area plays at its recommended level.
// Usage: node scripts/balance-report.mjs [skill]
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const load = p => import(pathToFileURL(join(root, p)))
const { G, state } = await load('src/game/engine.js')
const { XP_TABLE, SKILLS } = await load('src/game/data/skills.js')
const { ITEMS, CROPS } = await load('src/game/data/items.js')
const { ACTIONS } = await load('src/game/data/actions.js')
const { AREAS, PLAYER_ATTACK_SPEED } = await load('src/game/data/combat.js')
const { TOOL_TYPES } = await load('src/game/data/character.js')
const { i18n } = await load('src/i18n/index.js')
i18n.global.locale.value = 'en'

const only = process.argv[2]
const fmt = n => (n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e4 ? Math.round(n / 1e3) + 'K' : Math.round(n).toString())
const pad = (s, n) => String(s).padEnd(n)
const lpad = (s, n) => String(s).padStart(n)

G.newGame(0, { name: 'Balance', role: 'warrior', difficulty: 'normal' })
const reset = () => {
  for (const sk of Object.keys(state.skills)) state.skills[sk].xp = XP_TABLE[sk === 'hitpoints' ? 10 : 1]
  state.mastery = {}; state.hero.attrs = Object.fromEntries(Object.keys(state.hero.attrs).map(k => [k, 0])); state.hero.talents = {}
  state.role = 'warrior'
}
const toolFor = Object.fromEntries(Object.entries(TOOL_TYPES).map(([type, t]) => [t.skill, type]))
function bestTool(skill) {
  const type = toolFor[skill]
  if (!type) return
  const tools = Object.values(ITEMS).filter(it => it.type === 'tool' && it.toolType === type && G.meetsReq(it.req)).sort((a, b) => b.tier - a.tier)
  state.tools[type] = tools[0]?.id || null
}
// Expected XP and seconds per attempt, counting burns, thieving failures and their stun
function actionRate(skill, a) {
  const t = G.actionTime(skill, a)
  let xp = a.xp * G.xpMult(skill), time = t
  if (a.burn) xp *= 1 - G.burnChance(skill, a)
  if (a.fail) { const f = G.failChance(skill, a); xp *= 1 - f; time += f * 2 }
  const outValue = Object.entries(a.out).reduce((s, [k, q]) => s + ITEMS[k].value * q, 0)
  const inValue = Object.entries(a.in).reduce((s, [k, q]) => s + ITEMS[k].value * q, 0)
  const gold = (a.gold ? (a.gold[0] + a.gold[1]) / 2 * (1 - (a.fail ? G.failChance(skill, a) : 0)) : 0) + outValue - inValue
  return { xph: xp * 3600 / time, goldh: gold * 3600 / time }
}

/* ---------------- Skills ---------------- */
function skillCurve(skill) {
  reset()
  const rows = []
  for (let L = 1; L < 99; L++) {
    state.skills[skill].xp = XP_TABLE[L]
    bestTool(skill)
    let best = null
    if (skill === 'farming') {
      for (const c of CROPS) if (L >= c.lvl) {
        const xph = (c.harvestXp * G.xpMult('farming')) * 3600 / G.growTime(c) * G.plotCount()
        if (!best || xph > best.xph) best = { id: c.id, xph, goldh: 0 }
      }
    } else {
      for (const a of ACTIONS[skill] || []) {
        if (a.lvl > L || !G.hasTool(a)) continue
        const r = actionRate(skill, a)
        if (!best || r.xph > best.xph) best = { id: a.id, ...r }
      }
    }
    if (!best) { rows.push(null); continue }
    rows.push({ L, ...best, hours: (XP_TABLE[L + 1] - XP_TABLE[L]) / best.xph })
  }
  return rows.filter(Boolean)
}
function reportSkill(skill) {
  const rows = skillCurve(skill)
  if (!rows.length) return null
  const total = rows.reduce((s, r) => s + r.hours, 0)
  const band = (a, b) => rows.filter(r => r.L >= a && r.L < b).reduce((s, r) => s + r.hours, 0)
  // Stretches where the best action does not change
  const stretches = []
  let cur = null
  for (const r of rows) {
    if (!cur || cur.id !== r.id) { cur = { id: r.id, from: r.L, to: r.L, hours: 0 }; stretches.push(cur) }
    cur.to = r.L; cur.hours += r.hours
  }
  const worst = [...stretches].sort((a, b) => b.hours - a.hours)[0]
  const flags = []
  if (worst.hours / total > 0.4 && worst.to - worst.from > 12) flags.push(`dead zone ${worst.from}-${worst.to + 1} on ${worst.id} (${Math.round(worst.hours / total * 100)}% of the time)`)
  if (total > 400) flags.push('very slow to 99')
  if (total < 40) flags.push('very fast to 99')
  return { skill, total, b1: band(1, 30), b2: band(30, 60), b3: band(60, 90), b4: band(90, 99), worst, flags, goldh: rows.map(r => r.goldh) }
}

const skills = Object.keys(ACTIONS).concat('farming').filter(s => !only || s === only)
console.log('\nSKILLS (hours of active play, no bonuses, normal difficulty)\n')
console.log(pad('skill', 14) + lpad('to 99', 8) + lpad('1-30', 8) + lpad('30-60', 8) + lpad('60-90', 8) + lpad('90-99', 8) + '  longest stretch / notes')
const results = skills.map(reportSkill).filter(Boolean).sort((a, b) => b.total - a.total)
for (const r of results) {
  console.log(pad(SKILLS[r.skill].name, 14) + lpad(r.total.toFixed(0), 8) + lpad(r.b1.toFixed(1), 8) + lpad(r.b2.toFixed(1), 8) + lpad(r.b3.toFixed(1), 8) + lpad(r.b4.toFixed(1), 8)
    + `  ${r.worst.id} ${r.worst.from}-${r.worst.to + 1} (${r.worst.hours.toFixed(0)} h)` + (r.flags.length ? '  <-- ' + r.flags.join('; ') : ''))
}
const totals = results.map(r => r.total).sort((a, b) => a - b)
console.log(`\nmedian ${totals[Math.floor(totals.length / 2)].toFixed(0)} h · fastest ${totals[0].toFixed(0)} h · slowest ${totals[totals.length - 1].toFixed(0)} h`)

/* ---------------- Gold ---------------- */
if (!only) {
  console.log('\nGOLD PER HOUR (selling what you make, best action at each level)\n')
  console.log(pad('skill', 14) + [10, 30, 50, 70, 90].map(l => lpad('L' + l, 9)).join(''))
  for (const sk of ['mining', 'woodcutting', 'fishing', 'thieving', 'smithing', 'fletching', 'crafting', 'herblore']) {
    reset()
    const line = [10, 30, 50, 70, 90].map(L => {
      state.skills[sk].xp = XP_TABLE[L]; bestTool(sk)
      let g = 0
      for (const a of ACTIONS[sk]) if (a.lvl <= L && G.hasTool(a)) g = Math.max(g, actionRate(sk, a).goldh)
      return lpad(fmt(g), 9)
    })
    console.log(pad(SKILLS[sk].name, 14) + line.join(''))
  }
}

/* ---------------- Combat ---------------- */
if (!only) {
  console.log('\nCOMBAT at each area\'s recommended level (melee, best metal gear allowed, Accurate style)\n')
  console.log(pad('monster', 18) + lpad('lvl', 5) + lpad('hit%', 6) + lpad('kill s', 8) + lpad('k/h', 6) + lpad('xp/h', 8) + lpad('hp/h', 7) + lpad('ttd s', 7) + '  notes')
  const gearIds = Object.values(ITEMS).filter(it => it.type === 'equip' && it.style === 'melee' && /^(bronze|iron|steel|mithril|adamant|rune|aether)_/.test(it.id))
  for (const area of AREAS) {
    reset()
    const L = Math.min(99, area.recLvl)
    for (const sk of ['attack', 'strength', 'defense', 'hitpoints']) state.skills[sk].xp = XP_TABLE[L]
    Object.keys(state.equipment).forEach(s => (state.equipment[s] = null))
    for (const slot of ['weapon', 'head', 'shield', 'legs', 'body']) {
      const best = gearIds.filter(it => it.slot === slot && G.meetsReq(it.req)).sort((a, b) => b.value - a.value)[0]
      if (best) state.equipment[slot] = best.id
    }
    state.combatStyle = 'attack'
    console.log(`-- ${area.name} (rec ${area.recLvl})`)
    for (const raw of area.monsters) {
      const m = G.scaleMonster(raw)
      const ps = G.playerStats(m), mr = G.monsterRolls(m)
      const pHit = G.hitChance(ps.accRoll, mr.defRoll), mHit = G.hitChance(mr.accRoll, ps.defRoll)
      // Player hits roll 1..max, monster hits 0..max; combat regen is 1 HP every 6 s
      const pDps = pHit * (ps.maxHit + 1) / 2 / PLAYER_ATTACK_SPEED, mDps = mHit * m.maxHit / 2 / m.speed
      const netLoss = mDps - 1 / 6
      const killS = m.hp / pDps + 1.5
      const kph = 3600 / killS
      const xph = kph * m.hp * (4 + 1.33)
      const hpH = Math.max(0, netLoss * 3600)
      const ttd = netLoss > 0 ? G.maxHp() / netLoss : Infinity
      const notes = []
      if (killS > 60) notes.push('slow kills')
      if (ttd < 90) notes.push('lethal without food')
      if (hpH > G.maxHp() * 60) notes.push('heavy food use')
      if (m.slayer && G.level('slayer') < m.slayer) notes.push(`slayer ${m.slayer}`)
      console.log(pad(m.name, 18) + lpad(L, 5) + lpad(Math.round(pHit * 100), 6) + lpad(killS.toFixed(0), 8) + lpad(Math.round(kph), 6) + lpad(fmt(xph), 8) + lpad(fmt(hpH), 7) + lpad(ttd === Infinity ? '-' : ttd.toFixed(0), 7) + '  ' + notes.join(', '))
    }
  }
}
