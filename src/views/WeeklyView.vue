<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import { G, state } from '../game/engine.js'
import { ITEMS, STAT_LABELS } from '../game/data/items.js'
import { WEEKLY_BOSSES, WEEKLY_MIN_CL, MILESTONES, ATTEMPT_TIME, ENRAGE_EVERY, ENRAGE_STEP, milestoneReward } from '../game/data/weekly.js'
import { fmt, fmtTime, fmtClock } from '../game/format.js'
import { play } from '../game/sound.js'
import GameIcon from '../components/GameIcon.vue'
import ItemTile from '../components/ItemTile.vue'
import Arena from '../components/Arena.vue'
import HelpTip from '../components/HelpTip.vue'

const { t } = useI18n()

const now = ref(Date.now())
let clock, off
const flash = ref(null)
onMounted(() => {
  clock = setInterval(() => (now.value = Date.now()), 1000)
  // Short notes when the boss uses its mechanic
  off = G.on('weeklyMech', e => {
    flash.value = { text: t(`weekly.mech.${e.kind}`, { n: fmt(e.n || 0) }), id: Date.now() }
    setTimeout(() => { if (flash.value && Date.now() - flash.value.id >= 2900) flash.value = null }, 3000)
  })
})
onUnmounted(() => { clearInterval(clock); off && off() })

const wk = computed(() => G.ensureWeekly())
const boss = computed(() => G.weeklyBoss())
const unlocked = computed(() => G.weeklyUnlocked())
const fighting = computed(() => state.activity?.type === 'combat' && state.activity.kind === 'weekly')
const act = computed(() => (fighting.value ? state.activity : null))
const max = computed(() => G.weeklyMaxHp())
const left = computed(() => G.weeklyHpLeft())
const dealtPct = computed(() => Math.min(100, (wk.value.dealt / max.value) * 100))
const trophy = computed(() => ITEMS[boss.value.trophy])
const trophyStats = computed(() => Object.entries(trophy.value.stats).map(([k, v]) => (k === 'mDmg' ? `+${Math.round(v * 100)}% ${STAT_LABELS[k]}` : `+${v} ${STAT_LABELS[k]}`)).join(' · '))
const ownedTrophy = computed(() => !!wk.value.slain[boss.value.id])

// Time until next Monday
const resetIn = computed(() => {
  const d = new Date(now.value)
  const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + (7 - ((d.getDay() + 6) % 7)))
  return Math.max(0, (next - d) / 1000)
})
const fury = computed(() => (act.value ? +(ENRAGE_STEP ** Math.floor(act.value.t / ENRAGE_EVERY)).toFixed(2) : 1))

function challenge() {
  G.startCombat('weekly', 'weekly')
  if (fighting.value) play('quest')
}
function claim(i) {
  const got = G.claimMilestone(i)
  if (!got) return
  play('rare')
  const list = [`${fmt(got.gold)} ${t('common.gold')}`, ...Object.entries(got.items).map(([k, n]) => `${n}× ${ITEMS[k].name}`), ...(got.relic ? [ITEMS[got.relic].name] : [])]
  G.toast('open-treasure-chest', 'weekly.claimed', { list: list.join(', ') }, 'success')
}
const rewardText = i => {
  const r = milestoneReward(i, G.weeklyCl())
  return [`${fmt(Math.floor(r.gold * G.goldMult()))} ${t('common.gold')}`, ...Object.entries(r.items).map(([k, n]) => `${n}× ${ITEMS[k].name}`), ...(r.relic ? [t('weekly.relic', { q: t(`omens.rarity.${r.relic}`) })] : [])].join(' · ')
}
</script>

<template>
  <div>
    <!-- The week's boss -->
    <div class="banner wb-banner" :style="{ '--c': boss.tint }">
      <GameIcon :name="boss.icon" :size="230" class="banner-ghost" />
      <ItemTile :icon="boss.icon" :tint="boss.tint" size="xl" :tip="false" />
      <div class="grow" style="min-width:0">
        <span class="tag gold"><i class="pi pi-calendar" /> {{ $t('weekly.resetIn', { t: fmtTime(resetIn) }) }}</span>
        <h2 class="banner-title">{{ boss.name }}</h2>
        <p class="banner-desc">{{ boss.desc }}</p>
        <div class="row wrap" style="gap:6px">
          <span class="tag bad" v-tooltip.top="$t('weekly.resistTip')"><i class="pi pi-shield" /> {{ $t('weekly.resists', { style: $t(`combat.types.${boss.resist}`) }) }}</span>
          <span class="tag ok" v-tooltip.top="$t('combat.weakness')"><i class="pi pi-bullseye" /> {{ $t('weekly.weakTo', { style: $t(`combat.types.${boss.weak}`) }) }}</span>
          <span class="tag" v-tooltip.top="$t(`weekly.mechanics.${boss.mechanic}.desc`)"><i class="pi pi-bolt" /> {{ $t(`weekly.mechanics.${boss.mechanic}.name`) }}</span>
        </div>
      </div>
    </div>

    <div class="panel pad" style="margin-bottom:20px">
      <div class="meter-head">
        <b>{{ wk.killed ? $t('weekly.slain') : $t('weekly.pool') }}</b>
        <span class="tnum">{{ fmt(left) }} / {{ fmt(max) }}</span>
      </div>
      <div class="bar thick hp"><i :style="{ width: (left / max) * 100 + '%' }" /></div>
      <div class="row wrap stats-row">
        <span class="small muted">{{ $t('weekly.dealt') }} <b class="tnum">{{ fmt(wk.dealt) }}</b> ({{ dealtPct.toFixed(1) }}%)</span>
        <span class="small muted">{{ $t('weekly.attempts') }} <b class="tnum">{{ wk.attempts }}</b></span>
        <span class="small muted">{{ $t('weekly.best') }} <b class="tnum">{{ fmt(wk.best) }}</b></span>
        <span v-if="wk.cl" class="small faint" v-tooltip.top="$t('weekly.levelTip')">{{ $t('weekly.scaledTo', { n: wk.cl }) }}</span>
      </div>

      <div class="row wrap" style="margin-top:14px;gap:10px">
        <template v-if="!unlocked">
          <span class="small muted"><i class="pi pi-lock" /> {{ $t('weekly.lockedHint', { n: WEEKLY_MIN_CL, cl: G.combatLevel() }) }}</span>
        </template>
        <template v-else-if="wk.killed">
          <span class="small ok-text"><i class="pi pi-check" /> {{ $t('weekly.slainHint') }}</span>
        </template>
        <template v-else>
          <Button v-if="!fighting" :label="$t('weekly.challenge')" icon="pi pi-bolt" @click="challenge" />
          <Button v-else :label="$t('weekly.retreat')" icon="pi pi-flag" severity="secondary" outlined @click="G.stop()" />
          <span class="small faint">{{ $t('weekly.rules', { min: ATTEMPT_TIME / 60 }) }}</span>
        </template>
      </div>
    </div>

    <!-- The attempt in progress -->
    <div v-if="act" class="panel pad" style="margin-bottom:20px">
      <div class="row wrap" style="gap:8px;margin-bottom:10px">
        <span class="tag gold tnum"><i class="pi pi-clock" /> {{ fmtClock(Math.max(0, ATTEMPT_TIME - act.t)) }}</span>
        <span class="tag tnum" :class="{ bad: fury > 1.5 }" v-tooltip.top="$t('weekly.furyTip')"><i class="pi pi-bolt" /> {{ $t('weekly.fury', { x: fury }) }}</span>
        <span class="tag tnum">{{ $t('weekly.thisAttempt', { n: fmt(act.dealt) }) }}</span>
        <span v-if="act.hard > 0" class="tag bad"><i class="pi pi-shield" /> {{ $t('weekly.status.harden') }}</span>
        <span v-if="act.slowT > 0" class="tag bad"><i class="pi pi-asterisk" /> {{ $t('weekly.status.frost') }}</span>
        <span v-if="act.thrall > 0" class="tag bad"><GameIcon name="skeleton" :size="12" /> {{ $t('weekly.status.thrall', { n: fmt(act.thrall) }) }}</span>
        <span class="grow" />
        <Transition name="fade"><span v-if="flash" :key="flash.id" class="small flash">{{ flash.text }}</span></Transition>
      </div>
      <span class="bar thin"><i :style="{ width: (act.t / ATTEMPT_TIME) * 100 + '%' }" /></span>
      <Arena style="margin-top:14px" />
    </div>

    <div class="wb-grid">
      <!-- Milestones -->
      <div class="panel pad">
        <h3 class="panel-title"><GameIcon name="open-treasure-chest" :size="18" /> {{ $t('weekly.milestones') }} <HelpTip k="sections.milestones" /></h3>
        <div v-for="(p, i) in MILESTONES" :key="i" class="ms" :class="{ done: G.milestoneClaimed(i), ready: G.milestoneReached(i) && !G.milestoneClaimed(i) }">
          <span class="ms-pct tnum">{{ p === 1 ? $t('weekly.kill') : Math.round(p * 100) + '%' }}</span>
          <span class="grow small muted" style="min-width:0">{{ rewardText(i) }}</span>
          <Button v-if="G.milestoneClaimed(i)" icon="pi pi-check" text size="small" disabled :aria-label="$t('weekly.claimedLabel')" />
          <Button v-else :label="$t('weekly.claim')" size="small" :severity="G.milestoneReached(i) ? undefined : 'secondary'" :outlined="!G.milestoneReached(i)" :disabled="!G.milestoneReached(i)" @click="claim(i)" />
        </div>
        <p class="small faint" style="margin:10px 0 0">{{ $t('weekly.milestonesHint') }}</p>
      </div>

      <!-- Trophy and the hall of bosses -->
      <div class="panel pad">
        <h3 class="panel-title"><GameIcon name="trophy" :size="18" /> {{ $t('weekly.trophy') }} <HelpTip k="sections.trophy" /></h3>
        <div class="row" style="gap:12px">
          <ItemTile :item="boss.trophy" size="lg" />
          <div class="grow" style="min-width:0">
            <b>{{ trophy.name }}</b>
            <div class="small ok-text">{{ trophyStats }}</div>
            <div class="small faint">{{ ownedTrophy ? $t('weekly.trophyOwned') : $t('weekly.trophyHint') }}</div>
          </div>
        </div>
        <div class="section-title" style="margin-top:18px">{{ $t('weekly.hall') }} <HelpTip k="sections.hall" /></div>
        <div class="hall">
          <div v-for="b in WEEKLY_BOSSES" :key="b.id" class="hall-row" :class="{ met: wk.slain[b.id] || b.id === boss.id }">
            <ItemTile :icon="b.icon" :tint="wk.slain[b.id] || b.id === boss.id ? b.tint : '#2a2838'" size="sm" :tip="false" />
            <span class="grow small">{{ wk.slain[b.id] || b.id === boss.id ? b.name : '???' }}</span>
            <span v-if="wk.slain[b.id]" class="tag ok tnum">×{{ wk.slain[b.id] }}</span>
            <span v-else-if="b.id === boss.id" class="tag gold">{{ $t('weekly.thisWeek') }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wb-banner { --c: #b38cff; }
.meter-head { display: flex; justify-content: space-between; gap: 10px; margin-bottom: 6px; }
.stats-row { gap: 16px; margin-top: 10px; }
.flash { color: var(--warn); font-weight: 600; }
.wb-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; align-items: start; }
.ms { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px dashed var(--line); }
.ms:last-of-type { border-bottom: 0; }
.ms-pct { width: 58px; font-weight: 700; color: var(--muted); }
.ms.ready .ms-pct { color: var(--gold); }
.ms.done { opacity: 0.6; }
.hall { display: grid; gap: 6px; }
.hall-row { display: flex; align-items: center; gap: 10px; opacity: 0.6; }
.hall-row.met { opacity: 1; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
@media (max-width: 900px) { .wb-grid { grid-template-columns: 1fr; } }
</style>
