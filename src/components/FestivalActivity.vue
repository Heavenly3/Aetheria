<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import { G, state } from '../game/engine.js'
import { ITEMS } from '../game/data/items.js'
import { monsterLevel } from '../game/data/combat.js'
import {
  BLOOM_CROP, BLOOM_SCORE, FREE_SEEDS, LOG_VALUE, BONFIRE_LEVELS, BONFIRE_TOKENS, SUNFISH, STAND_REWARD, GIANT, WRAITH, GIFTS, GIFT_POINTS,
} from '../game/data/festivalActs.js'
import { fmt } from '../game/format.js'
import { play } from '../game/sound.js'
import GameIcon from './GameIcon.vue'
import ItemTile from './ItemTile.vue'
import HelpTip from './HelpTip.vue'

// The big festival's own activity: one panel per festival
const props = defineProps({ now: { type: Number, default: 0 } })
const router = useRouter()
const { t } = useI18n()
const f = computed(() => (props.now, G.activeFestival()))
const act = computed(() => (f.value ? G.festAct() : {}))

/* spring */
function seeds() { const n = G.claimFreeSeeds(); if (n) { play('coin'); G.toast('plant-seed', 'festival.act.seedsGot', { n }, 'success') } }

/* summer */
const level = computed(() => G.bonfireLevel())
const nextLevel = computed(() => BONFIRE_LEVELS[level.value + 1] ?? null)
const logs = computed(() => Object.keys(LOG_VALUE).filter(id => G.qty(id) > 0))
function feed(id) { const v = G.feedBonfire(id); if (v) { play('coin'); G.toast('campfire', 'festival.act.fed', { n: v }, 'success') } }

/* harvest */
const stand = computed(() => (props.now, G.standRequests()))
function deliver(i) { const p = G.deliverStand(i); if (p) { play('quest'); G.toast('wheat', 'festival.act.delivered', { n: p }, 'success') } }
function giants() { const n = G.deliverGiants(); if (n) { play('quest'); G.toast('carrot', 'festival.act.giants', { n, p: n * GIANT.points }, 'success') } }

/* winter */
const wraith = computed(() => (f.value?.id === 'winter' ? G.festivalCreature() : null))
const fightingWraith = computed(() => state.activity?.type === 'combat' && state.activity.kind === 'festival')
function gift(id, item) { if (G.giveGift(id, item)) { play('quest'); G.toast('glass-celebration', 'festival.act.gifted', { name: t(`journal.people.${id}.name`, G.journalNames()) }, 'success') } }
</script>

<template>
  <div v-if="f" class="activity">
    <!-- Spring Bloom: grow festival blooms and have them judged -->
    <div v-if="f.id === 'spring'" class="panel pad">
      <h3 class="panel-title"><GameIcon name="butterfly" /> {{ $t('festival.act.spring.title') }} <HelpTip k="sections.festSpring" /></h3>
      <p class="small muted" style="margin-top:-6px">{{ $t('festival.act.spring.text', { base: BLOOM_SCORE.base }) }}</p>
      <div class="row wrap" style="gap:10px">
        <ItemTile :item="BLOOM_CROP + '_seed'" size="md" :qty="G.qty(BLOOM_CROP + '_seed')" />
        <div class="grow">
          <div>{{ $t('festival.act.spring.grown', { n: fmt(act.blooms || 0) }) }}</div>
          <div class="small muted">{{ $t('festival.act.spring.best', { n: act.bestBloom || 0 }) }}</div>
        </div>
        <Button :label="$t('festival.act.spring.seeds', { n: FREE_SEEDS })" icon="pi pi-gift" size="small" :disabled="!G.freeSeedsReady()" @click="seeds" />
        <Button :label="$t('festival.act.toFarm')" icon="pi pi-arrow-right" iconPos="right" size="small" severity="secondary" outlined @click="router.push('/skill/farming')" />
      </div>
    </div>

    <!-- Midsummer Fires: the bonfire and the regatta -->
    <div v-else-if="f.id === 'summer'" class="two-col">
      <div class="panel pad">
        <h3 class="panel-title"><GameIcon name="campfire" /> {{ $t('festival.act.summer.bonfire') }} <HelpTip k="sections.festSummer" /></h3>
        <div class="row small"><span class="grow muted">{{ $t('festival.act.summer.level', { n: level, v: Math.round(level * BONFIRE_TOKENS * 100) }) }}</span><b class="tnum">{{ fmt(G.bonfireFed()) }}{{ nextLevel ? ' / ' + fmt(nextLevel) : '' }}</b></div>
        <div class="bar thick" style="margin:8px 0;--c:#ff9a3c"><i :style="{ width: (nextLevel ? G.bonfireFed() / nextLevel : 1) * 100 + '%' }" /></div>
        <div v-if="!logs.length" class="small faint">{{ $t('festival.act.summer.noLogs') }}</div>
        <div class="row wrap" style="gap:6px">
          <Button v-for="id in logs" :key="id" size="small" severity="secondary" outlined @click="feed(id)">
            <ItemTile :item="id" size="xs" :tip="false" /> {{ fmt(G.qty(id)) }} · +{{ LOG_VALUE[id] }}
          </Button>
        </div>
      </div>
      <div class="panel pad">
        <h3 class="panel-title"><GameIcon name="flatfish" /> {{ $t('festival.act.summer.regatta') }}</h3>
        <p class="small muted" style="margin-top:-6px">{{ $t('festival.act.summer.regattaText', { p: SUNFISH.points, t: SUNFISH.tokens }) }}</p>
        <div class="row">
          <ItemTile :item="SUNFISH.item" size="md" />
          <span class="grow">{{ $t('festival.act.summer.sunfish', { n: fmt(act.sunfish || 0) }) }}</span>
          <Button :label="$t('festival.act.toFish')" icon="pi pi-arrow-right" iconPos="right" size="small" @click="router.push('/skill/fishing')" />
        </div>
      </div>
    </div>

    <!-- Harvest Festival: the fair stand and giant vegetables -->
    <div v-else-if="f.id === 'harvest'" class="two-col">
      <div class="panel pad">
        <h3 class="panel-title"><GameIcon name="wheat" /> {{ $t('festival.act.harvest.stand') }} <HelpTip k="sections.festHarvest" /></h3>
        <div v-for="(r, i) in stand" :key="r.item" class="req" :class="{ done: r.done }">
          <ItemTile :item="r.item" size="sm" />
          <span class="grow">{{ r.qty }}× {{ ITEMS[r.item].name }} <span class="small faint tnum">({{ fmt(G.qty(r.item)) }})</span></span>
          <span class="small gold-text">+{{ STAND_REWARD.points[i] }}</span>
          <i v-if="r.done" class="pi pi-check ok-text" />
          <Button v-else :label="$t('festival.act.deliver')" size="small" :disabled="G.qty(r.item) < r.qty" @click="deliver(i)" />
        </div>
        <p class="small faint" style="margin:8px 0 0">{{ $t('festival.act.harvest.newDay') }}</p>
      </div>
      <div class="panel pad">
        <h3 class="panel-title"><GameIcon name="carrot" /> {{ $t('festival.act.harvest.giants') }}</h3>
        <p class="small muted" style="margin-top:-6px">{{ $t('festival.act.harvest.giantsText', { pct: Math.round(GIANT.chance * 100), p: GIANT.points }) }}</p>
        <div class="row">
          <ItemTile :item="GIANT.item" size="md" :qty="G.qty(GIANT.item)" />
          <span class="grow small muted">{{ $t('festival.act.harvest.giantsDone', { n: fmt(act.giants || 0) }) }}</span>
          <Button :label="$t('festival.act.deliver')" size="small" :disabled="!G.qty(GIANT.item)" @click="giants" />
        </div>
      </div>
    </div>

    <!-- Winter's Veil: the Frost Wraith and gifts -->
    <div v-else-if="f.id === 'winter'" class="two-col">
      <div class="panel pad">
        <h3 class="panel-title"><GameIcon name="ice-golem" /> {{ $t('festival.wraith') }} <HelpTip k="sections.festWinter" /></h3>
        <div class="row">
          <ItemTile :icon="WRAITH.icon" tint="#8fd0f2" size="lg" :tip="false" />
          <div class="grow">
            <div class="small muted">{{ $t('common.lvlShort', { n: monsterLevel(wraith) }) }} · {{ fmt(wraith.hp) }} {{ $t('common.hp') }}</div>
            <div class="small">{{ $t('festival.act.winter.slain', { n: fmt(act.wraiths || 0), p: WRAITH.points }) }}</div>
          </div>
          <Button :label="fightingWraith ? $t('combat.retreat') : $t('festival.act.winter.fight')" :icon="fightingWraith ? 'pi pi-flag' : 'pi pi-bolt'"
            :severity="fightingWraith ? 'danger' : undefined" size="small" @click="G.startCombat('festival', WRAITH.id)" />
        </div>
      </div>
      <div class="panel pad">
        <h3 class="panel-title"><GameIcon name="glass-celebration" /> {{ $t('festival.act.winter.gifts') }}</h3>
        <p class="small muted" style="margin-top:-6px">{{ $t('festival.act.winter.giftsText', { p: GIFT_POINTS }) }}</p>
        <div v-for="c in G.giftPeople()" :key="c.id" class="req" :class="{ done: G.giftGiven(c.id) }">
          <ItemTile :icon="c.icon" :tint="c.tint" size="sm" :tip="false" />
          <span class="grow">{{ $t(`journal.people.${c.id}.name`, G.journalNames()) }}</span>
          <i v-if="G.giftGiven(c.id)" class="pi pi-check ok-text" />
          <template v-else>
            <button v-for="it in GIFTS[c.id].likes" :key="it" class="gift" :class="{ have: G.qty(it) > 0 }" :disabled="!G.canGift(c.id, it)" v-tooltip.top="ITEMS[it].name" @click="gift(c.id, it)">
              <ItemTile :item="it" size="xs" :tip="false" />
            </button>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.activity { margin-bottom: 4px; }
.req { display: flex; align-items: center; gap: 10px; padding: 7px 0; border-bottom: 1px solid var(--line); }
.req:last-of-type { border-bottom: 0; }
.req.done { opacity: 0.6; }
.gift { padding: 2px; border-radius: 8px; border: 1px solid var(--line); background: none; cursor: pointer; opacity: 0.45; }
.gift.have { opacity: 1; border-color: var(--gold); }
.gift:disabled { cursor: not-allowed; }
</style>
