<script setup>
import { ref, computed } from 'vue'
import Button from 'primevue/button'
import InputNumber from 'primevue/inputnumber'
import { useI18n } from 'vue-i18n'
import { G, state } from '../game/engine.js'
import { MORRIS_LINES, MORRIS_PAYS } from '../game/data/tavern.js'
import { fmt } from '../game/format.js'
import { play } from '../game/sound.js'
import GameIcon from './GameIcon.vue'
import HelpTip from './HelpTip.vue'

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
  <div class="panel pad">
    <h3 class="panel-title"><GameIcon name="stone-block" /> {{ $t('tavern.morris.title') }} <HelpTip k="sections.morris" /></h3>
    <div class="table">
      <svg class="board" viewBox="0 0 200 200" role="group" :aria-label="$t('tavern.morris.board')">
        <rect x="8" y="8" width="184" height="184" rx="10" class="wood" />
        <line v-for="(l, k) in MORRIS_LINES" :key="'l' + k" :x1="at(l[0]).x" :y1="at(l[0]).y" :x2="at(l[2]).x" :y2="at(l[2]).y" class="line" />
        <g v-for="i in 9" :key="i" class="point" :class="{ target: targets.includes(i - 1), chosen: chosen === i - 1 }" role="button" :tabindex="playing ? 0 : -1"
          :aria-label="pointLabel(i - 1)" @click="tap(i - 1)" @keydown.enter.prevent="tap(i - 1)" @keydown.space.prevent="tap(i - 1)">
          <circle :cx="at(i - 1).x" :cy="at(i - 1).y" r="16" class="hit" />
          <circle :cx="at(i - 1).x" :cy="at(i - 1).y" r="5" class="dot" />
          <circle v-if="round?.board[i - 1]" :key="round.board[i - 1]" :cx="at(i - 1).x" :cy="at(i - 1).y" r="13"
            class="piece" :class="[round.board[i - 1], { fresh: lastTo === i - 1 && round.board[i - 1] === 'keeper' }]" />
        </g>
      </svg>
      <div class="side small">
        <div><span class="chip-dot you" /> {{ $t('tavern.morris.yours') }}</div>
        <div><span class="chip-dot keeper" /> {{ keeper }}</div>
        <div v-if="playing" class="muted" style="margin-top:8px">{{ status }}</div>
      </div>
    </div>

    <div v-if="round?.result" class="result" :class="round.result.net > 0 ? 'ok-text' : round.result.net < 0 ? 'bad-text' : 'muted'" role="status">
      {{ $t(`tavern.morris.results.${round.result.kind}`, { keeper }) }}
      <b>{{ round.result.net ? $t('inventory.goldAmount', { n: (round.result.net > 0 ? '+' : '') + fmt(round.result.net) }) : $t('tavern.cards.betBack') }}</b>
    </div>
    <div v-if="!playing" class="row" style="margin-top:12px">
      <InputNumber v-model="bet" :min="10" :max="Math.max(10, G.maxBet())" inputId="morris-bet" size="small" class="grow" :suffix="' ' + $t('common.gold')" :aria-label="$t('tavern.betLabel')" />
      <Button :label="$t('tavern.morris.start', { x: MORRIS_PAYS })" icon="pi pi-th-large" @click="start" />
    </div>
    <div class="small faint" style="margin-top:8px">{{ $t('tavern.tableStats', { n: game.played, net: (game.net >= 0 ? '+' : '') + fmt(game.net) }) }}</div>
  </div>
</template>

<style scoped>
.table { display: flex; align-items: center; gap: 16px; padding: 14px; border-radius: 14px; background: var(--well); }
.board { width: min(220px, 64%); aspect-ratio: 1; flex-shrink: 0; }
.wood { fill: #6b4a2a; stroke: #3a2614; stroke-width: 3; }
.line { stroke: #e8d6ae; stroke-width: 3; stroke-linecap: round; opacity: 0.85; }
.point { cursor: pointer; outline: none; }
.point .hit { fill: transparent; }
.point .dot { fill: #e8d6ae; }
.point.target .dot { fill: var(--gold-hi); r: 7; }
.point.target .hit { fill: color-mix(in srgb, var(--gold) 25%, transparent); }
.point:focus-visible .hit { stroke: var(--gold-hi); stroke-width: 2; }
.piece { stroke-width: 2.5; animation: drop 0.3s cubic-bezier(0.2, 0.8, 0.3, 1.3); transform-box: fill-box; transform-origin: center; }
.piece.you { fill: #e2b65a; stroke: #6b4a12; }
.piece.keeper { fill: #a8322a; stroke: #4a1410; }
.piece.fresh { filter: drop-shadow(0 0 5px #ff9a7a); }
.point.chosen .piece { stroke: #fff6dc; stroke-width: 3.5; }
.side { display: grid; gap: 4px; }
.chip-dot { display: inline-block; width: 12px; height: 12px; border-radius: 50%; vertical-align: -1px; margin-inline-end: 4px; }
.chip-dot.you { background: #e2b65a; }
.chip-dot.keeper { background: #a8322a; }
.result { margin-top: 12px; font-weight: 700; display: flex; flex-wrap: wrap; gap: 6px; animation: pop 0.35s cubic-bezier(0.2, 0.8, 0.3, 1.3); }
@keyframes drop { 0% { transform: scale(1.6); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
@keyframes pop { 0% { opacity: 0; transform: translateY(6px) scale(0.92); } 100% { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .piece, .result { animation: none; } }
</style>
