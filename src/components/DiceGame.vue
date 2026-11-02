<script setup>
import { ref, computed } from 'vue'
import Button from 'primevue/button'
import { G, state } from '../game/engine.js'
import { fmt } from '../game/format.js'
import { play } from '../game/sound.js'
import GameIcon from './GameIcon.vue'
import GameTable from './GameTable.vue'
import BetInput from './BetInput.vue'

// The Griffin's dice: two dice each against the keeper, double six pays triple
const bet = ref(Math.min(100, Math.max(10, G.maxBet())))
const rolling = ref(false)
const last = ref(null)
const keeperName = computed(() => G.journalNames().keeper)
const record = computed(() => state.tavern.dice)
const FACES = ['', 'dice-six-faces-one', 'dice-six-faces-two', 'dice-six-faces-three', 'dice-six-faces-four', 'dice-six-faces-five', 'dice-six-faces-six']
const sum = a => a[0] + a[1]

function roll() {
  if (rolling.value) return
  rolling.value = true
  play('dice')
  setTimeout(() => {
    const r = G.rollDice(bet.value)
    rolling.value = false
    if (!r) return G.toast('perspective-dice-six-faces-random', 'tavern.badBet', {}, 'warn')
    last.value = { ...r, id: Date.now() }
    play(r.delta > 0 ? (r.kind === 'jackpot' ? 'rare' : 'coin') : r.delta < 0 ? 'bad' : 'dice')
  }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 650)
}
</script>

<template>
  <GameTable icon="perspective-dice-six-faces-random" :title="$t('tavern.diceTitle')" help="sections.dice" :stats="record">
    <template #badge><span class="tag">{{ $t('tavern.diceBadge') }}</span></template>
    <div class="duel">
      <div class="side-dice">
        <b>{{ $t('tavern.you') }}</b>
        <div :key="'p' + (last?.id || 0)" class="dice" :class="{ rolling, landed: last && !rolling }">
          <GameIcon v-for="(v, i) in last?.p || [6, 6]" :key="i" :name="FACES[v]" :size="72" />
        </div>
        <span v-if="last && !rolling" class="tnum total">{{ sum(last.p) }}</span>
      </div>
      <span class="vs">VS</span>
      <div class="side-dice">
        <b>{{ keeperName }}</b>
        <div :key="'h' + (last?.id || 0)" class="dice" :class="{ rolling, landed: last && !rolling }">
          <GameIcon v-for="(v, i) in last?.h || [1, 1]" :key="i" :name="FACES[v]" :size="72" />
        </div>
        <span v-if="last && !rolling" class="tnum total">{{ sum(last.h) }}</span>
      </div>
    </div>
    <div class="table-mid">
      <div v-if="last && !rolling" :key="last.id" class="banner-result pop" :class="last.delta > 0 ? 'win' : last.delta < 0 ? 'loss' : 'even'" role="status">
        <b>{{ $t('tavern.roll.' + last.kind) }}</b>
        <span v-if="last.delta" class="tnum">{{ $t('inventory.goldAmount', { n: (last.delta > 0 ? '+' : '') + fmt(last.delta) }) }}</span>
      </div>
    </div>
    <template #controls>
      <BetInput v-model="bet" id="dice-bet" :disabled="rolling" />
      <Button :label="$t('tavern.rollDice')" icon="pi pi-sync" fluid :loading="rolling" @click="roll" />
    </template>
  </GameTable>
</template>

<style scoped>
.duel { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 12px; }
.side-dice { display: grid; justify-items: center; gap: 10px; }
.dice { display: flex; gap: 10px; color: #f2e8d2; filter: drop-shadow(0 6px 8px rgba(0, 0, 0, 0.5)); }
.dice.rolling { animation: shakeDice 0.16s infinite; }
.dice.landed :deep(svg) { animation: land 0.4s cubic-bezier(0.2, 0.8, 0.3, 1.3); }
.dice.landed :deep(svg:nth-child(2)) { animation-delay: 0.06s; }
.total { font-size: 22px; font-weight: 800; color: var(--gold-hi); }
.vs { font-family: var(--font-display); font-size: 26px; color: var(--gold); }
.table-mid { min-height: 58px; display: grid; place-items: center; text-align: center; }
.banner-result { display: grid; gap: 2px; padding: 10px 22px; border-radius: 12px; background: var(--panel-solid); border: 1px solid var(--line-hi); }
.banner-result b { font-family: var(--font-display); font-size: 19px; }
.banner-result.win { border-color: color-mix(in srgb, var(--ok) 55%, transparent); color: var(--tag-ok); }
.banner-result.loss { border-color: color-mix(in srgb, var(--danger) 55%, transparent); color: var(--tag-bad); }
.banner-result.even { color: var(--muted); }
:root[data-theme="light"] .banner-result.win { color: var(--ok); }
:root[data-theme="light"] .banner-result.loss { color: var(--danger); }
.pop { animation: pop 0.35s cubic-bezier(0.2, 0.8, 0.3, 1.3); }
@keyframes shakeDice { 25% { transform: translate(-3px, 2px) rotate(-6deg); } 75% { transform: translate(3px, -2px) rotate(6deg); } }
@keyframes land { 0% { transform: translateY(-24px) rotate(-30deg); opacity: 0.4; } 100% { transform: none; opacity: 1; } }
@keyframes pop { 0% { opacity: 0; transform: translateY(6px) scale(0.92); } 100% { opacity: 1; transform: none; } }
@media (max-width: 600px) { .dice :deep(svg) { width: 48px; height: 48px; } .vs { font-size: 20px; } }
@media (prefers-reduced-motion: reduce) { .dice.rolling, .dice.landed :deep(svg), .pop { animation: none; } }
</style>
