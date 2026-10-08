<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Select from 'primevue/select'
import Slider from 'primevue/slider'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import { G, state } from '../game/engine.js'
import { COMBAT_STYLES, SPELLS } from '../game/data/combat.js'
import { PRAYERS, PRAYER_DRAIN } from '../game/data/extras.js'
import { ITEMS, SLOTS } from '../game/data/items.js'
import { fmt, fmtClock } from '../game/format.js'
import { tm } from '../i18n/index.js'
import GameIcon from './GameIcon.vue'
import ItemTile from './ItemTile.vue'
import HelpTip from './HelpTip.vue'

const { t } = useI18n()
const foods = computed(() => Object.keys(state.inventory).filter(id => ITEMS[id]?.type === 'food')
  .sort((a, b) => ITEMS[a].heal - ITEMS[b].heal)
  .map(id => ({ value: id, label: `${ITEMS[id].name} (+${G.foodHeal(id)} ${t('common.hp')}) · ${fmt(state.inventory[id])}` })))
const potions = computed(() => Object.keys(state.inventory).filter(id => ITEMS[id]?.type === 'potion' && !ITEMS[id].elixir)
  .map(id => ({ value: id, label: `${ITEMS[id].name} · ${fmt(state.inventory[id])}` })))
const spells = computed(() => SPELLS.map(sp => ({
  value: sp.id, disabled: G.level('magic') < sp.lvl,
  label: t('combat.spellOption', { name: sp.name, max: sp.max, lvl: sp.lvl }),
})))
const spell = computed(() => G.currentSpell())
const blocker = computed(() => G.attackBlocker())
const prayers = computed(() => PRAYERS.map(p => ({ value: p.id, label: `${p.name} — ${p.desc} · ${t('common.lvlShort', { n: p.lvl })}`, disabled: G.level('prayer') < p.lvl })))
const bonesLeft = computed(() => ['bones', 'big_bones', 'dragon_bones', 'demon_ashes'].reduce((s, k) => s + G.qty(k), 0))
const setName = ref(['', '', ''])
function saveSet(i) {
  G.saveLoadout(i, setName.value[i].trim() || state.loadouts[i]?.name || t('loadouts.defaultName', { n: i + 1 }))
  setName.value[i] = ''
  G.toast('checked-shield', 'loadouts.saved', {}, 'success')
}
function useSet(i) {
  const missing = G.applyLoadout(i)
  if (missing?.length) G.toast('checked-shield', 'loadouts.missing', { items: missing.map(id => ITEMS[id]?.name || id).join(', ') }, 'warn')
  else G.toast('checked-shield', 'loadouts.ready', { name: state.loadouts[i].name }, 'success')
}
const setSummary = lo => Object.keys(SLOTS).map(k => lo.equipment[k]).filter(Boolean)
const ammo = computed(() => state.equipment.ammo)
</script>

<template>
  <div class="two-col">
    <div class="panel pad">
      <h3 class="panel-title"><GameIcon name="crossed-swords" /> {{ $t('combat.style') }} <HelpTip k="combat.style" /></h3>
      <div class="styles">
        <button v-for="(st, k) in COMBAT_STYLES" :key="k" class="style-btn" :class="{ active: state.combatStyle === k }" @click="state.combatStyle = k">
          <GameIcon :name="st.icon" :size="22" />
          <b>{{ st.name }}</b>
          <span>{{ st.desc }}</span>
        </button>
      </div>
      <div v-if="state.combatStyle === 'magic'" class="stack" style="margin-top:14px">
        <label class="small muted" for="spell-select">{{ $t('combat.spell') }} <HelpTip k="combat.spell" /></label>
        <Select inputId="spell-select" v-model="state.spell" :options="spells" optionLabel="label" optionValue="value" optionDisabled="disabled" class="w-full" />
        <div class="row wrap">
          <span class="small muted">{{ $t('combat.castCost') }}</span>
          <span v-for="(q, r) in spell.runes" :key="r" class="row" style="gap:4px">
            <ItemTile :item="r" size="xs" /><b class="small tnum" :class="{ 'bad-text': G.qty(r) < q }">{{ q }}</b><span class="faint small">({{ fmt(G.qty(r)) }})</span>
          </span>
        </div>
      </div>
      <div v-if="state.combatStyle === 'ranged'" class="row wrap" style="margin-top:14px">
        <span class="small muted">{{ $t('combat.ammo') }} <HelpTip k="combat.ammo" /></span>
        <template v-if="ammo"><ItemTile :item="ammo" size="xs" /><b class="small">{{ ITEMS[ammo].name }} · {{ fmt(G.qty(ammo)) }}</b></template>
        <span v-else class="small bad-text">{{ $t('combat.equipArrows') }}</span>
      </div>
      <div v-if="blocker" class="small bad-text" style="margin-top:12px"><i class="pi pi-exclamation-triangle" /> {{ tm(blocker) }}</div>
    </div>

    <div class="panel pad">
      <h3 class="panel-title"><GameIcon name="meat" /> {{ $t('combat.supplies') }} <HelpTip k="sections.supplies" /></h3>
      <div class="stack">
        <label class="small muted" for="food-select">{{ $t('combat.autoFood') }} <HelpTip k="combat.food" /></label>
        <Select inputId="food-select" v-model="state.food" :options="foods" optionLabel="label" optionValue="value" showClear :placeholder="$t('combat.noFood')" :emptyMessage="$t('combat.noFoodHint')" class="w-full" />
        <div class="row small">
          <span class="muted grow">{{ $t('combat.eatBelow', { n: state.autoEatPct }) }} <HelpTip k="combat.eatBelow" /></span>
        </div>
        <Slider v-model="state.autoEatPct" :min="20" :max="80" :step="5" />
        <label class="small muted" for="potion-select" style="margin-top:6px">{{ $t('combat.autoPotion') }} <HelpTip k="combat.potion" /></label>
        <Select inputId="potion-select" v-model="state.potion" :options="potions" optionLabel="label" optionValue="value" showClear :placeholder="$t('combat.noPotion')" :emptyMessage="$t('combat.noPotionHint')" class="w-full" />
        <label class="small muted" for="prayer-select" style="margin-top:6px">{{ $t('combat.prayerLabel', { n: PRAYER_DRAIN }) }} <HelpTip k="combat.prayer" :params="{ n: PRAYER_DRAIN }" /></label>
        <Select inputId="prayer-select" :modelValue="state.prayer" @update:modelValue="v => G.setPrayer(v)" :options="prayers" optionLabel="label" optionValue="value" optionDisabled="disabled"
          showClear :placeholder="$t('combat.noPrayer')" class="w-full" />
        <div v-if="state.prayer" class="small muted">{{ $t('combat.bonesLeft', { n: fmt(bonesLeft) }) }}</div>
        <div v-if="state.buffs.potion" class="row small">
          <ItemTile :item="state.buffs.potion.id" size="xs" />
          <span class="grow">{{ $t('combat.potionActive', { name: ITEMS[state.buffs.potion.id].name }) }}</span>
          <b class="tnum gold-text">{{ fmtClock(state.buffs.potion.t) }}</b>
        </div>
      </div>
    </div>
  </div>
  <div class="panel pad" style="margin-top:16px">
    <h3 class="panel-title"><GameIcon name="checked-shield" /> {{ $t('loadouts.title') }} <HelpTip k="combat.loadouts" /></h3>
    <p class="small muted" style="margin-top:0">{{ $t('loadouts.intro') }}</p>
    <div class="sets">
      <div v-for="(lo, i) in state.loadouts" :key="i" class="set">
        <div class="row">
          <b class="grow">{{ lo ? lo.name : $t('loadouts.empty', { n: i + 1 }) }}</b>
          <span v-if="lo" class="tag">{{ COMBAT_STYLES[lo.style].name }}</span>
        </div>
        <div v-if="lo" class="row wrap" style="gap:4px;min-height:34px">
          <span v-for="id in setSummary(lo)" :key="id"><ItemTile :item="id" size="sm" /></span>
        </div>
        <InputText v-model="setName[i]" :placeholder="lo ? $t('loadouts.rename') : $t('loadouts.name')" size="small" :id="'set-name-' + i" />
        <div class="row">
          <Button :label="$t('loadouts.save')" icon="pi pi-save" size="small" severity="secondary" class="grow" @click="saveSet(i)" />
          <Button :label="$t('common.equip')" icon="pi pi-check" size="small" :disabled="!lo" @click="useSet(i)" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.styles { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
.style-btn { display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 12px 6px; border-radius: 12px; text-align: center; cursor: pointer;
  border: 1px solid var(--line); background: var(--tint-1); color: var(--ink); font: inherit; transition: all 0.18s; }
.style-btn .gi { color: var(--muted); }
.style-btn b { font-size: 13.5px; }
.style-btn span { font-size: 11px; color: var(--muted); line-height: 1.25; }
.style-btn:hover { border-color: var(--tint-border); }
.style-btn.active { border-color: var(--gold); background: rgba(226, 182, 90, 0.08); box-shadow: inset 0 0 0 1px rgba(226, 182, 90, 0.3); }
.style-btn.active .gi { color: var(--gold); }
.w-full { width: 100%; }
.sets { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.set { display: flex; flex-direction: column; gap: 8px; padding: 12px; border-radius: 12px; background: var(--tint-1); border: 1px solid var(--line); }
@media (max-width: 900px) { .sets { grid-template-columns: 1fr; } }
@media (max-width: 560px) { .styles { grid-template-columns: repeat(3, 1fr); } }
</style>
