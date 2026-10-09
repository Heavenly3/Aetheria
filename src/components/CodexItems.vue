<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import { G } from '../game/engine.js'
import { CATEGORY_GROUPS, CATEGORY_ICON } from '../game/data/categories.js'
import { PAGES, PAGE_REWARDS, pageGold } from '../game/data/codex.js'
import { fmt } from '../game/format.js'
import { modText } from '../i18n/mods.js'
import { play } from '../game/sound.js'
import GameIcon from './GameIcon.vue'
import ItemTile from './ItemTile.vue'

// The item pages of the compendium: one per inventory category, grouped like the inventory
const { t } = useI18n()
const groups = CATEGORY_GROUPS.map(g => ({ ...g, cats: g.cats.filter(c => PAGES[c]) })).filter(g => g.cats.length)
const progress = computed(() => G.codexProgress())
const open = ref(Object.fromEntries(Object.keys(PAGES).map(p => [p, G.pageComplete(p) && !G.pageClaimed(p)])))
const rewardText = p => [`+${fmt(pageGold(p))} ${t('common.gold')}`, ...Object.entries(PAGE_REWARDS[p]).map(([k, v]) => modText(k, v))].join(' · ')
function claim(p) { if (G.claimPage(p)) { play('quest'); G.toast(CATEGORY_ICON[p], 'codex.claimed', { page: '@codexPage:' + p }, 'success') } }
</script>

<template>
  <div>
    <div class="panel pad" style="margin-bottom:20px">
      <div class="row wrap">
        <p class="intro grow" style="margin:0">{{ $t('codex.itemsIntro') }}</p>
        <span class="tag gold tnum"><GameIcon name="knapsack" :size="13" /> {{ progress.done }} / {{ progress.total }}</span>
      </div>
      <div class="bar thick" style="margin-top:14px"><i :style="{ width: (progress.done / progress.total) * 100 + '%' }" /></div>
    </div>

    <template v-for="g in groups" :key="g.id">
      <div class="section-title">{{ $t(`inventory.groups.${g.id}`) }}</div>
      <section v-for="p in g.cats" :key="p" class="group">
        <button class="group-head" :aria-expanded="open[p]" @click="open[p] = !open[p]">
          <ItemTile :icon="CATEGORY_ICON[p]" size="sm" :tip="false" />
          <span class="grow">
            <span class="group-name">{{ $t(`inventory.cats.${p}`) }}</span>
            <span class="small muted group-reward">{{ $t('bestiary.reward') }}: {{ rewardText(p) }}</span>
          </span>
          <span class="tag tnum" :class="G.pageComplete(p) ? 'ok' : ''">{{ G.pageProgress(p).done }} / {{ G.pageProgress(p).total }}</span>
          <i class="pi muted" :class="open[p] ? 'pi-angle-up' : 'pi-angle-down'" />
        </button>
        <div v-if="G.pageComplete(p) && !G.pageClaimed(p)" class="claim row">
          <GameIcon name="laurels-trophy" :size="20" />
          <span class="grow">{{ $t('codex.pageComplete') }}</span>
          <Button :label="$t('bestiary.claim')" icon="pi pi-gift" size="small" @click="claim(p)" />
        </div>
        <div v-else-if="G.pageClaimed(p)" class="claimed small"><i class="pi pi-check" /> {{ $t('codex.claimedTag') }}</div>
        <div v-if="open[p]" class="tiles">
          <div v-for="id in PAGES[p]" :key="id" class="slot" :class="{ missing: !G.codexHas(id) }">
            <ItemTile :item="id" size="md" />
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.group { border-radius: var(--radius); background: var(--panel); border: 1px solid var(--line); margin-bottom: 10px; overflow: hidden; }
.group-head { display: flex; align-items: center; gap: 12px; width: 100%; padding: 12px 14px; background: none; border: 0; color: inherit; font: inherit; text-align: start; cursor: pointer; }
.group-head:hover { background: var(--tint-1); }
.group-name { display: block; font-family: var(--font-display); font-size: 16px; letter-spacing: 0.03em; }
.group-reward { display: block; margin-top: 2px; }
.claim { gap: 10px; margin: 0 14px 12px; padding: 10px 12px; border-radius: 10px; background: rgba(226, 182, 90, 0.08); border: 1px solid rgba(226, 182, 90, 0.3); color: var(--gold-hi); }
.claimed { margin: -4px 14px 10px; color: var(--tag-ok); }
.tiles { display: flex; flex-wrap: wrap; gap: 8px; padding: 4px 14px 16px; }
/* Items never held show as faded silhouettes; the card still says what they are */
.slot.missing { opacity: 0.28; filter: grayscale(1) brightness(0.6); }
.slot.missing:hover { opacity: 0.7; }
</style>
