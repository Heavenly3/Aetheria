<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { G, state } from '../game/engine.js'
import { AREAS } from '../game/data/combat.js'
import { QUESTS } from '../game/data/progression.js'
import { regionOfActivity, regionPath } from '../game/data/world.js'
import { regionMarks, regionProgress, MARK_ICONS, MARK_ORDER } from '../ui/worldMarks.js'
import { throttled } from '../ui/throttled.js'
import GameIcon from '../components/GameIcon.vue'
import ItemTile from '../components/ItemTile.vue'
import WorldMap from '../components/WorldMap.vue'

// The realm: the map, what each mark means, and on phones the regions as a list too
const { t } = useI18n()
const questName = id => QUESTS.find(q => q.id === id)?.name
const here = computed(() => regionOfActivity(state.activity))
// The tracker reads a lot of state; a refresh every couple of seconds is plenty for the map
const marks = throttled(() => (void state.lastTick, regionMarks()), 2000)
const regions = computed(() => (void state.bestiary.kills, void state.quests, AREAS.map(a => {
  const open = G.areaUnlocked(a), m = marks.value?.[a.id] || {}
  const p = regionProgress(a.id)
  return {
    a, open, p,
    marks: MARK_ORDER.filter(k => m[k]).map(k => ({ k, n: m[k], text: t(`world.marks.${k}`, { n: m[k] }) })),
  }
})))
</script>

<template>
  <div>
    <h1 class="sr-only">{{ $t('world.map') }}</h1>
    <p class="intro">{{ $t('world.intro') }}</p>

    <div v-if="here" class="panel pad elsewhere row wrap">
      <GameIcon name="crossed-swords" :size="18" class="gold-text" />
      <span class="grow">{{ $t('world.elsewhere', { region: AREAS.find(a => a.id === here).name }) }}</span>
      <router-link :to="regionPath(here)" class="p-button p-button-sm">{{ $t('world.goThere') }} <i class="pi pi-arrow-right" /></router-link>
    </div>

    <WorldMap />
    <div class="legend small muted">
      <span v-for="k in MARK_ORDER" :key="k"><span class="mark" :class="k"><GameIcon :name="MARK_ICONS[k]" :size="11" /></span> {{ $t(`world.legend.${k}`) }}</span>
    </div>

    <!-- Phones: the same regions as a list -->
    <section class="region-list" :aria-label="$t('world.list')">
      <router-link v-for="r in regions" :key="r.a.id" :to="regionPath(r.a.id)" class="card region-row" :class="{ locked: !r.open, here: here === r.a.id }" :data-tut="'region:' + r.a.id">
        <ItemTile :icon="r.open ? r.a.icon : 'padlock'" :tint="r.open ? '#6b5a3a' : '#2a2838'" size="md" :tip="false" />
        <span class="grow">
          <b>{{ r.a.name }}</b>
          <span class="small muted block">{{ $t('world.level', { n: r.a.recLvl }) }} · {{ r.open ? $t('world.progress', { n: r.p.met, total: r.p.total }) : $t('world.locked', { quest: questName(r.a.reqQuest) }) }}</span>
        </span>
        <span v-if="here === r.a.id" class="tag gold">{{ $t('world.here') }}</span>
        <span v-for="m in r.marks" :key="m.k" class="mark" :class="m.k" :aria-label="m.text"><GameIcon :name="MARK_ICONS[m.k]" :size="12" /></span>
      </router-link>
    </section>
  </div>
</template>

<style scoped>
.elsewhere { margin-bottom: 16px; gap: 12px; padding: 12px 16px; }
.elsewhere a { text-decoration: none; gap: 6px; }
.legend { display: flex; flex-wrap: wrap; gap: 8px 16px; margin-top: 12px; }
.legend > span { display: inline-flex; align-items: center; gap: 6px; }
.mark { width: 22px; height: 22px; border-radius: 50%; display: inline-grid; place-items: center; background: var(--panel-solid); border: 1px solid var(--c, var(--gold)); color: var(--c, var(--gold)); flex-shrink: 0; }
.mark.story { --c: var(--gold); }
.mark.quest { --c: #7ab8e0; }
.mark.slayer { --c: var(--danger); }
.mark.guild { --c: #b48cff; }
.mark.task { --c: var(--ok); }
:root[data-theme="light"] .mark.quest { --c: #2f6f9f; }
:root[data-theme="light"] .mark.guild { --c: #6a3fbf; }
.legend .mark { width: 18px; height: 18px; }

.region-list { display: none; flex-direction: column; gap: 8px; }
.region-row { display: flex; align-items: center; gap: 12px; padding: 10px 12px; text-decoration: none; color: var(--ink); }
.region-row.here { border-color: var(--gold); }
.region-row.locked { opacity: 0.6; }
.block { display: block; }
@media (max-width: 760px) {
  .legend { display: none; }
  .region-list { display: flex; margin-top: 16px; }
}
</style>
