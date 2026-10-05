<script setup>
import Button from 'primevue/button'
import { G, state } from '../game/engine.js'
import { ROOMS } from '../game/data/progression.js'
import { ITEMS } from '../game/data/items.js'
import { fmt } from '../game/format.js'
import ItemTile from '../components/ItemTile.vue'

function build(r) {
  if (G.build(r.id)) G.toast(r.icon, 'home.upgraded', { room: '@room:' + r.id, n: G.room(r.id) }, 'success')
}
</script>

<template>
  <div>
    <p class="intro">{{ $t('home.intro') }}</p>
    <div class="grid-wide">
      <div v-for="r in ROOMS" :key="r.id" class="card room" :class="{ done: G.room(r.id) >= r.max }" style="--c:#e2b65a">
        <div class="row">
          <ItemTile :icon="r.icon" tint="#8a6a2a" size="lg" :tip="false" />
          <div class="grow">
            <div class="card-name">{{ r.name }}</div>
            <div class="card-sub">{{ $t('home.level', { n: G.room(r.id), max: r.max }) }}</div>
          </div>
        </div>
        <div class="pips"><i v-for="i in r.max" :key="i" :class="{ on: i <= G.room(r.id) }" /></div>
        <div class="small">
          <div v-if="G.room(r.id)">{{ r.desc(G.room(r.id)) }}</div>
          <div v-else class="muted">{{ $t('home.notBuilt') }}</div>
          <div v-if="G.room(r.id) < r.max" class="muted">{{ $t('home.next', { effect: r.desc(G.room(r.id) + 1) }) }}</div>
        </div>
        <template v-if="G.room(r.id) < r.max">
          <div class="cost">
            <div class="row small">
              <ItemTile icon="two-coins" tint="#c9a04a" size="xs" :tip="false" />
              <span class="grow">{{ $t('common.gold') }}</span>
              <b class="tnum" :class="state.gold >= G.roomCost(r).gold ? '' : 'bad-text'">{{ fmt(state.gold) }} / {{ fmt(G.roomCost(r).gold) }}</b>
            </div>
            <template v-for="(q, k) in G.roomCost(r).items" :key="k">
              <div v-if="q > 0" class="row small">
                <ItemTile :item="k" size="xs" />
                <span class="grow">{{ ITEMS[k].name }}</span>
                <b class="tnum" :class="G.qty(k) >= q ? '' : 'bad-text'">{{ fmt(G.qty(k)) }} / {{ fmt(q) }}</b>
              </div>
            </template>
          </div>
          <Button :label="G.room(r.id) ? $t('home.upgrade') : $t('home.build')" icon="pi pi-hammer" fluid :disabled="!G.canBuild(r)" @click="build(r)" />
        </template>
        <div v-else class="tag ok" style="align-self:flex-start"><i class="pi pi-check" /> {{ $t('common.maxLevel') }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.room { display: flex; flex-direction: column; gap: 12px; }
.pips { display: flex; gap: 4px; }
.pips i { flex: 1; height: 5px; border-radius: 5px; background: var(--tint-3); }
.pips i.on { background: var(--gold-grad); box-shadow: 0 0 8px rgba(226, 182, 90, 0.5); }
.cost { display: flex; flex-direction: column; gap: 6px; padding: 10px; border-radius: 10px; background: var(--well); margin-top: auto; }
</style>
