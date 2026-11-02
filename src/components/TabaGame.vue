<script setup>
import { ref, computed } from 'vue'
import Button from 'primevue/button'
import { G, state } from '../game/engine.js'
import { TABA_FACES } from '../game/data/tavern.js'
import { fmt } from '../game/format.js'
import { play } from '../game/sound.js'
import GameTable from './GameTable.vue'
import BetInput from './BetInput.vue'

// Knucklebone: one throw of the bone, and the face it lands on decides
const bet = ref(Math.min(100, Math.max(10, G.maxBet())))
const game = computed(() => (void state.tavern.games, G.table('taba')))
const round = computed(() => game.value.round)
const tumbling = ref(false)
const FACE_LOOK = { luck: 'gold', flesh: 'ok', belly: 'even', hollow: 'bad' }

function toss() {
  if (tumbling.value) return
  G.tableClear('taba')
  if (!G.tabaThrow(bet.value)) return G.toast('crossed-bones', 'tavern.badBet', {}, 'warn')
  tumbling.value = true
  play('dice')
  setTimeout(() => {
    tumbling.value = false
    const r = round.value.result
    play(r.net > 0 ? (r.kind === 'luck' ? 'rare' : 'coin') : r.net < 0 ? 'bad' : 'dice')
  }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 900)
}
</script>

<template>
  <GameTable icon="crossed-bones" :title="$t('tavern.taba.title')" help="sections.taba" :stats="game">
    <div class="bone-wrap">
      <svg :key="game.played" class="bone" :class="{ tumble: tumbling }" viewBox="-60 -30 120 60" aria-hidden="true">
        <path d="M-38,-12 C-52,-26 -62,-6 -50,0 C-62,6 -52,26 -38,12 L38,12 C52,26 62,6 50,0 C62,-6 52,-26 38,-12 Z" />
        <path d="M-30,-4 C-10,2 10,2 30,-4" class="grain" />
        <circle v-if="round && !tumbling" r="6" :class="'face-dot ' + round.face" />
      </svg>
      <div class="shadow" :class="{ tumble: tumbling }" />
    </div>
    <div class="faces">
      <div v-for="f in TABA_FACES" :key="f.id" class="face" :class="[FACE_LOOK[f.id], { on: round && !tumbling && round.face === f.id }]">
        <span :class="'face-dot ' + f.id" />
        <b>{{ $t(`tavern.taba.faces.${f.id}`) }}</b>
        <small class="tnum">{{ f.mult ? '×' + f.mult : $t('tavern.taba.loses') }}</small>
        <small class="faint tnum">{{ Math.round(f.p * 100) }}%</small>
      </div>
    </div>
    <div v-if="round?.result && !tumbling" :key="'r' + game.played" class="banner-result pop" :class="round.result.net > 0 ? 'win' : round.result.net < 0 ? 'loss' : 'even'" role="status">
      <b>{{ $t(`tavern.taba.results.${round.result.kind}`) }}</b>
      <span class="tnum">{{ round.result.net ? $t('inventory.goldAmount', { n: (round.result.net > 0 ? '+' : '') + fmt(round.result.net) }) : $t('tavern.cards.betBack') }}</span>
    </div>

    <template #controls>
      <BetInput v-model="bet" id="taba-bet" :disabled="tumbling" />
      <Button :label="$t('tavern.taba.throw')" icon="pi pi-replay" fluid :loading="tumbling" @click="toss" />
    </template>
  </GameTable>
</template>

<style scoped>
.bone-wrap { position: relative; display: grid; place-items: center; height: 150px; }
.bone { width: 220px; overflow: visible; filter: drop-shadow(0 8px 10px rgba(0, 0, 0, 0.45)); }
.bone path { fill: #efe3c8; stroke: #8a7550; stroke-width: 2; }
.bone .grain { fill: none; stroke: #c9b48a; stroke-width: 1.5; }
.bone.tumble { animation: tumble 0.9s cubic-bezier(0.3, 0.6, 0.4, 1); }
.shadow { position: absolute; bottom: 12px; width: 150px; height: 14px; border-radius: 50%; background: rgba(0, 0, 0, 0.35); filter: blur(4px); }
.shadow.tumble { animation: shadow 0.9s ease-out; }
.face-dot { display: inline-block; width: 14px; height: 14px; border-radius: 50%; border: 1.5px solid #1d1a14; }
circle.face-dot { stroke: #1d1a14; stroke-width: 1.5; }
.face-dot.luck { background: var(--gold); fill: var(--gold); }
.face-dot.flesh { background: #c25b4a; fill: #c25b4a; }
.face-dot.belly { background: #b9a989; fill: #b9a989; }
.face-dot.hollow { background: #2a2418; fill: #2a2418; }
.faces { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
.face { display: grid; justify-items: center; gap: 3px; padding: 10px 4px; border-radius: 12px; border: 1px solid var(--line); background: var(--panel-solid); transition: transform 0.2s, border-color 0.2s; }
.face b { font-size: 14.5px; }
.face.on { transform: translateY(-4px); border-color: var(--gold); box-shadow: 0 0 16px -6px var(--gold); }
.face.gold b { color: var(--gold-hi); }
.face.ok b { color: var(--tag-ok); }
.face.bad b { color: var(--tag-bad); }
:root[data-theme="light"] .face.ok b { color: var(--ok); }
:root[data-theme="light"] .face.bad b { color: var(--danger); }
.banner-result { justify-self: center; display: grid; justify-items: center; gap: 2px; padding: 10px 22px; border-radius: 12px; background: var(--panel-solid); border: 1px solid var(--line-hi); }
.banner-result b { font-family: var(--font-display); font-size: 19px; }
.banner-result.win { border-color: color-mix(in srgb, var(--ok) 55%, transparent); color: var(--tag-ok); }
.banner-result.loss { border-color: color-mix(in srgb, var(--danger) 55%, transparent); color: var(--tag-bad); }
.banner-result.even { color: var(--muted); }
:root[data-theme="light"] .banner-result.win { color: var(--ok); }
:root[data-theme="light"] .banner-result.loss { color: var(--danger); }
.pop { animation: pop 0.35s cubic-bezier(0.2, 0.8, 0.3, 1.3); }
@keyframes tumble { 0% { transform: translateY(0) rotate(0); } 40% { transform: translateY(-60px) rotate(400deg); } 75% { transform: translateY(4px) rotate(680deg); } 88% { transform: translateY(-8px) rotate(710deg); } 100% { transform: translateY(0) rotate(720deg); } }
@keyframes shadow { 40% { transform: scale(0.5); opacity: 0.4; } 100% { transform: none; } }
@keyframes pop { 0% { opacity: 0; transform: translateY(6px) scale(0.92); } 100% { opacity: 1; transform: none; } }
@media (max-width: 600px) { .faces { grid-template-columns: repeat(2, minmax(0, 1fr)); } .bone { width: 170px; } }
@media (prefers-reduced-motion: reduce) { .bone.tumble, .shadow.tumble, .pop { animation: none; } .face { transition: none; } }
</style>
