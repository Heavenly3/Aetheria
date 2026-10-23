/* =========================================================
   TRACKER — every objective the hero has on the go (story quests, the slayer task, guild contracts,
   tavern orders, daily and weekly tasks), each with the exact place it is done: the action that
   makes an item, the creature to defeat, the seed to plant, the shop shelf… `go` is a route plus
   the element to point at there (see ui/focus.js).
   ========================================================= */
import { t, tm } from '../i18n/index.js'
import { G, state } from '../game/engine.js'
import { ITEMS, CROPS } from '../game/data/items.js'
import { SKILLS } from '../game/data/skills.js'
import { ACTIONS } from '../game/data/actions.js'
import { MONSTERS, BOSSES, DUNGEONS, AREAS, monsterLevel } from '../game/data/combat.js'
import { ECHOES } from '../game/data/echoes.js'
import { QUESTS, QUEST_STAT_ICONS, SHOP } from '../game/data/progression.js'
import { fmt } from '../game/format.js'

const AREA_OF = Object.fromEntries(AREAS.flatMap(a => a.monsters.map(m => [m.id, a])))
const BOSS_IDS = new Set([...BOSSES, ...ECHOES].map(b => b.id))
const DUNGEON_OF = Object.fromEntries(DUNGEONS.map(dg => [dg.boss.id, dg]))
const SHOP_ITEMS = new Set(SHOP.flatMap(c => c.items.map(([id]) => id)))
const xph = (skill, a) => (a.xp * 3600) / G.actionTime(skill, a)

/* ---------------- where things are done ---------------- */
// The creature, in the right tab of the combat screen
export function whereToKill(id) {
  if (BOSS_IDS.has(id)) return { to: { path: '/combat', query: { tab: 'bosses' } }, focus: 'monster:' + id }
  if (DUNGEON_OF[id]) return { to: { path: '/combat', query: { tab: 'dungeons' } }, focus: 'dungeon:' + DUNGEON_OF[id].id }
  return { to: { path: '/combat', query: { tab: 'areas' } }, focus: 'monster:' + id }
}
// Any creature will do: the toughest one the hero can sensibly take on
export function whereToHunt() {
  const cl = G.combatLevel()
  const ok = AREAS.filter(a => G.areaUnlocked(a)).flatMap(a => a.monsters).filter(m => (!m.slayer || G.level('slayer') >= m.slayer) && monsterLevel(m) <= cl + 2)
  const best = ok.sort((a, b) => monsterLevel(b) - monsterLevel(a))[0]
  return best ? whereToKill(best.id) : { to: '/combat' }
}
// The best action of a skill the hero can do right now (or the screen, when none)
export function whereToTrain(skill, depth = 0) {
  if (skill === 'farming') return { to: '/skill/farming' }
  const list = (ACTIONS[skill] || []).filter(a => !a.festival && G.level(skill) >= a.lvl && G.hasTool(a))
  const ready = list.filter(a => G.canDo(skill, a))
  const best = (ready.length ? ready : list).sort((a, b) => xph(skill, b) - xph(skill, a))[0]
  if (!SKILLS[skill] || ['attack', 'strength', 'defense', 'ranged', 'magic', 'hitpoints'].includes(skill)) return { to: '/combat' }
  if (skill === 'slayer') return { to: '/slayer' }
  if (!best) return { to: '/skill/' + skill }
  const go = { to: '/skill/' + skill, focus: 'action:' + best.id }
  // Nothing ready to make: the cheapest action, and what is missing for it
  if (!ready.length) {
    const cheap = list.sort((a, b) => a.lvl - b.lvl)[0]
    go.focus = 'action:' + cheap.id
    const missing = Object.entries(cheap.in || {}).filter(([k, q]) => G.qty(k) < q).map(([k]) => k)
    if (missing.length && depth === 0) go.need = missing.map(k => ({ item: k, go: whereToGet(k, 1) }))
  }
  return go
}
// How to get an item: an action the hero can do, else a creature they can reach, the shop, a crop,
// and failing that the first maker or dropper there is
// `need`: when the action lacks ingredients, what is missing and where to get it (one step back)
export function whereToGet(id, depth = 0) {
  const makers = []
  for (const [skill, list] of Object.entries(ACTIONS)) for (const a of list) {
    if (a.festival) continue
    if (a.out?.[id] || a.catch?.[id]) makers.push({ skill, a, ok: G.level(skill) >= a.lvl && G.hasTool(a) })
  }
  const maker = makers.find(m => m.ok)
  if (maker) {
    const go = { to: '/skill/' + maker.skill, focus: 'action:' + maker.a.id }
    const missing = Object.entries(maker.a.in || {}).filter(([k, q]) => G.qty(k) < q).map(([k]) => k)
    if (missing.length && depth === 0) go.need = missing.map(k => ({ item: k, go: whereToGet(k, 1) }))
    return go
  }
  const crop = CROPS.find(c => c.id === id && !c.festival)
  if (crop && G.level('farming') >= crop.lvl) return { to: '/skill/farming', focus: 'crop:' + crop.id }
  // Creatures that drop it: the likeliest one the hero can take on now
  const cl = G.combatLevel()
  const drops = Object.values(MONSTERS).flatMap(m => m.drops.filter(d => d.item === id).map(d => ({ m, chance: d.chance })))
    .filter(({ m }) => G.areaUnlocked(AREA_OF[m.id]) && (!m.slayer || G.level('slayer') >= m.slayer))
    .sort((a, b) => b.chance - a.chance)
  const safe = drops.find(({ m }) => monsterLevel(m) <= cl + 3)
  if (safe) return whereToKill(safe.m.id)
  if (SHOP_ITEMS.has(id)) return { to: '/shop', focus: 'shop:' + id }
  // Made by a skill not high enough yet: train it up to the level (`level` says which)
  const next = makers.filter(m => m.a.lvl > G.level(m.skill)).sort((a, b) => a.a.lvl - G.level(a.skill) - (b.a.lvl - G.level(b.skill)))[0]
  if (next) return { ...whereToTrain(next.skill, depth), level: { skill: next.skill, lvl: next.a.lvl } }
  if (makers.length) return { to: '/skill/' + makers[0].skill, focus: 'action:' + makers[0].a.id }
  if (drops.length) return { ...whereToKill(drops[0].m.id), tough: true }
  if (crop) return { to: '/skill/farming', focus: 'crop:' + crop.id, level: { skill: 'farming', lvl: crop.lvl } }
  // Anything else: the item's own page, with every place it comes from
  return { to: { path: '/inventory', query: { item: id } } }
}
// Counters of the quests and tasks: the screen where they go up
const STAT_ROUTES = {
  fish: { to: '/skill/fishing' }, patrons: { to: { path: '/tavern', query: { tab: 'bar' } } }, contracts: { to: '/guilds' }, guildRank: { to: '/guilds' },
  bountiful: { to: '/skill/farming', focus: 'plots' }, hybrids: { to: '/skill/farming', focus: 'plots' }, harvest: { to: '/skill/farming', focus: 'plots' },
  superiors: { to: '/slayer' }, slayer: { to: '/slayer' }, heists: { to: '/skill/thieving' }, guardians: { to: '/tower' }, tower: { to: '/tower' },
  masterworks: { to: '/skill/smithing' }, dungeon: { to: { path: '/combat', query: { tab: 'dungeons' } } }, 
  orders: { to: { path: '/tavern', query: { tab: 'orders' } }, focus: 'orders' }, fest: { to: '/festival' },
}
export const whereForStat = key => (['kills', 'elites', 'elite'].includes(key) ? whereToHunt() : STAT_ROUTES[key] || { to: '/quests' })
// Where the hero is busy already, for counters any activity raises
const activityRoute = () => {
  const a = state.activity
  if (a?.type === 'skill') return { to: '/skill/' + a.skill, focus: 'action:' + a.action }
  return { to: '/skill/mining' }
}

/* ---------------- the objectives ---------------- */
function questObjective(q, o) {
  switch (o.type) {
    case 'item': return { item: o.item, text: t('quests.obj.item', { n: o.qty, item: ITEMS[o.item].name }), go: whereToGet(o.item) }
    case 'kill': return { icon: MONSTERS[o.monster].icon, text: t('quests.obj.kill', { n: o.qty, monster: MONSTERS[o.monster].name }), go: whereToKill(o.monster) }
    case 'level': return { icon: SKILLS[o.skill].icon, text: t('quests.obj.level', { lvl: o.lvl, skill: SKILLS[o.skill].name }), go: whereToTrain(o.skill) }
    case 'tower': return { icon: 'stone-tower', text: t('quests.obj.tower', { floor: o.floor }), go: whereForStat('tower') }
    case 'slayer': return { icon: 'death-skull', text: t('quests.obj.slayer', { n: o.tasks }), go: whereForStat('slayer') }
    default: return { icon: QUEST_STAT_ICONS[o.key] || 'scroll-unfurled', text: t(`quests.obj.${o.key}`, { n: o.qty }), go: whereForStat(o.key) }
  }
}
function taskGo(tk) {
  if (tk.type === 'xp') return whereToTrain(tk.skill)
  if (tk.type === 'kill') return whereToKill(tk.monster)
  if (tk.type === 'deliver') return whereToGet(tk.item)
  if (tk.type === 'actions' || tk.type === 'gold') return activityRoute()
  return whereForStat(tk.type)
}

// Everything on the go, the ones ready to hand in first
export function trackedGoals() {
  const out = []
  // Story quests: one line per objective still open, or one to hand the quest in
  for (const q of QUESTS) {
    if (state.quests[q.id]?.status !== 'active') continue
    if (G.questReady(q)) { out.push({ key: 'q:' + q.id, source: 'quest', from: q.name, icon: q.icon, text: t('tracker.handIn'), ready: true, go: { to: '/quests', focus: 'quest:' + q.id } }); continue }
    q.obj.forEach((o, i) => {
      const p = G.objProgress(q, o)
      if (p.cur >= p.max) return
      out.push({ key: `q:${q.id}:${i}`, source: 'quest', from: q.name, cur: p.cur, max: p.max, ...questObjective(q, o) })
    })
  }
  // The story: the ending to choose, or the next page of the journal
  const story = G.nextGoal()
  if (story?.kind === 'ending') out.push({ key: 'story', source: 'story', from: t('tracker.sources.story'), icon: 'crown', text: t('goal.ending'), ready: true, go: { to: story.to } })
  else if (story?.kind === 'story') out.push({ key: 'story:' + story.hint, source: 'story', from: t('tracker.sources.story') + ' · ' + t(`journal.acts.${story.act}`), icon: story.icon, text: t(`journal.hints.${story.hint}`), go: { to: story.to } })
  const sl = state.slayer.task
  if (sl) out.push({ key: 'slayer', source: 'slayer', from: t('tracker.sources.slayer'), icon: MONSTERS[sl.monster]?.icon || 'death-skull',
    text: t('quests.obj.kill', { n: sl.total, monster: MONSTERS[sl.monster]?.name || sl.monster }), cur: sl.total - sl.left, max: sl.total, go: whereToKill(sl.monster) })
  // Guild contracts
  const gs = state.guilds
  for (const [i, c] of (gs?.member ? gs.contracts || [] : []).entries()) {
    if (c.claimed) continue
    const cur = G.taskCur(c), ready = cur >= c.target
    out.push({ key: 'g:' + i, source: 'guild', from: t('tracker.sources.guild'), icon: 'swords-emblem', item: c.type === 'deliver' ? c.item : null,
      text: tm({ key: `guilds.tasks.${c.type}`, params: { n: fmt(c.target), monster: '@monster:' + c.monster, skill: '@skill:' + c.skill, item: '@item:' + c.item } }),
      cur, max: c.target, ready, go: ready ? { to: '/guilds', focus: 'contracts' } : taskGo(c) })
  }
  // Tavern orders
  for (const [i, o] of (state.tavern.orders || []).entries()) {
    if (o.done) continue
    const have = Math.min(G.qty(o.item), o.qty)
    const ready = have >= o.qty
    out.push({ key: 'o:' + i, source: 'order', from: t('tracker.sources.order'), item: o.item, text: t('quests.obj.item', { n: o.qty, item: ITEMS[o.item].name }),
      cur: have, max: o.qty, ready, go: ready ? { to: { path: '/tavern', query: { tab: 'orders' } }, focus: 'orders' } : whereToGet(o.item) })
  }
  // Daily and weekly tasks
  const d = state.daily
  for (const [weekly, list] of [[false, d?.tasks || []], [true, d?.weekly || []]]) list.forEach((tk, i) => {
    if (tk.claimed) return
    const p = G.taskProgress(tk), ready = p.cur >= p.max
    out.push({ key: `${weekly ? 'w' : 'd'}:${i}`, source: weekly ? 'weekly' : 'daily', from: t(`tracker.sources.${weekly ? 'weekly' : 'daily'}`),
      icon: weekly ? 'calendar-half-year' : 'calendar', text: t('daily.task.' + tk.type, { n: fmt(tk.target), skill: tk.skill ? SKILLS[tk.skill].name : '' }),
      cur: p.cur, max: p.max, ready, go: ready ? { to: '/quests', focus: 'tasks' } : taskGo(tk) })
  })
  return out.sort((a, b) => (b.ready ? 1 : 0) - (a.ready ? 1 : 0))
}
