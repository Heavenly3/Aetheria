<script setup>
import { ref, computed } from 'vue'
import Popover from 'primevue/popover'
import { G, state } from '../game/engine.js'
import { walletLines } from '../game/data/wallet.js'
import { fmt } from '../game/format.js'
import GameIcon from './GameIcon.vue'

// The gold chip of the top bar; it opens the purse with every other currency
const pop = ref()
const lines = computed(() => (void state.lastTick, walletLines(G)))
</script>

<template>
  <button class="chip gold wallet-chip" :aria-label="$t('wallet.title')" v-tooltip.bottom="$t('wallet.hint')" @click="pop.toggle($event)">
    <GameIcon name="two-coins" :size="15" />{{ fmt(state.gold) }}
  </button>
  <Popover ref="pop">
    <div class="wallet">
      <div class="w-head">{{ $t('wallet.title') }}</div>
      <router-link v-for="w in lines" :key="w.id" :to="w.to" class="w-row" :class="{ empty: !w.value }" @click="pop.hide()">
        <span class="w-icon"><GameIcon :name="w.icon" :size="16" /></span>
        <span class="grow">
          <b>{{ $t(`wallet.items.${w.id}.name`) }}</b>
          <small>{{ $t(`wallet.items.${w.id}.from`) }}</small>
        </span>
        <span class="w-val tnum">{{ fmt(w.value) }}</span>
      </router-link>
    </div>
  </Popover>
</template>

<style scoped>
.wallet-chip { font: inherit; cursor: pointer; }
.wallet-chip:hover { border-color: var(--line-hi); }
.wallet { display: flex; flex-direction: column; gap: 2px; width: min(320px, calc(100vw - 48px)); }
.w-head { font-size: 11px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: var(--faint); padding: 2px 8px 6px; }
.w-row { display: flex; align-items: center; gap: 10px; padding: 7px 8px; border-radius: 10px; color: var(--ink-2); text-decoration: none; }
.w-row:hover { background: var(--tint-2); color: var(--ink); }
.w-row.empty { opacity: 0.55; }
.w-row small { display: block; font-size: 12px; color: var(--muted); line-height: 1.3; }
.w-icon { width: 28px; height: 28px; flex-shrink: 0; display: grid; place-items: center; border-radius: 8px; background: var(--tint-2); border: 1px solid var(--line); color: var(--gold); }
.w-val { font-weight: 800; color: var(--gold-hi); }
</style>
