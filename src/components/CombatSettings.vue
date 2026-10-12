<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Select from 'primevue/select'
import Slider from 'primevue/slider'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import ToggleSwitch from 'primevue/toggleswitch'
import { G, state } from '../game/engine.js'
import { COMBAT_STYLES, SPELLS, STYLE_TYPES, stancesOf } from '../game/data/combat.js'
import { PRAYERS, PRAYER_DRAIN } from '../game/data/extras.js'
import { ITEMS, SLOTS } from '../game/data/items.js'
import { ABILITY_SKILL } from '../game/data/fighting.js'
import { fmt, fmtDec, fmtClock } from '../game/format.js'
import { tm } from '../i18n/index.js'
import GameIcon from './GameIcon.vue'
import ItemTile from './ItemTile.vue'
import HelpTip from './HelpTip.vue'

// section: show only one part ('style', 'supplies' or 'loadouts'), or 'all' of them
const props = defineProps({ section: { type: String, default: 'all' } })
const show = part => props.section === 'all' || props.section === part
const { t } = useI18n()

/* ---------- kind of fight and stance ---------- */
const TYPE_ICONS = { melee: 'crossed-swords', ranged: 'bow-arrow', magic: 'fire-spell-cast' }
const stance = computed(() => G.stance())
const type = computed(() => stance.value.type)
const stances = computed(() => stancesOf(type.value))
// What a stance changes, as short lines; costs are marked so they read as trade-offs
const pctOf = v => Math.round(Math.abs(v - 1) * 100)
function effects(st) {
  const out = []
  if (st.acc) out.push({ text: t('combat.fx.acc', { n: st.acc }) })
  if (st.str) out.push({ text: t('combat.fx.str', { n: st.str }) })
  if (st.def) out.push({ text: t('combat.fx.def', { n: st.def }) })
  if (st.speed < 1) out.push({ text: t('combat.fx.faster', { n: pctOf(st.speed) }) })
  if (st.speed > 1) out.push({ text: t('combat.fx.slower', { n: pctOf(st.speed) }), bad: true })
  if (st.dmg > 1) out.push({ text: t('combat.fx.moreDmg', { n: pctOf(st.dmg) }) })
  if (st.dmg < 1) out.push({ text: t('combat.fx.lessDmg', { n: pctOf(st.dmg) }), bad: true })
  if (st.crit) out.push({ text: t('combat.fx.crit', { n: Math.round(st.crit * 100) }) })
  if (st.guard < 1) out.push({ text: t('combat.fx.lessGuard', { n: pctOf(st.guard) }), bad: true })
  return out
}
const trains = st => Object.entries(st.xp).map(([k, share]) => t(`skills.${k}.name`) + (share < 1 ? ` ${Math.round(share * 100)}%` : '')).join(' · ')
// Every stance of this kind side by side, against the creature being fought (or a foe of the hero's level)
const foe = computed(() => (state.activity?.type === 'combat' ? G.getMonster(state.activity) : null))
const compare = computed(() => {
  void state.equipment, void state.combatStyle, void state.spell
  const target = foe.value || null
  const rows = Object.fromEntries(stances.value.map(id => {
    const p = G.withStance(id, () => G.combatProfile(target))
    return [id, { dps: p.dps, taken: p.takenPerSec }]
  }))
  const list = Object.values(rows)
  const best = Math.max(...list.map(r => r.dps)), safest = Math.min(...list.map(r => r.taken))
  for (const r of list) { r.share = best > 0 ? r.dps / best : 0; r.best = r.dps === best && best > 0; r.safe = r.taken === safest && Math.max(...list.map(o => o.taken)) >= Math.max(0.05, safest * 1.1) }
  return rows
})

/* ---------- spells, ammo and what stops an attack ---------- */
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
const ammo = computed(() => state.equipment.ammo)
// The weapon in hand and how it fights: pace, crit chance and the status it can leave
const weapon = computed(() => state.equipment.weapon)
// A weapon made for another kind of fight is wasted: say which one it is for
const weaponStyle = computed(() => (weapon.value ? ITEMS[weapon.value].style || 'melee' : null))
const mismatch = computed(() => weaponStyle.value && weaponStyle.value !== type.value)
const weaponLine = computed(() => {
  const parts = [t('fighting.weaponLine', { speed: fmtDec(G.attackSpeed()), crit: Math.round(G.critChance() * 100) + '%' })]
  for (const f of G.heroEffects()) parts.push(t('fighting.weaponFx', { chance: Math.round(f.chance * 100) + '%', status: t(`fighting.statuses.${f.id}.name`).toLowerCase() }))
  return parts.join(' · ')
})

/* ---------- supplies and tactics ---------- */
const foods = computed(() => Object.keys(state.inventory).filter(id => ITEMS[id]?.type === 'food')
  .sort((a, b) => ITEMS[a].heal - ITEMS[b].heal)
  .map(id => ({ value: id, label: `${ITEMS[id].name} (+${G.foodHeal(id)} ${t('common.hp')}) · ${fmt(state.inventory[id])}` })))
const potions = computed(() => Object.keys(state.inventory).filter(id => ITEMS[id]?.type === 'potion' && !ITEMS[id].elixir)
  .map(id => ({ value: id, label: `${ITEMS[id].name} · ${fmt(state.inventory[id])}` })))
const prayers = computed(() => PRAYERS.map(p => ({ value: p.id, label: `${p.name} — ${p.desc} · ${t('common.lvlShort', { n: p.lvl })}`, disabled: G.level('prayer') < p.lvl })))
const bonesLeft = computed(() => ['bones', 'big_bones', 'dragon_bones', 'demon_ashes'].reduce((s, k) => s + G.qty(k), 0))

/* ---------- loadouts ---------- */
const setName = ref(state.loadouts.map(() => ''))
function saveSet(i) {
  G.saveLoadout(i, setName.value[i]?.trim() || state.loadouts[i]?.name || t('loadouts.defaultName', { n: i + 1 }))
  setName.value[i] = ''
  G.toast('checked-shield', 'loadouts.saved', {}, 'success')
}
function useSet(i) {
  const missing = G.applyLoadout(i)
  if (missing?.length) G.toast('checked-shield', 'loadouts.missing', { items: missing.map(id => ITEMS[id]?.name || id).join(', ') }, 'warn')
  else G.toast('checked-shield', 'loadouts.ready', { name: state.loadouts[i].name }, 'success')
}
const setSummary = lo => Object.keys(SLOTS).map(k => lo.equipment[k]).filter(Boolean)
const styleOf = lo => COMBAT_STYLES[lo.style] || COMBAT_STYLES.attack
</script>

<template>
  <div :class="{ 'two-col': section === 'all' || section === 'supplies' }">
    <div v-if="show('style')" class="panel pad">
      <h3 class="panel-title"><GameIcon name="crossed-swords" /> {{ $t('combat.style') }} <HelpTip k="combat.style" /></h3>

      <!-- The kind of fight -->
      <div class="types">
        <button v-for="ty in STYLE_TYPES" :key="ty" class="type-btn" :class="{ active: type === ty }" @click="G.setStyleType(ty)">
          <GameIcon :name="TYPE_ICONS[ty]" :size="20" />
          <span class="type-name">{{ $t(`combat.typeNames.${ty}`) }}</span>
          <span class="small faint tnum">{{ $t('common.lvlShort', { n: G.level(ABILITY_SKILL[ty]) }) }}</span>
          <i v-if="weaponStyle === ty" class="pi pi-check weapon-dot" v-tooltip.top="$t('combat.weaponFits')" />
        </button>
      </div>

      <!-- Its stances, compared against the same foe -->
      <div class="row small muted compare-head">
        <span class="grow">{{ $t('combat.stance') }} <HelpTip k="combat.stance" /></span>
        <span>{{ foe ? $t('combat.compareVs', { monster: foe.name }) : $t('combat.compareRef') }}</span>
      </div>
      <div class="stances">
        <button v-for="id in stances" :key="id" class="stance" :class="{ active: state.combatStyle === id }" @click="G.setStance(id)">
          <div class="row" style="gap:10px;align-items:flex-start">
            <span class="st-icon"><GameIcon :name="COMBAT_STYLES[id].icon" :size="18" /></span>
            <span class="grow" style="min-width:0">
              <span class="st-name">{{ COMBAT_STYLES[id].name }}
                <span v-if="compare[id].best" class="badge dmg">{{ $t('combat.bestDmg') }}</span>
                <span v-if="compare[id].safe" class="badge safe">{{ $t('combat.safest') }}</span>
              </span>
              <span class="st-desc">{{ COMBAT_STYLES[id].desc }}</span>
            </span>
          </div>
          <div class="fx">
            <span v-for="f in effects(COMBAT_STYLES[id])" :key="f.text" class="fx-i" :class="{ bad: f.bad }">{{ f.text }}</span>
          </div>
          <div class="small faint">{{ $t('combat.trainsList', { list: trains(COMBAT_STYLES[id]) }) }}</div>
          <div class="numbers">
            <span class="bar thin grow" :style="{ '--c': 'var(--gold)' }"><i :style="{ width: compare[id].share * 100 + '%' }" /></span>
            <b class="small tnum">{{ $t('combat.dps', { n: fmtDec(compare[id].dps) }) }}</b>
            <span class="small faint tnum">{{ $t('combat.takenPs', { n: fmtDec(compare[id].taken) }) }}</span>
          </div>
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
      </div>
      <div v-if="mismatch" class="mismatch row">
        <i class="pi pi-exclamation-triangle" />
        <span class="grow">{{ $t('combat.weaponMismatch', { style: $t(`combat.types.${weaponStyle}`) }) }}</span>
        <button class="link" @click="G.setStyleType(weaponStyle)">{{ $t('combat.useStyle', { style: $t(`combat.typeNames.${weaponStyle}`) }) }}</button>
      </div>
      <div v-if="type === 'magic'" class="stack" style="margin-top:14px">
        <label class="small muted" for="spell-select">{{ $t('combat.spell') }} <HelpTip k="combat.spell" /></label>
        <Select inputId="spell-select" v-model="state.spell" :options="spells" optionLabel="label" optionValue="value" optionDisabled="disabled" class="w-full" />
        <div class="row wrap">
          <span class="small muted">{{ $t('combat.castCost') }}</span>
          <span v-for="(q, r) in spell.runes" :key="r" class="row" style="gap:4px">
            <ItemTile :item="r" size="xs" /><b class="small tnum" :class="{ 'bad-text': G.qty(r) < q }">{{ q }}</b><span class="faint small">({{ fmt(G.qty(r)) }})</span>
          </span>
        </div>
      </div>
      <div v-if="type === 'ranged'" class="row wrap" style="margin-top:14px">
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

    <!-- Tactics: when to pull out of a fight -->
    <div v-if="show('supplies')" class="panel pad">
      <h3 class="panel-title"><GameIcon name="run" /> {{ $t('tactics.title') }} <HelpTip k="combat.tactics" /></h3>
      <p class="small muted" style="margin-top:0">{{ $t('tactics.intro') }}</p>
      <div class="tactic">
        <label class="row" for="tac-retreat" style="gap:10px;cursor:pointer">
          <span class="grow"><b>{{ $t('tactics.retreat') }}</b><span class="small muted block">{{ $t('tactics.retreatHint') }}</span></span>
          <ToggleSwitch v-model="state.tactics.retreat" inputId="tac-retreat" />
        </label>
        <template v-if="state.tactics.retreat">
          <div class="small muted" style="margin-top:10px">{{ $t('tactics.retreatAt', { n: state.tactics.retreatPct }) }}</div>
          <Slider v-model="state.tactics.retreatPct" :min="10" :max="50" :step="5" style="margin-top:10px" />
          <div v-if="!state.food" class="small warn-text" style="margin-top:10px"><i class="pi pi-info-circle" /> {{ $t('tactics.noFoodNow') }}</div>
        </template>
      </div>
      <div class="tactic">
        <label class="row" for="tac-task" style="gap:10px;cursor:pointer">
          <span class="grow"><b>{{ $t('tactics.stopOnTask') }}</b><span class="small muted block">{{ $t('tactics.stopOnTaskHint') }}</span></span>
          <ToggleSwitch v-model="state.tactics.stopOnTask" inputId="tac-task" />
        </label>
      </div>
      <div class="tactic">
        <label class="row" for="tac-abilities" style="gap:10px;cursor:pointer">
          <span class="grow"><b>{{ $t('abilities.auto') }}</b><span class="small muted block">{{ $t('tactics.abilitiesHint') }}</span></span>
          <ToggleSwitch v-model="state.abilities.auto" inputId="tac-abilities" />
        </label>
      </div>
      <div class="small faint tnum" style="margin-top:12px">{{ $t('tactics.record', { retreats: fmt(state.stats.retreats || 0), deaths: fmt(state.stats.deaths || 0) }) }}</div>
    </div>
  </div>

  <div v-if="show('loadouts')" class="panel pad" :style="section === 'all' ? 'margin-top:16px' : null">
    <h3 class="panel-title"><GameIcon name="checked-shield" /> {{ $t('loadouts.title') }} <HelpTip k="combat.loadouts" /></h3>
    <p class="small muted" style="margin-top:0">{{ $t('loadouts.intro') }}</p>
    <div class="sets">
      <div v-for="(lo, i) in state.loadouts" :key="i" class="set" :class="{ empty: !lo }">
        <div class="row">
          <b class="grow">{{ lo ? lo.name : $t('loadouts.empty', { n: i + 1 }) }}</b>
          <span v-if="lo" class="tag"><GameIcon :name="styleOf(lo).icon" :size="12" /> {{ styleOf(lo).name }}</span>
        </div>
        <div v-if="lo" class="row wrap" style="gap:4px;min-height:34px">
          <span v-for="id in setSummary(lo)" :key="id"><ItemTile :item="id" size="sm" /></span>
        </div>
        <div v-if="lo?.bar?.length" class="row wrap small muted" style="gap:4px">
          <GameIcon name="sparkles" :size="12" />
          <span v-for="id in lo.bar" :key="id" class="ab-chip">{{ $t(`abilities.list.${id}`) }}</span>
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
.types { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.type-btn { position: relative; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 10px 6px; border-radius: 12px; cursor: pointer;
  border: 1px solid var(--line); background: var(--tint-1); color: var(--ink); font: inherit; transition: all 0.18s; }
.type-btn .gi { color: var(--muted); }
.type-btn:hover { border-color: var(--tint-border); }
.type-btn.active { border-color: var(--gold); background: rgba(226, 182, 90, 0.08); box-shadow: inset 0 0 0 1px rgba(226, 182, 90, 0.3); }
.type-btn.active .gi { color: var(--gold); }
.type-name { font-weight: 700; font-size: 14px; }
.weapon-dot { position: absolute; top: 6px; inset-inline-end: 8px; font-size: 11px; color: var(--ok); }
.compare-head { margin: 14px 0 8px; gap: 10px; flex-wrap: wrap; }
.stances { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 8px; }
.stance { display: flex; flex-direction: column; gap: 8px; padding: 10px 12px; border-radius: 12px; cursor: pointer; text-align: start;
  border: 1px solid var(--line); background: var(--panel); color: inherit; font: inherit; transition: border-color 0.18s, background 0.18s; }
.stance:hover { border-color: var(--line-hi); }
.stance.active { border-color: var(--gold); background: linear-gradient(160deg, rgba(226, 182, 90, 0.1), var(--panel) 70%); }
.st-icon { width: 32px; height: 32px; flex-shrink: 0; border-radius: 9px; display: grid; place-items: center; color: var(--muted); background: var(--tint-2); border: 1px solid var(--line); }
.stance.active .st-icon { color: var(--gold); border-color: rgba(226, 182, 90, 0.4); }
.st-name { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 6px; font-weight: 700; font-size: 14px; }
.st-desc { display: block; font-size: 12px; color: var(--muted); line-height: 1.35; margin-top: 2px; }
.badge { font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 999px; letter-spacing: 0.02em; }
.badge.dmg { color: var(--gold-hi); background: rgba(226, 182, 90, 0.12); border: 1px solid rgba(226, 182, 90, 0.35); }
.badge.safe { color: var(--tag-ok); background: rgba(98, 193, 126, 0.1); border: 1px solid rgba(98, 193, 126, 0.35); }
.fx { display: flex; flex-wrap: wrap; gap: 4px; }
.fx-i { font-size: 11.5px; padding: 1px 7px; border-radius: 999px; color: var(--tag-ok); background: rgba(98, 193, 126, 0.08); border: 1px solid rgba(98, 193, 126, 0.25); }
.fx-i.bad { color: var(--tag-bad); background: rgba(224, 85, 75, 0.08); border-color: rgba(224, 85, 75, 0.25); }
.numbers { display: flex; align-items: center; gap: 8px; }
.numbers .bar { min-width: 40px; }
.w-full { width: 100%; }
.mismatch { gap: 8px; margin-top: 8px; padding: 8px 10px; border-radius: 10px; font-size: 13px; color: var(--warn); background: color-mix(in srgb, var(--warn) 10%, transparent); border: 1px solid color-mix(in srgb, var(--warn) 35%, transparent); }
.mismatch .link { background: none; border: 0; padding: 0; font: inherit; font-weight: 700; color: var(--gold); cursor: pointer; text-decoration: underline; }
.weapon { display: flex; align-items: center; gap: 12px; margin-top: 14px; padding: 10px 12px; border-radius: 12px; background: var(--tint-1); border: 1px solid var(--line); }
.tactic { padding: 12px 0; border-top: 1px solid var(--line); }
.block { display: block; margin-top: 2px; }
.warn-text { color: var(--warn); }
.sets { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 12px; }
.set { display: flex; flex-direction: column; gap: 8px; padding: 12px; border-radius: 12px; background: var(--tint-1); border: 1px solid var(--line); }
.set.empty { border-style: dashed; }
.ab-chip { padding: 0 6px; border-radius: 999px; background: var(--tint-2); font-size: 11.5px; }
.blocker { margin-top: 12px; }
@media (max-width: 560px) {
  .weapon { flex-wrap: wrap; }
  .stances { grid-template-columns: 1fr; }
  .type-btn { padding: 8px 4px; }
}
</style>
