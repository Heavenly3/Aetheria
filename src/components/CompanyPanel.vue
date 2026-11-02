<script setup>
import { ref, computed } from 'vue'
import Button from 'primevue/button'
import ToggleSwitch from 'primevue/toggleswitch'
import { G, state } from '../game/engine.js'
import { MERC_ROLES, MERC_ROLE_IDS, PARTY_SLOTS, wageOf, mercXpNeed, mercPower } from '../game/data/company.js'
import { fmt, fmtClock } from '../game/format.js'
import { throttled } from '../ui/throttled.js'
import GameIcon from './GameIcon.vue'
import ItemTile from './ItemTile.vue'
import HelpTip from './HelpTip.vue'

// The hired company: who goes along, how they grow, and who else could be taken on
const members = computed(() => state.company.members)
const party = computed(() => state.company.party)
const recruits = computed(() => MERC_ROLE_IDS.filter(r => !members.value.some(m => m.role === r)))
const hireCost = computed(() => G.mercHireCost())
// Hurt companions count down in real time
const now = throttled(() => (void state.lastTick, Date.now()), 1000)
const hurtLeft = m => Math.max(0, ((m.hurtUntil || 0) - now.value) / 1000)
const power = m => Math.round(mercPower(m.lvl, G.combatLevel()) * 100)
const toggle = m => { if (!G.toggleParty(m.id)) G.toast('padlock', 'company.full', { n: PARTY_SLOTS }, 'warn') }
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
    <p class="small muted" style="margin-top:0">{{ $t('company.intro', { n: PARTY_SLOTS }) }}</p>
    <div class="row small" style="gap:8px;margin-bottom:12px">
      <span class="tag gold">{{ $t('company.inParty', { n: party.length, max: PARTY_SLOTS }) }}</span>
      <span v-if="party.length" class="tag">{{ $t('company.wages', { n: fmt(G.partyWages()) }) }}</span>
    </div>

    <div v-if="members.length" class="list">
      <div v-for="m in members" :key="m.id" class="member" :class="{ on: party.includes(m.id) }">
        <ItemTile :icon="MERC_ROLES[m.role].icon" :tint="MERC_ROLES[m.role].tint" size="md" :tip="false" />
        <div class="grow">
          <div class="row wrap" style="gap:6px">
            <b>{{ m.name }}</b>
            <span class="small muted">{{ $t(`company.roles.${m.role}.name`) }} · {{ $t('company.level', { n: m.lvl }) }}</span>
            <span v-if="G.mercHurt(m)" class="tag bad"><i class="pi pi-heart" /> {{ $t('company.hurt', { t: fmtClock(hurtLeft(m)) }) }}</span>
          </div>
          <div class="small muted">{{ $t(`company.roles.${m.role}.desc`) }}</div>
          <div class="bar thin" style="margin-top:6px" role="progressbar" :aria-label="$t('company.xp')" aria-valuemin="0" :aria-valuemax="mercXpNeed(m.lvl)" :aria-valuenow="m.xp"><i :style="{ width: (m.xp / mercXpNeed(m.lvl)) * 100 + '%' }" /></div>
          <div class="small faint tnum" style="margin-top:3px">{{ $t('company.stats', { p: power(m), w: fmt(wageOf(m.lvl)) }) }}</div>
        </div>
        <div class="stack actions">
          <label class="row small" :for="'party-' + m.id" style="gap:8px;cursor:pointer">{{ $t('company.goes') }}
            <ToggleSwitch :modelValue="party.includes(m.id)" @update:modelValue="toggle(m)" :inputId="'party-' + m.id" />
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
  </div>
</template>

<style scoped>
.list { display: grid; gap: 8px; }
.member { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 12px; background: var(--tint-1); border: 1px solid var(--line); }
.member.on { border-color: var(--line-hi); }
.actions { align-items: flex-end; gap: 4px; flex-shrink: 0; }
@media (max-width: 600px) {
  .member { flex-wrap: wrap; }
  .actions { flex-direction: row; width: 100%; justify-content: space-between; align-items: center; }
}
</style>
