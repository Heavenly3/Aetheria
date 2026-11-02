<script setup>
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import { G, state } from '../game/engine.js'
import { AREAS, MONSTERS } from '../game/data/combat.js'
import { mercIcon, mercTint } from '../game/data/company.js'
import { mercName } from '../ui/company.js'
import { ECHO_BONUS } from '../game/data/echoes.js'
import { QUESTS } from '../game/data/progression.js'
import { AREA_MAP, regionDungeon, regionBosses, regionEchoes, regionOfActivity, regionPath } from '../game/data/world.js'
import { regionMarks, regionProgress, MARK_ICONS, MARK_ORDER } from '../ui/worldMarks.js'
import { throttled } from '../ui/throttled.js'
import { fmt } from '../game/format.js'
import { chanceNote } from '../ui/tips.js'
import Arena from '../components/Arena.vue'
import RegionThreat from '../components/RegionThreat.vue'
import MonsterCard from '../components/MonsterCard.vue'
import PrepButton from '../components/PrepButton.vue'
import ItemTile from '../components/ItemTile.vue'
import GameIcon from '../components/GameIcon.vue'
import HelpTip from '../components/HelpTip.vue'

// One region of the realm: its places and their creatures, its dungeon and its bosses.
// A fight started here is shown here.
const route = useRoute()
const router = useRouter()
const id = computed(() => route.params.region)
const area = computed(() => AREA_MAP[id.value])
watch(area, a => { if (!a) router.replace('/combat') }, { immediate: true })
const open = computed(() => !!area.value && G.areaUnlocked(area.value))
const questName = q => QUESTS.find(x => x.id === q)?.name
const dungeon = computed(() => regionDungeon(id.value))
const bosses = computed(() => regionBosses(id.value))
const echoes = computed(() => regionEchoes(id.value))
const progress = computed(() => (void state.bestiary.kills, void state.dungeonsBy, area.value ? regionProgress(id.value) : null))
const marks = throttled(() => (void state.lastTick, regionMarks()[route.params.region] || {}), 2000)
const markList = computed(() => MARK_ORDER.filter(k => marks.value?.[k]))

// The fight shows here when it is in this region; a fight in another region gets a way back to it
const fightRegion = computed(() => regionOfActivity(state.activity))
const fightingHere = computed(() => fightRegion.value === id.value)
const regionName = rid => AREAS.find(a => a.id === rid)?.name

const inDungeon = dgId => state.activity?.type === 'combat' && state.activity.kind === 'dungeon' && state.activity.target === dgId
const dungeonLocked = dg => !!dg.reqQuest && !G.questDone(dg.reqQuest)
const fightBoss = b => G.startCombat('boss', b.id)
// The companions set to come along (chosen in Preparation)
const party = computed(() => state.company.party.map(id => G.companyMember(id)).filter(Boolean))
</script>

<template>
  <div v-if="area">
    <div class="row wrap head">
      <router-link to="/combat" class="back small"><i class="pi pi-arrow-left" /> {{ $t('world.back') }}</router-link>
    </div>

    <!-- The region: what it is, how troubled it is, how far the hero has got -->
    <div class="banner region-banner">
      <ItemTile :icon="open ? area.icon : 'padlock'" tint="#6b5a3a" size="lg" :tip="false" />
      <div class="grow">
        <h1 class="banner-title">{{ area.name }}</h1>
        <p class="banner-desc">{{ area.desc }}</p>
        <div class="row wrap" style="gap:6px">
          <span class="tag">{{ $t('combat.recommended', { n: area.recLvl }) }}</span>
          <template v-if="open">
            <RegionThreat :area="area.id" />
            <span class="tag" :class="{ ok: progress.met === progress.total }"><GameIcon name="open-book" :size="12" /> {{ $t('world.progress', { n: progress.met, total: progress.total }) }}</span>
            <span v-if="progress.cleared" class="tag ok"><i class="pi pi-check" /> {{ $t('world.cleared') }}</span>
            <span v-if="progress.beaten" class="tag ok"><i class="pi pi-check" /> {{ $t('world.beaten') }}</span>
          </template>
          <span v-else class="tag bad"><i class="pi pi-lock" /> {{ $t('world.locked', { quest: questName(area.reqQuest) }) }}</span>
          <span v-for="k in markList" :key="k" class="tag mark-tag" :class="k"><GameIcon :name="MARK_ICONS[k]" :size="12" /> {{ $t(`world.marks.${k}`, { n: marks[k] }) }}</span>
        </div>
      </div>
      <PrepButton class="region-prep" />
    </div>

    <!-- The fight -->
    <Arena v-if="fightingHere" class="region-arena" />
    <div v-else-if="fightRegion" class="panel pad elsewhere row wrap">
      <GameIcon name="crossed-swords" :size="18" class="gold-text" />
      <span class="grow">{{ $t('world.elsewhere', { region: regionName(fightRegion) }) }}</span>
      <router-link :to="regionPath(fightRegion)" class="go small">{{ $t('world.goThere') }} <i class="pi pi-arrow-right" /></router-link>
    </div>

    <p v-if="!open" class="intro" style="margin-top:18px"><i class="pi pi-lock" /> {{ $t('world.lockedRegion', { quest: questName(area.reqQuest) }) }}</p>

    <!-- Places, one creature in each -->
    <h2 class="section-title">{{ $t('world.places') }}</h2>
    <div class="grid-cards">
      <MonsterCard v-for="m in area.monsters" :key="m.id" :monster="m" :place="$t(`world.placeNames.${m.id}`)" :locked="!open" :lockText="$t('combat.areaLocked')"
        @fight="G.startCombat('area', m.id)" />
    </div>

    <!-- The dungeon -->
    <template v-if="dungeon">
      <h2 class="section-title">{{ $t('world.dungeon') }}</h2>
      <div :data-focus="'dungeon:' + dungeon.id" class="card dungeon" :class="{ active: inDungeon(dungeon.id), locked: dungeonLocked(dungeon) }" style="--c:#e0554b">
        <div class="row">
          <ItemTile :icon="dungeon.icon" tint="#7a2a32" size="lg" :tip="false" />
          <div class="grow">
            <div class="card-name">{{ dungeon.name }}</div>
            <div class="card-sub">{{ dungeon.desc }}</div>
          </div>
        </div>
        <div class="row wrap" style="gap:5px">
          <span class="tag">{{ $t('combat.recommended', { n: dungeon.recLvl }) }}</span>
          <span class="tag gold">{{ $t('combat.clears', { n: state.dungeonsBy[dungeon.id] || 0 }) }}</span>
          <span v-if="dungeonLocked(dungeon)" class="tag bad"><i class="pi pi-lock" /> {{ $t('combat.questReq', { quest: questName(dungeon.reqQuest) }) }}</span>
        </div>
        <div class="rooms">
          <span v-for="(r, i) in dungeon.rooms" :key="i" class="room" :class="{ cur: inDungeon(dungeon.id) && state.activity.room === i, past: inDungeon(dungeon.id) && state.activity.room > i }"
            v-tooltip.top="$t('combat.roomTip', { n: i + 1, monster: MONSTERS[r].name })"><ItemTile :icon="MONSTERS[r].icon" tint="#5a2a32" size="sm" :tip="false" /></span>
          <i class="pi pi-angle-right faint" />
          <span class="room boss" :class="{ cur: inDungeon(dungeon.id) && state.activity.room === dungeon.rooms.length }" v-tooltip.top="$t('combat.bossTip', { monster: dungeon.boss.name })">
            <ItemTile :icon="dungeon.boss.icon" tint="#a0202a" size="sm" :tip="false" />
          </span>
        </div>
        <div class="row wrap" style="gap:5px">
          <span class="small faint">{{ $t('combat.chest') }}</span>
          <ItemTile v-for="c in dungeon.chest" :key="c.item" :item="c.item" size="xs" :note="chanceNote(c.chance)" />
        </div>
        <Button :label="inDungeon(dungeon.id) ? $t('combat.retreat') : $t('combat.enter')" :icon="inDungeon(dungeon.id) ? 'pi pi-flag' : 'pi pi-sign-in'" :severity="inDungeon(dungeon.id) ? 'danger' : undefined"
          :disabled="dungeonLocked(dungeon) && !inDungeon(dungeon.id)" @click="inDungeon(dungeon.id) ? G.stop() : G.startCombat('dungeon', dungeon.id)" />
      </div>
    </template>

    <!-- The bosses of the region, with mercenaries to hire for them -->
    <template v-if="bosses.length">
      <h2 class="section-title">{{ $t('world.bosses') }}</h2>
      <div class="boss-layout">
        <div class="grid-cards">
          <MonsterCard v-for="b in bosses" :key="b.id" :monster="b" kind="boss" :locked="!!b.reqQuest && !G.questDone(b.reqQuest)" :lockText="$t('combat.questReq', { quest: questName(b.reqQuest) })" @fight="fightBoss(b)">
            <div class="small muted" style="margin-top:8px">{{ $t('combat.recommended', { n: b.recLvl }) }} · {{ $t('combat.respawnIn', { n: b.respawn }) }}</div>
          </MonsterCard>
          <template v-if="G.echoesOpen()">
            <MonsterCard v-for="e in echoes" :key="e.id" :monster="e" kind="boss" :locked="!!e.reqQuest && !G.questDone(e.reqQuest)" :lockText="$t('combat.questReq', { quest: questName(e.reqQuest) })" @fight="fightBoss(e)">
              <div class="row wrap small muted" style="margin-top:8px;gap:6px">
                <span>{{ $t('combat.recommended', { n: e.recLvl }) }} · {{ $t('combat.respawnIn', { n: e.respawn }) }}</span>
                <span v-if="G.echoBeaten(e.echoOf)" class="tag ok"><i class="pi pi-check" /> {{ $t('echoes.beaten') }}</span>
              </div>
            </MonsterCard>
          </template>
        </div>
        <!-- The company that comes along -->
        <div class="panel pad mercs">
          <h3 class="panel-title">{{ $t('company.title') }} <HelpTip k="sections.mercs" /></h3>
          <p class="small muted" style="margin-top:0">{{ $t('company.regionHint') }}</p>
          <div v-if="party.length" class="stack" style="gap:8px">
            <div v-for="p in party" :key="p.id" class="merc row">
              <ItemTile :icon="mercIcon(p)" :tint="mercTint(p)" size="sm" :tip="false" />
              <div class="grow">
                <b>{{ mercName(p) }}</b>
                <div class="small muted">{{ $t(`company.roles.${p.role}.name`) }} · {{ $t('company.level', { n: p.lvl }) }}</div>
              </div>
              <span v-if="G.mercHurt(p)" class="tag bad">{{ $t('company.hurtShort') }}</span>
            </div>
            <div class="small">{{ $t('company.wagesEach') }} <b class="gold-text">{{ $t('inventory.goldAmount', { n: fmt(G.partyWages()) }) }}</b></div>
          </div>
          <p v-else class="small faint" style="margin:0">{{ $t('company.empty') }}</p>
          <p v-if="G.echoesOpen() && echoes.length" class="small faint" style="margin:10px 0 0">{{ $t('echoes.intro', { xp: ECHO_BONUS.xp * 100, gold: ECHO_BONUS.gold * 100 }) }}</p>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.head { margin-bottom: 12px; }
.back { color: var(--muted); text-decoration: none; display: inline-flex; align-items: center; gap: 6px; }
.back:hover { color: var(--ink); }
.region-banner { align-items: center; }
.region-prep { align-self: center; }
@media (max-width: 900px) { .region-prep { order: 4; width: 100%; } }
.region-arena { margin-top: 18px; }
.elsewhere { margin-top: 18px; gap: 12px; padding: 12px 16px; }
.go { color: var(--gold-hi); text-decoration: none; font-weight: 700; display: inline-flex; gap: 6px; align-items: center; }
.mark-tag { color: var(--c); border-color: color-mix(in srgb, var(--c) 40%, transparent); }
.mark-tag.story { --c: var(--gold-hi); }
.mark-tag.quest { --c: #7ab8e0; }
.mark-tag.slayer { --c: var(--tag-bad); }
.mark-tag.guild { --c: #b48cff; }
.mark-tag.task { --c: var(--tag-ok); }
:root[data-theme="light"] .mark-tag.quest { --c: #2f6f9f; }
:root[data-theme="light"] .mark-tag.guild { --c: #6a3fbf; }
.dungeon { display: flex; flex-direction: column; gap: 10px; max-width: 640px; }
.rooms { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.room { border-radius: 9px; padding: 2px; border: 1px solid transparent; }
.room.past { opacity: 0.4; }
.room.cur { border-color: var(--gold); box-shadow: 0 0 12px -2px rgba(226, 182, 90, 0.6); }
.boss-layout { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 16px; align-items: start; }
.merc { padding: 8px 10px; border-radius: 12px; background: var(--tint-1); border: 1px solid var(--line); }
@media (max-width: 1100px) { .boss-layout { grid-template-columns: 1fr; } }
</style>
