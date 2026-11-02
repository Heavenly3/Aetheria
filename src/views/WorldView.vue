<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { G, state } from '../game/engine.js'
import { AREAS } from '../game/data/combat.js'
import { QUESTS } from '../game/data/progression.js'
import { REGIONS, MAP_W, MAP_H, regionOfActivity, regionPath } from '../game/data/world.js'
import { regionMarks, regionProgress, MARK_ICONS, MARK_ORDER } from '../ui/worldMarks.js'
import { throttled } from '../ui/throttled.js'
import GameIcon from '../components/GameIcon.vue'
import ItemTile from '../components/ItemTile.vue'

// The realm as a map: every region, the roads between them, where the hero is and what waits where
const { t } = useI18n()
const questName = id => QUESTS.find(q => q.id === id)?.name
const here = computed(() => regionOfActivity(state.activity))
// The tracker reads a lot of state; a refresh every couple of seconds is plenty for the map
const marks = throttled(() => (void state.lastTick, regionMarks()), 2000)
const regions = computed(() => (void state.bestiary.kills, void state.quests, AREAS.map(a => {
  const r = REGIONS[a.id], open = G.areaUnlocked(a), m = marks.value?.[a.id] || {}
  const p = regionProgress(a.id)
  return {
    a, x: (r.x / MAP_W) * 100, y: (r.y / MAP_H) * 100, open, p,
    marks: MARK_ORDER.filter(k => m[k]).map(k => ({ k, n: m[k], text: t(`world.marks.${k}`, { n: m[k] }) })),
  }
})))
// Roads join the regions in the order they open; the ones already walked are drawn in gold
const roads = computed(() => regions.value.slice(1).map((r, i) => {
  const from = REGIONS[regions.value[i].a.id], to = REGIONS[r.a.id], bend = i % 2 ? 40 : -40
  return { d: `M${from.x},${from.y} Q${(from.x + to.x) / 2 + bend},${(from.y + to.y) / 2 - bend * 0.75} ${to.x},${to.y}`, walked: regions.value[i].p.visited && r.p.visited }
}))
const label = r => [r.a.name, t('world.level', { n: r.a.recLvl }), r.open ? t('world.progress', { n: r.p.met, total: r.p.total }) : t('world.locked', { quest: questName(r.a.reqQuest) }),
  here.value === r.a.id ? t('world.here') : null, ...r.marks.map(m => m.text)].filter(Boolean).join('. ')
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

    <!-- The map: land and roads are drawn; the regions are links laid over it -->
    <section class="map" :aria-label="$t('world.map')">
      <svg :viewBox="`0 0 ${MAP_W} ${MAP_H}`" preserveAspectRatio="none" aria-hidden="true">
        <path class="land" d="M40,520 C20,400 70,300 120,220 C170,130 300,70 430,90 C520,40 640,60 720,120 C820,80 960,40 985,140 C1000,260 960,380 900,450 C820,530 640,540 520,520 C380,550 200,550 40,520 Z" />
        <path class="land alt" d="M150,300 C200,200 330,170 430,210 C520,240 600,200 640,260 C600,340 470,390 360,360 C260,360 170,370 150,300 Z" />
        <path class="land alt" d="M760,320 C820,280 900,300 930,350 C920,420 840,450 790,430 C750,400 740,350 760,320 Z" />
        <path v-for="(r, i) in roads" :key="i" class="road" :class="{ walked: r.walked }" :d="r.d" />
      </svg>
      <router-link v-for="r in regions" :key="r.a.id" :to="regionPath(r.a.id)" class="node" :class="{ locked: !r.open, here: here === r.a.id }"
        :style="{ left: r.x + '%', top: r.y + '%' }" :data-tut="'region:' + r.a.id" :data-focus="'region:' + r.a.id" :aria-label="label(r)">
        <span class="ring">
          <GameIcon :name="r.open ? r.a.icon : 'padlock'" :size="30" />
          <span v-if="r.open" class="pips" aria-hidden="true"><i v-for="n in r.p.total" :key="n" :class="{ on: n <= r.p.met }" /></span>
        </span>
        <span class="name">{{ r.a.name }}</span>
        <span class="lvl">{{ $t('world.level', { n: r.a.recLvl }) }}</span>
        <span v-if="here === r.a.id" class="hero-pin" aria-hidden="true"><ItemTile :icon="state.avatar" :tint="state.tint" size="xs" :tip="false" /></span>
        <span v-if="r.marks.length" class="marks" aria-hidden="true">
          <span v-for="m in r.marks" :key="m.k" class="mark" :class="m.k" v-tooltip.top="m.text"><GameIcon :name="MARK_ICONS[m.k]" :size="12" /></span>
        </span>
      </router-link>
    </section>
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
.map { position: relative; aspect-ratio: 1000 / 560; border-radius: 18px; border: 1px solid var(--line); overflow: hidden;
  background: radial-gradient(ellipse at 30% 20%, color-mix(in srgb, #4a7a9a 14%, transparent), transparent 60%), color-mix(in srgb, #284a66 22%, var(--bg)); }
.map > svg { position: absolute; inset: 0; width: 100%; height: 100%; }
.land { fill: color-mix(in srgb, var(--panel-solid) 88%, #6b5a3a); stroke: var(--line-hi); stroke-width: 1.5; }
.land.alt { fill: color-mix(in srgb, var(--panel-solid) 78%, #6b5a3a); }
.road { fill: none; stroke: var(--faint); stroke-width: 3; stroke-dasharray: 2 9; stroke-linecap: round; opacity: 0.7; }
.road.walked { stroke: var(--gold); stroke-dasharray: none; opacity: 0.55; }

.node { position: absolute; transform: translate(-50%, -32px); display: flex; flex-direction: column; align-items: center; gap: 2px; text-decoration: none; color: var(--ink); width: 150px; text-align: center; border-radius: 14px; }
.node:focus-visible { outline: 2px solid var(--gold); outline-offset: 4px; }
.ring { position: relative; width: 64px; height: 64px; border-radius: 50%; display: grid; place-items: center; background: var(--panel-solid);
  border: 2px solid color-mix(in srgb, var(--gold) 70%, transparent); color: var(--ink); box-shadow: 0 6px 18px -8px rgba(0, 0, 0, 0.6); transition: transform 0.15s, box-shadow 0.15s; }
.node:hover .ring { transform: scale(1.06); box-shadow: 0 0 0 4px color-mix(in srgb, var(--gold) 22%, transparent), 0 6px 18px -8px rgba(0, 0, 0, 0.6); }
.node.here .ring { border-width: 3px; border-color: var(--gold); box-shadow: 0 0 22px -4px var(--gold); }
.node.locked .ring { border-color: var(--line-hi); color: var(--faint); }
.node.locked .name, .node.locked .lvl { color: var(--faint); }
.pips { position: absolute; bottom: -5px; display: flex; gap: 3px; padding: 2px 5px; border-radius: 99px; background: var(--panel-solid); border: 1px solid var(--line); }
.pips i { width: 6px; height: 6px; border-radius: 50%; background: var(--tint-3); }
.pips i.on { background: var(--gold); }
.name { font-weight: 800; font-size: 14.5px; margin-top: 6px; line-height: 1.15; text-shadow: 0 1px 6px var(--bg), 0 0 2px var(--bg); }
.lvl { font-size: 12.5px; color: var(--muted); text-shadow: 0 1px 6px var(--bg); }
.hero-pin { position: absolute; top: -18px; left: calc(50% + 14px); border-radius: 8px; box-shadow: 0 0 0 2px var(--gold); }
.marks { position: absolute; top: -10px; left: calc(50% - 46px); display: flex; flex-direction: column; gap: 3px; }
.mark { width: 22px; height: 22px; border-radius: 50%; display: inline-grid; place-items: center; background: var(--panel-solid); border: 1px solid var(--c, var(--gold)); color: var(--c, var(--gold)); flex-shrink: 0; }
.mark.story { --c: var(--gold); }
.mark.quest { --c: #7ab8e0; }
.mark.slayer { --c: var(--danger); }
.mark.guild { --c: #b48cff; }
.mark.task { --c: var(--ok); }
.legend { display: flex; flex-wrap: wrap; gap: 8px 16px; margin-top: 12px; }
.legend > span { display: inline-flex; align-items: center; gap: 6px; }
.legend .mark { width: 18px; height: 18px; }

.region-list { display: none; flex-direction: column; gap: 8px; }
.region-row { display: flex; align-items: center; gap: 12px; padding: 10px 12px; text-decoration: none; color: var(--ink); }
.region-row.here { border-color: var(--gold); }
.region-row.locked { opacity: 0.6; }
.block { display: block; }
@media (max-width: 760px) {
  .map, .legend { display: none; }
  .region-list { display: flex; }
}
</style>
