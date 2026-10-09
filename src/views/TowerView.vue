<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import { G, state } from '../game/engine.js'
import { TOWER_SHOP, monsterLevel } from '../game/data/combat.js'
import { TOWER_AFFIXES, AFFIX_TOKENS, affixOf, guardianOf, guardianReward } from '../game/data/tower.js'
import { ROLE_ICONS } from '../game/data/guilds.js'
import { ITEMS } from '../game/data/items.js'
import { fmt } from '../game/format.js'
import { tip } from '../ui/tips.js'
import { guildName } from '../i18n/names.js'
import Arena from '../components/Arena.vue'
import CombatSettings from '../components/CombatSettings.vue'
import ItemTile from '../components/ItemTile.vue'
import GameIcon from '../components/GameIcon.vue'
import HelpTip from '../components/HelpTip.vue'

const { t } = useI18n()
const inTower = computed(() => state.activity?.type === 'combat' && state.activity.kind === 'tower')
const startFloor = computed(() => Math.max(1, Math.floor(state.tower.best / 10) * 10 + 1))
const from = computed(() => (inTower.value ? state.activity.floor : startFloor.value))
const preview = computed(() => [0, 1, 2, 3, 4].map(i => G.towerFloor(from.value + i)))
// This week's affixes for the next few blocks of five floors
const blocks = computed(() => {
  const first = Math.floor((from.value - 1) / 5) * 5 + 1
  return [0, 1, 2, 3].map(i => first + i * 5).map(f => ({ from: f, to: f + 4, affix: affixOf(f) }))
})
// The next guardians and what their first defeat pays
const guardians = computed(() => {
  const first = Math.ceil(Math.max(1, state.tower.best) / 10) * 10 || 10
  return [0, 1, 2].map(i => first + i * 10).map(f => ({ floor: f, id: guardianOf(f), reward: guardianReward(f), cleared: !!state.tower.cleared?.[f] }))
})
const rivals = computed(() => {
  const all = G.towerRivals()
  const top = all.slice(0, 8)
  const me = all.find(r => r.hero)
  return top.includes(me) ? top : [...top, me]
})
const affixTip = id => tip(t(`tower.affixes.${id}.name`), t(`tower.affixes.${id}.desc`) + ' ' + t('tower.affixTokens', { n: Math.round((AFFIX_TOKENS - 1) * 100) }))
const rewardText = r => [t('tower.tokens', { n: r.tokens }), ...Object.entries(r.items).map(([id, n]) => `${n}× ${ITEMS[id].name}`)].join(' · ')
function buy(it) {
  if (G.buyTower(it.id)) G.toast(it.icon, 'common.bought', { name: it.name }, 'success')
}
</script>

<template>
  <div>
    <div class="banner" style="--c:#e2b65a">
      <GameIcon class="banner-ghost" name="stone-tower" :size="230" />
      <ItemTile icon="stone-tower" tint="#c9a04a" size="xl" :tip="false" />
      <div class="grow">
        <h1 class="banner-title">{{ $t('tower.title') }}</h1>
        <div class="banner-desc">{{ $t('tower.desc') }}</div>
        <div class="row wrap">
          <span class="tag gold">{{ $t('tower.best', { n: state.tower.best }) }}</span>
          <span class="tag">{{ $t('tower.startAt', { n: startFloor }) }}</span>
          <span class="tag gold"><GameIcon name="two-coins" :size="12" /> {{ $t('tower.tokens', { n: fmt(state.tower.tokens) }) }}</span>
        </div>
      </div>
      <Button :label="inTower ? $t('tower.leave') : $t('tower.enter')" :icon="inTower ? 'pi pi-flag' : 'pi pi-arrow-up'" :severity="inTower ? 'danger' : undefined"
        @click="inTower ? G.stop() : G.startCombat('tower')" />
    </div>

    <div style="height:18px" />
    <Arena v-if="inTower" />
    <CombatSettings />

    <div class="section-title">{{ $t('tower.next') }} <HelpTip k="sections.towerNext" /></div>
    <div class="floors">
      <div v-for="m in preview" :key="m.floor" class="card floor" :class="{ active: inTower && state.activity.floor === m.floor, guardian: m.guardian }" style="--c:#e2b65a">
        <div class="small muted">{{ $t('tower.floorN', { n: m.floor }) }}</div>
        <ItemTile :icon="m.icon" :tint="m.guardian ? '#c0392b' : '#6b4a2a'" size="lg" :tip="false" style="margin:8px auto" />
        <div class="card-name small" style="text-align:center">{{ m.name }}</div>
        <div class="small muted tnum" style="text-align:center;margin-top:4px">{{ $t('common.lvlShort', { n: monsterLevel(m) }) }} · {{ $t('tower.hp', { n: m.hp }) }}</div>
        <span v-if="m.affix" class="tag affix" v-tooltip.top="affixTip(m.affix)"><GameIcon :name="TOWER_AFFIXES[m.affix].icon" :size="11" /> {{ $t(`tower.affixes.${m.affix}.name`) }}</span>
      </div>
    </div>

    <div class="two-col" style="margin-top:22px">
      <div class="panel pad">
        <h3 class="panel-title"><GameIcon name="calendar" /> {{ $t('tower.weekTitle') }} <HelpTip k="sections.towerAffixes" /></h3>
        <div v-for="b in blocks" :key="b.from" class="line">
          <span class="small muted tnum floors-range">{{ $t('tower.floorsRange', { a: b.from, b: b.to }) }}</span>
          <span v-if="b.affix" class="grow" v-tooltip.top="affixTip(b.affix)"><GameIcon :name="TOWER_AFFIXES[b.affix].icon" :size="13" /> <b>{{ $t(`tower.affixes.${b.affix}.name`) }}</b> <span class="small muted">· {{ $t(`tower.affixes.${b.affix}.desc`) }}</span></span>
          <span v-else class="grow small faint">{{ $t('tower.noAffix') }}</span>
        </div>
        <h3 class="panel-title" style="margin-top:18px"><GameIcon name="crowned-skull" /> {{ $t('tower.guardiansTitle') }}</h3>
        <div v-for="g in guardians" :key="g.floor" class="line" :class="{ cleared: g.cleared }">
          <span class="small muted tnum floors-range">{{ $t('tower.floorN', { n: g.floor }) }}</span>
          <span class="grow"><b>{{ $t(`tower.guardians.${g.id}`) }}</b> <span class="small muted">· {{ rewardText(g.reward) }}</span></span>
          <i v-if="g.cleared" class="pi pi-check ok-text" />
        </div>
      </div>
      <div class="panel pad">
        <h3 class="panel-title"><GameIcon name="trophy-cup" /> {{ $t('tower.rivalsTitle') }} <HelpTip k="sections.towerRivals" /></h3>
        <div v-for="r in rivals" :key="r.name + r.place" class="rival" :class="{ hero: r.hero }">
          <span class="place tnum">{{ r.place }}</span>
          <GameIcon :name="ROLE_ICONS[r.role]" :size="14" />
          <span class="grow" style="min-width:0">
            <span class="rival-name">{{ r.hero ? `${r.name} (${$t('guilds.you')})` : r.name }}</span>
            <span v-if="r.guild" class="small faint guild">{{ guildName(G.guildById(r.guild)) }}</span>
          </span>
          <b class="tnum">{{ $t('tower.floorN', { n: r.best }) }}</b>
        </div>
      </div>
    </div>

    <div class="section-title">{{ $t('tower.shop') }} <HelpTip k="sections.towerShop" /></div>
    <div class="grid-wide">
      <div v-for="it in TOWER_SHOP" :key="it.id" class="card">
        <div class="row">
          <ItemTile :icon="it.icon" :item="it.item || null" tint="#c9a04a" size="md" />
          <div class="grow"><div class="card-name">{{ it.name }}</div><div class="card-sub">{{ it.desc }}</div></div>
        </div>
        <Button :label="$t('tower.tokens', { n: it.cost })" icon="pi pi-shopping-cart" fluid style="margin-top:14px" :disabled="state.tower.tokens < it.cost" @click="buy(it)" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.floors { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; }
.floor { text-align: center; display: flex; flex-direction: column; align-items: center; }
.floor.guardian { border-color: rgba(192, 57, 43, 0.45); }
.floor .affix { margin-top: 8px; font-size: 11px; color: var(--tag-arcane); }
.line { display: flex; align-items: center; gap: 10px; padding: 7px 0; border-bottom: 1px solid var(--line); }
.line:last-child { border-bottom: 0; }
.line.cleared { opacity: 0.6; }
.floors-range { min-width: 92px; }
.rival { display: flex; align-items: center; gap: 10px; padding: 6px 8px; border-radius: 8px; }
.rival:nth-child(even) { background: var(--tint-1); }
.rival.hero { color: var(--gold-hi); background: rgba(226, 182, 90, 0.08); }
.rival .place { width: 22px; text-align: center; font-family: var(--font-display); color: var(--muted); }
.rival-name { display: block; }
.rival .guild { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
@media (max-width: 900px) { .floors { grid-template-columns: repeat(2, 1fr); } }
</style>
