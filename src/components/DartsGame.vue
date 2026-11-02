<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import Button from 'primevue/button'
import InputNumber from 'primevue/inputnumber'
import { G, state } from '../game/engine.js'
import { DART_RINGS, DART_THROWS, DART_PAYS } from '../game/data/tavern.js'
import { fmt } from '../game/format.js'
import { play } from '../game/sound.js'
import GameIcon from './GameIcon.vue'
import HelpTip from './HelpTip.vue'

// Darts: the aim sways over the board and the dart flies where it is when thrown.
// A steadier hand (Ranged) sways less and slower
const bet = ref(Math.min(100, Math.max(10, G.maxBet())))
const game = computed(() => (void state.tavern.games, G.tavernGames().darts))
const round = computed(() => game.value.round)
const playing = computed(() => !!round.value && !round.value.result)
const steady = computed(() => G.dartsSteady())
// Where the darts of this round landed, in board units (-1 to 1)
const marks = ref([])

// The aim follows a slow figure that never quite repeats
const aim = ref({ x: 0, y: 0 })
let raf = 0, t0 = 0
function sway(now) {
  const t = (now - t0) / 1000
  const reach = 0.95 - 0.45 * steady.value
  const pace = (1.9 - 0.8 * steady.value) * (matchMedia('(prefers-reduced-motion: reduce)').matches ? 0.6 : 1)
  aim.value = { x: reach * Math.sin(pace * t), y: reach * Math.sin(pace * 1.37 * t + 1.1) * 0.9 }
  raf = requestAnimationFrame(sway)
}
onMounted(() => { t0 = performance.now(); raf = requestAnimationFrame(sway) })
onUnmounted(() => cancelAnimationFrame(raf))

function start() {
  if (round.value?.result) G.dartsClear()
  if (!G.dartsStart(bet.value)) return G.toast('archery-target', 'tavern.badBet', {}, 'warn')
  marks.value = []
  play('dice')
}
function shoot() {
  if (!playing.value) return
  const { x, y } = aim.value
  marks.value.push({ x, y })
  G.dartsThrow(Math.hypot(x, y))
  const r = round.value.result
  play(r ? (r.net > 0 ? (r.mult >= 3 ? 'rare' : 'coin') : r.net < 0 ? 'bad' : 'dice') : 'dice')
}
function onKey(e) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); shoot() } }
const pays = DART_PAYS.map(p => `${p.min}+ ×${p.mult}`).join(' · ')
</script>

<template>
  <div class="panel pad">
    <h3 class="panel-title"><GameIcon name="archery-target" /> {{ $t('tavern.darts.title') }} <HelpTip k="sections.darts" /></h3>
    <p class="small muted" style="margin-top:0">{{ $t('tavern.darts.rules', { n: DART_THROWS, pays }) }}</p>

    <div class="board-wrap">
      <svg class="board" viewBox="-1.1 -1.1 2.2 2.2" role="img" :aria-label="$t('tavern.darts.board')" :tabindex="playing ? 0 : -1" @click="shoot" @keydown="onKey">
        <circle v-for="(ring, i) in [...DART_RINGS].reverse()" :key="ring.r" :r="ring.r" :class="'ring r' + (i % 2)" />
        <circle v-for="(m, i) in marks" :key="'m' + i" :cx="m.x" :cy="m.y" r="0.035" class="dart" />
        <g v-if="playing" :transform="`translate(${aim.x},${aim.y})`" class="aim">
          <circle r="0.09" /><path d="M-0.14,0 H-0.05 M0.05,0 H0.14 M0,-0.14 V-0.05 M0,0.05 V0.14" />
        </g>
      </svg>
      <div class="scores">
        <span v-for="i in DART_THROWS" :key="i" class="score" :class="{ done: round?.throws[i - 1] !== undefined }">{{ round?.throws[i - 1] ?? '·' }}</span>
        <b v-if="round" class="tnum total">{{ round.throws.reduce((s, v) => s + v, 0) }}</b>
      </div>
    </div>

    <div v-if="round?.result" class="result" :class="round.result.net > 0 ? 'ok-text' : round.result.net < 0 ? 'bad-text' : 'muted'" role="status">
      {{ $t('tavern.darts.result', { n: round.result.total }) }}
      <b v-if="round.result.net">{{ $t('inventory.goldAmount', { n: (round.result.net > 0 ? '+' : '') + fmt(round.result.net) }) }}</b>
    </div>

    <div v-if="playing" class="row" style="margin-top:12px">
      <span class="small muted grow">{{ $t('tavern.darts.left', { n: DART_THROWS - round.throws.length }) }}</span>
      <Button :label="$t('tavern.darts.throw')" icon="pi pi-send" @click="shoot" />
    </div>
    <div v-else class="row" style="margin-top:12px">
      <InputNumber v-model="bet" :min="10" :max="Math.max(10, G.maxBet())" inputId="darts-bet" size="small" class="grow" :suffix="' ' + $t('common.gold')" :aria-label="$t('tavern.darts.betLabel')" />
      <Button :label="round ? $t('tavern.darts.again') : $t('tavern.darts.start')" icon="pi pi-bullseye" @click="start" />
    </div>
    <div class="small faint" style="margin-top:8px">{{ $t('tavern.darts.stats', { s: Math.round(steady * 100), best: game.best, n: game.played, net: (game.net >= 0 ? '+' : '') + fmt(game.net) }) }}</div>
  </div>
</template>

<style scoped>
.board-wrap { display: flex; align-items: center; gap: 16px; padding: 14px; border-radius: 14px; background: var(--well); }
.board { width: min(220px, 60%); aspect-ratio: 1; cursor: crosshair; flex-shrink: 0; }
.board:focus-visible { outline: 2px solid var(--gold); outline-offset: 4px; border-radius: 50%; }
.ring { stroke: var(--line-hi); stroke-width: 0.01; }
.ring.r0 { fill: color-mix(in srgb, var(--gold) 14%, var(--panel-solid)); }
.ring.r1 { fill: var(--panel-solid); }
.dart { fill: var(--danger); stroke: var(--panel-solid); stroke-width: 0.012; }
.aim circle { fill: none; stroke: var(--gold-hi); stroke-width: 0.018; }
.aim path { stroke: var(--gold-hi); stroke-width: 0.018; }
.scores { display: flex; flex-direction: column; gap: 6px; align-items: flex-start; }
.score { min-width: 44px; padding: 4px 10px; border-radius: 8px; background: var(--tint-1); border: 1px solid var(--line); text-align: center; font-weight: 800; color: var(--faint); }
.score.done { color: var(--ink); border-color: var(--line-hi); }
.total { font-size: 22px; color: var(--gold-hi); }
.result { margin-top: 12px; font-weight: 700; }
</style>
