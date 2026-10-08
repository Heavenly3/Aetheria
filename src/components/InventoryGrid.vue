<script setup>
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import InputText from 'primevue/inputtext'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import { G, state } from '../game/engine.js'
import { ITEMS } from '../game/data/items.js'
import { CATEGORY_GROUPS, CATEGORIES, CATEGORY_ICON, itemCategory, groupOf } from '../game/data/categories.js'
import { fmt } from '../game/format.js'
import ItemTile from './ItemTile.vue'
import GameIcon from './GameIcon.vue'

// mode 'sell' hides locked items and shows each stack's sale value
const props = defineProps({ mode: { type: String, default: 'inventory' } })
const selected = defineModel({ type: String, default: null })
const emit = defineEmits(['filtered'])
const { t } = useI18n()

const group = ref('all')
const cat = ref(null)
const search = ref('')

const owned = computed(() => Object.keys(state.inventory).filter(id => ITEMS[id] && state.inventory[id] > 0 && (props.mode !== 'sell' || !G.isLocked(id))))
const counts = computed(() => {
  const c = {}
  for (const id of owned.value) c[itemCategory(id)] = (c[itemCategory(id)] || 0) + 1
  return c
})
const groupCount = g => g.cats.reduce((a, k) => a + (counts.value[k] || 0), 0)
const groups = computed(() => [{ id: 'all', icon: 'knapsack', count: owned.value.length }, ...CATEGORY_GROUPS.map(g => ({ id: g.id, icon: g.icon, count: groupCount(g) }))])
const subcats = computed(() => (group.value === 'all' ? [] : CATEGORY_GROUPS.find(g => g.id === group.value).cats.filter(k => counts.value[k])))
watch(group, () => (cat.value = null))

const ids = computed(() => {
  const q = search.value.trim().toLowerCase()
  return owned.value.filter(id => {
    const k = itemCategory(id)
    if (cat.value) { if (k !== cat.value) return false }
    else if (group.value !== 'all' && groupOf(k).id !== group.value) return false
    return !q || ITEMS[id].name.toLowerCase().includes(q)
  })
})
watch(ids, v => emit('filtered', v), { immediate: true })

// Shown in sections, one per category, in a fixed order; the most valuable first inside each
const sections = computed(() => {
  const by = {}
  for (const id of ids.value) (by[itemCategory(id)] ||= []).push(id)
  return CATEGORIES.filter(k => by[k]).map(k => ({ cat: k, ids: by[k].sort((a, b) => ITEMS[b].value - ITEMS[a].value) }))
})
</script>

<template>
  <div>
    <div class="groups">
      <button v-for="g in groups" :key="g.id" class="group-btn" :class="{ on: group === g.id }" :disabled="!g.count && g.id !== 'all'" @click="group = g.id">
        <GameIcon :name="g.icon" :size="15" /> {{ $t(`inventory.groups.${g.id}`) }} <small class="tnum">{{ g.count }}</small>
      </button>
    </div>
    <div v-if="subcats.length > 1" class="subcats">
      <button class="chip-btn" :class="{ on: !cat }" @click="cat = null">{{ $t('inventory.groups.all') }}</button>
      <button v-for="k in subcats" :key="k" class="chip-btn" :class="{ on: cat === k }" @click="cat = k">
        <GameIcon :name="CATEGORY_ICON[k]" :size="13" /> {{ $t(`inventory.cats.${k}`) }} <small class="tnum">{{ counts[k] }}</small>
      </button>
    </div>
    <div class="row wrap" style="margin-bottom:12px">
      <IconField class="grow" style="min-width:200px">
        <InputIcon class="pi pi-search" />
        <InputText v-model="search" :placeholder="$t('inventory.search')" :id="'inv-search-' + mode" fluid />
      </IconField>
      <slot name="tools" />
    </div>

    <template v-if="sections.length">
      <section v-for="s in sections" :key="s.cat" class="cat-sec">
        <div class="cat-title"><GameIcon :name="CATEGORY_ICON[s.cat]" :size="14" /> {{ $t(`inventory.cats.${s.cat}`) }} <small class="tnum">{{ s.ids.length }}</small></div>
        <div class="inv-grid">
          <button v-for="id in s.ids" :key="id" class="inv-slot" :class="{ selected: selected === id }" @click="selected = id">
            <i v-if="state.food === id || state.potion === id || state.equipment.ammo === id" class="pi pi-check-circle mark" />
            <i v-if="G.isLocked(id)" class="pi pi-lock lock-mark" />
            <i v-if="G.marketMult(id) > 1" class="pi pi-arrow-up market-mark" />
            <ItemTile :item="id" size="lg" :qty="state.inventory[id]" />
            <span v-if="mode === 'sell'" class="slot-price tnum">{{ fmt(G.sellPrice(id) * state.inventory[id]) }}</span>
          </button>
        </div>
      </section>
    </template>
    <div v-else class="empty-state">
      <GameIcon name="knapsack" :size="46" />
      <div>{{ search || group !== 'all' ? $t('filters.noMatch') : $t(mode === 'sell' ? 'shop.nothingToSell' : 'inventory.empty') }}</div>
    </div>
  </div>
</template>

<style scoped>
.cat-sec + .cat-sec { margin-top: 16px; }
.cat-title { display: flex; align-items: center; gap: 7px; margin-bottom: 8px; font-size: 12px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); }
.cat-title .gi { color: var(--gold); }
.cat-title small { color: var(--faint); letter-spacing: 0; }
.lock-mark { position: absolute; inset-inline-end: 6px; top: 5px; color: var(--muted); font-size: 11px; }
.market-mark { position: absolute; inset-inline-start: 6px; bottom: 5px; color: var(--ok); font-size: 11px; }
.slot-price { position: absolute; left: 0; right: 0; bottom: -2px; text-align: center; font-size: 10.5px; font-weight: 800; color: var(--gold-hi); text-shadow: 0 1px 2px #000; }
</style>
