<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import { G } from '../game/engine.js'
import { monsterLevel } from '../game/data/combat.js'
import { ITEMS } from '../game/data/items.js'
import { BESTIARY, KNOWLEDGE, HUNT_BONUS, killsFor } from '../game/data/bestiary.js'
import { fmt } from '../game/format.js'
import { modText } from '../i18n/mods.js'
import { play } from '../game/sound.js'
import GameIcon from '../components/GameIcon.vue'
import ItemTile from '../components/ItemTile.vue'

const { t } = useI18n()
const progress = computed(() => G.bestiaryProgress())
// Groups with something discovered and a reward still to claim start open; the rest start folded
const open = ref(Object.fromEntries(BESTIARY.map(g => [g.id, !G.groupClaimed(g) && g.monsters.some(m => G.knowledge(m))])))

const rewardText = g => [`+${fmt(g.reward.gold)} ${t('common.gold')}`, ...Object.entries(g.reward.mods).map(([k, v]) => modText(k, v))].join(' · ')
// Progress towards the next knowledge tier
function nextTier(m) {
  const cur = G.knowledge(m)
  const i = cur ? KNOWLEDGE.indexOf(cur) + 1 : 0
  if (i >= KNOWLEDGE.length) return null
  const need = killsFor(m, KNOWLEDGE[i]), prev = i ? killsFor(m, KNOWLEDGE[i - 1]) : 0
  return { tier: KNOWLEDGE[i], need, pct: Math.min(1, (G.beastKills(m.id) - prev) / (need - prev)) }
}
const chance = c => (c >= 1 ? '100%' : c >= 0.01 ? Math.round(c * 100) + '%' : '1/' + fmt(Math.round(1 / c)))
function claim(g) { if (G.claimGroup(g.id)) { play('quest'); G.toast(g.icon, 'bestiary.claimed', { group: '@beasts:' + g.id }, 'success') } }
</script>

<template>
  <div>
    <div class="panel pad" style="margin-bottom:20px">
      <div class="row wrap">
        <p class="intro grow" style="margin:0">{{ $t('bestiary.intro', { pct: Math.round(HUNT_BONUS * 100) }) }}</p>
        <span class="tag gold tnum"><GameIcon name="open-book" :size="13" /> {{ progress.seen }} / {{ progress.total }}</span>
      </div>
      <div class="bar thick" style="margin-top:14px"><i :style="{ width: (progress.seen / progress.total) * 100 + '%' }" /></div>
      <div class="row wrap legend">
        <span v-for="k in KNOWLEDGE" :key="k" class="small muted"><span class="tag" :class="'k-' + k">{{ $t(`bestiary.tiers.${k}`) }}</span> {{ $t(`bestiary.tierHints.${k}`, { pct: Math.round(HUNT_BONUS * 100) }) }}</span>
      </div>
    </div>

    <section v-for="g in BESTIARY" :key="g.id" class="group">
      <button class="group-head" :aria-expanded="open[g.id]" @click="open[g.id] = !open[g.id]">
        <ItemTile :icon="g.icon" size="sm" :tip="false" />
        <span class="grow">
          <span class="group-name">{{ g.name }}</span>
          <span class="small muted group-reward">{{ $t('bestiary.reward') }}: {{ rewardText(g) }}</span>
        </span>
        <span class="tag tnum" :class="G.groupComplete(g) ? 'ok' : ''">{{ G.groupProgress(g).done }} / {{ G.groupProgress(g).total }}</span>
        <i class="pi muted" :class="open[g.id] ? 'pi-angle-up' : 'pi-angle-down'" />
      </button>
      <div v-if="G.groupComplete(g) && !G.groupClaimed(g)" class="claim row">
        <GameIcon name="laurels-trophy" :size="20" />
        <span class="grow">{{ $t('bestiary.complete') }}</span>
        <Button :label="$t('bestiary.claim')" icon="pi pi-gift" size="small" @click="claim(g)" />
      </div>

      <div v-if="open[g.id]" class="grid-wide">
        <div v-for="m in g.monsters" :key="m.id" class="card beast" :class="['k-' + (G.knowledge(m) || 'none')]" style="--c:#e0554b">
          <div class="row">
            <div :class="{ hidden: !G.knowledge(m) }"><ItemTile :icon="m.icon" :tint="G.knowledge(m) ? (m.boss ? '#c0392b' : '#7a2a32') : '#2a2838'" size="md" :tip="false" /></div>
            <div class="grow" style="min-width:0">
              <div class="card-name">{{ G.knowledge(m) ? m.name : '???' }}</div>
              <div class="card-sub">
                <template v-if="G.knowledge(m)">{{ $t('common.lvlShort', { n: monsterLevel(m) }) }} · {{ $t('bestiary.kills', { n: fmt(G.beastKills(m.id)) }) }}</template>
                <template v-else>{{ $t('bestiary.unknown') }}</template>
              </div>
            </div>
            <span v-if="G.knowledge(m)" class="tag" :class="'k-' + G.knowledge(m)">{{ $t(`bestiary.tiers.${G.knowledge(m)}`) }}</span>
          </div>

          <div v-if="G.knowledge(m)" class="row wrap small muted stats">
            <span><i class="pi pi-heart" /> {{ fmt(m.hp) }}</span>
            <span><GameIcon name="crossed-swords" :size="12" /> {{ m.maxHit }}</span>
            <span v-if="m.weak"><i class="pi pi-bullseye" /> {{ $t(`combat.types.${m.weak}`) }}</span>
            <span v-if="G.knows(m, 'hunted')" class="ok-text">+{{ Math.round(HUNT_BONUS * 100) }}% {{ $t('bestiary.vsThis') }}</span>
          </div>

          <div v-if="G.knowledge(m)" class="drops">
            <span v-for="d in m.drops" :key="d.item" class="drop" :class="{ unknown: !G.knows(m, 'studied') && !G.dropSeen(m.id, d.item) }"
              v-tooltip.top="G.knows(m, 'studied') || G.dropSeen(m.id, d.item) ? ITEMS[d.item].name + (G.knows(m, 'studied') ? ' · ' + chance(d.chance) : '') : $t('bestiary.undiscovered')">
              <ItemTile :item="d.item" size="xs" :tip="false" />
              <small v-if="G.knows(m, 'studied')" class="tnum">{{ chance(d.chance) }}</small>
            </span>
          </div>

          <!-- Studying a creature reveals its place in the story -->
          <p v-if="G.knows(m, 'studied')" class="lore">{{ $t(`bestiary.lore.${m.id}`, G.journalNames()) }}</p>
          <p v-else-if="G.knowledge(m)" class="lore faint">{{ $t('bestiary.loreLocked') }}</p>

          <div v-if="nextTier(m)" class="next">
            <div class="row small faint" style="margin-bottom:4px">
              <span class="grow">{{ $t('bestiary.next', { tier: $t(`bestiary.tiers.${nextTier(m).tier}`) }) }}</span>
              <span class="tnum">{{ fmt(G.beastKills(m.id)) }} / {{ fmt(nextTier(m).need) }}</span>
            </div>
            <span class="bar thin"><i :style="{ width: nextTier(m).pct * 100 + '%' }" /></span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.legend { gap: 6px 18px; margin-top: 14px; }
.group { margin-bottom: 18px; }
.group-head { display: flex; align-items: center; gap: 12px; width: 100%; padding: 10px 12px; margin-bottom: 10px; border-radius: 14px; cursor: pointer; text-align: start;
  background: var(--panel); border: 1px solid var(--line); color: var(--ink); font: inherit; }
.group-head:hover { border-color: var(--line-hi); }
.group-name { display: block; font-family: var(--font-display); font-size: 18px; letter-spacing: 0.03em; }
.group-reward { display: block; }
.claim { gap: 10px; margin-bottom: 10px; padding: 10px 12px; border-radius: 12px; border: 1px solid var(--line-hi); background: color-mix(in srgb, var(--gold) 10%, transparent); }
.claim .gi { color: var(--gold); }
.beast { display: flex; flex-direction: column; gap: 10px; }
.beast.k-none { opacity: 0.7; }
.beast.k-hunted { border-color: color-mix(in srgb, var(--gold) 45%, transparent); }
.hidden :deep(svg) { filter: brightness(0.25); }
.stats { gap: 6px 14px; }
.lore { margin: 0; font-size: 13px; font-style: italic; color: var(--ink-2); line-height: 1.5; }
.drops { display: flex; flex-wrap: wrap; gap: 6px; }
.drop { display: inline-flex; flex-direction: column; align-items: center; gap: 2px; }
.drop small { font-size: 10.5px; color: var(--muted); }
.drop.unknown :deep(.tile) { filter: grayscale(1) brightness(0.55); opacity: 0.45; }
.tag.k-seen { color: var(--ink-2); }
.tag.k-studied { color: var(--tag-arcane); border-color: color-mix(in srgb, var(--arcane) 35%, transparent); }
.tag.k-hunted { color: var(--gold-hi); border-color: color-mix(in srgb, var(--gold) 40%, transparent); }
</style>
