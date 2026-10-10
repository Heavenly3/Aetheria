<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { G, state } from '../game/engine.js'
import { SKILLS } from '../game/data/skills.js'
import { ACHIEVEMENTS } from '../game/data/progression.js'
import { CHAPTERS } from '../game/data/journal.js'
import { HYBRIDS } from '../game/data/farm.js'
import { RANKS } from '../game/data/guilds.js'
import { CRAFTED_COUNT } from '../game/data/codex.js'
import { WEEKLY_BOSSES } from '../game/data/weekly.js'
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

// Records, one block per part of the game
const gold = n => t('inventory.goldAmount', { n: fmt(n) })
const sum = o => Object.values(o || {}).reduce((x, y) => x + y, 0)
const blocks = computed(() => {
  const st = state.stats, q = st.quality || {}
  const codex = G.codexProgress(), rank = G.bestGuildRank()
  return [
    { id: 'general', icon: 'hourglass', rows: [
      ['playTime', fmtTime(st.playTime)], ['heroActions', fmt(st.actions)], ['goldEarned', fmt(st.goldEarned)],
      ['achievements', `${Object.keys(state.achievements).length} / ${ACHIEVEMENTS.length}`], ['deaths', fmt(st.deaths)], ['ascensions', fmt(state.ascension?.count || 0)],
    ] },
    { id: 'combat', icon: 'crossed-swords', rows: [
      ['kills', fmt(st.kills)], ['elites', fmt(st.elites || 0)], ['superiors', fmt(st.superiors || 0)], ['bestStreak', fmt(state.hunt?.best || 0)],
      ['dungeons', fmt(st.dungeons || 0)], ['towerBest', fmt(state.tower.best)], ['guardians', fmt(Object.keys(state.tower.cleared || {}).length)],
      ['slayerTasks', fmt(state.slayer.completed)], ['weeklySlain', `${G.weeklySlainCount()} / ${WEEKLY_BOSSES.length}`],
    ] },
    { id: 'gathering', icon: 'sickle', rows: [
      ['harvests', fmt(st.harvests || 0)], ['bountiful', fmt(st.bountiful || 0)], ['hybrids', `${G.hybridsKnown()} / ${HYBRIDS.length}`], ['fish', fmt(st.fish || 0)],
      ['heists', fmt(sum(state.thief?.done))], ['jailed', fmt(st.jailed || 0)], ['fenced', gold(st.fenced || 0)],
    ] },
    { id: 'craft', icon: 'anvil-impact', rows: [
      ['fine', fmt(q[1] || 0)], ['superior', fmt(q[2] || 0)], ['masterworkRolls', fmt(q[3] || 0)], ['masterworks', `${G.masterworks()} / ${CRAFTED_COUNT}`],
      ['codexItems', `${codex.done} / ${codex.total}`], ['codexPages', fmt(Object.keys(state.codex?.claimed || {}).filter(k => k.startsWith('page:')).length)],
    ] },
    { id: 'town', icon: 'beer-horn', rows: [
      ['staffActions', fmt(st.workerActions || 0)], ['wages', gold(st.wages || 0)], ['expeditions', fmt(st.expeditions || 0)], ['orders', fmt(st.orders || 0)],
      ['patrons', fmt(st.patrons || 0)], ['guests', fmt(st.guests || 0)], ['tavernRep', fmt(state.tavern.rep || 0)],
      ['dice', gold((state.tavern.dice.net >= 0 ? '+' : '') + fmt(state.tavern.dice.net))],
      ['guildRank', rank >= 0 ? t(`guilds.ranks.${RANKS[rank].id}`) : '—'], ['contracts', fmt(st.contracts || 0)], ['favour', fmt(G.favourLevel())],
    ] },
    { id: 'story', icon: 'quill-ink', rows: [
      ['chapters', `${CHAPTERS.filter(c => G.chapterUnlocked(c.id)).length} / ${CHAPTERS.length}`], ['omens', fmt(G.omensSeen())], ['wishes', fmt(G.wishCount())],
    ] },
  ]
})
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
      </div>
    </div>

    <!-- Records of every part of the game -->
    <div class="section-title" style="margin-top:24px">{{ $t('statsView.records') }}</div>
    <div class="grid-wide records">
      <div v-for="b in blocks" :key="b.id" class="panel pad">
        <h3 class="panel-title"><GameIcon :name="b.icon" /> {{ $t(`statsView.blocks.${b.id}`) }}</h3>
        <div v-for="[k, v] in b.rows" :key="k" class="kv"><span>{{ $t(`statsView.rows.${k}`) }}</span><b class="tnum">{{ v }}</b></div>
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
.xp-track { height: 10px; border-radius: 4px; background: var(--tint-2); overflow: hidden; }
.xp-track i { display: block; height: 100%; border-start-end-radius: 4px; border-end-end-radius: 4px; }
.xp-val { text-align: end; color: var(--ink); }
@media (max-width: 900px) { .tiles { grid-template-columns: repeat(2, 1fr); } }
</style>
