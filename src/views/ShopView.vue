<script setup>
import { reactive, computed } from 'vue'
import InputNumber from 'primevue/inputnumber'
import Button from 'primevue/button'
import { G, state } from '../game/engine.js'
import { SHOP } from '../game/data/progression.js'
import { ITEMS } from '../game/data/items.js'
import { fmt } from '../game/format.js'
import ItemTile from '../components/ItemTile.vue'

const qty = reactive({})
const market = computed(() => Object.entries(G.marketTable()).filter(([id]) => ITEMS[id]).sort((a, b) => b[1] - a[1]))
const q = id => qty[id] || 1
function buy(id, price) {
  const n = q(id)
  if (G.buy(id, n, price)) G.toast(ITEMS[id].icon, 'shop.bought', { n, item: '@item:' + id }, 'success')
  else G.toast('two-coins', 'common.notEnoughGold', {}, 'warn')
}
</script>

<template>
  <div>
    <p class="intro">{{ $t('shop.intro') }}</p>
    <div class="panel pad" style="margin-bottom:8px">
      <h3 class="panel-title"><i class="pi pi-chart-line gold-text" /> {{ $t('shop.marketTitle') }}</h3>
      <p class="small muted" style="margin-top:0">{{ $t('shop.marketIntro') }}</p>
      <div class="market">
        <div v-for="[id, m] in market" :key="id" class="mrow">
          <ItemTile :item="id" size="sm" :tip="false" />
          <span class="grow small">{{ ITEMS[id].name }}</span>
          <span class="tag" :class="m > 1 ? 'ok' : 'bad'"><i :class="m > 1 ? 'pi pi-arrow-up' : 'pi pi-arrow-down'" style="font-size:10px" /> ×{{ m }}</span>
          <b class="small tnum gold-text">{{ fmt(G.sellPrice(id)) }}</b>
        </div>
      </div>
    </div>
    <template v-for="c in SHOP" :key="c.cat">
      <div class="section-title">{{ $t('shop.cats.' + c.cat) }}</div>
      <div class="grid-cards">
        <div v-for="[id, price] in c.items" :key="id" class="card shop-item">
          <div class="row">
            <ItemTile :item="id" size="md" :tip="false" />
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
  </div>
</template>

<style scoped>
:deep(.shop-qty) { width: 100%; }
.market { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 6px 18px; }
.mrow { display: flex; align-items: center; gap: 8px; padding: 4px 0; border-bottom: 1px dashed var(--line); }
</style>
