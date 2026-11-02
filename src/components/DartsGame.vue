<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import Button from 'primevue/button'
import { G, state } from '../game/engine.js'
import { DART_RINGS, DART_THROWS, DART_PAYS } from '../game/data/tavern.js'
import { fmt } from '../game/format.js'
import { play } from '../game/sound.js'
import GameTable from './GameTable.vue'
import BetInput from './BetInput.vue'

// Darts: the aim sways over the board and the dart flies to where it is when thrown.
// A steadier hand (Ranged) sways less and slower
const bet = ref(Math.min(100, Math.max(10, G.maxBet())))
const game = computed(() => (void state.tavern.games, G.tavernGames().darts))
const round = computed(() => game.value.round)
const playing = computed(() => !!round.value && !round.value.result)
const steady = computed(() => G.dartsSteady())
const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'reduce'

/* ---------- the board: twenty sectors in each ring, coloured like a tavern board ---------- */
const SECTORS = 20
const BANDS = [
  { r0: DART_RINGS[3].r, r1: DART_RINGS[4].r, fills: ['#1f1a15', '#e8dcc0'] },
  { r0: DART_RINGS[2].r, r1: DART_RINGS[3].r, fills: ['#a8322a', '#356b3d'] },
  { r0: DART_RINGS[1].r, r1: DART_RINGS[2].r, fills: ['#1f1a15', '#e8dcc0'] },
]
function sector(r0, r1, a0, a1) {
  const p = (r, a) => `${(r * Math.cos(a)).toFixed(4)},${(r * Math.sin(a)).toFixed(4)}`
  return `M${p(r1, a0)} A${r1},${r1} 0 0 1 ${p(r1, a1)} L${p(r0, a1)} A${r0},${r0} 0 0 0 ${p(r0, a0)} Z`
}
const step = (Math.PI * 2) / SECTORS, turn = -Math.PI / 2 - step / 2
const sectors = BANDS.flatMap((b, bi) => Array.from({ length: SECTORS }, (_, i) => ({
  key: bi + '-' + i, d: sector(b.r0, b.r1, turn + i * step, turn + (i + 1) * step), fill: b.fills[i % 2],
})))
const wires = Array.from({ length: SECTORS }, (_, i) => { const a = turn + i * step; return { x: Math.cos(a), y: Math.sin(a) } })

/* ---------- the aim follows a slow figure that never quite repeats ---------- */
const aim = ref({ x: 0, y: 0 })
// A dart in the air: where it was aimed and when it left the hand
const flying = ref(null)
// Darts of this round stuck in the board, and the points that float up from each
const marks = ref([])
// A bull's eye shakes the board for a moment
const shake = ref(false)
const FLIGHT = 0.26
let raf = 0, t0 = 0, uid = 0
function frame(now) {
  const t = (now - t0) / 1000
  const reach = 0.95 - 0.45 * steady.value
  const pace = (1.9 - 0.8 * steady.value) * (still() ? 0.6 : 1)
  aim.value = { x: reach * Math.sin(pace * t), y: reach * Math.sin(pace * 1.37 * t + 1.1) * 0.9 }
  const f = flying.value
  if (f) {
    const p = Math.min(1, (now - f.at) / 1000 / FLIGHT)
    f.p = p
    if (p >= 1) land(f)
  }
  raf = requestAnimationFrame(frame)
}
onMounted(() => { t0 = performance.now(); raf = requestAnimationFrame(frame) })
onUnmounted(() => cancelAnimationFrame(raf))
// Where the dart in the air is drawn: from below the board, growing smaller as it flies in
const flight = computed(() => {
  const f = flying.value
  if (!f) return null
  const e = 1 - (1 - f.p) ** 2
  return { x: f.x * e, y: 1.6 + (f.y - 1.6) * e, s: 2.2 - 1.2 * e }
})

function start() {
  if (round.value?.result) G.dartsClear()
  if (!G.dartsStart(bet.value)) return G.toast('archery-target', 'tavern.badBet', {}, 'warn')
  marks.value = []
  play('dice')
}
function shoot() {
  if (!playing.value || flying.value) return
  const { x, y } = aim.value
  if (still()) return land({ x, y })
  flying.value = { x, y, at: performance.now(), p: 0 }
}
function land({ x, y }) {
  flying.value = null
  G.dartsThrow(Math.hypot(x, y))
  const r = round.value
  const pts = r.throws[r.throws.length - 1]
  marks.value.push({ x, y, pts, id: ++uid })
  if (pts >= 50) { shake.value = true; setTimeout(() => (shake.value = false), 360) }
  play(r.result ? (r.result.net > 0 ? (r.result.mult >= 3 ? 'rare' : 'coin') : r.result.net < 0 ? 'bad' : 'dice') : pts >= 25 ? 'coin' : 'dice')
}
function onKey(e) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); shoot() } }
</script>

<template>
  <GameTable icon="archery-target" :title="$t('tavern.darts.title')" help="sections.darts" :stats="game"
    :extra="[{ label: $t('tavern.figures.best'), value: game.best || 0 }, { label: $t('tavern.figures.steady'), value: Math.round(steady * 100) + '%' }]">
    <svg class="board" :class="{ shake }" viewBox="-1.2 -1.2 2.4 2.4" role="img" :aria-label="$t('tavern.darts.board')"
      :tabindex="playing ? 0 : -1" @click="shoot" @keydown="onKey">
      <circle r="1.17" class="rim" />
      <circle r="1.03" class="rim-in" />
      <path v-for="s in sectors" :key="s.key" :d="s.d" :fill="s.fill" />
      <circle :r="DART_RINGS[1].r" fill="#356b3d" />
      <circle :r="DART_RINGS[0].r" fill="#a8322a" />
      <line v-for="(w, i) in wires" :key="'w' + i" :x1="w.x * DART_RINGS[1].r" :y1="w.y * DART_RINGS[1].r" :x2="w.x" :y2="w.y" class="wire" />
      <circle v-for="ring in DART_RINGS" :key="'c' + ring.r" :r="ring.r" class="wire ring" />

      <!-- Darts already thrown, and their points floating up -->
      <g v-for="m in marks" :key="m.id" :transform="`translate(${m.x},${m.y})`">
        <g class="stuck"><line x1="0" y1="0" x2="0.07" y2="0.16" class="shaft" /><path d="M0.05,0.12 L0.12,0.13 L0.09,0.2 Z" class="fletch" /><circle r="0.022" class="tip" /></g>
        <text y="-0.08" class="pts" :class="{ big: m.pts >= 25 }">+{{ m.pts }}</text>
      </g>
      <!-- The dart in the air -->
      <g v-if="flight" :transform="`translate(${flight.x},${flight.y}) scale(${flight.s})`">
        <line x1="0" y1="0" x2="0.07" y2="0.16" class="shaft" /><path d="M0.05,0.12 L0.12,0.13 L0.09,0.2 Z" class="fletch" />
      </g>
      <!-- The aim -->
      <g v-if="playing && !flying" :transform="`translate(${aim.x},${aim.y})`" class="aim">
        <circle r="0.09" /><path d="M-0.15,0 H-0.05 M0.05,0 H0.15 M0,-0.15 V-0.05 M0,0.05 V0.15" />
      </g>
    </svg>

    <!-- The three darts of the round and their total -->
    <div class="scores">
      <span v-for="i in DART_THROWS" :key="i + '-' + (round?.throws[i - 1] ?? 'x')" class="score" :class="{ done: round?.throws[i - 1] !== undefined }">
        <small>{{ $t('tavern.darts.dart', { n: i }) }}</small><b class="tnum">{{ round?.throws[i - 1] ?? '—' }}</b>
      </span>
      <span class="score sum"><small>{{ $t('tavern.darts.total') }}</small><b :key="'t' + (round?.throws.length || 0)" class="tnum">{{ round ? round.throws.reduce((s, v) => s + v, 0) : '—' }}</b></span>
    </div>
    <div v-if="round?.result" :key="'r' + round.result.total + marks.length" class="banner-result pop" :class="round.result.net > 0 ? 'win' : round.result.net < 0 ? 'loss' : 'even'" role="status">
      <b>{{ $t('tavern.darts.result', { n: round.result.total }) }}</b>
      <span class="tnum">{{ round.result.net ? $t('inventory.goldAmount', { n: (round.result.net > 0 ? '+' : '') + fmt(round.result.net) }) : $t('tavern.cards.betBack') }}</span>
    </div>

    <template #controls>
      <template v-if="playing">
        <div class="small muted">{{ $t('tavern.darts.left', { n: DART_THROWS - round.throws.length }) }}</div>
        <Button :label="$t('tavern.darts.throw')" icon="pi pi-send" fluid :disabled="!!flying" @click="shoot" />
        <div class="small faint">{{ $t('tavern.darts.keys') }}</div>
      </template>
      <template v-else>
        <BetInput v-model="bet" id="darts-bet" />
        <Button :label="round ? $t('tavern.darts.again') : $t('tavern.darts.start')" icon="pi pi-bullseye" fluid @click="start" />
      </template>
    </template>
    <template #side>
      <div class="pays">
        <span class="small muted">{{ $t('tavern.darts.pays') }}</span>
        <div v-for="p in DART_PAYS" :key="p.min" class="pay small"><span>{{ $t('tavern.darts.payLine', { n: p.min }) }}</span><b>×{{ p.mult }}</b></div>
      </div>
    </template>
  </GameTable>
</template>

<style scoped>
.board { width: min(340px, 100%); aspect-ratio: 1; margin: 0 auto; cursor: crosshair; overflow: visible; filter: drop-shadow(0 10px 18px rgba(0, 0, 0, 0.5)); }
.board:focus-visible { outline: 2px solid var(--gold); outline-offset: 4px; border-radius: 50%; }
.rim { fill: #4a2f1c; stroke: #2a1a10; stroke-width: 0.02; }
.rim-in { fill: #1f1a15; }
.wire { stroke: #c9a04a; stroke-width: 0.006; fill: none; opacity: 0.8; }
.shaft { stroke: #3a2a1a; stroke-width: 0.02; stroke-linecap: round; }
.fletch { fill: var(--gold); }
.tip { fill: #d8d8d8; }
.pts { font: 800 0.13px var(--font); fill: #fff; stroke: #1a1206; stroke-width: 0.02px; paint-order: stroke; text-anchor: middle; animation: rise 1s ease-out forwards; }
.pts.big { fill: var(--gold-hi); font-size: 0.17px; }
.stuck { animation: thunk 0.25s ease-out; transform-box: fill-box; transform-origin: 0 0; }
.aim { animation: pulse 1.2s ease-in-out infinite; }
.aim circle { fill: none; stroke: #fff6dc; stroke-width: 0.02; }
.aim path { stroke: #fff6dc; stroke-width: 0.02; }
.board.shake { animation: shake 0.35s ease-out; }
.scores { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
.score { display: grid; justify-items: center; gap: 2px; padding: 8px 6px; border-radius: 10px; background: var(--panel-solid); border: 1px solid var(--line); }
.score small { color: var(--muted); font-size: 11.5px; }
.score b { font-size: 20px; color: var(--faint); }
.score.done { border-color: var(--line-hi); }
.score.done b { color: var(--ink); animation: bump 0.3s ease-out; }
.score.sum { border-color: color-mix(in srgb, var(--gold) 45%, var(--line)); }
.score.sum b { color: var(--gold-hi); animation: bump 0.3s ease-out; }
.banner-result { justify-self: center; display: grid; justify-items: center; gap: 2px; padding: 10px 22px; border-radius: 12px; background: var(--panel-solid); border: 1px solid var(--line-hi); }
.banner-result b { font-family: var(--font-display); font-size: 19px; }
.banner-result.win { border-color: color-mix(in srgb, var(--ok) 55%, transparent); color: var(--tag-ok); }
.banner-result.loss { border-color: color-mix(in srgb, var(--danger) 55%, transparent); color: var(--tag-bad); }
.banner-result.even { color: var(--muted); }
:root[data-theme="light"] .banner-result.win { color: var(--ok); }
:root[data-theme="light"] .banner-result.loss { color: var(--danger); }
.pays { display: grid; gap: 4px; }
.pay { display: flex; justify-content: space-between; padding: 4px 10px; border-radius: 8px; background: var(--panel-solid); border: 1px solid var(--line); }
.pay b { color: var(--gold-hi); }
.pop { animation: pop 0.35s cubic-bezier(0.2, 0.8, 0.3, 1.3); }
@keyframes rise { 0% { opacity: 0; transform: translateY(0.04px); } 20% { opacity: 1; } 100% { opacity: 0; transform: translateY(-0.25px); } }
@keyframes thunk { 0% { transform: scale(1.5); } 60% { transform: scale(0.92); } 100% { transform: scale(1); } }
@keyframes pulse { 50% { opacity: 0.6; } }
@keyframes shake { 20% { transform: translate(2px, -1px); } 40% { transform: translate(-2px, 1px); } 60% { transform: translate(1px, 1px); } 80% { transform: translate(-1px, 0); } }
@keyframes bump { 40% { transform: scale(1.2); } }
@keyframes pop { 0% { opacity: 0; transform: translateY(6px) scale(0.92); } 100% { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .pts, .stuck, .aim, .board.shake, .score b, .pop { animation: none; } .pts { opacity: 1; } }
</style>
