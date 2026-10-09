<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import { G } from '../game/engine.js'
import { SKILLS } from '../game/data/skills.js'
import { QUALITIES, withQuality } from '../game/data/actions.js'
import { CRAFTED, CRAFTED_COUNT, MASTER_MILESTONES, milestoneNeed } from '../game/data/codex.js'
import { fmt } from '../game/format.js'
import { modText } from '../i18n/mods.js'
import { play } from '../game/sound.js'
import GameIcon from './GameIcon.vue'
import ItemTile from './ItemTile.vue'

// Every piece of gear the hero can craft, with the best quality made so far, and masterwork milestones
const { t } = useI18n()
const made = computed(() => G.masterworks())
const rewardText = m => [`+${fmt(m.gold)} ${t('common.gold')}`, ...Object.entries(m.mods).map(([k, v]) => modText(k, v))].join(' · ')
// Show each piece at the best quality made (or plain and faded if never made)
const shown = id => withQuality(id, G.gradeMade(id))
function claim(i) { if (G.claimMasterwork(i)) { play('quest'); G.toast('anvil-impact', 'codex.milestoneClaimed', { n: milestoneNeed(MASTER_MILESTONES[i]) }, 'success') } }
</script>

<template>
  <div>
    <div class="panel pad" style="margin-bottom:20px">
      <div class="row wrap">
        <p class="intro grow" style="margin:0">{{ $t('codex.masterIntro') }}</p>
        <span class="tag gold tnum"><GameIcon name="anvil-impact" :size="13" /> {{ made }} / {{ CRAFTED_COUNT }}</span>
      </div>
      <div class="bar thick" style="margin-top:14px;--c:#f6c453"><i :style="{ width: (made / CRAFTED_COUNT) * 100 + '%' }" /></div>
      <div class="row wrap legend">
        <span v-for="(q, i) in QUALITIES.slice(1)" :key="q.id" class="small" :style="{ color: q.color }">{{ '◆'.repeat(i + 1) }} {{ $t(`quality.labels.${q.id}`) }}</span>
      </div>
    </div>

    <div class="section-title">{{ $t('codex.milestones') }}</div>
    <div class="milestones">
      <div v-for="(m, i) in MASTER_MILESTONES" :key="i" class="milestone" :class="{ done: G.masterworkClaimed(i), ready: G.masterworkDone(i) && !G.masterworkClaimed(i) }">
        <div class="row">
          <b class="tnum">{{ Math.min(made, milestoneNeed(m)) }} / {{ milestoneNeed(m) }}</b>
          <span class="grow" />
          <Button v-if="G.masterworkDone(i) && !G.masterworkClaimed(i)" :label="$t('bestiary.claim')" icon="pi pi-gift" size="small" @click="claim(i)" />
          <i v-else-if="G.masterworkClaimed(i)" class="pi pi-check ok-text" />
        </div>
        <div class="small muted" style="margin-top:6px">{{ rewardText(m) }}</div>
      </div>
    </div>

    <template v-for="(list, skill) in CRAFTED" :key="skill">
      <div class="section-title" style="margin-top:22px"><GameIcon :name="SKILLS[skill].icon" :size="14" /> {{ SKILLS[skill].name }}</div>
      <div class="tiles">
        <div v-for="id in list" :key="id" class="slot" :class="{ missing: !G.codexHas(id) && !G.gradeMade(id), master: G.gradeMade(id) >= 3 }">
          <ItemTile :item="shown(id)" size="md" />
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.legend { gap: 14px; margin-top: 12px; }
.milestones { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; }
.milestone { padding: 12px 14px; border-radius: var(--radius); background: var(--panel); border: 1px solid var(--line); }
.milestone.ready { border-color: rgba(246, 196, 83, 0.5); box-shadow: 0 0 18px -8px #f6c453; }
.milestone.done { opacity: 0.7; }
.tiles { display: flex; flex-wrap: wrap; gap: 8px; }
.slot.missing { opacity: 0.28; filter: grayscale(1) brightness(0.6); }
.slot.missing:hover { opacity: 0.7; }
.slot.master :deep(.tile) { box-shadow: 0 0 14px -4px #f6c453; }
</style>
