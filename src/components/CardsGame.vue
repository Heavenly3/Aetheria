<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import InputNumber from 'primevue/inputnumber'
import { G, state } from '../game/engine.js'
import { handValue } from '../game/tavernGames.js'
import { BLACKJACK, SUIT_LOOK } from '../game/data/tavern.js'
import { fmt } from '../game/format.js'
import { play } from '../game/sound.js'
import GameIcon from './GameIcon.vue'
import HelpTip from './HelpTip.vue'

// The King's Twenty-One against the tavern keeper, who goes by the name this world gave them
const { t } = useI18n()
const bet = ref(Math.min(100, Math.max(10, G.maxBet())))
const keeperName = computed(() => G.journalNames().keeper)
const game = computed(() => (void state.tavern.games, G.tavernGames().cards))
const round = computed(() => game.value.round)
const playing = computed(() => !!round.value && !round.value.result)
const you = computed(() => (round.value ? handValue(round.value.you) : 0))
// While the hand is played the keeper's second card stays face down
const keeperShown = computed(() => (round.value ? (playing.value ? round.value.keeper.slice(0, 1) : round.value.keeper) : []))
const keeper = computed(() => handValue(keeperShown.value))
// The first two cards of each hand come off the deck one after another; later ones at once
const dealDelay = (i, side) => (i < 2 ? (i * 2 + side) * 0.12 : 0) + 's'
// A card's suit (hands left from before the medieval deck still read) and how its rank is written
const OLD_SUITS = { '♦': 'coins', '♥': 'cups', '♠': 'swords', '♣': 'staves' }
const suit = c => SUIT_LOOK[OLD_SUITS[c.s] || c.s]
const suitId = c => OLD_SUITS[c.s] || c.s
const rank = c => t(`tavern.cards.ranks.${c.r}`)
const cardName = c => t('tavern.cards.cardName', { rank: t(`tavern.cards.rankNames.${c.r}`), suit: t(`tavern.cards.suits.${suitId(c)}`) })

function deal() {
  if (round.value?.result) G.cardsClear()
  if (!G.cardsStart(bet.value)) return G.toast('perspective-dice-six-faces-random', 'tavern.badBet', {}, 'warn')
  play('dice')
  sound()
}
function hit() { G.cardsHit(); play('dice'); sound() }
function stand() { G.cardsStand(); sound() }
function double() { G.cardsDouble(); play('coin'); sound() }
function sound() {
  const r = round.value?.result
  if (r) play(r.net > 0 ? (r.kind === 'natural' ? 'rare' : 'coin') : r.net < 0 ? 'bad' : 'dice')
}
</script>

<template>
  <div class="panel pad">
    <h3 class="panel-title"><GameIcon name="crown" /> {{ $t('tavern.cards.title') }} <HelpTip k="sections.cards" /></h3>

    <div class="table">
      <div class="hand">
        <div class="hand-head">
          <b>{{ $t('tavern.cards.yourHand') }}</b>
          <span v-if="round" :key="'v' + you" class="tnum value bump" :class="{ 'bad-text': you > BLACKJACK, 'gold-text': you === BLACKJACK }">{{ $t('tavern.cards.value', { n: you }) }}</span>
        </div>
        <div class="cards">
          <span v-for="(c, i) in round?.you || []" :key="(round.id || 0) + '-' + i" class="playing-card dealt" :style="{ '--suit': suit(c).color, '--delay': dealDelay(i, 0) }" role="img" :aria-label="cardName(c)">{{ rank(c) }}<GameIcon :name="suit(c).icon" :size="17" /></span>
          <span v-if="!round" class="faint small">—</span>
        </div>
      </div>
      <div class="hand">
        <div class="hand-head">
          <b>{{ $t('tavern.cards.keeperHand', { keeper: keeperName }) }}</b>
          <span v-if="round" class="tnum value">{{ playing ? $t('tavern.cards.valueHidden', { n: keeper }) : $t('tavern.cards.value', { n: keeper }) }}</span>
        </div>
        <div class="cards">
          <span v-for="(c, i) in keeperShown" :key="(round.id || 0) + '-' + i + (playing || i === 0 ? '' : '-up')" class="playing-card dealt" :class="{ flip: !playing && i === 1 && round.you.length > 0 }" :style="{ '--suit': suit(c).color, '--delay': playing ? dealDelay(i, 1) : i > 1 ? (i - 1) * 0.3 + 's' : '0s' }" role="img" :aria-label="cardName(c)">{{ rank(c) }}<GameIcon :name="suit(c).icon" :size="17" /></span>
          <span v-if="playing" :key="(round.id || 0) + '-back'" class="playing-card back dealt" :style="{ '--delay': dealDelay(1, 1) }" role="img" :aria-label="$t('tavern.cards.hidden')" />
          <span v-if="!round" class="faint small">—</span>
        </div>
      </div>
    </div>

    <div v-if="round?.result" :key="(round.id || 0) + round.result.kind" class="result pop" :class="round.result.net > 0 ? 'ok-text' : round.result.net < 0 ? 'bad-text' : 'muted'" role="status">
      {{ $t('tavern.cards.results.' + round.result.kind, { keeper: keeperName }) }}
      <b>{{ round.result.net ? $t('inventory.goldAmount', { n: (round.result.net > 0 ? '+' : '') + fmt(round.result.net) }) : $t('tavern.cards.betBack') }}</b>
    </div>

    <div v-if="playing" class="row wrap" style="margin-top:12px;gap:8px">
      <span class="small muted grow">{{ $t('tavern.cards.bet', { n: fmt(round.bet) }) }}</span>
      <Button :label="$t('tavern.cards.hit')" icon="pi pi-plus" @click="hit" />
      <Button :label="$t('tavern.cards.stand')" icon="pi pi-stop-circle" severity="secondary" outlined @click="stand" />
      <Button :label="$t('tavern.cards.double')" icon="pi pi-angle-double-up" severity="secondary" outlined :disabled="!G.canDouble()" @click="double" />
    </div>
    <div v-else class="row" style="margin-top:12px">
      <InputNumber v-model="bet" :min="10" :max="Math.max(10, G.maxBet())" inputId="cards-bet" size="small" class="grow" :suffix="' ' + $t('common.gold')" :aria-label="$t('tavern.cards.betLabel')" />
      <Button :label="round ? $t('tavern.cards.again') : $t('tavern.cards.deal')" icon="pi pi-clone" @click="deal" />
    </div>
    <div class="small faint" style="margin-top:8px">{{ $t('tavern.gameStats', { n: game.played, net: (game.net >= 0 ? '+' : '') + fmt(game.net) }) }}</div>
  </div>
</template>

<style scoped>
.table { display: grid; gap: 14px; padding: 14px; border-radius: 14px; background: var(--well); }
.hand-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; font-size: 14px; }
.value { font-weight: 800; }
.cards { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; min-height: 60px; align-items: center; }
.playing-card { width: 42px; height: 60px; border-radius: 7px; display: flex; flex-direction: column; align-items: center; justify-content: center; line-height: 1;
  gap: 4px; font-family: var(--font-display); font-size: 18px; background: #f7f1e3; color: var(--suit, #1d1a14);
  border: 1px solid rgba(0, 0, 0, 0.25); box-shadow: inset 0 0 0 3px #f7f1e3, inset 0 0 0 4px color-mix(in srgb, var(--suit, #1d1a14) 35%, transparent), 0 3px 8px -4px rgba(0, 0, 0, 0.6); }
.playing-card.back { background: repeating-linear-gradient(45deg, #7a2a32 0 6px, #5a1f26 6px 12px); border-color: var(--line-hi); }
.result { margin-top: 12px; font-weight: 700; display: flex; flex-wrap: wrap; gap: 6px; }
/* Cards slide in from the deck, the keeper's hidden card turns over, the result pops */
.dealt { animation: deal 0.38s cubic-bezier(0.2, 0.8, 0.3, 1.1) var(--delay, 0s) both; }
.dealt.flip { animation: flip 0.45s ease-out both; }
.bump { animation: bump 0.3s ease-out; display: inline-block; }
.pop { animation: pop 0.35s cubic-bezier(0.2, 0.8, 0.3, 1.3); }
@keyframes deal { from { opacity: 0; transform: translate(60px, -24px) rotate(14deg) scale(0.85); } to { opacity: 1; transform: none; } }
@keyframes flip { 0% { transform: rotateY(90deg); } 100% { transform: rotateY(0); } }
@keyframes bump { 40% { transform: scale(1.25); } }
@keyframes pop { 0% { opacity: 0; transform: translateY(6px) scale(0.92); } 100% { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .dealt, .bump, .pop { animation: none; } }
:global([data-motion="reduce"] .dealt), :global([data-motion="reduce"] .bump), :global([data-motion="reduce"] .pop) { animation: none; }
</style>
