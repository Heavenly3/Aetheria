<script setup>
import { ref, computed } from 'vue'
import Button from 'primevue/button'
import ToggleSwitch from 'primevue/toggleswitch'
import { G, state } from '../game/engine.js'
import { ITEMS, SLOTS, STAT_LABELS } from '../game/data/items.js'
import { ENCHANT_SLOTS, ENCHANT_MAX, ENCHANT_PER_LEVEL, PROTECT_ITEM } from '../game/meta.js'
import { fmt, pct } from '../game/format.js'
import { play } from '../game/sound.js'
import ItemTile from '../components/ItemTile.vue'
import GameIcon from '../components/GameIcon.vue'

const protect = ref(true)
const flash = ref({}) // slot -> 'success' | 'fail' | 'drop', for a short animation
const slots = computed(() => ENCHANT_SLOTS.map(slot => ({ slot, id: state.equipment[slot], lvl: G.enchantLevel(slot) })))
const statLine = (id, lvl) => Object.entries(ITEMS[id]?.stats || {}).map(([k, v]) => {
  const val = k === 'mDmg' ? `${Math.round(v * (1 + lvl * ENCHANT_PER_LEVEL) * 100)}%` : Math.round(v * (1 + lvl * ENCHANT_PER_LEVEL))
  return `${STAT_LABELS[k]} ${val}`
}).join(' · ')

function enchant(slot) {
  const r = G.enchant(slot, protect.value)
  if (!r) return
  flash.value = { ...flash.value, [slot]: r }
  setTimeout(() => { flash.value = { ...flash.value, [slot]: null } }, 900)
  if (r === 'success') { play(G.enchantLevel(slot) >= 7 ? 'rare' : 'level'); G.toast('upgrade', 'forge.success', { slot: '@slot:' + slot, n: G.enchantLevel(slot) }, 'success') }
  else if (r === 'drop') { play('bad'); G.toast('broken-shield', 'forge.drop', { slot: '@slot:' + slot, n: G.enchantLevel(slot) }, 'error') }
  else { play('bad'); G.toast('broken-shield', 'forge.fail', { slot: '@slot:' + slot }, 'warn') }
}
</script>

<template>
  <div>
    <div class="banner" style="--c:#c58cff">
      <GameIcon class="banner-ghost" name="anvil-impact" :size="230" />
      <ItemTile icon="anvil-impact" tint="#8a5cff" size="xl" :tip="false" />
      <div class="grow">
        <h1 class="banner-title">{{ $t('forge.title') }}</h1>
        <div class="banner-desc">{{ $t('forge.desc', { v: Math.round(ENCHANT_PER_LEVEL * 100), max: ENCHANT_MAX }) }}</div>
        <div class="row wrap">
          <label class="row small" for="forge-protect" style="gap:8px;cursor:pointer">
            <ToggleSwitch v-model="protect" inputId="forge-protect" />
            {{ $t('forge.protect', { item: ITEMS[PROTECT_ITEM].name }) }}
          </label>
          <span class="tag gold"><ItemTile :item="PROTECT_ITEM" size="xs" :tip="false" /> {{ fmt(G.qty(PROTECT_ITEM)) }}</span>
        </div>
      </div>
    </div>

    <div class="grid-wide" style="margin-top:18px">
      <div v-for="s in slots" :key="s.slot" class="card ench" :class="[flash[s.slot], { maxed: s.lvl >= ENCHANT_MAX }]" style="--c:#c58cff">
        <div class="row">
          <ItemTile v-if="s.id" :item="s.id" size="lg" :tip="false" />
          <ItemTile v-else :icon="SLOTS[s.slot].icon" size="lg" empty :tip="false" />
          <div class="grow" style="min-width:0">
            <div class="slot-label">{{ SLOTS[s.slot].name }}</div>
            <div class="card-name">{{ s.id ? ITEMS[s.id].name : $t('hero.empty') }}</div>
          </div>
          <div class="lvl tnum">+{{ s.lvl }}</div>
        </div>
        <div class="pips"><i v-for="i in ENCHANT_MAX" :key="i" :class="{ on: i <= s.lvl, risky: i > 5 }" /></div>
        <div v-if="s.id" class="small muted">{{ statLine(s.id, s.lvl) }}</div>
        <div v-if="s.id && s.lvl < ENCHANT_MAX" class="small ok-text">{{ $t('forge.next') }} {{ statLine(s.id, s.lvl + 1) }}</div>

        <template v-if="s.lvl < ENCHANT_MAX">
          <div class="cost">
            <span class="cost-i" :class="{ miss: state.gold < G.enchantCost(s.slot).gold }"><GameIcon name="two-coins" :size="15" />{{ fmt(G.enchantCost(s.slot).gold) }}</span>
            <span v-for="(q, k) in G.enchantCost(s.slot).items" :key="k" class="cost-i" :class="{ miss: G.qty(k) < q }" v-tooltip.top="ITEMS[k].name">
              <ItemTile :item="k" size="xs" :tip="false" />{{ fmt(G.qty(k)) }}/{{ fmt(q) }}
            </span>
          </div>
          <div class="row small">
            <span class="grow" :class="G.enchantChance(s.slot) >= 0.7 ? 'ok-text' : G.enchantChance(s.slot) < 0.4 ? 'bad-text' : ''">{{ $t('forge.chance', { v: pct(G.enchantChance(s.slot)) }) }}</span>
            <span v-if="G.enchantRisky(s.slot)" class="faint">
              {{ protect && G.qty(PROTECT_ITEM) > 0 ? $t('forge.protected') : $t('forge.risk') }}
            </span>
          </div>
          <Button :label="$t('forge.enchant', { n: s.lvl + 1 })" icon="pi pi-bolt" fluid :disabled="!G.canEnchant(s.slot)" @click="enchant(s.slot)" />
        </template>
        <div v-else class="tag ok" style="align-self:flex-start"><i class="pi pi-check" /> {{ $t('forge.maxed') }}</div>
      </div>
    </div>
    <p class="small faint" style="margin-top:14px">{{ $t('forge.note') }}</p>
  </div>
</template>

<style scoped>
.ench { display: flex; flex-direction: column; gap: 10px; transition: box-shadow 0.3s, border-color 0.3s; }
.ench.success { border-color: var(--ok); box-shadow: 0 0 30px -6px var(--ok); }
.ench.fail, .ench.drop { border-color: var(--danger); box-shadow: 0 0 30px -6px var(--danger); animation: shake 0.3s; }
.ench.maxed { border-color: rgba(197, 140, 255, 0.5); }
@keyframes shake { 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }
.slot-label { font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--faint); }
.lvl { font-family: var(--font-display); font-size: 28px; color: #c58cff; }
.pips { display: flex; gap: 4px; }
.pips i { flex: 1; height: 5px; border-radius: 5px; background: rgba(255, 255, 255, 0.07); }
.pips i.risky { background: rgba(224, 85, 75, 0.12); }
.pips i.on { background: linear-gradient(90deg, #8a5cff, #e0a8ff); box-shadow: 0 0 8px rgba(197, 140, 255, 0.6); }
.cost { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 14px; font-size: 13px; padding: 8px 10px; border-radius: 10px; background: rgba(0, 0, 0, 0.2); }
.cost-i { display: inline-flex; align-items: center; gap: 5px; font-variant-numeric: tabular-nums; }
.cost-i .gi { color: var(--gold); }
.cost-i.miss { color: var(--danger); }
</style>
