<script setup>
import { computed } from 'vue'
import { G, state } from '../game/engine.js'
import { COMBAT_STYLES } from '../game/data/combat.js'
import { fmt, fmtDec, pct } from '../game/format.js'
import GameIcon from './GameIcon.vue'
import HelpTip from './HelpTip.vue'

// The hero's fighting numbers, worked out against an opponent of the same combat level
const p = computed(() => (void state.equipment, G.combatProfile()))
const style = computed(() => COMBAT_STYLES[state.combatStyle])
const num = fmtDec
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
        <div v-for="r in offence" :key="r.k" class="kv"><span>{{ $t(`power.${r.k}`) }} <HelpTip :k="'power.' + r.k" /></span><b :class="{ 'gold-text': r.gold }">{{ r.v }}</b></div>
      </div>
      <div>
        <div class="section-title sm">{{ $t('power.defence') }}</div>
        <div v-for="r in defence" :key="r.k" class="kv"><span>{{ $t(`power.${r.k}`) }} <HelpTip :k="'power.' + r.k" /></span><b :class="{ 'gold-text': r.gold }">{{ r.v }}</b></div>
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
.section-title.sm { margin: 10px 0 4px; font-size: 12px; }
</style>
