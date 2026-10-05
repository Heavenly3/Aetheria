<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import { G, state } from '../game/engine.js'
import { SKILLS } from '../game/data/skills.js'
import { STREAK_BONUS, STREAK_CAP } from '../game/meta.js'
import { fmt, fmtTime } from '../game/format.js'
import { play } from '../game/sound.js'
import GameIcon from './GameIcon.vue'

const { t } = useI18n()
const now = ref(Date.now())
let timer
onMounted(() => { G.ensureTasks(); timer = setInterval(() => (now.value = Date.now()), 1000) })
onUnmounted(() => clearInterval(timer))

const d = computed(() => state.daily)
const streak = computed(() => G.currentStreak())
const untilMidnight = computed(() => { const x = new Date(now.value); x.setHours(24, 0, 0, 0); return (x - now.value) / 1000 })
const untilMonday = computed(() => {
  const x = new Date(now.value)
  x.setDate(x.getDate() + ((8 - x.getDay()) % 7 || 7))
  x.setHours(0, 0, 0, 0)
  return (x - now.value) / 1000
})
const ICONS = { xp: 'star-medal', actions: 'hourglass', kills: 'crossed-swords', gold: 'two-coins', harvest: 'sickle', dungeon: 'open-treasure-chest', orders: 'beer-horn', slayer: 'death-skull' }
const label = tk => t('daily.task.' + tk.type, { n: fmt(tk.target), skill: tk.skill ? SKILLS[tk.skill].name : '' })
const icon = tk => (tk.type === 'xp' ? SKILLS[tk.skill].icon : ICONS[tk.type])

function claim(i, weekly) {
  const r = G.claimTask(i, weekly)
  if (!r) return
  play('coin')
  G.toast('scroll-unfurled', 'daily.claimed', { gold: fmt(r.gold), tokens: r.tokens }, 'success')
}
</script>

<template>
  <div class="daily">
    <div class="panel pad streak-card">
      <div class="flame" :class="{ lit: streak > 0 }"><GameIcon name="flame" :size="34" /></div>
      <div class="grow">
        <div class="streak-n">{{ streak ? $t('daily.streak', { n: streak }) : $t('daily.noStreak') }}</div>
        <div class="small muted">{{ $t('daily.streakHint', { v: Math.round(Math.min(STREAK_CAP, streak) * STREAK_BONUS * 100), cap: STREAK_CAP }) }}</div>
      </div>
      <div class="small faint tnum" style="text-align:end">
        <div>{{ $t('daily.best', { n: d.bestStreak || 0 }) }}</div>
        <div>{{ $t('daily.claimedTotal', { n: d.claimed || 0 }) }}</div>
      </div>
    </div>

    <div class="two-col">
      <div v-for="group in [{ weekly: false, list: d.tasks, reset: untilMidnight }, { weekly: true, list: d.weekly, reset: untilMonday }]" :key="String(group.weekly)">
        <div class="row" style="margin-bottom:10px">
          <h3 class="panel-title grow" style="margin:0">
            <GameIcon :name="group.weekly ? 'calendar-half-year' : 'calendar'" /> {{ group.weekly ? $t('daily.weeklyTitle') : $t('daily.dailyTitle') }}
          </h3>
          <span class="small faint tnum">{{ $t('daily.resets', { time: fmtTime(group.reset) }) }}</span>
        </div>
        <div class="stack" style="gap:8px">
          <div v-for="(tk, i) in group.list" :key="i" class="task" :class="{ done: tk.claimed, ready: !tk.claimed && G.taskDone(tk) }">
            <span class="t-icon"><GameIcon :name="icon(tk)" :size="18" /></span>
            <div class="grow" style="min-width:0">
              <div class="row small"><b class="grow">{{ label(tk) }}</b><span class="tnum muted">{{ fmt(G.taskProgress(tk).cur) }}/{{ fmt(tk.target) }}</span></div>
              <div class="bar thin" style="margin-top:6px"><i :style="{ width: (G.taskProgress(tk).cur / tk.target) * 100 + '%' }" /></div>
              <div class="small faint" style="margin-top:4px">
                {{ $t('daily.reward', { gold: fmt(G.taskReward(tk, group.weekly).gold), tokens: G.taskReward(tk, group.weekly).tokens }) }}<template v-if="group.weekly"> · {{ $t('daily.chest') }}</template>
              </div>
            </div>
            <i v-if="tk.claimed" class="pi pi-check-circle ok-text" style="font-size:20px" />
            <Button v-else :label="$t('daily.claim')" size="small" :disabled="!G.taskDone(tk)" @click="claim(i, group.weekly)" />
          </div>
        </div>
      </div>
    </div>
    <p class="small faint" style="margin:10px 0 0">{{ $t('daily.allBonus') }}</p>
  </div>
</template>

<style scoped>
.daily { margin-bottom: 26px; }
.streak-card { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; }
.flame { width: 56px; height: 56px; border-radius: 16px; display: grid; place-items: center; color: var(--faint); background: rgba(255, 255, 255, 0.04); border: 1px solid var(--line); }
.flame.lit { color: #ff9a3c; background: rgba(255, 140, 60, 0.12); border-color: rgba(255, 140, 60, 0.4); box-shadow: 0 0 26px -6px rgba(255, 140, 60, 0.7); }
.streak-n { font-family: var(--font-display); font-size: 22px; }
.task { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 14px; background: var(--panel); border: 1px solid var(--line); }
.task.ready { border-color: rgba(98, 193, 126, 0.55); box-shadow: 0 0 20px -10px rgba(98, 193, 126, 0.8); }
.task.done { opacity: 0.55; }
.t-icon { width: 36px; height: 36px; flex-shrink: 0; border-radius: 10px; display: grid; place-items: center; color: var(--gold); background: rgba(226, 182, 90, 0.08); border: 1px solid rgba(226, 182, 90, 0.2); }
</style>
