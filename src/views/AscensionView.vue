<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import { useConfirm } from 'primevue/useconfirm'
import { G, state } from '../game/engine.js'
import { BRANCHES, UPGRADES, UPGRADE_MAP, ASCEND_MIN_TOTAL } from '../game/data/ascension.js'
import { fmt } from '../game/format.js'
import { modText } from '../i18n/mods.js'
import { play } from '../game/sound.js'
import GameIcon from '../components/GameIcon.vue'
import ItemTile from '../components/ItemTile.vue'

const { t } = useI18n()
const router = useRouter()
const confirm = useConfirm()
const asc = computed(() => state.ascension)
const preview = computed(() => G.shardsForAscension())
const branches = computed(() => Object.entries(BRANCHES).map(([id, b]) => ({ id, ...b, name: b.name, list: UPGRADES.filter(u => u.branch === id) })))
const effect = (u, ranks) => Object.entries(u.mods).map(([k, v]) => modText(k, v * ranks)).join(' · ')

function buy(u) { if (G.buyUpgrade(u.id)) { play('level'); G.toast(u.icon, 'ascension.bought', { name: u.name, rank: G.upgradeRank(u.id) }, 'success') } }
function resetTree() {
  confirm.require({
    header: t('ascension.resetTitle'), message: t('ascension.resetMessage'), icon: 'pi pi-refresh',
    acceptLabel: t('ascension.resetConfirm'), rejectLabel: t('common.cancel'), rejectProps: { severity: 'secondary', outlined: true },
    accept: () => { const n = G.resetUpgrades(); G.toast('ankh', 'ascension.refunded', { n }, 'success') },
  })
}
function ascend() {
  confirm.require({
    header: t('ascension.confirmTitle'), message: t('ascension.confirmMessage', { n: preview.value }), icon: 'pi pi-exclamation-triangle',
    acceptLabel: t('ascension.ascendNow'), rejectLabel: t('common.cancel'),
    acceptProps: { severity: 'danger' }, rejectProps: { severity: 'secondary', outlined: true },
    accept: () => { const n = G.ascend(); play('rare'); G.toast('ankh', 'ascension.done', { n, count: state.ascension.count }, 'rare'); router.push('/') },
  })
}
</script>

<template>
  <div>
    <div class="banner" style="--c:#7ad7ff">
      <GameIcon class="banner-ghost" name="ankh" :size="230" />
      <ItemTile icon="ankh" tint="#3f8fbf" size="xl" :tip="false" />
      <div class="grow">
        <h1 class="banner-title">{{ $t('ascension.title') }}</h1>
        <div class="banner-desc">{{ $t('ascension.desc') }}</div>
        <div class="row wrap">
          <span class="tag arcane"><GameIcon name="crystal-growth" :size="12" /> {{ $t('ascension.shards', { n: fmt(asc.shards) }) }}</span>
          <span class="tag">{{ $t('ascension.count', { n: asc.count }) }}</span>
          <span class="tag">{{ $t('ascension.total', { n: fmt(asc.total) }) }}</span>
        </div>
      </div>
    </div>

    <div class="two-col" style="margin-top:18px">
      <div class="panel pad">
        <h3 class="panel-title"><GameIcon name="ankh" /> {{ $t('ascension.ascendTitle') }}</h3>
        <template v-if="G.canAscend()">
          <div class="gain tnum">+{{ fmt(preview) }} <span class="small muted">{{ $t('ascension.shardsWord') }}</span></div>
          <p class="small muted">{{ $t('ascension.formula') }}</p>
          <Button :label="$t('ascension.ascendNow')" icon="pi pi-replay" severity="danger" @click="ascend" />
        </template>
        <template v-else>
          <p class="muted" style="margin-top:0">{{ $t('ascension.locked', { n: ASCEND_MIN_TOTAL }) }}</p>
          <div class="bar thick"><i :style="{ width: Math.min(1, G.totalLevel() / ASCEND_MIN_TOTAL) * 100 + '%' }" /></div>
          <div class="small muted tnum" style="margin-top:6px">{{ G.totalLevel() }} / {{ ASCEND_MIN_TOTAL }}</div>
        </template>
      </div>
      <div class="panel pad">
        <h3 class="panel-title"><GameIcon name="scroll-unfurled" /> {{ $t('ascension.rulesTitle') }}</h3>
        <div class="small"><b class="ok-text">{{ $t('ascension.keepLabel') }}</b> <span class="muted">{{ $t('ascension.keep') }}</span></div>
        <div class="small" style="margin-top:8px"><b class="bad-text">{{ $t('ascension.loseLabel') }}</b> <span class="muted">{{ $t('ascension.lose') }}</span></div>
      </div>
    </div>

    <div class="row" style="margin:26px 0 12px">
      <div class="section-title grow" style="margin:0">{{ $t('ascension.treeTitle') }}</div>
      <Button :label="$t('ascension.resetTree')" icon="pi pi-refresh" size="small" severity="secondary" outlined :disabled="!Object.keys(asc.upgrades).length" @click="resetTree" />
    </div>
    <div class="tree">
      <div v-for="b in branches" :key="b.id" class="branch" :style="{ '--c': b.color }">
        <div class="branch-head"><GameIcon :name="b.icon" :size="18" /> {{ b.name }}</div>
        <div v-for="u in b.list" :key="u.id" class="node" :class="{ owned: G.upgradeRank(u.id) > 0, locked: !G.upgradeUnlocked(u) }">
          <div class="row">
            <span class="n-icon"><GameIcon :name="u.icon" :size="20" /></span>
            <div class="grow" style="min-width:0">
              <div class="card-name">{{ u.name }}</div>
              <div class="small muted">{{ $t('talents.perRank', { effect: effect(u, 1) }) }}</div>
            </div>
            <span class="tnum small rank">{{ G.upgradeRank(u.id) }}/{{ u.max }}</span>
          </div>
          <div v-if="G.upgradeRank(u.id)" class="small ok-text" style="margin-top:6px">{{ $t('ascension.now', { effect: effect(u, G.upgradeRank(u.id)) }) }}</div>
          <div v-if="!G.upgradeUnlocked(u)" class="small faint" style="margin-top:6px"><i class="pi pi-lock" style="font-size:11px" /> {{ $t('ascension.requires', { name: UPGRADE_MAP[u.req].name }) }}</div>
          <Button v-if="G.upgradeRank(u.id) < u.max" :label="$t('ascension.buy', { n: G.upgradeCost(u) })" size="small" fluid style="margin-top:10px"
            :disabled="!G.canBuyUpgrade(u)" @click="buy(u)" />
          <div v-else class="tag ok" style="margin-top:10px"><i class="pi pi-check" /> {{ $t('talents.maxed') }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.gain { font-family: var(--font-display); font-size: 40px; color: #7ad7ff; line-height: 1.1; }
.tree { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.branch { display: flex; flex-direction: column; gap: 10px; }
.branch-head { display: flex; align-items: center; gap: 8px; font-family: var(--font-display); font-size: 18px; color: var(--c); padding-bottom: 6px; border-bottom: 1px solid color-mix(in srgb, var(--c) 35%, transparent); }
.node { position: relative; padding: 14px; border-radius: 14px; background: var(--panel); border: 1px solid var(--line); }
.node + .node::before { content: ''; position: absolute; top: -11px; inset-inline-start: 31px; width: 2px; height: 10px; background: color-mix(in srgb, var(--c) 40%, transparent); }
.node.owned { border-color: color-mix(in srgb, var(--c) 55%, transparent); box-shadow: 0 0 22px -12px var(--c); }
.node.locked { opacity: 0.55; }
.n-icon { width: 40px; height: 40px; flex-shrink: 0; border-radius: 12px; display: grid; place-items: center; color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); border: 1px solid color-mix(in srgb, var(--c) 35%, transparent); }
.rank { color: var(--c); font-weight: 700; }
@media (max-width: 1000px) { .tree { grid-template-columns: 1fr; } }
</style>
