<script setup>
import Button from 'primevue/button'
import { G, state } from '../game/engine.js'
import { BLESSINGS } from '../game/data/progression.js'
import { SKILLS } from '../game/data/skills.js'
import { fmt, fmtClock } from '../game/format.js'
import ItemTile from '../components/ItemTile.vue'
import GameIcon from '../components/GameIcon.vue'
import HelpTip from '../components/HelpTip.vue'

function bless(b) {
  if (G.bless(b.id)) G.toast(b.icon, 'church.blessed', { name: '@blessing:' + b.id, n: Math.round(G.blessingDuration() / 60) }, 'success')
  else if (!G.blessed(b.id) && G.activeBlessings() >= G.maxBlessings()) G.toast('candle-light', 'church.maxActive', {}, 'warn')
}
</script>

<template>
  <div>
    <div class="banner" style="--c:#f1e3b0">
      <GameIcon class="banner-ghost" name="church" :size="230" />
      <ItemTile icon="church" tint="#c9b27a" size="xl" :tip="false" />
      <div class="grow">
        <h1 class="banner-title">{{ $t('church.title') }}</h1>
        <div class="banner-desc">{{ $t('church.desc') }}</div>
        <div class="row wrap">
          <span class="tag gold">{{ SKILLS.prayer.name }} {{ G.level('prayer') }}</span>
          <span class="tag">{{ $t('church.active', { n: G.activeBlessings(), max: G.maxBlessings() }) }}</span>
          <span class="tag arcane">{{ $t('church.duration', { n: Math.round(G.blessingDuration() / 60) }) }}</span>
        </div>
      </div>
    </div>
    <div class="section-title">{{ $t('church.blessings') }} <HelpTip k="sections.blessings" /></div>
    <div class="grid-wide">
      <div v-for="b in BLESSINGS" :key="b.id" class="card" :class="{ active: G.blessed(b.id), locked: G.level('prayer') < b.lvl }" style="--c:#f1e3b0">
        <div class="row">
          <ItemTile :icon="b.icon" tint="#b8a060" size="md" :tip="false" />
          <div class="grow">
            <div class="card-name">{{ b.name }}</div>
            <div class="card-sub">{{ b.desc }} · {{ SKILLS.prayer.name }} {{ b.lvl }}</div>
          </div>
        </div>
        <div v-if="G.blessed(b.id)" style="margin-top:12px">
          <div class="bar" style="--c:#f1e3b0"><i :style="{ width: (state.blessings[b.id] / G.blessingDuration()) * 100 + '%' }" /></div>
          <div class="small muted tnum" style="margin-top:5px">{{ $t('church.remaining', { time: fmtClock(state.blessings[b.id]) }) }}</div>
        </div>
        <Button :label="G.blessed(b.id) ? $t('church.renew', { gold: fmt(b.cost) }) : $t('church.offer', { gold: fmt(b.cost) })" icon="pi pi-sun" fluid style="margin-top:14px"
          :disabled="G.level('prayer') < b.lvl || state.gold < b.cost" @click="bless(b)" />
      </div>
    </div>
  </div>
</template>
