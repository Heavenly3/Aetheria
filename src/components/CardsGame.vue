<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import { G, state } from '../game/engine.js'
import { handValue } from '../game/tavernGames.js'
import { BLACKJACK, KEEPER_STANDS, SUIT_LOOK } from '../game/data/tavern.js'
import { fmt } from '../game/format.js'
import { play } from '../game/sound.js'
import GameIcon from './GameIcon.vue'
import GameTable from './GameTable.vue'
import BetInput from './BetInput.vue'

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
const keeperDelay = i => (playing.value ? dealDelay(i, 1) : i > 1 ? (i - 1) * 0.3 + 's' : '0s')

function deal() {
  if (round.value?.result) G.cardsClear()
  if (!G.cardsStart(bet.value)) return G.toast('crown', 'tavern.badBet', {}, 'warn')
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
  <GameTable icon="crown" :title="$t('tavern.cards.title')" help="sections.cards" :stats="game">
    <template #badge><span class="tag">{{ $t('tavern.cards.badge', { n: KEEPER_STANDS }) }}</span></template>

    <!-- The keeper's hand across the table, the hero's in front -->
    <div class="hand">
      <div class="hand-head">
        <b>{{ $t('tavern.cards.keeperHand', { keeper: keeperName }) }}</b>
        <span v-if="round" class="tnum value">{{ playing ? $t('tavern.cards.valueHidden', { n: keeper }) : $t('tavern.cards.value', { n: keeper }) }}</span>
      </div>
      <div class="cards">
        <span v-for="(c, i) in keeperShown" :key="(round.id || 0) + '-' + i + (playing || i === 0 ? '' : '-up')" class="playing-card dealt"
          :class="{ flip: !playing && i === 1 && round.you.length > 0 }" :style="{ '--suit': suit(c).color, '--delay': keeperDelay(i) }" role="img" :aria-label="cardName(c)">
          <span class="corner">{{ rank(c) }}</span><GameIcon :name="suit(c).icon" :size="30" /><span class="corner low">{{ rank(c) }}</span>
        </span>
        <span v-if="playing" :key="(round.id || 0) + '-back'" class="playing-card back dealt" :style="{ '--delay': dealDelay(1, 1) }" role="img" :aria-label="$t('tavern.cards.hidden')" />
        <template v-if="!round"><span class="playing-card ghost" aria-hidden="true" /><span class="playing-card ghost" aria-hidden="true" /></template>
      </div>
    </div>

    <div class="table-mid">
      <div v-if="round?.result" :key="(round.id || 0) + round.result.kind" class="banner-result pop" :class="round.result.net > 0 ? 'win' : round.result.net < 0 ? 'loss' : 'even'" role="status">
        <b>{{ $t('tavern.cards.results.' + round.result.kind, { keeper: keeperName }) }}</b>
        <span class="tnum">{{ round.result.net ? $t('inventory.goldAmount', { n: (round.result.net > 0 ? '+' : '') + fmt(round.result.net) }) : $t('tavern.cards.betBack') }}</span>
      </div>
      <span v-else-if="!round" class="muted small">{{ $t('tavern.cards.idle', { keeper: keeperName }) }}</span>
    </div>

    <div class="hand">
      <div class="cards">
        <span v-for="(c, i) in round?.you || []" :key="(round.id || 0) + '-' + i" class="playing-card dealt" :style="{ '--suit': suit(c).color, '--delay': dealDelay(i, 0) }" role="img" :aria-label="cardName(c)">
          <span class="corner">{{ rank(c) }}</span><GameIcon :name="suit(c).icon" :size="30" /><span class="corner low">{{ rank(c) }}</span>
        </span>
        <template v-if="!round"><span class="playing-card ghost" aria-hidden="true" /><span class="playing-card ghost" aria-hidden="true" /></template>
      </div>
      <div class="hand-head">
        <b>{{ $t('tavern.cards.yourHand') }}</b>
        <span v-if="round" :key="'v' + you" class="tnum value bump" :class="{ 'bad-text': you > BLACKJACK, 'gold-text': you === BLACKJACK }">{{ $t('tavern.cards.value', { n: you }) }}</span>
      </div>
    </div>

    <template #controls>
      <template v-if="playing">
        <div class="small muted">{{ $t('tavern.cards.bet', { n: fmt(round.bet) }) }}</div>
        <Button :label="$t('tavern.cards.hit')" icon="pi pi-plus" fluid @click="hit" />
        <Button :label="$t('tavern.cards.stand')" icon="pi pi-stop-circle" severity="secondary" outlined fluid @click="stand" />
        <Button :label="$t('tavern.cards.double')" icon="pi pi-angle-double-up" severity="secondary" outlined fluid :disabled="!G.canDouble()" @click="double" />
      </template>
      <template v-else>
        <BetInput v-model="bet" id="cards-bet" />
        <Button :label="round ? $t('tavern.cards.again') : $t('tavern.cards.deal')" icon="pi pi-clone" fluid @click="deal" />
      </template>
    </template>
  </GameTable>
</template>

<style scoped>
.hand { display: grid; gap: 10px; }
.hand-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; font-size: 15px; }
.value { font-weight: 800; }
.cards { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; min-height: 104px; align-items: center; }
.playing-card { position: relative; width: 72px; height: 102px; border-radius: 10px; display: grid; place-items: center; color: var(--suit, #1d1a14);
  background: linear-gradient(160deg, #fbf6ea, #ece2cc); border: 1px solid rgba(0, 0, 0, 0.3);
  box-shadow: inset 0 0 0 4px #fbf6ea, inset 0 0 0 5px color-mix(in srgb, var(--suit, #1d1a14) 35%, transparent), 0 6px 14px -6px rgba(0, 0, 0, 0.7); }
.corner { position: absolute; top: 6px; left: 8px; font-family: var(--font-display); font-size: 17px; font-weight: 700; line-height: 1; }
.corner.low { top: auto; left: auto; bottom: 6px; right: 8px; transform: rotate(180deg); }
.playing-card.back { background: repeating-linear-gradient(45deg, #7a2a32 0 7px, #5a1f26 7px 14px); border-color: var(--line-hi); box-shadow: inset 0 0 0 4px #4a1820, 0 6px 14px -6px rgba(0, 0, 0, 0.7); }
.playing-card.ghost { background: none; border: 1px dashed var(--line-hi); box-shadow: none; }
.table-mid { min-height: 58px; display: grid; place-items: center; text-align: center; }
.banner-result { display: grid; gap: 2px; padding: 10px 22px; border-radius: 12px; background: var(--panel-solid); border: 1px solid var(--line-hi); font-size: 15px; }
.banner-result b { font-family: var(--font-display); font-size: 19px; letter-spacing: 0.03em; }
.banner-result.win { border-color: color-mix(in srgb, var(--ok) 55%, transparent); color: var(--tag-ok); }
.banner-result.loss { border-color: color-mix(in srgb, var(--danger) 55%, transparent); color: var(--tag-bad); }
.banner-result.even { color: var(--muted); }
:root[data-theme="light"] .banner-result.win { color: var(--ok); }
:root[data-theme="light"] .banner-result.loss { color: var(--danger); }
/* Cards slide in from the deck, the keeper's hidden card turns over, the result pops */
.dealt { animation: deal 0.38s cubic-bezier(0.2, 0.8, 0.3, 1.1) var(--delay, 0s) both; }
.dealt.flip { animation: flip 0.45s ease-out both; }
.bump { animation: bump 0.3s ease-out; display: inline-block; }
.pop { animation: pop 0.35s cubic-bezier(0.2, 0.8, 0.3, 1.3); }
@keyframes deal { from { opacity: 0; transform: translate(80px, -30px) rotate(14deg) scale(0.85); } to { opacity: 1; transform: none; } }
@keyframes flip { 0% { transform: rotateY(90deg); } 100% { transform: rotateY(0); } }
@keyframes bump { 40% { transform: scale(1.25); } }
@keyframes pop { 0% { opacity: 0; transform: translateY(6px) scale(0.92); } 100% { opacity: 1; transform: none; } }
@media (max-width: 600px) { .playing-card { width: 56px; height: 80px; } .cards { min-height: 82px; gap: 6px; } }
@media (prefers-reduced-motion: reduce) { .dealt, .bump, .pop { animation: none; } }
:global([data-motion="reduce"] .dealt), :global([data-motion="reduce"] .bump), :global([data-motion="reduce"] .pop) { animation: none; }
</style>
