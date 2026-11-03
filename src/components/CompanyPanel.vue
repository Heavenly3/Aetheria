<script setup>
import { ref, computed } from 'vue'
import Button from 'primevue/button'
import ToggleSwitch from 'primevue/toggleswitch'
import { G, state } from '../game/engine.js'
import { MERC_ROLES, MERC_ROLE_IDS, UNIQUE_MERCS, UNIQUE_IDS, wageOf, mercXpNeed, mercPower, mercIcon, mercTint } from '../game/data/company.js'
import { mercName } from '../ui/company.js'
import { modText } from '../i18n/mods.js'
import { useI18n } from 'vue-i18n'
import { DUNGEONS, BOSSES } from '../game/data/combat.js'
import { fmt, fmtClock } from '../game/format.js'
import { throttled } from '../ui/throttled.js'
import GameIcon from './GameIcon.vue'
import ItemTile from './ItemTile.vue'
import HelpTip from './HelpTip.vue'

// The hired company: who goes along, how they grow, and who else could be taken on
const { t } = useI18n()
const members = computed(() => state.company.members)
const party = computed(() => state.company.party)
// With every place taken, the others cannot be switched on until someone steps out
const slots = computed(() => G.partySlots())
const full = computed(() => party.value.length >= slots.value)
const recruits = computed(() => MERC_ROLE_IDS.filter(r => !members.value.some(m => m.role === r && !m.unique)))
// Companions met along the way: the ones waiting to join, and the ones still out there
const waiting = computed(() => (void state.journal.chapters, void state.stats.affairs, G.uniquesWaiting()))
const unmet = computed(() => UNIQUE_IDS.filter(id => !G.uniqueOpen(id) && !G.companyMember(id)))
// A companion's own quest: waiting for full trust, under way, or done
function questText(m) {
  const q = UNIQUE_MERCS[m.unique].quest
  if (m.questDone) return t('company.questDone', { reward: t(`company.uniques.${m.unique}.reward`) })
  if (!G.questOpen(m)) return t('company.questLater')
  const task = q.kill ? t('quests.obj.kill', { n: q.n, monster: bossName(q.kill) }) : t('company.questAffairs', { n: q.n })
  return t('company.questNow', { task, n: m.questCount || 0, max: q.n })
}
const bossName = id => DUNGEONS.find(d => d.boss.id === id)?.boss.name || BOSSES.find(b => b.id === id)?.name || id
const perkText = id => Object.entries(UNIQUE_MERCS[id].perk).map(([k, v]) => modText(k, v)).join(' · ')
const hireCost = computed(() => G.mercHireCost())
// Hurt companions count down in real time
const now = throttled(() => (void state.lastTick, Date.now()), 1000)
const hurtLeft = m => Math.max(0, ((m.hurtUntil || 0) - now.value) / 1000)
const power = m => Math.round(mercPower(m.lvl, G.combatLevel()) * 100)
const toggle = m => { if (!G.toggleParty(m.id)) G.toast('padlock', 'company.full', { n: slots.value }, 'warn') }
// Dismissing asks twice
const dismissing = ref(null)
function dismiss(m) {
  if (dismissing.value !== m.id) { dismissing.value = m.id; return }
  G.dismissMerc(m.id)
  dismissing.value = null
}
</script>

<template>
  <div class="panel pad">
    <h3 class="panel-title"><GameIcon name="crossed-swords" /> {{ $t('company.title') }} <HelpTip k="sections.mercs" /></h3>
    <p class="small muted" style="margin-top:0">{{ $t('company.intro', { n: slots }) }}</p>
    <div class="row small" style="gap:8px;margin-bottom:12px">
      <span class="tag gold">{{ $t('company.inParty', { n: party.length, max: slots }) }}</span>
      <span v-if="party.length" class="tag">{{ $t('company.wages', { n: fmt(G.partyWages()) }) }}</span>
    </div>

    <div v-if="members.length" class="list">
      <div v-for="m in members" :key="m.id" class="member" :class="{ on: party.includes(m.id) }">
        <ItemTile :icon="mercIcon(m)" :tint="mercTint(m)" size="md" :tip="false" />
        <div class="grow">
          <div class="row wrap" style="gap:6px">
            <b>{{ mercName(m) }}</b>
            <span v-if="m.unique" class="tag gold">{{ $t(`company.uniques.${m.unique}.title`) }}</span>
            <span class="small muted">{{ $t(`company.roles.${m.role}.name`) }} · {{ $t('company.level', { n: m.lvl }) }}</span>
            <span v-if="G.mercHurt(m)" class="tag bad"><i class="pi pi-heart" /> {{ $t('company.hurt', { t: fmtClock(hurtLeft(m)) }) }}</span>
            <span v-if="G.memberAway(m.id)" class="tag arcane"><GameIcon name="treasure-map" :size="11" /> {{ $t('company.away') }}</span>
          </div>
          <div class="small muted">{{ $t(`company.roles.${m.role}.desc`) }}</div>
          <div v-if="m.unique" class="small ok-text"><GameIcon name="sparkles" :size="11" /> {{ perkText(m.unique) }}</div>
          <div class="bar thin" style="margin-top:6px" role="progressbar" :aria-label="$t('company.xp')" aria-valuemin="0" :aria-valuemax="mercXpNeed(m.lvl)" :aria-valuenow="m.xp"><i :style="{ width: (m.xp / mercXpNeed(m.lvl)) * 100 + '%' }" /></div>
          <div class="small faint tnum" style="margin-top:3px">{{ $t('company.stats', { p: power(m), w: fmt(wageOf(m.lvl)) }) }}</div>
          <div class="row wrap small" style="gap:6px;margin-top:6px">
            <span class="tag" :class="{ gold: G.mercLoyal(m) }" v-tooltip.top="$t('company.trustTip')">{{ $t('company.trust', { n: m.trust || 0 }) }}</span>
            <span v-if="G.mercLoyal(m)" class="tag ok">{{ $t('company.loyal') }}</span>
            <span v-if="m.unique" :class="m.questDone ? 'ok-text' : G.questOpen(m) ? 'gold-text' : 'faint'">{{ questText(m) }}</span>
          </div>
        </div>
        <div class="stack actions">
          <label class="row small" :class="{ faint: full && !party.includes(m.id) }" :for="'party-' + m.id" style="gap:8px;cursor:pointer" v-tooltip.left="full && !party.includes(m.id) ? $t('company.full', { n: slots }) : null">{{ $t('company.goes') }}
            <ToggleSwitch :modelValue="party.includes(m.id)" @update:modelValue="toggle(m)" :inputId="'party-' + m.id" :disabled="full && !party.includes(m.id)" />
          </label>
          <Button :label="dismissing === m.id ? $t('company.sure') : $t('company.dismiss')" size="small" text :severity="dismissing === m.id ? 'danger' : 'secondary'" @click="dismiss(m)" />
        </div>
      </div>
    </div>
    <p v-else class="small faint">{{ $t('company.none') }}</p>

    <template v-if="recruits.length">
      <div class="section-title" style="margin-top:20px">{{ $t('company.recruits') }}</div>
      <div class="list">
        <div v-for="r in recruits" :key="r" class="member recruit">
          <ItemTile :icon="MERC_ROLES[r].icon" :tint="MERC_ROLES[r].tint" size="md" :tip="false" />
          <div class="grow">
            <b>{{ $t(`company.roles.${r}.name`) }}</b>
            <div class="small muted">{{ $t(`company.roles.${r}.desc`) }}</div>
          </div>
          <Button :label="$t('company.hire', { n: fmt(hireCost) })" icon="pi pi-wallet" size="small" :disabled="state.gold < hireCost" @click="G.hireMerc(r)" />
        </div>
      </div>
    </template>

    <!-- Companions met along the way: they join for free when their moment comes -->
    <div class="section-title" style="margin-top:20px">{{ $t('company.met') }}</div>
    <div class="list">
      <div v-for="id in waiting" :key="id" class="member unique">
        <ItemTile :icon="UNIQUE_MERCS[id].icon" :tint="UNIQUE_MERCS[id].tint" size="md" :tip="false" />
        <div class="grow">
          <div class="row wrap" style="gap:6px">
            <b>{{ $t(`company.uniques.${id}.name`) }}</b>
            <span class="tag gold">{{ $t(`company.uniques.${id}.title`) }}</span>
            <span class="small muted">{{ $t(`company.roles.${UNIQUE_MERCS[id].role}.name`) }}</span>
          </div>
          <p class="small muted bio">{{ $t(`company.uniques.${id}.bio`) }}</p>
          <div class="small ok-text"><GameIcon name="sparkles" :size="11" /> {{ perkText(id) }}</div>
        </div>
        <Button :label="$t('company.join')" icon="pi pi-user-plus" size="small" @click="G.recruitUnique(id)" />
      </div>
      <div v-for="id in unmet" :key="id" class="member unmet">
        <ItemTile icon="hood" tint="#2a2838" size="md" :tip="false" />
        <div class="grow">
          <b>???</b>
          <div class="small faint">{{ $t(`company.uniques.${id}.hint`) }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.list { display: grid; gap: 8px; }
.member { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 12px; background: var(--tint-1); border: 1px solid var(--line); }
.member.on { border-color: var(--line-hi); }
.member.unique { border-color: color-mix(in srgb, var(--gold) 45%, var(--line)); }
.member.unmet { border-style: dashed; }
.bio { margin: 4px 0; font-style: italic; max-width: 62ch; }
.actions { align-items: flex-end; gap: 4px; flex-shrink: 0; }
@media (max-width: 600px) {
  .member { flex-wrap: wrap; }
  .actions { flex-direction: row; width: 100%; justify-content: space-between; align-items: center; }
}
</style>
