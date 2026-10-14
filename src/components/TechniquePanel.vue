<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { G, state } from '../game/engine.js'
import { VEIN, FELL, MOMENTUM, MOMENTUM_COOL, BONFIRE, RESONANCE, RESONANCE_BONUS } from '../game/data/techniques.js'
import { ACTIONS } from '../game/data/actions.js'
import { ITEMS } from '../game/data/items.js'
import { fmtTime, pct } from '../game/format.js'
import { modText } from '../i18n/mods.js'
import ItemTile from './ItemTile.vue'
import GameIcon from './GameIcon.vue'

// The skill's own twist, as it stands right now
const props = defineProps({ skill: { type: String, required: true } })
const now = ref(Date.now())
let timer
onMounted(() => (timer = setInterval(() => (now.value = Date.now()), 1000)))
onUnmounted(() => clearInterval(timer))

const t = computed(() => (G.ensureTech(), state.technique))
const ICONS = { mining: 'gem-pendant', woodcutting: 'wood-axe', smithing: 'anvil-impact', fletching: 'arrow-flights', cooking: 'campfire', herblore: 'round-potion', firemaking: 'flame', runecrafting: 'rune-stone' }
const momentum = computed(() => {
  const d = MOMENTUM[props.skill]
  if (!d) return null
  void now.value
  const n = G.momentumOf(props.skill), m = t.value.momentum
  return { d, n, share: n / d.max, bonus: n * d.per, cools: n ? Math.max(0, (m.at + MOMENTUM_COOL - now.value) / 1000) : 0 }
})
// Trees the hero has been cutting, closest to falling first
const trees = computed(() => (ACTIONS.woodcutting || []).filter(a => (t.value.fell[a.id] || 0) > 0)
  .map(a => ({ a, item: Object.keys(a.out)[0], n: t.value.fell[a.id] })).sort((x, y) => y.n - x.n))
const hearth = computed(() => (void now.value, G.hearthLeft()))
const runes = computed(() => (void now.value, Object.keys(RESONANCE).filter(id => ITEMS[id]).map(id => ({ id, on: G.resonates(id) }))))
const recent = computed(() => {
  const l = t.value.last
  return l && now.value - l.at < 60e3 && (l.kind === 'vein' ? props.skill === 'mining' : l.kind === 'fell' ? props.skill === 'woodcutting' : props.skill === 'herblore') ? l : null
})
const mods = m => Object.entries(m).map(([k, v]) => modText(k, v)).join(' · ')
</script>

<template>
  <div class="panel pad tech">
    <h3 class="panel-title"><GameIcon :name="ICONS[skill]" /> {{ $t(`techniques.${skill}.name`) }}</h3>
    <p class="small muted" style="margin-top:0">{{ $t(`techniques.${skill}.desc`) }}</p>

    <!-- Mining: a rich vein -->
    <div v-if="skill === 'mining'" class="state" :class="{ hot: t.vein > 0 }">
      <GameIcon name="gem-pendant" :size="18" />
      <span class="grow">{{ t.vein > 0 ? $t('techniques.mining.on', { n: t.vein, extra: VEIN.extra }) : $t('techniques.mining.off', { v: pct(VEIN.chance) }) }}</span>
    </div>

    <!-- Woodcutting: trees on their way down -->
    <template v-if="skill === 'woodcutting'">
      <div v-if="!trees.length" class="small faint">{{ $t('techniques.woodcutting.none', { n: FELL.cuts }) }}</div>
      <div v-for="tr in trees" :key="tr.a.id" class="tree">
        <ItemTile :item="tr.item" size="sm" />
        <div class="grow" style="min-width:0">
          <div class="row small"><span class="grow">{{ tr.a.name }}</span><b class="tnum">{{ tr.n }} / {{ FELL.cuts }}</b></div>
          <div class="bar thin" style="margin-top:4px;--c:#8bc34a"><i :style="{ width: (tr.n / FELL.cuts) * 100 + '%' }" /></div>
        </div>
      </div>
    </template>

    <!-- Momentum at the forge, the bench, the stove and the cauldron -->
    <template v-if="momentum">
      <div class="row small"><span class="grow">{{ $t('techniques.stacks', { n: momentum.n, max: momentum.d.max }) }}</span><b class="tnum gold-text">{{ $t(`techniques.${skill}.bonus`, { v: Math.round(momentum.bonus * 100) }) }}</b></div>
      <div class="bar thick" style="margin-top:6px;--c:#ff9a3c"><i :style="{ width: momentum.share * 100 + '%' }" /></div>
      <div class="small faint" style="margin-top:6px">{{ momentum.n ? $t('techniques.cools', { time: fmtTime(momentum.cools) }) : $t('techniques.cold') }}</div>
    </template>

    <!-- Firemaking: the hearth -->
    <div v-if="skill === 'firemaking'" class="state" :class="{ hot: hearth > 0 }">
      <GameIcon name="campfire" :size="18" />
      <span class="grow">{{ hearth > 0 ? $t('techniques.firemaking.on', { time: fmtTime(hearth / 1000), mods: mods(BONFIRE.mods) }) : $t('techniques.firemaking.off') }}</span>
    </div>

    <!-- Runecrafting: what resonates now -->
    <template v-if="skill === 'runecrafting'">
      <div class="small muted" style="margin-bottom:6px">{{ $t('techniques.runecrafting.now', { v: Math.round(RESONANCE_BONUS * 100) }) }}</div>
      <div class="row wrap" style="gap:6px">
        <span v-for="r in runes" :key="r.id" class="rune" :class="{ on: r.on }"><ItemTile :item="r.id" size="xs" /> {{ ITEMS[r.id].name }}</span>
      </div>
    </template>

    <div v-if="recent" class="small ok-text" style="margin-top:8px"><i class="pi pi-sparkles" /> {{ $t(`techniques.note.${recent.kind}`, { item: ITEMS[recent.item]?.name || '' }) }}</div>
  </div>
</template>

<style scoped>
.tech { margin-top: 20px; }
.state { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px; background: var(--tint-1); border: 1px solid var(--line); color: var(--muted); }
.state.hot { color: var(--gold-hi); border-color: rgba(226, 182, 90, 0.45); background: rgba(226, 182, 90, 0.08); }
.tree { display: flex; align-items: center; gap: 10px; padding: 6px 0; }
.rune { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px 2px 2px; border-radius: 999px; font-size: 12px; color: var(--faint); border: 1px solid var(--line); }
.rune.on { color: var(--tag-ok); border-color: rgba(98, 193, 126, 0.45); background: rgba(98, 193, 126, 0.08); }
</style>
