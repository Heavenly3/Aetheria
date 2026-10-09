<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import { G, state } from '../game/engine.js'
import { BLESSINGS } from '../game/data/progression.js'
import { SKILLS } from '../game/data/skills.js'
import { fmt, fmtClock } from '../game/format.js'
import { ITEMS } from '../game/data/items.js'
import { FAVOUR_LEVELS } from '../game/data/church.js'
import { play } from '../game/sound.js'
import ItemTile from '../components/ItemTile.vue'
import GameIcon from '../components/GameIcon.vue'
import HelpTip from '../components/HelpTip.vue'

// The Order of the Dawn: favour, today's offering and what each level of favour brings
const ch = computed(() => G.ensureChurch())
const priest = computed(() => G.journalNames().priest)
const level = computed(() => G.favourLevel())
const next = computed(() => G.nextFavour())
const favourBar = computed(() => {
  if (!next.value) return 1
  const from = FAVOUR_LEVELS[level.value].favour
  return (ch.value.favour - from) / (next.value.favour - from)
})
const { t } = useI18n()
const perkText = l => [l.duration && t('church.perkDuration', { n: Math.round(l.duration * 100) }), l.slot && t('church.perkSlot'), l.discount && t('church.perkDiscount', { n: Math.round(l.discount * 100) })].filter(Boolean).join(' · ')
function offer() { const r = G.giveOffering(); if (r) { play('quest'); G.toast('holy-symbol', 'church.offered', { n: r.favour }, 'success') } }
function consecrate() { if (G.consecrate()) { play('level'); G.toast('vial', 'church.consecrated', {}, 'success') } }
function bless(b) {
  if (G.bless(b.id)) G.toast(b.icon, 'church.blessed', { name: '@blessing:' + b.id, n: Math.round(G.blessingDuration() / 60) }, 'success')
  else if (!G.blessed(b.id) && G.activeBlessings() >= G.maxBlessings()) G.toast('candle-light', 'church.maxActive', {}, 'warn')
}
</script>

<template>
  <div>
    <div class="banner" style="--c:#f1e3b0">
      <GameIcon class="banner-ghost" name="church" :size="230" />
      <ItemTile icon="church" tint="#c9b27a" size="xl" :tip="false" />
      <div class="grow">
        <h1 class="banner-title">{{ $t('church.title') }}</h1>
        <div class="banner-desc">{{ $t('church.desc') }}</div>
        <div class="row wrap">
          <span class="tag gold">{{ SKILLS.prayer.name }} {{ G.level('prayer') }}</span>
          <span class="tag">{{ $t('church.active', { n: G.activeBlessings(), max: G.maxBlessings() }) }}</span>
          <span class="tag arcane">{{ $t('church.duration', { n: Math.round(G.blessingDuration() / 60) }) }}</span>
        </div>
      </div>
    </div>
    <div class="two-col" style="margin-top:18px">
      <div class="panel pad">
        <h3 class="panel-title"><GameIcon name="holy-symbol" /> {{ $t('church.orderTitle') }} <HelpTip k="sections.order" /></h3>
        <p class="small muted" style="margin-top:-6px">{{ $t('church.orderText', { priest }) }}</p>
        <div class="row small"><span class="muted grow">{{ $t('church.favour', { n: level }) }}</span><b class="tnum">{{ fmt(ch.favour) }}{{ next ? ' / ' + fmt(next.favour) : '' }}</b></div>
        <div class="bar thick" style="margin:8px 0;--c:#f1e3b0"><i :style="{ width: favourBar * 100 + '%' }" /></div>
        <div v-if="next" class="small faint">{{ $t('church.nextFavour', { perks: perkText(next) }) }}</div>
        <div v-if="level" class="small ok-text" style="margin-top:4px">{{ perkText(FAVOUR_LEVELS[level]) }}</div>
        <div class="offering">
          <ItemTile :item="ch.offering.item" size="md" />
          <div class="grow" style="min-width:0">
            <div>{{ $t('church.todayOffering', { n: ch.offering.qty, item: ITEMS[ch.offering.item].name }) }}</div>
            <div class="small muted">{{ $t('church.offeringReward', { n: ch.offering.favour }) }} · {{ fmt(G.qty(ch.offering.item)) }} / {{ ch.offering.qty }}</div>
          </div>
          <span v-if="ch.given" class="tag ok"><i class="pi pi-check" /> {{ $t('church.given') }}</span>
          <Button v-else :label="$t('church.give')" size="small" :disabled="!G.canGiveOffering()" @click="offer" />
        </div>
      </div>
      <div class="panel pad">
        <h3 class="panel-title"><GameIcon name="vial" /> {{ $t('church.waterTitle') }}</h3>
        <p class="small muted" style="margin-top:-6px">{{ $t('church.waterText') }}</p>
        <div class="row">
          <ItemTile item="holy_water" size="md" :qty="G.qty('holy_water')" />
          <span class="grow" />
          <Button :label="$t('church.consecrate')" icon="pi pi-sparkles" size="small" :disabled="!G.canConsecrate()" @click="consecrate" />
        </div>
        <h3 class="panel-title" style="margin-top:18px"><GameIcon name="church" /> {{ $t('church.altarTitle') }}</h3>
        <p class="small muted" style="margin-top:-6px">{{ $t('church.altarText') }}</p>
        <Button :label="$t('church.toAltar')" icon="pi pi-arrow-right" iconPos="right" size="small" severity="secondary" outlined @click="$router.push('/skill/prayer')" />
      </div>
    </div>

    <div class="section-title">{{ $t('church.blessings') }} <HelpTip k="sections.blessings" /></div>
    <div class="grid-wide">
      <div v-for="b in BLESSINGS" :key="b.id" class="card" :class="{ active: G.blessed(b.id), locked: G.level('prayer') < b.lvl }" style="--c:#f1e3b0">
        <div class="row">
          <ItemTile :icon="b.icon" tint="#b8a060" size="md" :tip="false" />
          <div class="grow">
            <div class="card-name">{{ b.name }}</div>
            <div class="card-sub">{{ b.desc }} · {{ SKILLS.prayer.name }} {{ b.lvl }}</div>
          </div>
        </div>
        <div v-if="G.blessed(b.id)" style="margin-top:12px">
          <div class="bar" style="--c:#f1e3b0"><i :style="{ width: (state.blessings[b.id] / G.blessingDuration()) * 100 + '%' }" /></div>
          <div class="small muted tnum" style="margin-top:5px">{{ $t('church.remaining', { time: fmtClock(state.blessings[b.id]) }) }}</div>
        </div>
        <Button :label="G.blessed(b.id) ? $t('church.renew', { gold: fmt(G.blessingCost(b)) }) : $t('church.offer', { gold: fmt(G.blessingCost(b)) })" icon="pi pi-sun" fluid style="margin-top:14px"
          :disabled="G.level('prayer') < b.lvl || state.gold < G.blessingCost(b)" @click="bless(b)" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.offering { display: flex; align-items: center; gap: 12px; margin-top: 14px; padding: 12px; border-radius: var(--radius); background: var(--tint-1); border: 1px solid var(--line); }
</style>
