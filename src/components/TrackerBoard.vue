<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { ITEMS } from '../game/data/items.js'
import { trackedGoals } from '../ui/tracker.js'
import { goTo } from '../ui/focus.js'
import { fmt } from '../game/format.js'
import ItemTile from './ItemTile.vue'

// Every objective on the go; a row takes the hero to where it is done and points at it
const props = defineProps({ limit: { type: Number, default: 0 }, compact: Boolean })
const emit = defineEmits(['went'])
const router = useRouter()
const goals = computed(() => trackedGoals())
const shown = computed(() => (props.limit ? goals.value.slice(0, props.limit) : goals.value))
function go(target) {
  emit('went')
  goTo(router, target)
}
</script>

<template>
  <div class="tracker" :class="{ compact }">
    <p v-if="!goals.length" class="small muted tr-empty">{{ $t('tracker.empty') }}</p>
    <div v-for="g in shown" :key="g.key" class="tr-goal" :class="{ ready: g.ready }">
      <button class="tr-main" @click="go(g.go)">
        <ItemTile :item="g.item || null" :icon="g.item ? null : g.icon" size="sm" :tip="false" />
        <span class="grow tr-text">
          <small class="tr-from">{{ g.from }}</small>
          <span class="tr-what">{{ g.text }}</span>
          <span v-if="g.max && !g.ready" class="bar thin tr-bar"><i :style="{ width: (g.cur / g.max) * 100 + '%' }" /></span>
        </span>
        <span v-if="g.ready" class="tag ok tr-state"><i class="pi pi-check" /> {{ $t('tracker.ready') }}</span>
        <span v-else-if="g.max" class="small muted tnum tr-state">{{ fmt(g.cur) }}/{{ fmt(g.max) }}</span>
        <span class="tr-go" :aria-label="$t('tracker.go')"><i class="pi pi-directions" /></span>
      </button>
      <div v-if="g.go.need?.length && !g.ready" class="tr-need">
        <span class="small faint">{{ $t('tracker.missing') }}</span>
        <button v-for="n in g.go.need" :key="n.item" class="tr-need-btn small" @click="go(n.go)">
          <ItemTile :item="n.item" size="xs" :tip="false" /> {{ ITEMS[n.item].name }} <i class="pi pi-angle-right" />
        </button>
      </div>
    </div>
    <p v-if="limit && goals.length > limit" class="small faint tr-more">{{ $t('tracker.more', { n: goals.length - limit }) }}</p>
  </div>
</template>

<style scoped>
.tracker { display: flex; flex-direction: column; gap: 6px; }
.tr-goal { border: 1px solid var(--line); border-radius: 12px; background: var(--panel); }
.tr-goal.ready { border-color: color-mix(in srgb, var(--ok) 45%, transparent); }
.tr-main { display: flex; align-items: center; gap: 10px; width: 100%; padding: 8px 10px; border: 0; background: none; color: var(--ink); font: inherit; text-align: start; cursor: pointer; border-radius: 12px; }
.tr-main:hover { background: var(--tint-2); }
.tr-text { display: flex; flex-direction: column; min-width: 0; gap: 2px; }
.tr-from { font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--gold); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tr-what { font-size: 14px; }
.tr-bar { margin-top: 3px; max-width: 220px; }
.tr-state { flex-shrink: 0; }
.tr-go { flex-shrink: 0; width: 30px; height: 30px; display: grid; place-items: center; border-radius: 8px; color: var(--gold); background: var(--tint-2); }
.tr-need { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; padding: 0 10px 8px 52px; }
.tr-need-btn { display: inline-flex; align-items: center; gap: 5px; padding: 2px 8px 2px 3px; border-radius: 8px; border: 1px solid var(--line); background: none; color: var(--ink-2); cursor: pointer; font: inherit; }
.tr-need-btn:hover { background: var(--tint-2); color: var(--ink); }
.tr-more, .tr-empty { margin: 4px 2px 0; }
.compact .tr-goal { border-radius: 10px; }
@media (max-width: 600px) { .tr-need { padding-inline-start: 10px; } .tr-bar { max-width: none; } }
</style>
