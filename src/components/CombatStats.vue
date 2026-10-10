<script setup>
import { computed } from 'vue'
import { G, state } from '../game/engine.js'
import { COMBAT_STYLES } from '../game/data/combat.js'
import { fmt, fmtDec, pct } from '../game/format.js'
import { useI18n } from 'vue-i18n'
import { tip } from '../ui/tips.js'
import GameIcon from './GameIcon.vue'
import HelpTip from './HelpTip.vue'

// The hero's fighting numbers, worked out against an opponent of the same combat level
const p = computed(() => (void state.equipment, G.combatProfile()))
const style = computed(() => COMBAT_STYLES[state.combatStyle])
const num = fmtDec
const { t } = useI18n()
// Where a number comes from: its base and every bonus on top, for the tooltip on the value
const srcName = src => (src.startsWith('attr.') ? t(`attributes.${src.slice(5)}.name`) : t(`power.src.${src}`))
const sign = v => (v >= 0 ? '+' : '−') + pct(Math.abs(v), 1)
function breakdown(k) {
  const keys = { crit: 'crit', speed: 'atkSpeed', dodge: 'dodge', block: 'block', reduction: 'reduction' }
  const key = keys[k]
  if (!key) return null
  const lines = []
  if (k === 'crit') lines.push({ text: `${t('power.base.weapon')}: ${pct(G.weapon().crit, 1)}`, kind: 'muted' })
  if (k === 'speed') lines.push({ text: `${t('power.base.weapon')}: ${num(G.weapon().speed)} s`, kind: 'muted' })
  if (k === 'dodge') lines.push({ text: `${t('power.base.agility', { n: G.level('agility') })}: ${pct(G.level('agility') * 0.0015, 1)}`, kind: 'muted' })
  if (k === 'block') lines.push({ text: state.equipment.shield ? `${t('power.base.shield')}: 12%` : t('power.base.noShield'), kind: 'muted' })
  if (k === 'reduction') { const d = Math.max(0, G.bonuses().def); lines.push({ text: `${t('power.base.armour', { n: d })}: ${pct(d / (d + 600), 1)}`, kind: 'muted' }) }
  for (const s of G.modSources(key)) lines.push({ text: `${srcName(s.src)}: ${sign(s.v)}`, kind: s.v > 0 ? 'ok' : 'bad' })
  if (lines.length === 1) lines.push({ text: t('power.noBonus'), kind: 'muted' })
  return tip(t(`power.${k}`), t(`power.why.${k}`), lines)
}
const offence = computed(() => [
  { k: 'dps', v: num(p.value.dps), gold: true },
  { k: 'maxHit', v: fmt(p.value.maxHit) },
  { k: 'avgHit', v: num(p.value.avgHit) },
  { k: 'speed', v: `${num(p.value.speed)} s` },
  { k: 'accuracy', v: pct(p.value.accuracy) },
  { k: 'crit', v: `${pct(p.value.crit)} · ×${num(p.value.critMult, 2)}` },
  { k: 'accRoll', v: fmt(p.value.accRoll) },
])
const defence = computed(() => [
  { k: 'maxHp', v: fmt(p.value.maxHp), gold: true },
  { k: 'defRoll', v: fmt(p.value.defRoll) },
  { k: 'hitTaken', v: pct(p.value.hitTaken) },
  { k: 'reduction', v: pct(p.value.reduction) },
  { k: 'dodge', v: pct(p.value.dodge) },
  { k: 'block', v: p.value.block ? pct(p.value.block) : '—' },
  { k: 'takenPerSec', v: num(p.value.takenPerSec) },
])
</script>

<template>
  <div class="panel pad">
    <h3 class="panel-title"><GameIcon name="crossed-swords" /> {{ $t('power.title') }} <HelpTip k="sections.power" /></h3>
    <div class="power">
      <span class="power-n tnum">{{ fmt(p.power) }}</span>
      <span class="small muted">{{ $t('power.label') }} · <GameIcon :name="style.icon" :size="12" /> {{ style.name }}</span>
    </div>
    <div class="cols">
      <div>
        <div class="section-title sm">{{ $t('power.offence') }}</div>
        <div v-for="r in offence" :key="r.k" class="kv"><span>{{ $t(`power.${r.k}`) }} <HelpTip :k="'power.' + r.k" /></span><b :class="{ 'gold-text': r.gold, why: breakdown(r.k) }" v-tooltip.left="breakdown(r.k)">{{ r.v }}</b></div>
      </div>
      <div>
        <div class="section-title sm">{{ $t('power.defence') }}</div>
        <div v-for="r in defence" :key="r.k" class="kv"><span>{{ $t(`power.${r.k}`) }} <HelpTip :k="'power.' + r.k" /></span><b :class="{ 'gold-text': r.gold, why: breakdown(r.k) }" v-tooltip.left="breakdown(r.k)">{{ r.v }}</b></div>
      </div>
    </div>
    <p class="small faint" style="margin:12px 0 0">{{ $t('power.note', { lvl: G.combatLevel() }) }}</p>
  </div>
</template>

<style scoped>
.power { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; margin-bottom: 8px; }
.power-n { font-family: var(--font-display); font-size: 40px; line-height: 1; background: var(--gold-grad); -webkit-background-clip: text; background-clip: text; color: transparent; }
.cols { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 0 22px; }
.kv b { white-space: nowrap; }
.kv b.why { cursor: help; text-decoration: underline dotted color-mix(in srgb, currentColor 40%, transparent); text-underline-offset: 3px; }
.section-title.sm { margin: 10px 0 4px; font-size: 12px; }
</style>
