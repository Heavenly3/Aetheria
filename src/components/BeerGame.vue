<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import Button from 'primevue/button'
import { G, state } from '../game/engine.js'
import { BEER_ROUNDS } from '../game/data/tavern.js'
import { fmt } from '../game/format.js'
import { play } from '../game/sound.js'
import GameIcon from './GameIcon.vue'
import ItemTile from './ItemTile.vue'
import GameTable from './GameTable.vue'
import BetInput from './BetInput.vue'

// The drinking contest: drink while the tankard is steady, round after round, until the rival staggers
const bet = ref(Math.min(100, Math.max(10, G.maxBet())))
const game = computed(() => (void state.tavern.games, G.table('beer')))
const round = computed(() => game.value.round)
const playing = computed(() => G.tableOpen('beer'))
const n = computed(() => round.value?.n || 0)
const zone = computed(() => G.beerZone(n.value))
// The sway, from -1 to 1: faster with every tankard
const sway = ref(0)
const gulp = ref(0)
const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches
let raf = 0, t = 0, last = 0
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000)
  last = now
  t += dt * (1.5 + 0.22 * n.value) * (still() ? 0.6 : 1)
  sway.value = Math.sin(t * 2.1) * 0.75 + Math.sin(t * 3.3 + 1) * 0.25
  raf = requestAnimationFrame(frame)
}
onMounted(() => { last = performance.now(); raf = requestAnimationFrame(frame) })
onUnmounted(() => cancelAnimationFrame(raf))
const steady = computed(() => Math.abs(sway.value) <= zone.value)
// How many the rival has downed: as many as the hero, except when the hero spilled
const rivalDrank = computed(() => n.value)

function start() {
  G.tableClear('beer')
  if (!G.beerStart(bet.value)) return G.toast('beer-horn', 'tavern.badBet', {}, 'warn')
  play('dice')
}
function drink() {
  if (!playing.value) return
  const r = G.beerDrink(steady.value)
  gulp.value++
  const res = r?.result
  play(res ? (res.net > 0 ? 'coin' : res.net < 0 ? 'bad' : 'dice') : 'dice')
}
function onKey(e) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); drink() } }
</script>

<template>
  <GameTable icon="beer-horn" :title="$t('tavern.beer.title')" help="sections.beer" :stats="game" :extra="[{ label: $t('tavern.figures.best'), value: game.best || 0 }]">
    <div class="contest">
      <div class="drinker">
        <ItemTile :icon="state.avatar" :tint="state.tint || '#6a3fbf'" size="md" :tip="false" />
        <b>{{ state.name }}</b>
        <div class="tally" :aria-label="$t('tavern.beer.drunk', { n })">
          <GameIcon v-for="i in n" :key="i" name="beer-horn" :size="16" class="drunk" />
        </div>
      </div>
      <div class="stage" :tabindex="playing ? 0 : -1" :aria-label="$t('tavern.beer.area')" @keydown="onKey" @click="drink">
        <div class="gauge">
          <span class="steady" :style="{ left: (50 - zone * 50) + '%', width: zone * 100 + '%' }" />
          <span class="needle" :class="{ ok: steady }" :style="{ left: (50 + sway * 50) + '%' }" />
        </div>
        <span :key="gulp" class="mug" :class="{ gulp: gulp && !still() }" :style="{ transform: `rotate(${sway * 28}deg)` }"><GameIcon name="beer-horn" :size="110" /></span>
        <span class="small muted tnum">{{ playing ? $t('tavern.beer.round', { n: n + 1, max: BEER_ROUNDS }) : $t('tavern.beer.none', { max: BEER_ROUNDS }) }}</span>
      </div>
      <div class="drinker">
        <ItemTile icon="viking-head" tint="#7a2a32" size="md" :tip="false" />
        <b>{{ $t('tavern.beer.rival') }}</b>
        <div class="tally"><GameIcon v-for="i in rivalDrank" :key="i" name="beer-horn" :size="16" class="drunk" /></div>
      </div>
    </div>

    <div v-if="round?.result" :key="'r' + game.played" class="banner-result pop" :class="round.result.net > 0 ? 'win' : round.result.net < 0 ? 'loss' : 'even'" role="status">
      <b>{{ $t(`tavern.beer.results.${round.result.kind}`, { keeper: G.journalNames().keeper, n }) }}</b>
      <span class="tnum">{{ round.result.net ? $t('inventory.goldAmount', { n: (round.result.net > 0 ? '+' : '') + fmt(round.result.net) }) : $t('tavern.cards.betBack') }}</span>
    </div>

    <template #controls>
      <template v-if="playing">
        <Button :label="$t('tavern.beer.drink')" icon="pi pi-check" fluid size="large" :class="{ steady }" @click="drink" />
        <div class="small faint">{{ $t('tavern.beer.hint') }}</div>
      </template>
      <template v-else>
        <BetInput v-model="bet" id="beer-bet" />
        <Button :label="$t('tavern.beer.start')" icon="pi pi-flag" fluid @click="start" />
      </template>
    </template>
  </GameTable>
</template>

<style scoped>
.contest { display: grid; grid-template-columns: 120px minmax(0, 1fr) 120px; align-items: center; gap: 14px; }
.drinker { display: grid; justify-items: center; gap: 6px; text-align: center; }
.drinker b { font-size: 13.5px; }
.tally { display: flex; flex-wrap: wrap; justify-content: center; gap: 2px; min-height: 18px; max-width: 110px; }
.drunk { color: #e8b84a; animation: pop 0.3s ease-out; }
.stage { display: grid; justify-items: center; gap: 14px; cursor: pointer; border-radius: 12px; padding: 4px; }
.stage:focus-visible { outline: 2px solid var(--gold); outline-offset: 4px; }
.gauge { position: relative; width: 100%; height: 16px; border-radius: 9px; background: color-mix(in srgb, var(--danger) 35%, var(--panel-solid)); }
.steady { position: absolute; top: 0; bottom: 0; border-radius: 9px; background: color-mix(in srgb, var(--ok) 70%, var(--panel-solid)); transition: left 0.3s, width 0.3s; }
.needle { position: absolute; top: -5px; width: 5px; height: 26px; margin-left: -2.5px; border-radius: 3px; background: var(--ink); }
.needle.ok { background: var(--gold-hi); box-shadow: 0 0 10px var(--gold); }
.mug { color: #e8b84a; transform-origin: 50% 90%; filter: drop-shadow(0 8px 10px rgba(0, 0, 0, 0.45)); }
.mug.gulp :deep(svg) { animation: gulp 0.35s ease-out; }
.banner-result { justify-self: center; display: grid; justify-items: center; gap: 2px; padding: 10px 22px; border-radius: 12px; background: var(--panel-solid); border: 1px solid var(--line-hi); }
.banner-result b { font-family: var(--font-display); font-size: 19px; }
.banner-result.win { border-color: color-mix(in srgb, var(--ok) 55%, transparent); color: var(--tag-ok); }
.banner-result.loss { border-color: color-mix(in srgb, var(--danger) 55%, transparent); color: var(--tag-bad); }
.banner-result.even { color: var(--muted); }
:root[data-theme="light"] .banner-result.win { color: var(--ok); }
:root[data-theme="light"] .banner-result.loss { color: var(--danger); }
.pop { animation: pop 0.35s cubic-bezier(0.2, 0.8, 0.3, 1.3); }
@keyframes gulp { 40% { transform: translateY(-12px) scale(1.1); } }
@keyframes pop { 0% { opacity: 0; transform: translateY(6px) scale(0.92); } 100% { opacity: 1; transform: none; } }
@media (max-width: 600px) { .contest { grid-template-columns: 1fr 1fr; } .stage { grid-column: 1 / -1; grid-row: 1; } .mug :deep(svg) { width: 80px; height: 80px; } }
@media (prefers-reduced-motion: reduce) { .drunk, .pop { animation: none; } .steady { transition: none; } }
</style>
