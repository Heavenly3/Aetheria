<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import { G } from '../game/engine.js'
import { ITEMS } from '../game/data/items.js'
import { MYTHIC_TIERS, MYTHIC_DROPS } from '../game/data/mythics.js'
import { modText } from '../i18n/mods.js'
import { oneIn } from '../ui/itemSources.js'
import ItemTile from './ItemTile.vue'
import ShareCard from './ShareCard.vue'

// The moment an ultra rare find drops: a window of its own, one find at a time
const router = useRouter()
const queue = ref([])
const cur = computed(() => queue.value[0] || null)
const it = computed(() => (cur.value ? ITEMS[cur.value.item] : null))
const color = computed(() => (it.value ? MYTHIC_TIERS[it.value.myth].color : null))
// The best odds it can drop at, as "1 in 50,000"
const odds = computed(() => {
  const best = Math.max(...MYTHIC_DROPS.filter(d => d.item === cur.value?.item).map(d => d.chance))
  return best > 0 ? oneIn(best) : null
})
let off
onMounted(() => { off = G.on('mythic', e => queue.value.push(e)) })
onUnmounted(() => off?.())
const next = () => queue.value.shift()
// The find being shared stays open behind the picture until the player is done with both
const sharing = ref(false)
function look() {
  const id = cur.value.item
  next()
  router.push({ path: '/inventory', query: { item: id } })
}
</script>

<template>
  <Dialog :visible="!!cur" modal :closable="false" :showHeader="false" class="myth-dialog" :style="{ width: 'min(420px, calc(100vw - 24px))', '--m': color }">
    <div v-if="it" class="myth">
      <div class="myth-tier">{{ $t('mythic.tiers.' + it.myth) }}</div>
      <div class="myth-tile"><ItemTile :item="cur.item" size="xl" :tip="false" /></div>
      <h2 class="myth-name">{{ it.name }}</h2>
      <p class="myth-line">{{ $t(cur.first ? `mythic.found.${it.myth}` : 'mythic.again') }}</p>
      <p v-if="odds" class="small faint">{{ $t('mythic.odds', { n: odds }) }}</p>
      <p v-if="it.desc" class="small muted">{{ it.desc }}</p>
      <div v-if="it.mods" class="myth-mods">
        <div v-for="(v, k) in it.mods" :key="k">{{ modText(k, v) }}</div>
      </div>
      <div class="row wrap" style="justify-content:center;gap:8px;margin-top:14px">
        <Button :label="$t('mythic.look')" icon="pi pi-eye" @click="look" />
        <Button :label="$t('share.find')" icon="pi pi-image" severity="secondary" outlined @click="sharing = true" />
        <Button :label="$t('mythic.ok')" severity="secondary" outlined @click="next" />
      </div>
    </div>
  </Dialog>
  <ShareCard v-if="cur" v-model:visible="sharing" :item="cur.item" />
</template>

<style scoped>
.myth { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 10px 4px 4px; }
.myth-tier { font-size: 12px; font-weight: 800; letter-spacing: 0.3em; text-transform: uppercase; color: var(--m); }
.myth-tile { margin: 16px 0 10px; padding: 14px; border-radius: 28px; background: radial-gradient(circle, color-mix(in srgb, var(--m) 30%, transparent), transparent 70%); }
.myth-name { margin: 0; font-family: var(--font-display); font-weight: 400; font-size: 24px; color: var(--m); }
.myth-line { margin: 6px 0 0; color: var(--ink); }
.myth-mods { margin-top: 8px; padding: 8px 14px; border-radius: 10px; border: 1px solid color-mix(in srgb, var(--m) 45%, transparent); background: color-mix(in srgb, var(--m) 8%, transparent); font-size: 14px; }
</style>
