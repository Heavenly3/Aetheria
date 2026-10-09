<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Select from 'primevue/select'
import Slider from 'primevue/slider'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import { G, state } from '../game/engine.js'
import { COMBAT_STYLES, SPELLS } from '../game/data/combat.js'
import { PRAYERS, PRAYER_DRAIN } from '../game/data/extras.js'
import { ITEMS, SLOTS } from '../game/data/items.js'
import { weaponProfile } from '../game/data/fighting.js'
import { fmt, fmtDec, fmtClock } from '../game/format.js'
import { tm } from '../i18n/index.js'
import GameIcon from './GameIcon.vue'
import ItemTile from './ItemTile.vue'
import HelpTip from './HelpTip.vue'

// section: show only one part ('style', 'supplies' or 'loadouts'), or 'all' of them
const props = defineProps({ section: { type: String, default: 'all' } })
const show = part => props.section === 'all' || props.section === part
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
// Ways out of the blocker: gear already in the bag to put on, or where to make or buy it
const router = useRouter()
const ownedFor = key => Object.keys(state.inventory).filter(id => G.qty(id) > 0 && G.canEquip(id) && ITEMS[id].style === 'ranged'
  && (key === 'msg.noArrows' ? ITEMS[id].stackEquip : ITEMS[id].slot === 'weapon' && !ITEMS[id].stackEquip))
  .sort((a, b) => ITEMS[b].value - ITEMS[a].value)[0]
const fixes = computed(() => {
  const key = blocker.value?.key
  if (key === 'msg.needBow' || key === 'msg.noArrows') {
    const own = ownedFor(key)
    return { equip: own, go: [['/skill/fletching', 'arrow-flights', 'skills.fletching'], ['/shop', 'shop', 'nav.shop']] }
  }
  if (key === 'msg.noRunes') return { go: [['/skill/runecrafting', 'rune-stone', 'skills.runecrafting'], ['/shop', 'shop', 'nav.shop']] }
  return null
})
function equipFix(id) { if (G.equip(id)) G.toast(ITEMS[id].icon, 'combat.equipped', { item: '@item:' + id }, 'success') }
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
// The weapon in hand and how it fights: pace, crit chance and the status it can leave
const weapon = computed(() => state.equipment.weapon)
const wp = computed(() => weaponProfile(weapon.value))
// A weapon made for another style is wasted: say which style it is for
const weaponStyle = computed(() => (weapon.value ? ITEMS[weapon.value].style || 'melee' : null))
const mismatch = computed(() => weaponStyle.value && weaponStyle.value !== G.styleType())
const styleFor = type => Object.keys(COMBAT_STYLES).find(k => COMBAT_STYLES[k].type === type)
const weaponLine = computed(() => {
  const parts = [t('fighting.weaponLine', { speed: fmtDec(G.attackSpeed()), crit: Math.round(G.critChance() * 100) + '%' })]
  for (const f of G.heroEffects()) parts.push(t('fighting.weaponFx', { chance: Math.round(f.chance * 100) + '%', status: t(`fighting.statuses.${f.id}.name`).toLowerCase() }))
  return parts.join(' · ')
})
</script>

<template>
  <div :class="{ 'two-col': section === 'all' }">
    <div v-if="show('style')" class="panel pad">
      <h3 class="panel-title"><GameIcon name="crossed-swords" /> {{ $t('combat.style') }} <HelpTip k="combat.style" /></h3>
      <div class="styles">
        <button v-for="(st, k) in COMBAT_STYLES" :key="k" class="style-btn" :class="{ active: state.combatStyle === k }" @click="state.combatStyle = k">
          <GameIcon :name="st.icon" :size="22" />
          <b>{{ st.name }}</b>
          <span>{{ st.desc }}</span>
        </button>
      </div>
      <!-- The weapon in hand -->
      <div class="weapon">
        <ItemTile v-if="weapon" :item="weapon" size="md" />
        <ItemTile v-else icon="biceps" size="md" empty :tip="false" />
        <div class="grow" style="min-width:0">
          <div class="small muted">{{ $t('combat.weaponTitle') }}</div>
          <b>{{ weapon ? ITEMS[weapon].name : $t('combat.unarmed') }}</b>
          <div class="small" style="color:var(--ink-2)">{{ weaponLine }}</div>
        </div>
        <span class="tag" v-tooltip.top="$t('combat.trainsHint')">{{ $t('combat.trains', { skill: $t(`skills.${COMBAT_STYLES[state.combatStyle].skill}.name`) }) }}</span>
      </div>
      <div v-if="mismatch" class="mismatch row">
        <i class="pi pi-exclamation-triangle" />
        <span class="grow">{{ $t('combat.weaponMismatch', { style: $t(`combat.types.${weaponStyle}`) }) }}</span>
        <button class="link" @click="state.combatStyle = styleFor(weaponStyle)">{{ $t('combat.useStyle', { style: COMBAT_STYLES[styleFor(weaponStyle)].name }) }}</button>
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
      <div v-if="blocker" class="blocker">
        <div class="small bad-text"><i class="pi pi-exclamation-triangle" /> {{ tm(blocker) }}</div>
        <div v-if="fixes" class="row wrap" style="gap:8px;margin-top:8px">
          <Button v-if="fixes.equip" size="small" @click="equipFix(fixes.equip)">
            <ItemTile :item="fixes.equip" size="xs" :tip="false" /> {{ $t('combat.equipItem', { item: ITEMS[fixes.equip].name }) }}
          </Button>
          <Button v-for="[to, icon, key] in fixes.go" :key="to" size="small" severity="secondary" outlined @click="router.push(to)">
            <GameIcon :name="icon" :size="14" /> {{ $t(key.startsWith('skills.') ? key + '.name' : key) }}
          </Button>
        </div>
      </div>
    </div>

    <div v-if="show('supplies')" class="panel pad">
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
  <div v-if="show('loadouts')" class="panel pad" :style="section === 'all' ? 'margin-top:16px' : null">
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
.mismatch { gap: 8px; margin-top: 8px; padding: 8px 10px; border-radius: 10px; font-size: 13px; color: var(--warn); background: color-mix(in srgb, var(--warn) 10%, transparent); border: 1px solid color-mix(in srgb, var(--warn) 35%, transparent); }
.mismatch .link { background: none; border: 0; padding: 0; font: inherit; font-weight: 700; color: var(--gold); cursor: pointer; text-decoration: underline; }
.weapon { display: flex; align-items: center; gap: 12px; margin-top: 14px; padding: 10px 12px; border-radius: 12px; background: var(--tint-1); border: 1px solid var(--line); }
@media (max-width: 560px) { .weapon { flex-wrap: wrap; } }
.sets { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.set { display: flex; flex-direction: column; gap: 8px; padding: 12px; border-radius: 12px; background: var(--tint-1); border: 1px solid var(--line); }
@media (max-width: 900px) { .sets { grid-template-columns: 1fr; } }
@media (max-width: 560px) { .styles { grid-template-columns: repeat(3, 1fr); } }
.blocker { margin-top: 12px; }
</style>
