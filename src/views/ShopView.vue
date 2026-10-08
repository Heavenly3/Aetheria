<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import Select from 'primevue/select'
import Button from 'primevue/button'
import SelectButton from 'primevue/selectbutton'
import { useConfirm } from 'primevue/useconfirm'
import { G, state } from '../game/engine.js'
import { SHOP } from '../game/data/progression.js'
import { ITEMS, CROPS } from '../game/data/items.js'
import { SKILLS } from '../game/data/skills.js'
import { itemCategory } from '../game/data/categories.js'
import { fmt } from '../game/format.js'
import { play } from '../game/sound.js'
import ItemTile from '../components/ItemTile.vue'
import GameIcon from '../components/GameIcon.vue'
import InventoryGrid from '../components/InventoryGrid.vue'
import HelpTip from '../components/HelpTip.vue'

const { t } = useI18n()
const route = useRoute()
const confirm = useConfirm()

// Opened from the inventory with ?sell=<item>: go straight to that item on the sell side
const tab = ref(route.query.sell ? 'sell' : 'buy')
const tabs = computed(() => [{ value: 'buy', label: t('shop.buyTab'), icon: 'pi pi-shopping-cart' }, { value: 'sell', label: t('shop.sellTab'), icon: 'pi pi-wallet' }])

/* ---------- buying ---------- */
const qty = reactive({})
const q = id => qty[id] || 1
const SHOP_ICON = { supplies: 'knapsack', seeds: 'plant-seed', runes: 'rune-stone', tools: 'war-pick', gear: 'crossed-swords' }
const buyCat = ref('all')
const buySearch = ref('')
const onlyAfford = ref(false)
const onlyUsable = ref(false)
const buySort = ref('shop')
const sorts = computed(() => ['shop', 'cheap', 'dear', 'name'].map(value => ({ value, label: t(`shop.sort.${value}`) })))
const CROP_LVL = Object.fromEntries(CROPS.map(c => [c.id + '_seed', c.lvl]))
// What still stops the hero from using an item: missing levels for gear and tools, Farming for seeds
function missing(id) {
  const it = ITEMS[id]
  if (CROP_LVL[id] && G.level('farming') < CROP_LVL[id]) return `${SKILLS.farming.name} ${CROP_LVL[id]}`
  const miss = Object.entries(it.req || {}).filter(([sk, l]) => G.level(sk) < l)
  return miss.length ? miss.map(([sk, l]) => `${SKILLS[sk].name} ${l}`).join(', ') : null
}
const offers = computed(() => SHOP.flatMap(c => c.items.map(([id, price], i) => ({ id, price, cat: c.cat, order: i }))))
const catCount = cat => offers.value.filter(o => cat === 'all' || o.cat === cat).length
const buyShown = computed(() => {
  const qs = buySearch.value.trim().toLowerCase()
  const list = offers.value.filter(o => (buyCat.value === 'all' || o.cat === buyCat.value)
    && (!qs || ITEMS[o.id].name.toLowerCase().includes(qs))
    && (!onlyAfford.value || state.gold >= o.price)
    && (!onlyUsable.value || !missing(o.id)))
  const by = { cheap: (a, b) => a.price - b.price, dear: (a, b) => b.price - a.price, name: (a, b) => ITEMS[a.id].name.localeCompare(ITEMS[b.id].name) }[buySort.value]
  return by ? [...list].sort(by) : list
})
// Grouped by shop section unless sorted by price or name
const buySections = computed(() => (buySort.value === 'shop'
  ? SHOP.map(c => ({ cat: c.cat, items: buyShown.value.filter(o => o.cat === c.cat) })).filter(s => s.items.length)
  : [{ cat: null, items: buyShown.value }]))
const maxAfford = price => Math.max(1, Math.min(9999, Math.floor(state.gold / price)))
function buy(id, price) {
  const n = q(id)
  if (G.buy(id, n, price)) { play('coin'); G.toast(ITEMS[id].icon, 'shop.bought', { n, item: '@item:' + id }, 'success') }
  else G.toast('two-coins', 'common.notEnoughGold', {}, 'warn')
}

/* ---------- selling ---------- */
const selected = ref(typeof route.query.sell === 'string' && ITEMS[route.query.sell] ? route.query.sell : null)
const sellQty = ref(1)
const shown = ref([])
const it = computed(() => (selected.value ? ITEMS[selected.value] : null))
const have = computed(() => (selected.value ? G.qty(selected.value) : 0))
watch(have, n => { if (selected.value && n <= 0) selected.value = null; if (sellQty.value > n) sellQty.value = Math.max(1, n) })
watch(selected, () => (sellQty.value = 1))
const market = computed(() => Object.entries(G.marketTable()).filter(([id]) => ITEMS[id]).sort((a, b) => b[1] - a[1]))
const sellable = computed(() => shown.value.filter(id => !G.isLocked(id)))
const sellableValue = computed(() => sellable.value.reduce((s, id) => s + G.sellPrice(id) * G.qty(id), 0))
const BIG_SALE = 50000

// Reasons to think twice before a sale
function warnings(id, n) {
  const w = []
  const all = n >= G.qty(id)
  if (all && state.equipment.ammo === id) w.push(t('shop.warn.ammo'))
  if (all && state.food === id) w.push(t('shop.warn.food'))
  if (all && state.potion === id) w.push(t('shop.warn.potion'))
  if (ITEMS[id].rare) w.push(t('shop.warn.rare'))
  if (G.sellPrice(id) * n >= BIG_SALE) w.push(t('shop.warn.big', { gold: fmt(G.sellPrice(id) * n) }))
  return w
}
function doSell(id, n) {
  const earned = G.sell(id, n)
  if (earned) { play('coin'); G.toast('two-coins', 'inventory.sold', { gold: fmt(earned) }, 'success') }
}
function sell(n) {
  const id = selected.value
  const w = warnings(id, n)
  if (!w.length) return doSell(id, n)
  confirm.require({
    header: t('shop.confirmTitle'),
    message: t('shop.confirmMessage', { n: fmt(n), item: ITEMS[id].name, gold: fmt(G.sellPrice(id) * n) }) + ' ' + w.join(' '),
    icon: 'pi pi-exclamation-triangle', acceptLabel: t('inventory.sell'), rejectLabel: t('common.cancel'),
    acceptProps: { severity: 'danger' }, rejectProps: { severity: 'secondary', outlined: true },
    accept: () => doSell(id, n),
  })
}
function sellShown() {
  confirm.require({
    header: t('inventory.sellShownTitle'),
    message: t('inventory.sellShownMessage', { n: sellable.value.length, gold: fmt(sellableValue.value) }),
    icon: 'pi pi-wallet', acceptLabel: t('inventory.sell'), rejectLabel: t('common.cancel'),
    acceptProps: { severity: 'danger' }, rejectProps: { severity: 'secondary', outlined: true },
    accept: () => { const n = G.sellMany(sellable.value); play('coin'); G.toast('two-coins', 'inventory.sold', { gold: fmt(n) }, 'success') },
  })
}
function sellJunk() {
  const n = G.sellJunk()
  n ? G.toast('two-coins', 'inventory.junkSold', { gold: fmt(n) }, 'success') : G.toast('two-coins', 'inventory.noJunk')
}
</script>

<template>
  <div>
    <div class="row wrap shop-head">
      <p class="intro grow" style="margin:0">{{ $t(tab === 'buy' ? 'shop.intro' : 'shop.sellIntro') }}</p>
      <SelectButton v-model="tab" :options="tabs" optionLabel="label" optionValue="value" :allowEmpty="false">
        <template #option="{ option }"><i :class="option.icon" style="margin-inline-end:6px" />{{ option.label }}</template>
      </SelectButton>
    </div>

    <!-- Buy -->
    <template v-if="tab === 'buy'">
      <div class="panel pad buy-filters">
        <div class="groups">
          <button class="group-btn" :class="{ on: buyCat === 'all' }" @click="buyCat = 'all'">
            <GameIcon name="shop" :size="15" /> {{ $t('inventory.groups.all') }} <small class="tnum">{{ catCount('all') }}</small>
          </button>
          <button v-for="c in SHOP" :key="c.cat" class="group-btn" :class="{ on: buyCat === c.cat }" @click="buyCat = c.cat">
            <GameIcon :name="SHOP_ICON[c.cat]" :size="15" /> {{ $t('shop.cats.' + c.cat) }} <small class="tnum">{{ catCount(c.cat) }}</small>
          </button>
        </div>
        <div class="row wrap" style="gap:8px">
          <IconField class="grow" style="min-width:200px">
            <InputIcon class="pi pi-search" />
            <InputText v-model="buySearch" :placeholder="$t('inventory.search')" id="shop-search" fluid />
          </IconField>
          <button class="chip-btn" :class="{ on: onlyAfford }" :aria-pressed="onlyAfford" @click="onlyAfford = !onlyAfford"><i class="pi pi-wallet" /> {{ $t('shop.filter.afford') }}</button>
          <button class="chip-btn" :class="{ on: onlyUsable }" :aria-pressed="onlyUsable" @click="onlyUsable = !onlyUsable"><i class="pi pi-check" /> {{ $t('shop.filter.usable') }}</button>
          <Select v-model="buySort" :options="sorts" optionLabel="label" optionValue="value" size="small" :aria-label="$t('shop.sort.label')" class="sort-select" />
        </div>
      </div>

      <div v-if="!buyShown.length" class="panel empty-state">
        <GameIcon name="shop" :size="46" />
        <div>{{ $t('shop.noMatch') }}</div>
      </div>
      <template v-for="s in buySections" :key="s.cat || 'all'">
        <div v-if="s.cat" class="section-title">{{ $t('shop.cats.' + s.cat) }}</div>
        <div class="grid-cards" :style="s.cat ? '' : 'margin-top:18px'">
          <div v-for="o in s.items" :key="o.id" class="card shop-item" :class="{ poor: state.gold < o.price }">
            <div class="row">
              <ItemTile :item="o.id" size="md" />
              <div class="grow" style="min-width:0">
                <div class="card-name">{{ ITEMS[o.id].name }}</div>
                <div class="card-sub"><span class="gold-text">{{ $t('inventory.goldAmount', { n: fmt(o.price) }) }}</span> · {{ $t('shop.have', { n: fmt(G.qty(o.id)) }) }}</div>
                <div v-if="missing(o.id)" class="small bad-text"><i class="pi pi-lock" style="font-size:11px" /> {{ $t('shop.needs', { req: missing(o.id) }) }}</div>
              </div>
            </div>
            <div class="row" style="margin-top:12px;gap:6px">
              <InputNumber :modelValue="q(o.id)" @update:modelValue="v => (qty[o.id] = v || 1)" :min="1" :max="9999" size="small" inputClass="shop-qty" class="grow" :inputId="'qty-' + o.id" />
              <Button :label="$t('shop.max')" size="small" text :disabled="state.gold < o.price" v-tooltip.top="$t('shop.maxTip')" @click="qty[o.id] = maxAfford(o.price)" />
              <Button :label="fmt(o.price * q(o.id))" icon="pi pi-shopping-cart" size="small" :disabled="state.gold < o.price * q(o.id)" @click="buy(o.id, o.price)" />
            </div>
          </div>
        </div>
      </template>
    </template>

    <!-- Sell -->
    <div v-else class="sell-layout">
      <div class="stack" style="gap:18px">
        <div class="panel pad">
          <h3 class="panel-title"><i class="pi pi-chart-line gold-text" /> {{ $t('shop.marketTitle') }} <HelpTip k="sections.market" /></h3>
          <p class="small muted" style="margin-top:0">{{ $t('shop.marketIntro') }}</p>
          <div class="market">
            <button v-for="[id, m] in market" :key="id" class="mrow" :class="{ owned: G.qty(id) > 0 }" :disabled="!G.qty(id)" @click="selected = id">
              <ItemTile :item="id" size="sm" />
              <span class="grow small">{{ ITEMS[id].name }}</span>
              <span class="tag" :class="m > 1 ? 'ok' : 'bad'"><i :class="m > 1 ? 'pi pi-arrow-up' : 'pi pi-arrow-down'" style="font-size:10px" /> ×{{ m }}</span>
              <b class="small tnum gold-text">{{ fmt(G.sellPrice(id)) }}</b>
            </button>
          </div>
        </div>
        <div class="panel pad">
          <InventoryGrid v-model="selected" mode="sell" @filtered="v => (shown = v)">
            <template #tools>
              <Button :label="$t('inventory.sellJunk')" icon="pi pi-trash" severity="secondary" size="small" outlined @click="sellJunk" />
              <Button :label="$t('inventory.sellShown', { gold: fmt(sellableValue) })" icon="pi pi-wallet" severity="danger" size="small" outlined :disabled="!sellable.length" @click="sellShown" />
            </template>
          </InventoryGrid>
        </div>
      </div>

      <div class="panel pad detail">
        <template v-if="it">
          <div class="row" style="margin-bottom:14px">
            <ItemTile :item="selected" size="xl" :tip="false" />
            <div class="grow">
              <div class="detail-name">{{ it.name }}</div>
              <div class="row wrap" style="gap:6px;margin-top:4px">
                <span class="tag">{{ $t('inventory.cats.' + itemCategory(selected)) }}</span>
                <span v-if="it.rare" class="tag gold">{{ $t('inventory.rare') }}</span>
              </div>
            </div>
          </div>
          <div class="kv"><span>{{ $t('inventory.quantity') }}</span><b>{{ fmt(have) }}</b></div>
          <div class="kv"><span>{{ $t('inventory.unitValue') }}</span><b class="gold-text">{{ $t('inventory.goldAmount', { n: fmt(G.sellPrice(selected)) }) }}</b></div>
          <div v-if="G.marketMult(selected) !== 1" class="kv"><span>{{ $t('inventory.market') }}</span><b :class="G.marketMult(selected) > 1 ? 'ok-text' : 'bad-text'">×{{ G.marketMult(selected) }} {{ G.marketMult(selected) > 1 ? $t('inventory.highDemand') : $t('inventory.lowDemand') }}</b></div>
          <p v-for="w in warnings(selected, have)" :key="w" class="small warn-line"><i class="pi pi-exclamation-triangle" /> {{ w }}</p>
          <template v-if="!G.isLocked(selected)">
            <div class="row" style="margin-top:14px">
              <InputNumber v-model="sellQty" :min="1" :max="Math.max(1, have)" showButtons buttonLayout="horizontal" size="small" inputClass="qty-input" class="grow"
                incrementButtonIcon="pi pi-plus" decrementButtonIcon="pi pi-minus" />
              <Button :label="$t('inventory.goldAmount', { n: fmt(G.sellPrice(selected) * sellQty) })" icon="pi pi-wallet" @click="sell(sellQty)" />
            </div>
            <Button :label="$t('inventory.sellAll', { gold: fmt(G.sellPrice(selected) * have) })" severity="danger" outlined fluid style="margin-top:8px" @click="sell(have)" />
          </template>
          <div v-else class="small muted" style="margin-top:10px"><i class="pi pi-lock" /> {{ $t('inventory.lockedHint') }}</div>
        </template>
        <div v-else class="empty-state" style="padding:30px 10px">
          <GameIcon name="two-coins" :size="46" />
          <div>{{ $t('shop.pickToSell') }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.shop-head { gap: 14px; margin-bottom: 18px; align-items: center; }
.buy-filters { margin-bottom: 4px; }
.buy-filters .groups { margin-bottom: 12px; }
.sort-select { min-width: 170px; }
.shop-item.poor { opacity: 0.7; }
:deep(.shop-qty) { width: 100%; }
:deep(.qty-input) { width: 100%; text-align: center; }
.sell-layout { display: grid; grid-template-columns: 1fr 340px; gap: 18px; align-items: start; }
.detail { position: sticky; top: 90px; }
.detail-name { font-family: var(--font-display); font-size: 20px; line-height: 1.15; }
.warn-line { color: var(--warn); margin: 8px 0 0; }
.market { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 6px 18px; }
.mrow { display: flex; align-items: center; gap: 8px; padding: 4px 6px; border: 0; border-bottom: 1px dashed var(--line); background: none; color: inherit; font: inherit; text-align: start; border-radius: 6px; }
.mrow.owned { cursor: pointer; }
.mrow.owned:hover { background: var(--tint-2); }
.mrow:disabled { opacity: 0.55; }
@media (max-width: 1100px) { .sell-layout { grid-template-columns: 1fr; } .detail { position: static; } }
</style>
