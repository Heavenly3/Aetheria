<script setup>
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import { useConfirm } from 'primevue/useconfirm'
import { G, state } from '../game/engine.js'
import { ITEMS, SLOTS, STAT_LABELS, POTION_DURATION } from '../game/data/items.js'
import { SET_OF } from '../game/data/sets.js'
import { SKILLS } from '../game/data/skills.js'
import { TOOL_TYPES } from '../game/data/character.js'
import { itemCategory, usesOf } from '../game/data/categories.js'
import { fmt, fmtClock } from '../game/format.js'
import SetBonuses from '../components/SetBonuses.vue'
import ItemCompare from '../components/ItemCompare.vue'
import InventoryGrid from '../components/InventoryGrid.vue'
import ItemTile from '../components/ItemTile.vue'
import GameIcon from '../components/GameIcon.vue'

const { t } = useI18n()
const router = useRouter()
const confirm = useConfirm()
const selected = ref(null)

const it = computed(() => (selected.value && ITEMS[selected.value]) || null)
const have = computed(() => (selected.value ? G.qty(selected.value) : 0))
watch(have, q => { if (selected.value && q <= 0) selected.value = null })
const totalValue = computed(() => Object.entries(state.inventory).reduce((s, [id, q]) => s + (ITEMS[id] ? G.sellPrice(id) * q : 0), 0))
const uses = computed(() => (selected.value ? usesOf(selected.value) : []))
const comparable = computed(() => it.value && ((it.value.type === 'equip' && !it.value.stackEquip) || it.value.type === 'tool'))
// Why the item cannot be equipped yet, if it cannot
const missingReq = computed(() => Object.entries(it.value?.req || {}).filter(([sk, l]) => G.level(sk) < l))

function open() {
  const got = G.openChest(selected.value)
  if (!got) return
  const parts = Object.entries(got).map(([k, v]) => (k === 'gold' ? t('inventory.goldAmount', { n: fmt(v) }) : `${v}× ${ITEMS[k].name}`))
  G.toast(it.value?.icon || 'open-treasure-chest', 'inventory.opened', { items: parts.join(', ') }, 'success')
}
// Equipping can push other gear off: a two-handed weapon removes the shield and the other way round
function equip() {
  const id = selected.value, item = ITEMS[id], eq = state.equipment
  const displaced = item.twoHanded && eq.shield ? eq.shield : item.slot === 'shield' && eq.weapon && ITEMS[eq.weapon].twoHanded ? eq.weapon : null
  const done = () => { if (G.equip(id)) G.toast(item.icon, 'inventory.equippedToast', { item: '@item:' + id }, 'success') }
  if (!displaced) return done()
  confirm.require({
    header: t('inventory.displaceTitle'),
    message: t('inventory.displaceMessage', { item: item.name, other: ITEMS[displaced].name }),
    icon: 'pi pi-exclamation-triangle', acceptLabel: t('common.equip'), rejectLabel: t('common.cancel'),
    rejectProps: { severity: 'secondary', outlined: true }, accept: done,
  })
}
const sellAtShop = () => router.push({ path: '/shop', query: { sell: selected.value } })
</script>

<template>
  <div class="inv-layout">
    <div class="panel pad">
      <InventoryGrid v-model="selected">
        <template #tools><span class="tag gold">{{ $t('inventory.totalValue', { gold: fmt(totalValue) }) }}</span></template>
      </InventoryGrid>
    </div>

    <div class="panel pad detail">
      <template v-if="it">
        <div class="row" style="margin-bottom:14px">
          <ItemTile :item="selected" size="xl" :tip="false" />
          <div class="grow">
            <div class="detail-name">{{ it.name }}</div>
            <div class="row wrap" style="gap:6px;margin-top:4px">
              <span class="tag">{{ $t('inventory.cats.' + itemCategory(selected)) }}</span>
              <span v-if="it.slot" class="tag">{{ SLOTS[it.slot].name }}</span>
              <span v-if="it.type === 'tool'" class="tag">{{ $t('hero.toolTier', { tool: TOOL_TYPES[it.toolType].name, n: it.tier }) }}</span>
              <span v-if="it.twoHanded" class="tag">{{ $t('inventory.twoHanded') }}</span>
              <span v-if="it.rare" class="tag gold">{{ $t('inventory.rare') }}</span>
            </div>
          </div>
        </div>
        <div class="kv"><span>{{ $t('inventory.quantity') }}</span><b>{{ fmt(have) }}</b></div>
        <div class="kv"><span>{{ $t('inventory.unitValue') }}</span><b class="gold-text">{{ $t('inventory.goldAmount', { n: fmt(G.sellPrice(selected)) }) }}</b></div>
        <div v-if="it.heal" class="kv"><span>{{ $t('inventory.heals') }}</span><b class="ok-text">{{ $t('inventory.hp', { n: G.foodHeal(selected) }) }}</b></div>
        <template v-if="it.buff">
          <div v-for="(v, sk) in it.buff" :key="sk" class="kv"><span>{{ SKILLS[sk].name }}</span><b class="ok-text">{{ $t('inventory.boost', { flat: v[0], pct: Math.round(v[1] * 100) }) }}</b></div>
          <div class="kv"><span>{{ $t('inventory.duration') }}</span><b>{{ fmtClock(POTION_DURATION) }}</b></div>
        </template>
        <div v-if="it.elixir" class="kv"><span>{{ $t('inventory.effect') }}</span><b class="ok-text">{{ $t('inventory.elixirEffect') }}</b></div>
        <template v-if="it.stats && !comparable">
          <div v-for="(v, k) in it.stats" :key="k" class="kv"><span>{{ STAT_LABELS[k] }}</span><b class="ok-text">+{{ k === 'mDmg' ? Math.round(v * 100) + '%' : v }}</b></div>
        </template>
        <div v-for="(l, sk) in it.req || {}" :key="sk" class="kv"><span>{{ $t('inventory.requires') }}</span><b :class="G.level(sk) >= l ? 'ok-text' : 'bad-text'">{{ SKILLS[sk].name }} {{ l }}</b></div>
        <p v-if="it.desc" class="small muted">{{ it.desc }}</p>

        <ItemCompare v-if="comparable" :id="selected" />
        <SetBonuses v-if="SET_OF[selected]" :set="SET_OF[selected]" pieces style="margin-top:10px" />

        <div v-if="uses.length" class="uses">
          <div class="uses-title">{{ $t('inventory.usedIn') }}</div>
          <router-link v-for="u in uses.slice(0, 8)" :key="u.skill + u.action.id" :to="'/skill/' + u.skill" class="use-row">
            <ItemTile :icon="u.action.icon" :tint="u.action.tint" size="xs" :tip="false" />
            <span class="grow">{{ u.action.name }}</span>
            <span class="small" :class="G.level(u.skill) >= u.action.lvl ? 'faint' : 'bad-text'" :style="{ color: G.level(u.skill) >= u.action.lvl ? SKILLS[u.skill].color : null }">{{ SKILLS[u.skill].name }} {{ u.action.lvl }}</span>
          </router-link>
          <div v-if="uses.length > 8" class="small faint">{{ $t('inventory.moreUses', { n: uses.length - 8 }) }}</div>
        </div>

        <div class="row wrap" style="margin-top:14px">
          <Button v-if="it.type === 'equip'" :label="it.stackEquip ? (state.equipment.ammo === selected ? $t('inventory.equipped') : $t('inventory.equipAmmo')) : $t('common.equip')" icon="pi pi-shield"
            :disabled="!G.canEquip(selected) || state.equipment.ammo === selected" @click="equip" />
          <Button v-if="it.type === 'tool'" :label="$t('inventory.equipTool')" icon="pi pi-wrench" :disabled="!G.canEquip(selected)" @click="equip" />
          <template v-if="it.type === 'food'">
            <Button :label="$t('inventory.eat')" icon="pi pi-heart" :disabled="state.hp >= G.maxHp()" @click="G.eat(selected)" />
            <Button :label="state.food === selected ? $t('inventory.combatFood') : $t('inventory.useInCombat')" :icon="state.food === selected ? 'pi pi-check' : 'pi pi-bolt'"
              severity="secondary" outlined @click="state.food = state.food === selected ? null : selected" />
          </template>
          <template v-if="it.type === 'potion'">
            <Button :label="$t('inventory.drink')" icon="pi pi-sparkles" @click="G.drink(selected)" />
            <Button v-if="!it.elixir" :label="state.potion === selected ? $t('inventory.combatPotion') : $t('inventory.useInCombat')" :icon="state.potion === selected ? 'pi pi-check' : 'pi pi-bolt'"
              severity="secondary" outlined @click="state.potion = state.potion === selected ? null : selected" />
          </template>
          <Button v-if="it.type === 'chest'" :label="$t('inventory.open')" icon="pi pi-box" @click="open" />
          <Button :label="G.isLocked(selected) ? $t('inventory.locked') : $t('inventory.lock')" :icon="G.isLocked(selected) ? 'pi pi-lock' : 'pi pi-lock-open'" severity="secondary" :outlined="!G.isLocked(selected)"
            v-tooltip.top="$t('inventory.lockTip')" @click="G.toggleLock(selected)" />
        </div>
        <p v-if="missingReq.length && (it.type === 'equip' || it.type === 'tool')" class="small bad-text" style="margin:8px 0 0">
          <i class="pi pi-lock" /> {{ $t('inventory.cannotEquip', { req: missingReq.map(([sk, l]) => `${SKILLS[sk].name} ${l}`).join(', ') }) }}
        </p>
        <Button :label="$t('inventory.sellAtShop')" icon="pi pi-shop" severity="secondary" text fluid style="margin-top:12px" :disabled="G.isLocked(selected)" @click="sellAtShop" />
      </template>
      <div v-else class="empty-state" style="padding:30px 10px">
        <GameIcon name="crystal-ball" :size="46" />
        <div>{{ $t('inventory.select') }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.inv-layout { display: grid; grid-template-columns: 1fr 360px; gap: 18px; align-items: start; }
.detail { position: sticky; top: 90px; max-height: calc(100vh - 110px); overflow-y: auto; }
.detail-name { font-family: var(--font-display); font-size: 20px; line-height: 1.15; }
.uses { margin-top: 12px; }
.uses-title { font-size: 12px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); margin-bottom: 6px; }
.use-row { display: flex; align-items: center; gap: 8px; padding: 4px 6px; border-radius: 8px; color: var(--ink-2); text-decoration: none; font-size: 13.5px; }
.use-row:hover { background: var(--tint-2); }
@media (max-width: 1100px) { .inv-layout { grid-template-columns: 1fr; } .detail { position: static; max-height: none; } }
</style>
