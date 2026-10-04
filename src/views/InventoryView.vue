<script setup>
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import SelectButton from 'primevue/selectbutton'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import Button from 'primevue/button'
import { G, state } from '../game/engine.js'
import { ITEMS, SLOTS, STAT_LABELS } from '../game/data/items.js'
import { SKILLS } from '../game/data/skills.js'
import { POTION_DURATION } from '../game/data/items.js'
import { fmt, fmtClock } from '../game/format.js'
import { TOOL_TYPES, TOOL_SPEED_PER_TIER } from '../game/data/character.js'
import { useConfirm } from 'primevue/useconfirm'
import ItemTile from '../components/ItemTile.vue'
import GameIcon from '../components/GameIcon.vue'

const { t } = useI18n()
const filters = computed(() => ['all', 'resource', 'food', 'equip', 'tool', 'potion', 'seed', 'rune', 'other'].map(value => ({ value, label: t('inventory.filters.' + value) })))
const ORDER = { tool: 0, equip: 0, potion: 1, food: 2, rune: 3, chest: 4, seed: 5, resource: 6, junk: 7 }
const filter = ref('all')
const search = ref('')
const selected = ref(null)
const sellQty = ref(1)

const ids = computed(() => {
  let list = Object.keys(state.inventory).filter(id => ITEMS[id])
  if (filter.value === 'other') list = list.filter(id => ['junk', 'chest'].includes(ITEMS[id].type))
  else if (filter.value !== 'all') list = list.filter(id => ITEMS[id].type === filter.value)
  const q = search.value.trim().toLowerCase()
  if (q) list = list.filter(id => ITEMS[id].name.toLowerCase().includes(q))
  return list.sort((a, b) => ORDER[ITEMS[a].type] - ORDER[ITEMS[b].type] || ITEMS[b].value - ITEMS[a].value)
})
const totalValue = computed(() => Object.entries(state.inventory).reduce((s, [id, q]) => s + (ITEMS[id] ? G.sellPrice(id) * q : 0), 0))
const it = computed(() => (selected.value && ITEMS[selected.value]) || null)
const have = computed(() => (selected.value ? G.qty(selected.value) : 0))
watch(have, q => { if (selected.value && q <= 0) selected.value = null; if (sellQty.value > q) sellQty.value = Math.max(1, q) })
watch(selected, () => (sellQty.value = 1))

const equippedSame = computed(() => it.value?.slot && state.equipment[it.value.slot])
function sell(n) {
  const earned = G.sell(selected.value, n)
  if (earned) G.toast('two-coins', 'inventory.sold', { gold: fmt(earned) }, 'success')
}
function open() {
  const got = G.openChest(selected.value)
  if (!got) return
  const parts = Object.entries(got).map(([k, v]) => (k === 'gold' ? t('inventory.goldAmount', { n: fmt(v) }) : `${v}× ${ITEMS[k].name}`))
  G.toast(it.value?.icon || 'open-treasure-chest', 'inventory.opened', { items: parts.join(', ') }, 'success')
}
const confirm = useConfirm()
const sellable = computed(() => ids.value.filter(id => !G.isLocked(id)))
const sellableValue = computed(() => sellable.value.reduce((s, id) => s + G.sellPrice(id) * G.qty(id), 0))
function sellFiltered() {
  confirm.require({
    header: t('inventory.sellShownTitle'),
    message: t('inventory.sellShownMessage', { n: sellable.value.length, gold: fmt(sellableValue.value) }),
    icon: 'pi pi-wallet', acceptLabel: t('inventory.sell'), rejectLabel: t('common.cancel'), acceptProps: { severity: 'danger' }, rejectProps: { severity: 'secondary', outlined: true },
    accept: () => { const n = G.sellMany(sellable.value); G.toast('two-coins', 'inventory.sold', { gold: fmt(n) }, 'success') },
  })
}
function sellJunk() {
  const n = G.sellJunk()
  n ? G.toast('two-coins', 'inventory.junkSold', { gold: fmt(n) }, 'success') : G.toast('two-coins', 'inventory.noJunk')
}
</script>

<template>
  <div class="inv-layout">
    <div class="panel pad">
      <div class="row wrap" style="justify-content:space-between;margin-bottom:14px">
        <SelectButton v-model="filter" :options="filters" optionLabel="label" optionValue="value" :allowEmpty="false" size="small" class="filters" />
      </div>
      <div class="row wrap" style="margin-bottom:16px">
        <IconField class="grow" style="min-width:200px">
          <InputIcon class="pi pi-search" />
          <InputText v-model="search" :placeholder="$t('inventory.search')" id="inventory-search" fluid />
        </IconField>
        <span class="tag gold">{{ $t('inventory.totalValue', { gold: fmt(totalValue) }) }}</span>
        <Button :label="$t('inventory.sellJunk')" icon="pi pi-trash" severity="secondary" size="small" outlined @click="sellJunk" />
        <Button v-if="filter !== 'all' || search" :label="$t('inventory.sellShown', { gold: fmt(sellableValue) })" icon="pi pi-wallet" severity="danger" size="small" outlined :disabled="!sellable.length" @click="sellFiltered" />
      </div>

      <div v-if="ids.length" class="inv-grid">
        <button v-for="id in ids" :key="id" class="inv-slot" :class="{ selected: selected === id }" @click="selected = id">
          <i v-if="state.food === id || state.potion === id || state.equipment.ammo === id" class="pi pi-check-circle mark" />
          <i v-if="G.isLocked(id)" class="pi pi-lock lock-mark" />
          <i v-if="G.marketMult(id) > 1" class="pi pi-arrow-up market-mark" />
          <ItemTile :item="id" size="lg" :qty="state.inventory[id]" />
        </button>
      </div>
      <div v-else class="empty-state">
        <GameIcon name="knapsack" :size="46" />
        <div>{{ search || filter !== 'all' ? $t('filters.noMatch') : $t('inventory.empty') }}</div>
      </div>
    </div>

    <div class="panel pad detail">
      <template v-if="it">
        <div class="row" style="margin-bottom:14px">
          <ItemTile :item="selected" size="xl" :tip="false" />
          <div class="grow">
            <div class="detail-name">{{ it.name }}</div>
            <div class="row wrap" style="gap:6px;margin-top:4px">
              <span class="tag">{{ $t('itemTypes.' + it.type) }}</span>
              <span v-if="it.slot" class="tag">{{ SLOTS[it.slot].name }}</span>
              <span v-if="it.type === 'tool'" class="tag">{{ $t('hero.toolTier', { tool: TOOL_TYPES[it.toolType].name, n: it.tier }) }}</span>
              <span v-if="it.twoHanded" class="tag">{{ $t('inventory.twoHanded') }}</span>
              <span v-if="it.rare" class="tag gold">{{ $t('inventory.rare') }}</span>
            </div>
          </div>
        </div>
        <div class="kv"><span>{{ $t('inventory.quantity') }}</span><b>{{ fmt(have) }}</b></div>
        <div class="kv"><span>{{ $t('inventory.unitValue') }}</span><b class="gold-text">{{ $t('inventory.goldAmount', { n: fmt(G.sellPrice(selected)) }) }}</b></div>
        <div v-if="G.marketMult(selected) !== 1" class="kv"><span>{{ $t('inventory.market') }}</span><b :class="G.marketMult(selected) > 1 ? 'ok-text' : 'bad-text'">×{{ G.marketMult(selected) }} {{ G.marketMult(selected) > 1 ? $t('inventory.highDemand') : $t('inventory.lowDemand') }}</b></div>
        <div v-if="it.heal" class="kv"><span>{{ $t('inventory.heals') }}</span><b class="ok-text">{{ $t('inventory.hp', { n: G.foodHeal(selected) }) }}</b></div>
        <template v-if="it.buff">
          <div v-for="(v, sk) in it.buff" :key="sk" class="kv"><span>{{ SKILLS[sk].name }}</span><b class="ok-text">{{ $t('inventory.boost', { flat: v[0], pct: Math.round(v[1] * 100) }) }}</b></div>
          <div class="kv"><span>{{ $t('inventory.duration') }}</span><b>{{ fmtClock(POTION_DURATION) }}</b></div>
        </template>
        <div v-if="it.type === 'tool'" class="kv"><span>{{ $t('skill.speed') }}</span><b class="ok-text">+{{ Math.round(it.tier * TOOL_SPEED_PER_TIER * 100) }}% {{ SKILLS[TOOL_TYPES[it.toolType].skill].name }}</b></div>
        <div v-if="it.type === 'tool' && state.tools[it.toolType]" class="kv"><span>{{ $t('inventory.equippedNow') }}</span><b>{{ ITEMS[state.tools[it.toolType]].name }}</b></div>
        <div v-if="it.elixir" class="kv"><span>{{ $t('inventory.effect') }}</span><b class="ok-text">{{ $t('inventory.elixirEffect') }}</b></div>
        <template v-if="it.stats">
          <div v-for="(v, k) in it.stats" :key="k" class="kv"><span>{{ STAT_LABELS[k] }}</span><b class="ok-text">+{{ k === 'mDmg' ? Math.round(v * 100) + '%' : v }}</b></div>
        </template>
        <div v-for="(l, sk) in it.req || {}" :key="sk" class="kv"><span>{{ $t('inventory.requires') }}</span><b :class="G.level(sk) >= l ? 'ok-text' : 'bad-text'">{{ SKILLS[sk].name }} {{ l }}</b></div>
        <p v-if="it.desc" class="small muted">{{ it.desc }}</p>
        <p v-if="equippedSame && equippedSame !== selected" class="small muted">{{ $t('inventory.equippedNow') }}: <b>{{ ITEMS[equippedSame].name }}</b></p>

        <div class="row wrap" style="margin-top:14px">
          <Button v-if="it.type === 'equip'" :label="it.stackEquip ? (state.equipment.ammo === selected ? $t('inventory.equipped') : $t('inventory.equipAmmo')) : $t('common.equip')" icon="pi pi-shield"
            :disabled="!G.canEquip(selected) || state.equipment.ammo === selected" @click="G.equip(selected)" />
          <Button v-if="it.type === 'tool'" :label="$t('inventory.equipTool')" icon="pi pi-wrench" :disabled="!G.canEquip(selected)" @click="G.equip(selected)" />
          <template v-if="it.type === 'food'">
            <Button :label="$t('inventory.eat')" icon="pi pi-heart" :disabled="state.hp >= G.maxHp()" @click="G.eat(selected)" />
            <Button :label="state.food === selected ? $t('inventory.combatFood') : $t('inventory.useInCombat')" :icon="state.food === selected ? 'pi pi-check' : 'pi pi-bolt'"
              severity="secondary" outlined @click="state.food = state.food === selected ? null : selected" />
          </template>
          <template v-if="it.type === 'potion'">
            <Button :label="$t('inventory.drink')" icon="pi pi-sparkles" @click="G.drink(selected)" />
            <Button v-if="!it.elixir" :label="state.potion === selected ? $t('inventory.combatPotion') : $t('inventory.useInCombat')" :icon="state.potion === selected ? 'pi pi-check' : 'pi pi-bolt'"
              severity="secondary" outlined @click="state.potion = state.potion === selected ? null : selected" />
          </template>
          <Button v-if="it.type === 'chest'" :label="$t('inventory.open')" icon="pi pi-box" @click="open" />
          <Button :label="G.isLocked(selected) ? $t('inventory.locked') : $t('inventory.lock')" :icon="G.isLocked(selected) ? 'pi pi-lock' : 'pi pi-lock-open'" severity="secondary" :outlined="!G.isLocked(selected)"
            v-tooltip.top="$t('inventory.lockTip')" @click="G.toggleLock(selected)" />
        </div>

        <div class="section-title" style="margin:20px 0 10px">{{ $t('inventory.sell') }}</div>
        <div class="row">
          <InputNumber v-model="sellQty" :min="1" :max="Math.max(1, have)" showButtons buttonLayout="horizontal" size="small" inputClass="qty-input" class="grow"
            incrementButtonIcon="pi pi-plus" decrementButtonIcon="pi pi-minus" />
          <Button :label="$t('inventory.goldAmount', { n: fmt(G.sellPrice(selected) * sellQty) })" icon="pi pi-wallet" severity="secondary" @click="sell(sellQty)" />
        </div>
        <Button :label="$t('inventory.sellAll', { gold: fmt(G.sellPrice(selected) * have) })" severity="danger" outlined fluid style="margin-top:8px" :disabled="G.isLocked(selected)" @click="sell(have)" />
        <div v-if="G.isLocked(selected)" class="small muted" style="margin-top:6px"><i class="pi pi-lock" /> {{ $t('inventory.lockedHint') }}</div>
      </template>
      <div v-else class="empty-state" style="padding:30px 10px">
        <GameIcon name="crystal-ball" :size="46" />
        <div>{{ $t('inventory.select') }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.inv-layout { display: grid; grid-template-columns: 1fr 340px; gap: 18px; align-items: start; }
.detail { position: sticky; top: 90px; }
.detail-name { font-family: var(--font-display); font-size: 20px; line-height: 1.15; }
.filters { flex-wrap: wrap; }
.lock-mark { position: absolute; inset-inline-end: 6px; top: 5px; color: var(--muted); font-size: 11px; }
.market-mark { position: absolute; inset-inline-start: 6px; bottom: 5px; color: var(--ok); font-size: 11px; }
:deep(.qty-input) { width: 100%; text-align: center; }
@media (max-width: 1100px) { .inv-layout { grid-template-columns: 1fr; } .detail { position: static; } }
</style>
