<script setup>
import { ref, computed } from 'vue'
import Button from 'primevue/button'
import { useI18n } from 'vue-i18n'
import { G, state } from '../game/engine.js'
import { MORRIS_LINES, MORRIS_PAYS, MORRIS_MAX_MOVES } from '../game/data/tavern.js'
import { fmt } from '../game/format.js'
import { play } from '../game/sound.js'
import GameTable from './GameTable.vue'
import BetInput from './BetInput.vue'

// Three men's morris against the keeper: place three pieces, then move them along the lines
const { t } = useI18n()
const bet = ref(Math.min(100, Math.max(10, G.maxBet())))
const game = computed(() => (void state.tavern.games, G.table('morris')))
const round = computed(() => game.value.round)
const playing = computed(() => G.tableOpen('morris'))
const placing = computed(() => (round.value?.placed.you || 0) < 3)
const chosen = ref(null)
const keeper = computed(() => G.journalNames().keeper)
// The nine points on a board 0–2 by 0–2
const at = i => ({ x: 20 + (i % 3) * 80, y: 20 + Math.floor(i / 3) * 80 })
const targets = computed(() => (playing.value ? G.morrisTargets(placing.value ? null : chosen.value) : []))
const lastTo = computed(() => round.value?.last?.[1])

function start() {
  G.tableClear('morris')
  if (!G.morrisStart(bet.value)) return G.toast('stone-block', 'tavern.badBet', {}, 'warn')
  chosen.value = null
  play('dice')
}
function tap(i) {
  if (!playing.value) return
  const b = round.value.board
  if (placing.value) return move(null, i)
  if (b[i] === 'you') { chosen.value = chosen.value === i ? null : i; return }
  if (chosen.value !== null) move(chosen.value, i)
}
function move(from, to) {
  if (!G.morrisPlay(from, to)) return
  chosen.value = null
  const r = round.value.result
  play(r ? (r.net > 0 ? 'coin' : r.net < 0 ? 'bad' : 'dice') : 'dice')
}
const status = computed(() => {
  if (!playing.value) return ''
  return placing.value ? t('tavern.morris.place', { n: round.value.placed.you + 1 }) : chosen.value === null ? t('tavern.morris.pick') : t('tavern.morris.moveTo')
})
const pointLabel = i => {
  const v = round.value?.board[i]
  return t('tavern.morris.point', { n: i + 1 }) + (v === 'you' ? ' · ' + t('tavern.morris.yours') : v === 'keeper' ? ' · ' + keeper.value : '')
}
</script>

<template>
  <GameTable icon="stone-block" :title="$t('tavern.morris.title')" help="sections.morris" :stats="game">
    <template #badge><span class="tag">{{ $t('tavern.morris.badge', { x: MORRIS_PAYS }) }}</span></template>
    <svg class="board" viewBox="0 0 200 200" role="group" :aria-label="$t('tavern.morris.board')">
      <rect x="4" y="4" width="192" height="192" rx="12" class="wood" />
      <rect x="10" y="10" width="180" height="180" rx="8" class="inlay" />
      <line v-for="(l, k) in MORRIS_LINES" :key="'l' + k" :x1="at(l[0]).x" :y1="at(l[0]).y" :x2="at(l[2]).x" :y2="at(l[2]).y" class="line" />
      <g v-for="i in 9" :key="i" class="point" :class="{ target: targets.includes(i - 1), chosen: chosen === i - 1 }" role="button" :tabindex="playing ? 0 : -1"
        :aria-label="pointLabel(i - 1)" @click="tap(i - 1)" @keydown.enter.prevent="tap(i - 1)" @keydown.space.prevent="tap(i - 1)">
        <circle :cx="at(i - 1).x" :cy="at(i - 1).y" r="17" class="hit" />
        <circle :cx="at(i - 1).x" :cy="at(i - 1).y" r="5" class="dot" />
        <circle v-if="round?.board[i - 1]" :key="round.board[i - 1]" :cx="at(i - 1).x" :cy="at(i - 1).y" r="14"
          class="piece" :class="[round.board[i - 1], { fresh: lastTo === i - 1 && round.board[i - 1] === 'keeper' }]" />
      </g>
    </svg>
    <div v-if="round?.result" :key="'r' + game.played" class="banner-result pop" :class="round.result.net > 0 ? 'win' : round.result.net < 0 ? 'loss' : 'even'" role="status">
      <b>{{ $t(`tavern.morris.results.${round.result.kind}`, { keeper }) }}</b>
      <span class="tnum">{{ round.result.net ? $t('inventory.goldAmount', { n: (round.result.net > 0 ? '+' : '') + fmt(round.result.net) }) : $t('tavern.cards.betBack') }}</span>
    </div>

    <template #controls>
      <template v-if="playing">
        <div class="turn">
          <b>{{ status }}</b>
          <span class="small muted tnum">{{ $t('tavern.morris.moves', { n: round.moves, max: MORRIS_MAX_MOVES }) }}</span>
        </div>
      </template>
      <template v-else>
        <BetInput v-model="bet" id="morris-bet" />
        <Button :label="$t('tavern.morris.start', { x: MORRIS_PAYS })" icon="pi pi-th-large" fluid @click="start" />
      </template>
    </template>
    <template #side>
      <div class="legend small">
        <span><i class="chip-dot you" /> {{ $t('tavern.morris.yours') }}</span>
        <span><i class="chip-dot keeper" /> {{ keeper }}</span>
      </div>
    </template>
  </GameTable>
</template>

<style scoped>
.board { width: min(330px, 100%); aspect-ratio: 1; margin: 0 auto; filter: drop-shadow(0 10px 18px rgba(0, 0, 0, 0.5)); }
.wood { fill: #6b4a2a; stroke: #3a2614; stroke-width: 3; }
.inlay { fill: none; stroke: #8a6a42; stroke-width: 1.5; }
.line { stroke: #e8d6ae; stroke-width: 3; stroke-linecap: round; opacity: 0.85; }
.point { cursor: pointer; outline: none; }
.point .hit { fill: transparent; }
.point .dot { fill: #e8d6ae; }
.point.target .dot { fill: var(--gold-hi); }
.point.target .hit { fill: color-mix(in srgb, var(--gold) 28%, transparent); }
.point:focus-visible .hit { stroke: var(--gold-hi); stroke-width: 2; }
.piece { stroke-width: 2.5; animation: drop 0.3s cubic-bezier(0.2, 0.8, 0.3, 1.3); transform-box: fill-box; transform-origin: center; }
.piece.you { fill: #e2b65a; stroke: #6b4a12; }
.piece.keeper { fill: #a8322a; stroke: #4a1410; }
.piece.fresh { filter: drop-shadow(0 0 5px #ff9a7a); }
.point.chosen .piece { stroke: #fff6dc; stroke-width: 3.5; }
.turn { display: grid; gap: 4px; padding: 10px 12px; border-radius: 10px; background: var(--panel-solid); border: 1px solid var(--line-hi); }
.legend { display: flex; gap: 14px; flex-wrap: wrap; }
.chip-dot { display: inline-block; width: 12px; height: 12px; border-radius: 50%; vertical-align: -1px; margin-inline-end: 4px; }
.chip-dot.you { background: #e2b65a; }
.chip-dot.keeper { background: #a8322a; }
.banner-result { justify-self: center; display: grid; justify-items: center; gap: 2px; padding: 10px 22px; border-radius: 12px; background: var(--panel-solid); border: 1px solid var(--line-hi); }
.banner-result b { font-family: var(--font-display); font-size: 19px; }
.banner-result.win { border-color: color-mix(in srgb, var(--ok) 55%, transparent); color: var(--tag-ok); }
.banner-result.loss { border-color: color-mix(in srgb, var(--danger) 55%, transparent); color: var(--tag-bad); }
.banner-result.even { color: var(--muted); }
:root[data-theme="light"] .banner-result.win { color: var(--ok); }
:root[data-theme="light"] .banner-result.loss { color: var(--danger); }
.pop { animation: pop 0.35s cubic-bezier(0.2, 0.8, 0.3, 1.3); }
@keyframes drop { 0% { transform: scale(1.6); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
@keyframes pop { 0% { opacity: 0; transform: translateY(6px) scale(0.92); } 100% { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .piece, .pop { animation: none; } }
</style>
