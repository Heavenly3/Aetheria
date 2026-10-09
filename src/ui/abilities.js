// What an ability does, in words, built from its numbers (shared by the ability panel and the arena)
import { t } from '../i18n/index.js'
import { BUFFS } from '../game/data/fighting.js'

export function abilityText(a) {
  const parts = []
  if (a.mult > 0) parts.push(a.hits > 1 ? t('abilities.fx.hits', { n: a.hits, v: Math.round(a.mult * 100) }) : t('abilities.fx.mult', { v: Math.round(a.mult * 100) }))
  if (a.acc) parts.push(t('abilities.fx.acc', { v: Math.round(a.acc * 100) }))
  if (a.crit >= 1) parts.push(t('abilities.fx.alwaysCrit'))
  else if (a.crit) parts.push(t('abilities.fx.crit', { v: Math.round(a.crit * 100) }))
  if (a.fx.length) parts.push(t('abilities.fx.leaves', { list: [...new Set(a.fx)].map(id => t(`fighting.statuses.${id}.name`).toLowerCase()).join(', ') }))
  if (a.heal) parts.push(t('abilities.fx.heal', { v: Math.round(a.heal * 100) }))
  if (a.buff) parts.push(t(`abilities.buffs.${a.buff}`, { t: BUFFS[a.buff].time }))
  return parts.join(' · ')
}
