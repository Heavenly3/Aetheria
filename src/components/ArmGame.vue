<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import Button from 'primevue/button'
import InputNumber from 'primevue/inputnumber'
import { G, state } from '../game/engine.js'
import { ARM_RIVALS, ARM_TIME } from '../game/data/tavern.js'
import { fmt } from '../game/format.js'
import { play } from '../game/sound.js'
import GameIcon from './GameIcon.vue'
import ItemTile from './ItemTile.vue'
import HelpTip from './HelpTip.vue'

// Arm wrestling: press to push, the rival pushes back without rest. Past the line wins
const bet = ref(Math.min(100, Math.max(10, G.maxBet())))
const rival = ref('farmhand')
const game = computed(() => (void state.tavern.games, G.table('arm')))
const round = computed(() => game.value.round)
const playing = computed(() => G.tableOpen('arm'))
const foe = computed(() => ARM_RIVALS.find(r => r.id === (round.value?.rival || rival.value)))
// Where the arms stand: 0 is the rival's win, 1 the hero's; and the seconds left
const at = ref(0.5)
const left = ref(ARM_TIME)
const strain = ref(0)
let raf = 0, last = 0
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000)
  last = now
  // The rival leans in harder in bursts
  const surge = 1 + 0.5 * Math.sin(now / 380) * Math.sin(now / 910)
  at.value = Math.max(0, at.value - foe.value.force * surge * dt * 0.35)
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
function push() {
  if (!playing.value) return
  at.value = Math.min(1, at.value + G.armPush())
  strain.value++
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
  <div class="panel pad">
    <h3 class="panel-title"><GameIcon name="biceps" /> {{ $t('tavern.arm.title') }} <HelpTip k="sections.arm" /></h3>
    <div class="rivals">
      <button v-for="r in ARM_RIVALS" :key="r.id" type="button" class="rival" :class="{ on: (round?.rival || rival) === r.id }" :disabled="playing" :aria-pressed="rival === r.id" @click="rival = r.id">
        <ItemTile :icon="r.icon" tint="#6b5a3a" size="sm" :tip="false" />
        <span class="grow"><b>{{ $t(`tavern.arm.rivals.${r.id}`) }}</b><small class="block muted">×{{ r.mult }}<template v-if="game.beaten?.[r.id]"> · {{ $t('tavern.arm.beaten', { n: game.beaten[r.id] }) }}</template></small></span>
      </button>
    </div>

    <div class="table" :tabindex="playing ? 0 : -1" :aria-label="$t('tavern.arm.area')" @keydown="onKey">
      <div class="arms">
        <ItemTile icon="biceps" :tint="state.tint || '#6a3fbf'" size="md" :tip="false" />
        <div class="lever" :style="{ '--tilt': ((0.5 - at) * 70) + 'deg' }"><span :key="strain" class="grip" :class="{ strain: playing }" /></div>
        <ItemTile :icon="foe.icon" tint="#7a2a32" size="md" :tip="false" />
      </div>
      <div class="bar thick tug" role="progressbar" :aria-label="$t('tavern.arm.area')" aria-valuemin="0" aria-valuemax="100" :aria-valuenow="Math.round(at * 100)"><i :style="{ width: at * 100 + '%' }" /></div>
      <div v-if="playing" class="small muted tnum">{{ $t('tavern.arm.left', { s: Math.max(0, left).toFixed(1) }) }}</div>
    </div>

    <div v-if="round?.result" class="result" :class="round.result.net > 0 ? 'ok-text' : 'bad-text'" role="status">
      {{ $t(`tavern.arm.results.${round.result.kind}`, { rival: $t(`tavern.arm.rivals.${round.rival}`) }) }}
      <b>{{ $t('inventory.goldAmount', { n: (round.result.net > 0 ? '+' : '') + fmt(round.result.net) }) }}</b>
    </div>

    <div v-if="playing" class="row" style="margin-top:12px">
      <span class="small muted grow">{{ $t('tavern.arm.hint') }}</span>
      <Button :label="$t('tavern.arm.push')" icon="pi pi-angle-double-up" @click="push" />
    </div>
    <div v-else class="row" style="margin-top:12px">
      <InputNumber v-model="bet" :min="10" :max="Math.max(10, G.maxBet())" inputId="arm-bet" size="small" class="grow" :suffix="' ' + $t('common.gold')" :aria-label="$t('tavern.betLabel')" />
      <Button :label="$t('tavern.arm.start')" icon="pi pi-bolt" @click="start" />
    </div>
    <div class="small faint" style="margin-top:8px">{{ $t('tavern.tableStats', { n: game.played, net: (game.net >= 0 ? '+' : '') + fmt(game.net) }) }}</div>
  </div>
</template>

<style scoped>
.rivals { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; margin-bottom: 12px; }
.rival { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 10px; border: 1px solid var(--line); background: var(--tint-1); color: var(--ink); font: inherit; text-align: start; cursor: pointer; min-width: 0; }
.rival.on { border-color: var(--gold); }
.rival:disabled { cursor: default; }
.block { display: block; }
.table { display: grid; gap: 10px; padding: 16px; border-radius: 14px; background: var(--well); }
.table:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }
.arms { display: flex; align-items: center; gap: 12px; }
.lever { flex: 1; height: 10px; border-radius: 6px; background: linear-gradient(90deg, #c9a07a, #a07850); transform: rotate(var(--tilt)); transition: transform 0.08s linear; position: relative; }
.grip { position: absolute; left: 50%; top: 50%; width: 22px; height: 22px; margin: -11px; border-radius: 50%; background: #d8b48a; border: 2px solid #6b4a2a; }
.grip.strain { animation: strain 0.15s ease-out; }
.tug > i { background: linear-gradient(90deg, var(--gold-lo), var(--gold)); }
.result { margin-top: 12px; font-weight: 700; display: flex; flex-wrap: wrap; gap: 6px; animation: pop 0.35s cubic-bezier(0.2, 0.8, 0.3, 1.3); }
@keyframes strain { 50% { transform: scale(1.25); } }
@keyframes pop { 0% { opacity: 0; transform: translateY(6px) scale(0.92); } 100% { opacity: 1; transform: none; } }
@media (max-width: 600px) { .rivals { grid-template-columns: 1fr; } }
@media (prefers-reduced-motion: reduce) { .grip.strain, .result { animation: none; } .lever { transition: none; } }
</style>
