<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import SelectButton from 'primevue/selectbutton'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import { G, state } from '../game/engine.js'
import { QUESTS, QUEST_STAT_ICONS } from '../game/data/progression.js'
import { MONSTERS } from '../game/data/combat.js'
import { ITEMS } from '../game/data/items.js'
import { SKILLS } from '../game/data/skills.js'
import { fmt } from '../game/format.js'
import ItemTile from '../components/ItemTile.vue'
import GameIcon from '../components/GameIcon.vue'
import DailyTasks from '../components/DailyTasks.vue'
import HelpTip from '../components/HelpTip.vue'

const { t } = useI18n()
const filter = ref('open')
const filters = computed(() => ['open', 'done', 'all'].map(value => ({ value, label: t('quests.filters.' + value) })))
const SEVERITY = { locked: 'secondary', available: 'info', active: 'warn', done: 'success' }
const list = computed(() => QUESTS.filter(q => {
  const st = G.questStatus(q)
  if (filter.value === 'open') return st !== 'done'
  if (filter.value === 'done') return st === 'done'
  return true
}).sort((a, b) => order(a) - order(b)))
const order = q => (G.questReady(q) ? 0 : { active: 1, available: 2, locked: 3, done: 4 }[G.questStatus(q)])

function objLabel(o) {
  switch (o.type) {
    case 'item': return t('quests.obj.item', { n: o.qty, item: ITEMS[o.item].name })
    case 'kill': return t('quests.obj.kill', { n: o.qty, monster: MONSTERS[o.monster].name })
    case 'level': return t('quests.obj.level', { lvl: o.lvl, skill: SKILLS[o.skill].name })
    case 'tower': return t('quests.obj.tower', { floor: o.floor })
    case 'slayer': return t('quests.obj.slayer', { n: o.tasks })
    case 'stat': case 'reach': return t(`quests.obj.${o.key}`, { n: o.qty })
  }
}
const reqText = q => [
  ...(q.req.quests || []).map(id => ({ ok: G.questDone(id), t: QUESTS.find(x => x.id === id).name })),
  ...Object.entries(q.req.levels || {}).map(([s, l]) => ({ ok: G.level(s) >= l, t: `${SKILLS[s].name} ${l}` })),
]
</script>

<template>
  <div>
    <DailyTasks />
    <div class="section-title" style="margin-top:0">{{ $t('quests.story') }} <HelpTip k="sections.story" /></div>
    <div class="row wrap" style="margin-bottom:18px">
      <p class="intro grow" style="margin:0">{{ $t('quests.intro') }}</p>
      <span class="tag gold">{{ $t('quests.summary', { n: G.questsDone(), total: QUESTS.length, qp: G.questPoints() }) }}</span>
    </div>
    <SelectButton v-model="filter" :options="filters" optionLabel="label" optionValue="value" :allowEmpty="false" size="small" style="margin-bottom:18px" />

    <div class="grid-wide">
      <div v-for="q in list" :key="q.id" class="card quest" :class="{ done: G.questStatus(q) === 'done', active: G.questReady(q), locked: G.questStatus(q) === 'locked' }" style="--c:#e2b65a">
        <div class="row">
          <ItemTile :icon="q.icon" tint="#8a6a2a" size="md" :tip="false" />
          <div class="grow">
            <div class="card-name">{{ q.name }}</div>
            <div class="card-sub">{{ q.giver }}</div>
          </div>
          <Tag :value="G.questReady(q) ? $t('quests.status.ready') : $t('quests.status.' + G.questStatus(q))" :severity="G.questReady(q) ? 'success' : SEVERITY[G.questStatus(q)]" />
        </div>
        <p class="small muted">{{ q.desc }}</p>

        <div v-if="reqText(q).length && G.questStatus(q) === 'locked'" class="row wrap" style="gap:6px;margin-bottom:10px">
          <span class="small faint">{{ $t('quests.requires') }}</span>
          <span v-for="r in reqText(q)" :key="r.t" class="tag" :class="r.ok ? 'ok' : 'bad'">{{ r.t }}</span>
        </div>

        <div class="stack" style="gap:8px">
          <div v-for="(o, i) in q.obj" :key="i">
            <div class="row small">
              <ItemTile v-if="o.type === 'item'" :item="o.item" size="xs" />
              <GameIcon v-else :name="o.type === 'kill' ? MONSTERS[o.monster].icon : o.type === 'level' ? SKILLS[o.skill].icon : o.type === 'tower' ? 'stone-tower' : o.key ? QUEST_STAT_ICONS[o.key] : 'death-skull'" :size="18" />
              <span class="grow">{{ objLabel(o) }}</span>
              <b class="tnum" v-if="G.questStatus(q) !== 'done'">{{ fmt(G.objProgress(q, o).cur) }}/{{ fmt(G.objProgress(q, o).max) }}</b>
              <i v-else class="pi pi-check ok-text" />
            </div>
            <div v-if="G.questStatus(q) === 'active'" class="bar thin" style="margin-top:5px"><i :style="{ width: (G.objProgress(q, o).cur / G.objProgress(q, o).max) * 100 + '%' }" /></div>
          </div>
        </div>

        <div class="row wrap rewards">
          <span class="small faint">{{ $t('quests.reward') }}</span>
          <span v-if="q.reward.gold" class="tag gold">{{ $t('inventory.goldAmount', { n: fmt(q.reward.gold) }) }}</span>
          <span v-for="(v, s) in q.reward.xp || {}" :key="s" class="tag">{{ $t('quests.xp', { n: fmt(v), skill: SKILLS[s].name }) }}</span>
          <span v-for="(v, k) in q.reward.items || {}" :key="k" class="tag"><ItemTile :item="k" size="xs" /> {{ v }}× {{ ITEMS[k].name }}</span>
          <span v-if="q.reward.slayerPoints" class="tag arcane">{{ $t('quests.slayerPoints', { n: q.reward.slayerPoints }) }}</span>
          <span v-if="q.reward.unlock" class="tag ok"><i class="pi pi-unlock" /> {{ $t(q.reward.unlock) }}</span>
          <span class="tag gold">{{ $t('quests.qp', { n: q.reward.qp }) }}</span>
        </div>

        <Button v-if="G.questStatus(q) === 'available'" :label="$t('quests.accept')" icon="pi pi-check" fluid style="margin-top:14px" @click="G.startQuest(q.id)" />
        <Button v-else-if="G.questStatus(q) === 'active'" :label="$t('quests.complete')" icon="pi pi-star" fluid style="margin-top:14px" :disabled="!G.questReady(q)" @click="G.completeQuest(q.id)" />
      </div>
    </div>
    <div v-if="!list.length" class="empty-state"><GameIcon name="scroll-unfurled" :size="46" /><div>{{ $t('quests.empty') }}</div></div>
  </div>
</template>

<style scoped>
.quest { display: flex; flex-direction: column; }
.rewards { margin-top: auto; padding-top: 14px; gap: 6px; }
.card.locked { opacity: 0.6; }
</style>
