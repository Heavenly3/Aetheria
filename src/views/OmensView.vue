<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import { G, state } from '../game/engine.js'
import { OMENS, RARITIES, RARITY_TINT, OFFERING_COST, WISHES, WISH_LIMIT, BOONS, RELICS, omenMonster } from '../game/data/omens.js'
import { PETS } from '../game/data/pets.js'
import { ITEMS } from '../game/data/items.js'
import { fmt, fmtClock } from '../game/format.js'
import { modText } from '../i18n/mods.js'
import { play } from '../game/sound.js'
import GameIcon from '../components/GameIcon.vue'
import ItemTile from '../components/ItemTile.vue'
import Arena from '../components/Arena.vue'

const { t } = useI18n()
const ev = computed(() => state.event)
const omen = computed(() => G.activeOmen())
const sign = computed(() => G.omenSign())
const seen = id => state.omens.seen[id] || 0
const fighting = computed(() => state.activity?.type === 'combat' && state.activity.kind === 'omen')
const creature = computed(() => (omen.value?.hunt ? omenMonster(omen.value.hunt, G.combatLevel()) : null))
const petsOf = id => PETS.filter(p => p.source.omen === id)
const effects = mods => Object.entries(mods).map(([k, v]) => modText(k, v)).join(' · ')
const boon = computed(() => (state.omens.boon ? BOONS.find(b => b.id === state.omens.boon.id) : null))
const wishes = computed(() => WISHES.filter(w => state.omens.wishes[w.id]).map(w => ({ w, n: state.omens.wishes[w.id] })))
const seenKinds = computed(() => OMENS.filter(o => seen(o.id)).length)

function offerText(o) {
  const what = o.relic ? t('omens.mysteryRelic') : `${o.qty}× ${ITEMS[o.item].name}`
  return what
}
function buy(i) {
  const got = G.buyCaravan(i)
  if (!got) return
  play('coin')
  G.toast(ITEMS[got].icon, 'omens.bought', { item: '@item:' + got }, 'success')
}
function hunt() { G.startCombat('omen', omen.value.hunt) }
function offer() { if (G.makeOffering()) { play('rare'); G.toast('crystal-ball', 'omens.offered', {}, 'rare') } }
</script>

<template>
  <div>
    <!-- A sign: something is coming, but not what -->
    <div v-if="sign" class="panel pad sky sign" :style="{ '--c': RARITY_TINT[sign] }">
      <GameIcon name="crystal-ball" :size="40" class="sky-icon" />
      <div class="grow">
        <div class="sky-title">{{ $t('omens.signTitle') }}</div>
        <p class="sky-text">{{ $t(`omens.signs.${sign}`) }}</p>
        <div class="small faint">{{ $t('omens.signSoon', { time: fmtClock(ev.t) }) }}</div>
      </div>
    </div>

    <!-- The omen itself -->
    <template v-else-if="omen">
      <div class="banner omen-banner" :style="{ '--c': RARITY_TINT[omen.rarity] }">
        <GameIcon :name="omen.icon" :size="230" class="banner-ghost" />
        <ItemTile :icon="omen.icon" :tint="RARITY_TINT[omen.rarity]" size="xl" :tip="false" />
        <div class="grow">
          <span class="rarity-tag hue" :style="{ '--hue': RARITY_TINT[omen.rarity] }">{{ $t(`omens.rarity.${omen.rarity}`) }}</span>
          <h2 class="banner-title">{{ omen.name }}</h2>
          <p class="banner-desc">{{ omen.desc }}</p>
          <p class="lore">{{ $t(`events.${omen.id}.lore`) }}</p>
          <div class="row wrap" style="gap:6px">
            <span class="tag gold"><i class="pi pi-clock" /> {{ fmtClock(ev.t) }}</span>
            <span v-if="ev.part" class="tag ok"><i class="pi pi-check" /> {{ $t('omens.taking') }}</span>
            <span v-else class="tag">{{ $t('omens.notTaking') }}</span>
          </div>
        </div>
      </div>
      <span class="bar omen-bar" :style="{ '--c': RARITY_TINT[omen.rarity] }"><i :style="{ width: (ev.t / ev.total) * 100 + '%' }" /></span>

      <!-- Hunts: the golden goblin and the rift horror -->
      <div v-if="creature" class="panel pad hunt">
        <div class="row wrap">
          <ItemTile :icon="creature.icon" :tint="creature.id === 'gilded_goblin' ? '#f0c040' : RARITY_TINT[omen.rarity]" size="lg" :tip="false" />
          <div class="grow">
            <b class="hunt-name">{{ creature.name }}</b>
            <div class="small muted">{{ $t(`omens.creatures.${creature.id}Desc`) }}</div>
            <div class="small faint" style="margin-top:4px">{{ $t('omens.defeated', { n: fmt(state.omens.kills[creature.id] || 0) }) }}</div>
          </div>
          <Button v-if="!fighting && G.canHunt()" :label="$t(`omens.huntBtn.${creature.id}`)" icon="pi pi-bolt" @click="hunt" />
          <Button v-else-if="fighting" :label="$t('common.stop')" icon="pi pi-stop" severity="secondary" outlined @click="G.stop()" />
        </div>
      </div>
      <Arena v-if="fighting" />

      <!-- The Veiled Caravan -->
      <template v-if="omen.caravan">
        <div class="section-title">{{ $t('omens.caravan') }}</div>
        <div class="grid-wide">
          <div v-for="(o, i) in ev.offers" :key="o.id" class="card" :class="{ done: o.sold }" :style="{ '--c': RARITY_TINT.rare }">
            <div class="row">
              <ItemTile v-if="o.relic" icon="floating-crystal" :tint="RARITY_TINT.legendary" size="md" :tip="false" />
              <ItemTile v-else :item="o.item" size="md" :qty="o.qty" />
              <div class="grow"><div class="card-name">{{ offerText(o) }}</div><div class="card-sub">{{ o.relic ? $t('omens.mysteryRelicHint') : ITEMS[o.item].desc || '' }}</div></div>
            </div>
            <div class="row" style="margin-top:12px">
              <span class="grow tag gold tnum">
                <template v-if="o.gold"><GameIcon name="two-coins" :size="13" /> {{ fmt(o.gold) }}</template>
                <template v-else><GameIcon name="sparkles" :size="13" /> {{ fmt(o.stardust) }}</template>
              </span>
              <span v-if="o.sold" class="small ok-text"><i class="pi pi-check" /> {{ $t('omens.sold') }}</span>
              <Button v-else :label="$t('festival.buy')" size="small" :disabled="!G.canBuyCaravan(o)" @click="buy(i)" />
            </div>
          </div>
        </div>
      </template>
    </template>

    <!-- Calm skies: the offering -->
    <div v-else class="panel pad sky calm">
      <GameIcon name="crystal-ball" :size="40" class="sky-icon" />
      <div class="grow">
        <div class="sky-title">{{ $t('omens.calmTitle') }}</div>
        <p class="sky-text">{{ $t(state.omens.offering ? 'omens.offeringMade' : 'omens.calm') }}</p>
        <div class="row wrap" style="gap:8px">
          <span class="tag tnum"><GameIcon name="sparkles" :size="13" /> {{ fmt(G.qty('stardust')) }}</span>
          <Button v-if="!state.omens.offering" :label="$t('omens.offer', { n: OFFERING_COST })" icon="pi pi-star" size="small" :disabled="!G.canOffer()" @click="offer" />
        </div>
      </div>
    </div>

    <!-- Lasting gifts -->
    <div class="two-col gifts">
      <div class="panel pad">
        <h3 class="panel-title"><GameIcon name="sparkles" /> {{ $t('omens.boonTitle') }}</h3>
        <div v-if="boon" class="row">
          <span class="rarity-dot" :style="{ background: RARITY_TINT[boon.rarity] }" />
          <div class="grow"><b>{{ $t(`omens.boons.${boon.id}.name`) }}</b><div class="small muted">{{ effects(boon.mods) }}</div></div>
          <span class="tag gold tnum">{{ fmtClock(state.omens.boon.t) }}</span>
        </div>
        <p v-else class="small muted" style="margin:0">{{ $t('omens.boonHint') }}</p>
      </div>
      <div class="panel pad">
        <h3 class="panel-title"><GameIcon name="burning-meteor" /> {{ $t('omens.wishTitle', { n: G.wishCount(), max: WISH_LIMIT }) }}</h3>
        <div v-if="wishes.length" class="row wrap" style="gap:6px">
          <span v-for="x in wishes" :key="x.w.id" class="tag ok">{{ effects(Object.fromEntries(Object.entries(x.w.mods).map(([k, v]) => [k, v * x.n]))) }}</span>
        </div>
        <p v-else class="small muted" style="margin:0">{{ $t(seen('comet') ? 'omens.wishHint' : 'omens.wishUnknown') }}</p>
      </div>
    </div>

    <!-- The chronicle -->
    <div class="section-title">{{ $t('omens.chronicle') }} <span class="tag tnum">{{ seenKinds }} / {{ OMENS.length }}</span></div>
    <p class="intro">{{ $t('omens.chronicleIntro') }}</p>
    <div class="grid-wide">
      <div v-for="o in OMENS" :key="o.id" class="card entry" :class="{ unknown: !seen(o.id) }" :style="{ '--c': RARITY_TINT[o.rarity] }">
        <template v-if="seen(o.id)">
          <div class="row">
            <ItemTile :icon="o.icon" :tint="RARITY_TINT[o.rarity]" size="md" :tip="false" />
            <div class="grow" style="min-width:0">
              <div class="card-name">{{ o.name }}</div>
              <div class="card-sub"><span class="hue" :style="{ '--hue': RARITY_TINT[o.rarity] }">{{ $t(`omens.rarity.${o.rarity}`) }}</span> · {{ $t('omens.witnessed', { n: seen(o.id) }) }}</div>
            </div>
          </div>
          <p class="small muted" style="margin:10px 0 0">{{ o.desc }}</p>
          <div v-if="petsOf(o.id).length" class="row wrap" style="gap:6px;margin-top:10px">
            <span v-for="p in petsOf(o.id)" :key="p.id" v-tooltip.top="G.hasPet(p.id) ? p.name : $t('omens.secretPet')" :class="{ dim: !G.hasPet(p.id) }">
              <ItemTile :icon="p.icon" :tint="G.hasPet(p.id) ? p.tint : '#2a2838'" size="xs" :tip="false" />
            </span>
          </div>
        </template>
        <template v-else>
          <div class="row">
            <ItemTile icon="crystal-ball" tint="#2a2838" size="md" :tip="false" />
            <div class="grow"><div class="card-name">???</div><div class="card-sub">{{ $t('omens.unseen') }}</div></div>
          </div>
        </template>
      </div>
    </div>

    <div class="section-title">{{ $t('omens.relics') }}</div>
    <p class="intro">{{ $t('omens.relicsIntro') }}</p>
    <div class="row wrap" style="gap:8px">
      <span v-for="q in RARITIES" :key="q" class="tag tnum hue" :style="{ '--hue': RARITY_TINT[q] }">{{ $t(`omens.rarity.${q}`) }} · {{ state.omens.relics[q] || 0 }}</span>
      <span class="small faint">{{ RELICS.map(r => $t(`relics.${r.id}`)).join(' · ') }}</span>
    </div>
  </div>
</template>

<style scoped>
.sky { display: flex; gap: 18px; align-items: flex-start; margin-bottom: 20px;
  background: radial-gradient(600px 200px at 0% 0%, color-mix(in srgb, var(--c, var(--gold)) 16%, transparent), transparent 70%), var(--panel); }
.sky-icon { color: var(--c, var(--gold)); flex-shrink: 0; }
.sign .sky-icon { animation: breathe 2.4s ease-in-out infinite; }
@keyframes breathe { 50% { opacity: 0.45; transform: scale(0.94); } }
.sky-title { font-family: var(--font-display); font-size: 21px; letter-spacing: 0.04em; }
.sky-text { margin: 6px 0 10px; color: var(--ink-2); font-style: italic; }
.omen-banner { margin-bottom: 8px; }
.omen-bar { margin-bottom: 18px; }
.rarity-tag { font-size: 11px; font-weight: 800; letter-spacing: 0.22em; text-transform: uppercase; }
.lore { margin: -6px 0 12px; color: var(--muted); font-style: italic; max-width: 70ch; }
.hunt { margin-bottom: 18px; }
.hunt-name { font-family: var(--font-display); font-size: 19px; font-weight: 400; }
.gifts { margin: 4px 0 6px; }
.rarity-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; box-shadow: 0 0 10px currentColor; }
.entry.unknown { opacity: 0.7; }
.entry:not(.unknown) { border-color: color-mix(in srgb, var(--c) 35%, transparent); }
.dim :deep(svg) { filter: brightness(0.3); }
</style>
