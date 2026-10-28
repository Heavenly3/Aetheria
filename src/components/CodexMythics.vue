<script setup>
import { computed } from 'vue'
import { G, state } from '../game/engine.js'
import { ITEMS } from '../game/data/items.js'
import { MYTHIC_TIERS, MYTHIC_DROPS } from '../game/data/mythics.js'
import { MYTHIC_IDS } from '../game/mythics.js'
import { mythicWhere, oneIn } from '../ui/itemSources.js'
import { modText } from '../i18n/mods.js'
import ItemTile from './ItemTile.vue'
import GameIcon from './GameIcon.vue'

// Every ultra rare find, by tier: the ones found with all they do, the rest as a silhouette with
// where they drop and how rarely
const TIERS = Object.keys(MYTHIC_TIERS)
const groups = computed(() => TIERS.map(tier => ({ tier, color: MYTHIC_TIERS[tier].color, ids: MYTHIC_IDS.filter(id => ITEMS[id].myth === tier) })))
const drops = id => MYTHIC_DROPS.filter(d => d.item === id)
const when = ts => new Date(ts).toLocaleDateString(undefined, { dateStyle: 'medium' })
</script>

<template>
  <div class="stack">
    <div class="panel pad">
      <div class="row wrap">
        <p class="intro grow" style="margin:0">{{ $t('mythic.intro') }}</p>
        <span class="tag gold tnum"><GameIcon name="sparkles" :size="13" /> {{ G.mythicsFound() }} / {{ MYTHIC_IDS.length }}</span>
      </div>
    </div>
    <div v-for="g in groups" :key="g.tier" class="panel pad" :style="{ '--m': g.color }">
      <h3 class="panel-title myth-title">{{ $t('mythic.tiers.' + g.tier) }}</h3>
      <div class="myth-grid">
        <div v-for="id in g.ids" :key="id" class="myth-card" :class="{ found: G.mythicFound(id) }">
          <template v-if="G.mythicFound(id)">
            <ItemTile :item="id" size="md" />
            <div class="grow">
              <b>{{ ITEMS[id].name }}</b>
              <div v-for="(v, k) in ITEMS[id].mods" :key="k" class="small">{{ modText(k, v) }}</div>
              <div class="small faint">{{ $t('mythic.foundOn', { date: when(state.mythics[id].first), n: state.mythics[id].n }) }}</div>
              <div v-if="G.mythicStreak(id) >= 1.5" class="small streak"><GameIcon name="sparkles" :size="11" /> {{ $t('mythic.streak') }}</div>
            </div>
          </template>
          <template v-else>
            <div class="myth-unknown"><span>?</span></div>
            <div class="grow">
              <b class="muted">???</b>
              <div v-for="(d, i) in drops(id)" :key="i" class="small faint">{{ mythicWhere(d) }} · 1/{{ oneIn(d.chance) }}</div>
              <div v-if="G.mythicStreak(id) >= 1.5" class="small streak"><GameIcon name="sparkles" :size="11" /> {{ $t('mythic.streak') }}</div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.myth-title { color: var(--m); }
.streak { color: var(--gold); margin-top: 2px; }
.myth-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 10px; }
.myth-card { display: flex; align-items: flex-start; gap: 12px; padding: 10px; border-radius: 12px; border: 1px dashed var(--line); }
.myth-card.found { border: 1px solid color-mix(in srgb, var(--m) 45%, transparent); background: color-mix(in srgb, var(--m) 6%, transparent); }
.myth-unknown { width: 46px; height: 46px; flex-shrink: 0; display: grid; place-items: center; border-radius: 12px; border: 1px solid color-mix(in srgb, var(--m) 40%, transparent); color: var(--m); font-size: 22px; font-weight: 700; opacity: 0.7; }
</style>
