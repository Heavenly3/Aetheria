<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import InputNumber from 'primevue/inputnumber'
import Button from 'primevue/button'
import SelectButton from 'primevue/selectbutton'
import { useConfirm } from 'primevue/useconfirm'
import { G, state } from '../game/engine.js'
import { SHOP } from '../game/data/progression.js'
import { ITEMS } from '../game/data/items.js'
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
      <template v-for="c in SHOP" :key="c.cat">
        <div class="section-title">{{ $t('shop.cats.' + c.cat) }}</div>
        <div class="grid-cards">
          <div v-for="[id, price] in c.items" :key="id" class="card shop-item">
            <div class="row">
              <ItemTile :item="id" size="md" />
              <div class="grow">
                <div class="card-name">{{ ITEMS[id].name }}</div>
                <div class="card-sub">{{ $t('inventory.goldAmount', { n: fmt(price) }) }} · {{ $t('shop.have', { n: fmt(G.qty(id)) }) }}</div>
              </div>
            </div>
            <div class="row" style="margin-top:12px">
              <InputNumber :modelValue="q(id)" @update:modelValue="v => (qty[id] = v || 1)" :min="1" :max="9999" size="small" inputClass="shop-qty" class="grow" :inputId="'qty-' + id" />
              <Button :label="fmt(price * q(id))" icon="pi pi-shopping-cart" size="small" :disabled="state.gold < price * q(id)" @click="buy(id, price)" />
            </div>
          </div>
        </div>
      </template>
    </template>

    <!-- Sell -->
    <div v-else class="sell-layout">
      <div class="stack" style="gap:18px">
        <div class="panel pad">
          <InventoryGrid v-model="selected" mode="sell" @filtered="v => (shown = v)">
            <template #tools>
              <Button :label="$t('inventory.sellJunk')" icon="pi pi-trash" severity="secondary" size="small" outlined @click="sellJunk" />
              <Button :label="$t('inventory.sellShown', { gold: fmt(sellableValue) })" icon="pi pi-wallet" severity="danger" size="small" outlined :disabled="!sellable.length" @click="sellShown" />
            </template>
          </InventoryGrid>
        </div>
        <div class="panel pad">
          <h3 class="panel-title"><i class="pi pi-chart-line gold-text" /> {{ $t('shop.marketTitle') }} <HelpTip k="sections.market" /></h3>
          <p class="small muted" style="margin-top:0">{{ $t('shop.marketIntro') }}</p>
          <div class="market">
            <button v-for="[id, m] in market" :key="id" class="mrow" :class="{ owned: G.qty(id) > 0 }" :disabled="!G.qty(id)" @click="selected = id">
              <ItemTile :item="id" size="sm" :tip="false" />
              <span class="grow small">{{ ITEMS[id].name }}</span>
              <span class="tag" :class="m > 1 ? 'ok' : 'bad'"><i :class="m > 1 ? 'pi pi-arrow-up' : 'pi pi-arrow-down'" style="font-size:10px" /> ×{{ m }}</span>
              <b class="small tnum gold-text">{{ fmt(G.sellPrice(id)) }}</b>
            </button>
          </div>
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
