<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import { G, state } from '../game/engine.js'
import { PETS, PET_MAP, petOdds } from '../game/data/pets.js'
import { SKILLS } from '../game/data/skills.js'
import { ITEMS } from '../game/data/items.js'
import { MONSTERS, BOSSES } from '../game/data/combat.js'
import {
  MAX_LEVEL, xpToNext, FULL_MAX, BOND_MAX, BOND_TIERS, BASKET_MAX, NICK_MAX, HATCH_MS, PAT_COOLDOWN,
  GIFTS_AT, LOYAL_AT, DEVOTED_AT, bondTier, companionBoost, dietOf, feedValue, giftEveryMs,
} from '../game/data/companions.js'
import { fmt, fmtDate, fmtTime } from '../game/format.js'
import { modText } from '../i18n/mods.js'
import { FESTIVAL_MAP } from '../game/data/festivals.js'
import { OMEN_MAP } from '../game/data/omens.js'
import { play } from '../game/sound.js'
import ItemTile from '../components/ItemTile.vue'
import GameIcon from '../components/GameIcon.vue'

const { t } = useI18n()

// Hunger, hatching and cooldowns follow the clock
const now = ref(Date.now())
let clock
onMounted(() => (clock = setInterval(() => (now.value = Date.now()), 1000)))
onUnmounted(() => clearInterval(clock))

const owned = computed(() => G.petCount())
const eggs = computed(() => state.companions.eggs)
const basket = computed(() => state.companions.basket)

// The pet shown in the big panel: the companion unless another owned pet was picked
const picked = ref(null)
const viewId = computed(() => (picked.value && G.hasPet(picked.value) ? picked.value : state.companions.active))
const view = computed(() => (viewId.value ? PET_MAP[viewId.value] : null))
const care = computed(() => (viewId.value ? G.careOf(viewId.value) : null))
const isComp = computed(() => viewId.value && G.isCompanion(viewId.value))
function pick(id) { if (G.hasPet(id)) { picked.value = id; feeding.value = false; renaming.value = false } }

const full = computed(() => (void now.value, viewId.value ? G.fullness(viewId.value, now.value) : 0))
const mood = computed(() => (void now.value, isComp.value ? G.hungerState(viewId.value) : 'resting'))
const xpPct = computed(() => (care.value.lvl >= MAX_LEVEL ? 100 : (care.value.xp / xpToNext(care.value.lvl)) * 100))
const tier = computed(() => bondTier(care.value.bond))
const nextTier = computed(() => BOND_TIERS.find(b => b.at > care.value.bond))
const hearts = b => Array.from({ length: 5 }, (_, i) => (b >= (i + 1) * 20 ? 'full' : b >= i * 20 + 10 ? 'half' : 'empty'))
const power = id => (void now.value, G.petPower(id, now.value))
const effects = (p, mult = 1) => Object.entries(p.mods).map(([k, v]) => modText(k, v * mult)).join(' · ')
const patLeft = computed(() => Math.max(0, PAT_COOLDOWN - (now.value - care.value.patAt)) / 1000)

/* ---------- feeding ---------- */
const feeding = ref(false)
const foods = computed(() => (void state.inventory, viewId.value ? G.foodsFor(viewId.value).slice(0, 12) : []))
function feed(item) {
  const v = G.feedPet(viewId.value, item)
  if (!v) return
  play(v.fav ? 'quest' : 'coin')
  G.toast(view.value.icon, v.fav ? 'pets.fedFav' : 'pets.fed', { name: G.petName(viewId.value), item: '@item:' + item }, 'success')
}
function pat() {
  if (!G.patPet(viewId.value)) return
  play('coin')
  G.toast(view.value.icon, 'pets.patted', { name: G.petName(viewId.value) }, 'success')
  bounce.value = true
  setTimeout(() => (bounce.value = false), 700)
}
const bounce = ref(false)

/* ---------- naming ---------- */
const renaming = ref(false)
const nick = ref('')
const nickInput = ref()
function startRename() {
  nick.value = care.value.nick || ''
  renaming.value = true
  nextTick(() => nickInput.value?.$el?.focus())
}
function saveRename() { if (renaming.value) { G.renamePet(viewId.value, nick.value); renaming.value = false } }
watch(viewId, () => (renaming.value = false))

/* ---------- gifts and eggs ---------- */
function collect() {
  const got = G.collectGifts()
  if (!got.length) return
  play('coin')
  const sum = {}
  got.forEach(g => (sum[g.item] = (sum[g.item] || 0) + g.n))
  G.toast('open-treasure-chest', 'pets.giftsCollected', { list: Object.entries(sum).map(([k, n]) => `${fmt(n)}× ${ITEMS[k].name}`).join(', ') }, 'success')
}
const eggLeft = e => Math.max(0, HATCH_MS - (now.value - e.at)) / 1000
const eggPct = e => Math.min(100, ((now.value - e.at) / HATCH_MS) * 100)
function hatch(i) {
  const p = G.hatchEgg(i)
  if (p) picked.value = p.id
}
const nextGift = computed(() => (void now.value, Math.max(0, state.companions.giftAt - now.value) / 1000))

/* ---------- collection ---------- */
function sourceText(src) {
  if (src.skill === 'farming') return t('pets.source.harvest')
  if (src.skill) return t('pets.source.skill', { skill: SKILLS[src.skill].name })
  if (src.monster) return t('pets.source.monster', { monster: (MONSTERS[src.monster] || BOSSES.find(b => b.id === src.monster))?.name })
  if (src.slayer) return t('pets.source.slayer')
  if (src.festival) return t('pets.source.festival', { name: FESTIVAL_MAP[src.festival].name })
  // Omen pets name their omen only once it has been witnessed
  if (src.omen) return state.omens.seen[src.omen] ? t('pets.source.omen', { name: OMEN_MAP[src.omen].name }) : t('pets.source.omenUnknown')
  return t('pets.source.dice')
}
// Which kind of roll the odds refer to
const oddsKey = src => 'pets.odds.' + (src.skill === 'farming' ? 'harvests' : src.skill ? 'actions' : src.monster ? 'kills' : src.slayer ? 'tasks' : 'games')
// Owned pets first, the companion at the top
const sorted = computed(() => [...PETS].sort((a, b) => (G.isCompanion(b.id) - G.isCompanion(a.id)) || (G.hasPet(b.id) - G.hasPet(a.id))))
</script>

<template>
  <div>
    <!-- The companion (or the pet picked from the collection) -->
    <div v-if="view" class="panel pad comp" :style="{ '--c': view.tint }">
      <div class="comp-main">
        <div class="comp-portrait" :class="[mood, { bounce }]">
          <ItemTile :icon="view.icon" :tint="view.tint" size="xl" :tip="false" />
          <span v-if="isComp" class="tag comp-badge"><GameIcon name="paw-print" :size="12" /> {{ $t('pets.companion') }}</span>
        </div>
        <div class="grow" style="min-width:0">
          <div class="row wrap" style="gap:8px">
            <template v-if="!renaming">
              <h2 class="comp-name">{{ G.petName(viewId) }}</h2>
              <Button icon="pi pi-pencil" text rounded size="small" severity="secondary" :aria-label="$t('pets.rename')" v-tooltip.top="$t('pets.rename')" @click="startRename" />
            </template>
            <InputText v-else ref="nickInput" v-model="nick" :maxlength="NICK_MAX" :placeholder="view.name" size="small" @keyup.enter="saveRename" @keyup.esc="renaming = false" @blur="saveRename" />
          </div>
          <div class="small muted">
            <span v-if="care.nick">{{ view.name }} · </span>{{ $t('pets.diet', { cat: $t('inventory.cats.' + dietOf(viewId)) }) }}
          </div>

          <div class="meters">
            <div>
              <div class="meter-head"><span>{{ $t('pets.level', { n: care.lvl }) }}</span><span class="tnum faint">{{ care.lvl >= MAX_LEVEL ? $t('pets.maxLevel') : `${fmt(Math.floor(care.xp))} / ${fmt(xpToNext(care.lvl))}` }}</span></div>
              <div class="bar"><i :style="{ width: xpPct + '%' }" /></div>
            </div>
            <div>
              <div class="meter-head"><span>{{ $t('pets.fullness') }}</span><span :class="mood === 'starving' || mood === 'hungry' ? 'warn-text' : 'faint'">{{ $t('pets.mood.' + mood) }}</span></div>
              <div class="bar" :class="{ low: full < 25 }"><i class="full-bar" :style="{ width: (full / FULL_MAX) * 100 + '%' }" /></div>
            </div>
            <div>
              <div class="meter-head">
                <span>{{ $t('pets.bondLabel') }} · <b>{{ $t('pets.bond.' + tier.id) }}</b></span>
                <span class="hearts" :aria-label="`${care.bond} / ${BOND_MAX}`">
                  <i v-for="(h, i) in hearts(care.bond)" :key="i" :class="h === 'empty' ? 'pi pi-heart' : 'pi pi-heart-fill'" :style="h === 'half' ? 'opacity:.5' : ''" />
                </span>
              </div>
              <div class="small faint">{{ nextTier ? $t('pets.nextBond', { tier: $t('pets.bond.' + nextTier.id), n: nextTier.at - care.bond, perk: $t('pets.perk.' + nextTier.id) }) : $t('pets.maxBond') }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="comp-bonus">
        <span class="tag ok">{{ effects(view, power(viewId)) }}</span>
        <span class="small muted">{{ isComp ? (full > 0 ? $t('pets.boostOn', { x: companionBoost(care.bond) }) : $t('pets.boostOff')) : $t('pets.resting') }}</span>
      </div>

      <div class="row wrap comp-actions">
        <Button :label="$t('pets.feed')" icon="pi pi-gift" :severity="feeding ? 'secondary' : undefined" :disabled="!G.canFeed(viewId)" @click="feeding = !feeding" />
        <Button :label="patLeft > 0 ? $t('pets.patIn', { t: fmtTime(patLeft) }) : $t('pets.pat')" icon="pi pi-heart" outlined :disabled="patLeft > 0" @click="pat" />
        <Button v-if="!isComp" :label="$t('pets.makeCompanion')" icon="pi pi-star" outlined @click="G.setCompanion(viewId)" />
        <Button v-else :label="$t('pets.rest')" icon="pi pi-moon" severity="secondary" text @click="G.setCompanion(null)" />
        <span class="grow" />
        <span v-if="!G.canFeed(viewId)" class="small faint">{{ $t('pets.notHungry') }}</span>
      </div>

      <div v-if="feeding" class="feed-list">
        <p v-if="!foods.length" class="small muted" style="margin:0">{{ $t('pets.noFood', { cat: $t('inventory.cats.' + dietOf(viewId)) }) }}</p>
        <button v-for="id in foods" :key="id" class="feed-item" :disabled="!G.canFeed(viewId)" @click="feed(id)">
          <ItemTile :item="id" size="sm" :qty="G.qty(id)" :tip="false" />
          <span class="grow" style="min-width:0">
            <span class="feed-name">{{ ITEMS[id].name }} <i v-if="feedValue(viewId, id).fav" class="pi pi-star-fill gold-text" v-tooltip.top="$t('pets.favourite')" /></span>
            <span class="small faint">+{{ feedValue(viewId, id).full }} {{ $t('pets.fullShort') }} · +{{ feedValue(viewId, id).xp }} XP · <i class="pi pi-heart-fill" style="font-size:10px" /> +{{ feedValue(viewId, id).bond }}</span>
          </span>
        </button>
      </div>

      <!-- Gift basket -->
      <div v-if="isComp" class="basket">
        <GameIcon name="open-treasure-chest" :size="22" class="gold-text" />
        <div class="grow" style="min-width:0">
          <div class="small"><b>{{ $t('pets.basket', { n: basket.length, max: BASKET_MAX }) }}</b></div>
          <div class="small faint">
            <template v-if="care.bond < GIFTS_AT">{{ $t('pets.giftsLocked', { tier: $t('pets.bond.friendly') }) }}</template>
            <template v-else-if="basket.length >= BASKET_MAX">{{ $t('pets.basketFull') }}</template>
            <template v-else-if="full <= 0">{{ $t('pets.giftsHungry') }}</template>
            <template v-else>{{ $t('pets.nextGift', { t: fmtTime(nextGift), every: Math.round(giftEveryMs(care.bond) / 60e3) }) }}</template>
          </div>
        </div>
        <span class="basket-items">
          <ItemTile v-for="(g, i) in basket" :key="i" :item="g.item" :qty="g.n" size="sm" />
        </span>
        <Button :label="$t('pets.collect')" icon="pi pi-download" size="small" :disabled="!basket.length" @click="collect" />
      </div>
    </div>

    <div v-else class="panel pad empty-state" style="margin-bottom:20px">
      <GameIcon name="paw-print" :size="46" />
      <div>{{ owned ? $t('pets.pickCompanion') : $t('pets.noneYet') }}</div>
    </div>

    <!-- Incubator -->
    <div v-if="eggs.length" class="panel pad" style="margin-bottom:20px">
      <h3 class="panel-title"><GameIcon name="cosmic-egg" :size="18" /> {{ $t('pets.incubator') }}</h3>
      <div class="eggs">
        <div v-for="(e, i) in eggs" :key="e.pet + e.at" class="egg" :class="{ ready: eggPct(e) >= 100 }" :style="{ '--c': PET_MAP[e.pet]?.tint }">
          <ItemTile icon="cosmic-egg" :tint="PET_MAP[e.pet]?.tint" size="lg" :tip="false" />
          <div class="grow">
            <div class="card-name">{{ $t('pets.eggName') }}</div>
            <div class="small faint">{{ eggPct(e) >= 100 ? $t('pets.eggReady') : $t('pets.eggHatchIn', { t: fmtTime(eggLeft(e)) }) }}</div>
            <div class="bar" style="margin-top:6px"><i :style="{ width: eggPct(e) + '%' }" /></div>
          </div>
          <Button :label="$t('pets.hatch')" icon="pi pi-sparkles" size="small" :disabled="eggPct(e) < 100" @click="hatch(i)" />
        </div>
      </div>
    </div>

    <!-- Collection -->
    <div class="panel pad" style="margin-bottom:20px">
      <div class="row wrap">
        <p class="intro grow" style="margin:0">{{ $t('pets.intro') }}</p>
        <span class="tag gold tnum"><GameIcon name="paw-print" :size="13" /> {{ owned }} / {{ PETS.length }}</span>
      </div>
      <div class="bar thick" style="margin-top:14px"><i :style="{ width: (owned / PETS.length) * 100 + '%' }" /></div>
    </div>

    <div class="grid-cards">
      <component :is="G.hasPet(p.id) ? 'button' : 'div'" v-for="p in sorted" :key="p.id" class="card pet" :class="{ got: G.hasPet(p.id), viewing: viewId === p.id }" :style="{ '--c': p.tint }" @click="pick(p.id)">
        <div class="row">
          <div class="pet-tile" :class="{ hidden: !G.hasPet(p.id) }">
            <ItemTile :icon="p.icon" :tint="G.hasPet(p.id) ? p.tint : '#2a2838'" size="lg" :tip="false" />
          </div>
          <div class="grow" style="min-width:0">
            <div class="card-name">{{ G.hasPet(p.id) ? G.petName(p.id) : '???' }}</div>
            <div class="card-sub">
              <template v-if="G.hasPet(p.id)">{{ $t('pets.level', { n: G.careOf(p.id).lvl }) }} · <span class="hearts small-hearts"><i v-for="(h, i) in hearts(G.careOf(p.id).bond)" :key="i" :class="h === 'empty' ? 'pi pi-heart' : 'pi pi-heart-fill'" /></span></template>
              <template v-else>{{ sourceText(p.source) }}</template>
            </div>
          </div>
          <span v-if="G.isCompanion(p.id)" class="tag gold"><GameIcon name="paw-print" :size="12" /></span>
        </div>
        <p class="small" :class="G.hasPet(p.id) ? 'muted' : 'faint'" style="margin:10px 0 8px">{{ G.hasPet(p.id) ? p.desc : G.hasEgg(p.id) ? $t('pets.inEgg') : $t('pets.unknown') }}</p>
        <div class="row wrap" style="gap:6px">
          <span class="tag" :class="G.hasPet(p.id) ? 'ok' : ''">{{ effects(p, G.hasPet(p.id) ? power(p.id) : 1) }}</span>
          <span class="grow" />
          <span v-if="G.hasPet(p.id)" class="small faint">{{ fmtDate(state.pets[p.id]) }}</span>
          <span v-else-if="p.source.festival" class="small faint">{{ $t('pets.festivalOnly') }}</span>
          <span v-else-if="p.source.omen" class="small faint">{{ $t('pets.omenOnly') }}</span>
          <span v-else class="small faint" v-tooltip.top="$t('pets.oddsTip')">{{ $t(oddsKey(p.source), { n: fmt(petOdds(p)) }) }}</span>
        </div>
      </component>
    </div>
  </div>
</template>

<style scoped>
.comp { margin-bottom: 20px; border-color: color-mix(in srgb, var(--c) 40%, var(--line)); box-shadow: 0 0 40px -24px var(--c); }
.comp-main { display: flex; gap: 20px; align-items: flex-start; }
.comp-portrait { position: relative; display: grid; justify-items: center; gap: 6px; padding-top: 4px; }
.comp-portrait :deep(.tile) { box-shadow: 0 0 30px -10px var(--c); }
.comp-portrait.full :deep(.tile), .comp-portrait.content :deep(.tile) { animation: idle 3.2s ease-in-out infinite; }
.comp-portrait.starving :deep(.tile) { filter: saturate(0.4) brightness(0.8); }
.comp-portrait.resting :deep(.tile) { opacity: 0.85; }
.comp-portrait.bounce :deep(.tile) { animation: hop 0.7s ease-out; }
.comp-badge { font-size: 11px; }
.comp-name { font-family: var(--font-display); font-size: 24px; line-height: 1.1; margin: 0; }
.meters { display: grid; gap: 12px; margin-top: 14px; max-width: 520px; }
.meter-head { display: flex; justify-content: space-between; gap: 10px; font-size: 13px; margin-bottom: 4px; }
.bar.low .full-bar { background: var(--warn); }
.full-bar { background: var(--ok); }
.warn-text { color: var(--warn); }
.hearts { color: #e0607a; display: inline-flex; gap: 3px; font-size: 13px; }
.small-hearts { font-size: 10px; gap: 2px; vertical-align: middle; }
.comp-bonus { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-top: 16px; }
.comp-actions { gap: 8px; margin-top: 14px; }
.feed-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 8px; margin-top: 12px; padding: 12px; border-radius: 12px; background: var(--tint-1); border: 1px solid var(--line); }
.feed-item { display: flex; align-items: center; gap: 10px; padding: 6px 8px; border-radius: 10px; border: 1px solid var(--line); background: var(--panel); color: inherit; font: inherit; text-align: start; cursor: pointer; }
.feed-item:hover:not(:disabled) { border-color: var(--line-hi); }
.feed-item:disabled { opacity: 0.5; cursor: default; }
.feed-item > .grow { display: grid; }
.feed-name { font-size: 13.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.basket { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; margin-top: 16px; padding: 12px; border-radius: 12px; border: 1px dashed var(--line-hi); }
.basket-items { display: flex; flex-wrap: wrap; gap: 4px; }
.eggs { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
.egg { display: flex; align-items: center; gap: 12px; padding: 10px; border-radius: 12px; border: 1px solid var(--line); }
.egg :deep(.tile) { animation: wobble 2.8s ease-in-out infinite; }
.egg.ready { border-color: color-mix(in srgb, var(--c) 60%, transparent); box-shadow: 0 0 24px -10px var(--c); }
.egg.ready :deep(.tile) { animation-duration: 0.9s; }
.pet { display: flex; flex-direction: column; color: inherit; font: inherit; text-align: start; }
button.pet { cursor: pointer; }
.pet.got { border-color: color-mix(in srgb, var(--c) 45%, transparent); box-shadow: 0 0 24px -12px var(--c); }
.pet.viewing { outline: 2px solid color-mix(in srgb, var(--c) 70%, transparent); outline-offset: 2px; }
.pet:not(.got) { opacity: 0.75; }
.pet-tile.hidden :deep(svg) { filter: brightness(0.25); }
@keyframes idle { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
@keyframes hop { 0% { transform: scale(1); } 30% { transform: scale(1.12) translateY(-8px); } 60% { transform: scale(0.96); } 100% { transform: scale(1); } }
@keyframes wobble { 0%, 100% { transform: rotate(0); } 20% { transform: rotate(-6deg); } 40% { transform: rotate(5deg); } 60% { transform: rotate(-2deg); } }
@media (prefers-reduced-motion: reduce) { .comp-portrait :deep(.tile), .egg :deep(.tile) { animation: none !important; } }
@media (max-width: 640px) {
  .comp-main { flex-direction: column; align-items: center; text-align: center; }
  .comp-main .row { justify-content: center; }
  .meters { text-align: start; width: 100%; }
}
</style>
