<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import Button from 'primevue/button'
import { G, state } from '../game/engine.js'
import { ARM_RIVALS, ARM_TIME, ARM_PRESS } from '../game/data/tavern.js'
import { fmt } from '../game/format.js'
import { play } from '../game/sound.js'
import ItemTile from './ItemTile.vue'
import GameIcon from './GameIcon.vue'
import GameTable from './GameTable.vue'
import BetInput from './BetInput.vue'

// Arm wrestling up a ladder of regulars: beat one to face the next. Press to push, the rival pushes
// back without rest and leans in harder in bursts
const bet = ref(Math.min(100, Math.max(10, G.maxBet())))
const game = computed(() => (void state.tavern.games, G.table('arm')))
const round = computed(() => game.value.round)
const playing = computed(() => G.tableOpen('arm'))
const top = computed(() => (void game.value.beaten, G.armTop()))
// The rival chosen: the highest open rung, unless the hero picks a lower one
const rival = ref(ARM_RIVALS[G.armTop()].id)
watch(top, i => { if (!playing.value) rival.value = ARM_RIVALS[i].id })
const foe = computed(() => ARM_RIVALS.find(r => r.id === (round.value?.rival || rival.value)))
const foeIndex = computed(() => ARM_RIVALS.indexOf(foe.value))

// Where the arms stand: 0 is the rival's win, 1 the hero's; the seconds left; whether the rival surges
const at = ref(0.5)
const left = ref(ARM_TIME)
const surging = ref(false)
const pushes = ref(0)
let raf = 0, last = 0, lastPress = 0
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000)
  last = now
  const surge = 1 + 0.6 * Math.max(0, Math.sin(now / 420) * Math.sin(now / 1030))
  surging.value = surge > 1.25
  at.value = Math.max(0, at.value - foe.value.force * surge * dt)
  left.value -= dt
  if (at.value <= 0 || left.value <= 0) return finish(at.value > 0.5)
  raf = requestAnimationFrame(frame)
}
function start() {
  G.tableClear('arm')
  if (!G.armStart(bet.value, rival.value)) return G.toast('biceps', 'tavern.badBet', {}, 'warn')
  at.value = 0.5
  left.value = ARM_TIME
  play('dice')
  last = performance.now()
  raf = requestAnimationFrame(frame)
}
// Presses closer together than ARM_PRESS do not count: strength, not frantic tapping, wins
function push() {
  if (!playing.value) return
  const now = performance.now()
  if ((now - lastPress) / 1000 < ARM_PRESS) return
  lastPress = now
  at.value = Math.min(1, at.value + G.armPush())
  pushes.value++
  if (at.value >= 1) finish(true)
}
function finish(won) {
  cancelAnimationFrame(raf)
  const r = G.armEnd(won)
  if (r) play(won ? 'coin' : 'bad')
}
function onKey(e) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); push() } }
// Walking away from the table, or coming back to one left mid-bout, gives the bout up
onUnmounted(() => { cancelAnimationFrame(raf); if (playing.value) G.armEnd(false) })
onMounted(() => { if (playing.value) G.armEnd(false) })
</script>

<template>
  <GameTable icon="biceps" :title="$t('tavern.arm.title')" help="sections.arm" :stats="game"
    :extra="[{ label: $t('tavern.arm.ladderTop'), value: `${top + 1} / ${ARM_RIVALS.length}` }]">
    <!-- The ladder: each rival beaten opens the next -->
    <div class="ladder" role="radiogroup" :aria-label="$t('tavern.arm.ladder')">
      <button v-for="(r, i) in ARM_RIVALS" :key="r.id" type="button" role="radio" class="rung" :class="{ on: foe.id === r.id, locked: i > top, beaten: game.beaten?.[r.id] }"
        :aria-checked="foe.id === r.id" :disabled="playing || i > top" :aria-label="i > top ? $t('tavern.arm.lockedRung') : $t(`tavern.arm.rivals.${r.id}`)" @click="rival = r.id">
        <ItemTile :icon="i > top ? 'padlock' : r.icon" :tint="i > top ? '#2a2838' : '#6b4a2a'" size="sm" :tip="false" />
        <small class="tnum">×{{ r.mult }}</small>
        <i v-if="game.beaten?.[r.id]" class="pi pi-check check" aria-hidden="true" />
      </button>
    </div>

    <!-- The bout -->
    <div class="bout" :tabindex="playing ? 0 : -1" :aria-label="$t('tavern.arm.area')" @keydown="onKey">
      <div class="fighter">
        <ItemTile :icon="state.avatar" :tint="state.tint || '#6a3fbf'" size="lg" :tip="false" />
        <b>{{ state.name }}</b>
      </div>
      <div class="clinch">
        <div class="clock tnum" :class="{ low: playing && left < 4 }">{{ playing ? Math.max(0, left).toFixed(1) : ARM_TIME.toFixed(0) }}<small>s</small></div>
        <div class="meter" role="progressbar" :aria-label="$t('tavern.arm.area')" aria-valuemin="0" aria-valuemax="100" :aria-valuenow="Math.round(at * 100)">
          <span class="half mine" /><span class="half theirs" />
          <span class="centre" />
          <span :key="pushes" class="knob" :class="{ shove: playing }" :style="{ left: at * 100 + '%' }"><GameIcon name="biceps" :size="20" /></span>
        </div>
        <div class="callout small" :class="{ show: playing && surging }">{{ $t('tavern.arm.surge', { rival: $t(`tavern.arm.rivals.${foe.id}`) }) }}</div>
      </div>
      <div class="fighter">
        <ItemTile :icon="foe.icon" tint="#7a2a32" size="lg" :tip="false" />
        <b>{{ $t(`tavern.arm.rivals.${foe.id}`) }}</b>
        <small class="muted">{{ $t('tavern.arm.rung', { n: foeIndex + 1, of: ARM_RIVALS.length }) }}</small>
      </div>
    </div>

    <div v-if="round?.result" :key="'r' + game.played" class="banner-result pop" :class="round.result.net > 0 ? 'win' : 'loss'" role="status">
      <b>{{ $t(`tavern.arm.results.${round.result.kind}`, { rival: $t(`tavern.arm.rivals.${round.rival}`) }) }}</b>
      <span class="tnum">{{ $t('inventory.goldAmount', { n: (round.result.net > 0 ? '+' : '') + fmt(round.result.net) }) }}</span>
      <small v-if="round.result.kind === 'win' && foeIndex === top - 1 && top < ARM_RIVALS.length" class="muted">{{ $t('tavern.arm.next', { rival: $t(`tavern.arm.rivals.${ARM_RIVALS[top].id}`) }) }}</small>
    </div>

    <template #controls>
      <template v-if="playing">
        <Button :label="$t('tavern.arm.push')" icon="pi pi-angle-double-right" fluid size="large" @click="push" />
        <div class="small faint">{{ $t('tavern.arm.hint') }}</div>
      </template>
      <template v-else>
        <BetInput v-model="bet" id="arm-bet" />
        <Button :label="$t('tavern.arm.start', { rival: $t(`tavern.arm.rivals.${foe.id}`), x: foe.mult })" icon="pi pi-bolt" fluid @click="start" />
      </template>
    </template>
  </GameTable>
</template>

<style scoped>
.ladder { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 6px; }
.rung { position: relative; display: grid; justify-items: center; gap: 4px; padding: 6px 2px; border-radius: 10px; border: 1px solid var(--line); background: var(--panel-solid);
  color: var(--ink-2); font: inherit; cursor: pointer; transition: border-color 0.15s, transform 0.15s; }
.rung small { font-size: 11.5px; font-weight: 700; }
.rung.on { border-color: var(--gold); transform: translateY(-2px); box-shadow: 0 0 14px -6px var(--gold); }
.rung.locked { opacity: 0.55; cursor: default; }
.rung:disabled:not(.locked) { cursor: default; }
.rung:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }
.check { position: absolute; top: 4px; right: 5px; font-size: 10px; color: var(--ok); }
.bout { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 16px; padding: 8px 0; border-radius: 12px; }
.bout:focus-visible { outline: 2px solid var(--gold); outline-offset: 4px; }
.fighter { display: grid; justify-items: center; gap: 4px; text-align: center; max-width: 120px; }
.fighter b { font-size: 13.5px; }
.clinch { display: grid; gap: 10px; justify-items: center; }
.clock { font-family: var(--font-display); font-size: 30px; color: var(--ink); line-height: 1; }
.clock small { font-size: 15px; margin-inline-start: 2px; color: var(--muted); }
.clock.low { color: var(--tag-bad); }
.meter { position: relative; width: 100%; height: 22px; border-radius: 12px; overflow: visible; background: var(--panel-solid); border: 1px solid var(--line-hi); display: flex; }
.half { flex: 1; }
.half.mine { border-radius: 12px 0 0 12px; background: linear-gradient(90deg, color-mix(in srgb, var(--danger) 45%, transparent), transparent); }
.half.theirs { border-radius: 0 12px 12px 0; background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--ok) 45%, transparent)); }
.centre { position: absolute; left: 50%; top: -5px; bottom: -5px; width: 2px; background: var(--line-hi); }
.knob { position: absolute; top: 50%; width: 38px; height: 38px; margin: -19px 0 0 -19px; border-radius: 50%; display: grid; place-items: center;
  background: radial-gradient(circle at 40% 35%, #f2d8a8, #b98c4a); color: #3a2410; border: 2px solid #6b4a2a; box-shadow: 0 4px 10px -3px rgba(0, 0, 0, 0.6); }
.knob.shove { animation: shove 0.14s ease-out; }
.callout { min-height: 18px; color: var(--tag-bad); font-weight: 700; opacity: 0; transition: opacity 0.2s; }
.callout.show { opacity: 1; }
.banner-result { justify-self: center; display: grid; justify-items: center; gap: 2px; padding: 10px 22px; border-radius: 12px; background: var(--panel-solid); border: 1px solid var(--line-hi); }
.banner-result b { font-family: var(--font-display); font-size: 19px; }
.banner-result.win { border-color: color-mix(in srgb, var(--ok) 55%, transparent); color: var(--tag-ok); }
.banner-result.loss { border-color: color-mix(in srgb, var(--danger) 55%, transparent); color: var(--tag-bad); }
:root[data-theme="light"] .banner-result.win { color: var(--ok); }
:root[data-theme="light"] .banner-result.loss { color: var(--danger); }
.pop { animation: pop 0.35s cubic-bezier(0.2, 0.8, 0.3, 1.3); }
@keyframes shove { 50% { transform: scale(1.18); } }
@keyframes pop { 0% { opacity: 0; transform: translateY(6px) scale(0.92); } 100% { opacity: 1; transform: none; } }
@media (max-width: 600px) {
  .ladder { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .bout { grid-template-columns: 1fr 1fr; }
  .clinch { grid-column: 1 / -1; order: 3; }
  .fighter { max-width: none; }
}
@media (prefers-reduced-motion: reduce) { .knob.shove, .pop { animation: none; } .rung { transition: none; } }
</style>
