<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { G, state } from '../game/engine.js'
import { SKILLS } from '../game/data/skills.js'
import { fmt, fmtTime } from '../game/format.js'
import LineChart from '../components/LineChart.vue'
import GameIcon from '../components/GameIcon.vue'

const { t } = useI18n()
const MARK = '#b9832c' // checked against the dark surface

// Hourly rates between consecutive samples
const rates = key => computed(() => {
  const h = state.history
  const out = []
  for (let i = 1; i < h.length; i++) {
    const hours = (h[i].t - h[i - 1].t) / 3_600_000
    if (hours <= 0) continue
    out.push({ t: h[i].t, v: Math.max(0, (h[i][key] - h[i - 1][key]) / hours) })
  }
  return out
})
const xpRate = rates('xp')
const goldRate = rates('gold')
const killRate = rates('kills')

// Average over the last hour
const lastHour = key => computed(() => {
  const h = state.history
  if (h.length < 2) return 0
  const end = h[h.length - 1]
  const start = [...h].reverse().find(p => end.t - p.t >= 3_600_000) || h[0]
  const hours = (end.t - start.t) / 3_600_000
  return hours > 0 ? (end[key] - start[key]) / hours : 0
})
const xpH = lastHour('xp'), goldH = lastHour('gold'), killsH = lastHour('kills'), actionsH = lastHour('actions')

const bySkill = computed(() => Object.entries(SKILLS)
  .map(([id, s]) => ({ id, ...s, xp: state.skills[id].xp, lvl: G.level(id) }))
  .sort((a, b) => b.xp - a.xp))
const maxXp = computed(() => Math.max(1, ...bySkill.value.map(s => s.xp)))

const counters = computed(() => [
  { label: t('hero.playTime'), v: fmtTime(state.stats.playTime) },
  { label: t('statsView.heroActions'), v: fmt(state.stats.actions) },
  { label: t('statsView.staffActions'), v: fmt(state.stats.workerActions || 0) },
  { label: t('statsView.wages'), v: t('inventory.goldAmount', { n: fmt(state.stats.wages || 0) }) },
  { label: t('statsView.expeditions'), v: fmt(state.stats.expeditions || 0) },
  { label: t('statsView.orders'), v: fmt(state.stats.orders || 0) },
  { label: t('statsView.dungeons'), v: fmt(state.stats.dungeons || 0) },
  { label: t('hero.harvests'), v: fmt(state.stats.harvests || 0) },
  { label: t('hero.kills'), v: fmt(state.stats.kills) },
  { label: t('hero.deaths'), v: fmt(state.stats.deaths) },
  { label: t('statsView.dice'), v: t('inventory.goldAmount', { n: (state.tavern.dice.net >= 0 ? '+' : '') + fmt(state.tavern.dice.net) }) },
  { label: t('hero.goldEarned'), v: fmt(state.stats.goldEarned) },
])
</script>

<template>
  <div>
    <div class="tiles">
      <div class="panel pad tile-stat"><span class="small muted">{{ $t('statsView.xpHour') }}</span><b>{{ fmt(xpH) }}</b><span class="faint small">{{ $t('statsView.lastHourAvg') }}</span></div>
      <div class="panel pad tile-stat"><span class="small muted">{{ $t('statsView.goldHour') }}</span><b>{{ fmt(goldH) }}</b><span class="faint small">{{ $t('statsView.lastHourAvg') }}</span></div>
      <div class="panel pad tile-stat"><span class="small muted">{{ $t('statsView.killsHour') }}</span><b>{{ fmt(killsH) }}</b><span class="faint small">{{ $t('statsView.lastHourAvg') }}</span></div>
      <div class="panel pad tile-stat"><span class="small muted">{{ $t('statsView.actionsHour') }}</span><b>{{ fmt(actionsH) }}</b><span class="faint small">{{ $t('statsView.lastHourAvg') }}</span></div>
    </div>

    <div class="two-col" style="margin-top:18px">
      <div class="panel pad">
        <h3 class="panel-title"><GameIcon name="histogram" /> {{ $t('statsView.xpHour') }} · {{ $t('statsView.last24') }}</h3>
        <LineChart :points="xpRate" :unit="$t('statsView.xpUnit')" :label="$t('statsView.xpHour')" :color="MARK" />
      </div>
      <div class="panel pad">
        <h3 class="panel-title"><GameIcon name="two-coins" /> {{ $t('statsView.goldHour') }} · {{ $t('statsView.last24') }}</h3>
        <LineChart :points="goldRate" :unit="$t('statsView.goldUnit')" :label="$t('statsView.goldHour')" :color="MARK" />
      </div>
    </div>

    <div class="two-col" style="margin-top:18px">
      <div class="panel pad">
        <h3 class="panel-title"><GameIcon name="star-medal" /> {{ $t('statsView.xpBySkill') }}</h3>
        <div class="xp-bars">
          <div v-for="s in bySkill" :key="s.id" class="xp-row" v-tooltip.top="$t('statsView.skillTip', { skill: s.name, xp: fmt(s.xp), lvl: s.lvl })">
            <span class="xp-name"><GameIcon :name="s.icon" :size="14" /> {{ s.name }}</span>
            <span class="xp-track"><i :style="{ width: Math.max(0.5, (s.xp / maxXp) * 100) + '%', background: MARK }" /></span>
            <span class="xp-val tnum">{{ fmt(s.xp) }}</span>
          </div>
        </div>
      </div>
      <div class="stack" style="gap:18px">
        <div class="panel pad">
          <h3 class="panel-title"><GameIcon name="crossed-swords" /> {{ $t('statsView.killsHour') }}</h3>
          <LineChart :points="killRate" :unit="$t('statsView.perHour')" :label="$t('statsView.killsHour')" :color="MARK" />
        </div>
        <div class="panel pad">
          <h3 class="panel-title"><GameIcon name="scroll-unfurled" /> {{ $t('statsView.counters') }}</h3>
          <div class="counters">
            <div v-for="c in counters" :key="c.label" class="kv"><span>{{ c.label }}</span><b>{{ c.v }}</b></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tiles { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
.tile-stat { display: flex; flex-direction: column; gap: 2px; }
.tile-stat b { font-family: var(--font); font-weight: 800; font-size: 30px; color: var(--ink); font-variant-numeric: tabular-nums; }
.xp-bars { display: flex; flex-direction: column; gap: 6px; }
.xp-row { display: grid; grid-template-columns: 130px 1fr 70px; align-items: center; gap: 10px; font-size: 13px; }
.xp-name { display: flex; align-items: center; gap: 6px; color: var(--muted); white-space: nowrap; overflow: hidden; }
.xp-track { height: 10px; border-radius: 4px; background: rgba(255, 255, 255, 0.04); overflow: hidden; }
.xp-track i { display: block; height: 100%; border-start-end-radius: 4px; border-end-end-radius: 4px; }
.xp-val { text-align: end; color: var(--ink); }
.counters { columns: 2; column-gap: 24px; }
.counters .kv { break-inside: avoid; }
@media (max-width: 900px) { .tiles { grid-template-columns: repeat(2, 1fr); } .counters { columns: 1; } }
</style>
