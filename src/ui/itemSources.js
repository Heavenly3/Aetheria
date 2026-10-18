import { t, intlLocale } from '../i18n/index.js'
import { G } from '../game/engine.js'
import { ITEMS } from '../game/data/items.js'
import { SKILLS } from '../game/data/skills.js'
import { BUILDINGS } from '../game/data/farm.js'
import { sourcesOf } from '../game/data/sources.js'
import { AREAS } from '../game/data/combat.js'

/* Where an item comes from, as rows ready to show: icon, name, the screen it links to, and what it
   asks for (a level, a price) or how likely it is. Used by the inventory and the item tooltips. */

// 12%, 2.5% or 1/400 (rare odds in full: 1/1,000,000 says more than 1/1M)
export const oneIn = c => Math.round(1 / c).toLocaleString(intlLocale())
const chance = c => (c >= 0.1 ? `${Math.round(c * 100)}%` : c >= 0.01 ? `${+(c * 100).toFixed(1)}%` : `1/${oneIn(c)}`)
const lvl = (skill, n) => ({ text: `${SKILLS[skill].name} ${n}`, ok: G.level(skill) >= n, color: SKILLS[skill].color })
const crop = id => t(`crops.${id}`)

function row(s) {
  const odds = s.chance != null && s.chance < 1 ? chance(s.chance) : null
  switch (s.kind) {
    case 'action': return { icon: s.action.icon, tint: s.action.tint, name: s.action.name, to: '/skill/' + s.skill, req: lvl(s.skill, s.action.lvl), odds }
    case 'anyAction': return { icon: SKILLS[s.skill].icon, name: t('inventory.from.anyAction', { skill: SKILLS[s.skill].name }), to: '/skill/' + s.skill, req: lvl(s.skill, s.lvl), odds }
    case 'burnt': return { icon: 'fire', name: t('inventory.from.burnt'), to: '/skill/cooking', req: lvl('cooking', 1) }
    case 'crop': return { icon: s.crop.icon, tint: s.crop.tint, name: t('inventory.from.harvestOf', { crop: crop(s.crop.id) }), to: '/skill/farming', req: lvl('farming', s.crop.lvl) }
    case 'cross': return { icon: s.crop.icon, tint: s.crop.tint, name: t('inventory.from.cross', { a: crop(s.parents[0]), b: crop(s.parents[1]) }), to: '/skill/farming', req: lvl('farming', s.crop.lvl) }
    case 'harvest': return { icon: 'sickle', name: t('inventory.from.harvest'), to: '/skill/farming' }
    case 'building': return { icon: BUILDINGS[s.building].icon, name: t(`farm.buildings.${s.building}.name`), to: '/skill/farming' }
    case 'stolen': return { icon: 'hooded-figure', name: t('inventory.from.stolen'), to: '/skill/thieving', req: lvl('thieving', s.lvl) }
    case 'heist': return { icon: s.heist.icon, name: t(`thief.heists.${s.heist.id}.name`), to: '/skill/thieving', req: lvl('thieving', s.heist.req.thieving) }
    case 'grace': return { icon: 'sprint', name: t('inventory.from.grace'), to: '/skill/agility', price: t('inventory.from.marks', { n: s.price }) }
    case 'shop': return { icon: 'shop', name: t('inventory.from.shop'), to: '/shop', price: t('inventory.from.gold', { n: s.price }) }
    case 'slayerShop': return { icon: 'death-skull', name: t('inventory.from.slayerShop'), to: '/slayer', price: t('inventory.from.points', { n: s.price }) }
    case 'towerShop': return { icon: 'stone-tower', name: t('inventory.from.towerShop'), to: '/tower', price: t('inventory.from.tokens', { n: s.price }) }
    case 'monster': return { icon: s.monster.icon, name: s.monster.name, to: '/combat', odds: odds || t('inventory.from.always') }
    case 'boss':
    case 'echo': return { icon: s.monster.icon, name: s.monster.name, to: '/combat', tag: t(`inventory.from.${s.kind}`), odds: odds || t('inventory.from.always') }
    case 'dungeon': return { icon: s.dungeon.icon, name: s.monster ? `${s.dungeon.name} · ${s.monster.name}` : t('inventory.from.dungeonChest', { name: s.dungeon.name }), to: '/combat', odds: odds || t('inventory.from.always') }
    case 'weekly': return { icon: s.boss.icon, tint: s.boss.tint, name: s.boss.name, to: '/weekly', tag: t('inventory.from.weekly') }
    case 'expedition': return { icon: s.expedition.icon, name: s.expedition.name, to: '/tavern', tag: t('inventory.from.expedition'), odds }
    case 'mythic': return { icon: 'sparkles', name: mythicWhere(s.drop), to: mythicTo(s.drop), odds: chance(s.chance) }
    case 'chest': return { item: s.chest, name: t('inventory.from.chest', { item: ITEMS[s.chest].name }), to: null }
  }
  return null
}
// Where an ultra rare find drops, in words: "Any Mining action", "Any creature in The Abyss"…
export function mythicWhere(d) {
  if (d.on === 'skill') return d.skill ? t('inventory.from.anyAction', { skill: SKILLS[d.skill].name }) : t('mythic.where.anySkill')
  if (d.boss) return t('mythic.where.bosses')
  if (d.tower) return t('mythic.where.tower')
  if (d.areas) return t('mythic.where.areas', { areas: d.areas.map(id => AREAS.find(a => a.id === id).name).join(', ') })
  if (d.monsters) return t('mythic.where.dragons')
  return t('mythic.where.anyKill')
}
const mythicTo = d => (d.on === 'skill' ? (d.skill ? '/skill/' + d.skill : null) : d.tower ? '/tower' : '/combat')

export const sourceRows = id => sourcesOf(id).map(row).filter(Boolean)
