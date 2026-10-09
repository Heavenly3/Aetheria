<script setup>
import { computed } from 'vue'
import Button from 'primevue/button'
import { G, state } from '../game/engine.js'
import { MONSTERS, AREAS, SLAYER_SHOP, monsterLevel } from '../game/data/combat.js'
import { TASK_KINDS, SLAYER_PERKS, REROLL_COST, BLOCK_COST, BLOCK_MAX, STREAK_CHEST_EVERY } from '../game/data/slayer.js'
import { fmt, pct } from '../game/format.js'
import { play } from '../game/sound.js'
import SkillBanner from '../components/SkillBanner.vue'
import ItemTile from '../components/ItemTile.vue'
import GameIcon from '../components/GameIcon.vue'
import HelpTip from '../components/HelpTip.vue'

const sl = computed(() => G.ensureSlayer())
const task = computed(() => state.slayer.task)
const m = computed(() => (task.value ? MONSTERS[task.value.monster] : null))
const areaOf = mon => AREAS.find(a => a.id === mon.area)
const fighting = computed(() => state.activity?.type === 'combat' && state.activity.target === m.value?.id)
const offers = computed(() => (task.value ? [] : G.slayerOffers()))
const reward = o => G.slayerReward({ monster: o.monster, kind: o.kind, total: o.total })
const toNextChest = computed(() => STREAK_CHEST_EVERY - (state.slayer.streak % STREAK_CHEST_EVERY))

function take(i) { if (G.takeOffer(i)) play('quest') }
function buy(it) { if (G.buySlayer(it.id)) G.toast(it.icon, 'common.bought', { name: it.name }, 'success') }
function perk(p) { if (G.buyPerk(p.id)) { play('level'); G.toast(p.icon, 'slayer.perkBought', { name: '@slayerPerk:' + p.id }, 'success') } }
function block(id) { if (G.blockMonster(id)) G.toast('cross-mark', 'slayer.blockedToast', { monster: '@monster:' + id }, 'warn') }
</script>

<template>
  <div>
    <SkillBanner skill="slayer" />
    <div class="two-col" style="margin-top:20px">
      <div class="panel pad">
        <h3 class="panel-title"><GameIcon name="death-skull" /> {{ $t('slayer.current') }} <HelpTip k="sections.slayerTask" /></h3>
        <template v-if="task && m">
          <div class="row">
            <ItemTile :icon="m.icon" tint="#7a2a52" size="xl" :tip="false" />
            <div class="grow">
              <div class="row" style="gap:8px">
                <div class="card-name" style="font-size:20px">{{ m.name }}</div>
                <span class="tag" :class="'kind-' + (task.kind || 'standard')"><GameIcon :name="TASK_KINDS[task.kind || 'standard'].icon" :size="11" /> {{ $t(`slayer.kinds.${task.kind || 'standard'}`) }}</span>
              </div>
              <div class="small muted">{{ areaOf(m).name }} · {{ $t('common.levelN', { n: monsterLevel(m) }) }}</div>
              <div class="bar thick" style="margin-top:12px;--c:#b5179e"><i :style="{ width: (1 - task.left / task.total) * 100 + '%' }" /></div>
              <div class="small muted tnum" style="margin-top:6px">{{ $t('slayer.left', { n: task.left, total: task.total }) }}</div>
            </div>
          </div>
          <div class="row wrap small reward">
            <span class="tag gold">+{{ reward(task).pts }} {{ $t('slayer.ptsShort') }}</span>
            <span class="tag"><GameIcon name="two-coins" :size="11" /> {{ fmt(reward(task).gold) }}</span>
            <span class="tag">+{{ fmt(reward(task).xp) }} XP</span>
            <span class="tag arcane" v-tooltip.top="$t('slayer.superiorTip')"><GameIcon name="crowned-skull" :size="11" /> {{ $t('slayer.superiorChance', { pct: pct(G.superiorChance(), 0) }) }}</span>
          </div>
          <div class="row wrap" style="margin-top:16px">
            <Button :label="fighting ? $t('combat.retreat') : $t('slayer.hunt')" :icon="fighting ? 'pi pi-flag' : 'pi pi-bolt'" :severity="fighting ? 'danger' : undefined"
              @click="G.startCombat('area', m.id)" />
            <Button :label="$t('slayer.block', { n: BLOCK_COST })" icon="pi pi-ban" severity="secondary" outlined
              :disabled="state.slayer.points < BLOCK_COST || sl.blocked.length >= BLOCK_MAX" v-tooltip.top="$t('slayer.blockTip')" @click="block(m.id)" />
          </div>
          <p class="small muted" style="margin-bottom:0">{{ $t('slayer.explain') }}</p>
        </template>

        <!-- No task: choose one of three -->
        <template v-else>
          <p class="muted" style="margin-top:0">{{ $t('slayer.pick') }}</p>
          <div class="offers">
            <button v-for="(o, i) in offers" :key="o.kind" class="offer" :class="'kind-' + o.kind" @click="take(i)">
              <span class="tag" :class="'kind-' + o.kind"><GameIcon :name="TASK_KINDS[o.kind].icon" :size="11" /> {{ $t(`slayer.kinds.${o.kind}`) }}</span>
              <ItemTile :icon="MONSTERS[o.monster].icon" tint="#7a2a52" size="md" :tip="false" />
              <b>{{ o.total }}× {{ MONSTERS[o.monster].name }}</b>
              <span class="small muted">{{ areaOf(MONSTERS[o.monster]).name }} · {{ $t('common.lvlShort', { n: monsterLevel(MONSTERS[o.monster]) }) }}</span>
              <span class="small gold-text">+{{ reward(o).pts }} {{ $t('slayer.ptsShort') }} · {{ fmt(reward(o).gold) }} {{ $t('common.gold') }}</span>
            </button>
          </div>
          <p v-if="!offers.length" class="small bad-text">{{ $t('slayer.noTargets') }}</p>
          <Button :label="$t('slayer.reroll', { n: REROLL_COST })" icon="pi pi-refresh" size="small" severity="secondary" outlined style="margin-top:12px"
            :disabled="state.slayer.points < REROLL_COST" @click="G.rerollOffers()" />
        </template>
      </div>

      <div class="panel pad">
        <h3 class="panel-title"><GameIcon name="medal" /> {{ $t('slayer.record') }} <HelpTip k="sections.slayerRecord" /></h3>
        <div class="kv"><span>{{ $t('slayer.points') }}</span><b class="gold-text">{{ fmt(state.slayer.points) }}</b></div>
        <div class="kv"><span>{{ $t('slayer.completed') }}</span><b>{{ state.slayer.completed }}</b></div>
        <div class="kv"><span>{{ $t('slayer.streak') }}</span><b>{{ state.slayer.streak }}</b></div>
        <div class="kv"><span>{{ $t('slayer.nextBonus') }}</span><b>{{ $t('slayer.inTasks', { n: 10 - (state.slayer.streak % 10) }) }}</b></div>
        <div class="kv"><span>{{ $t('slayer.nextChest') }}</span><b>{{ $t('slayer.inTasks', { n: toNextChest }) }}</b></div>
        <div class="kv"><span>{{ $t('slayer.superiors') }}</span><b>{{ state.stats.superiors || 0 }}</b></div>
        <template v-if="sl.blocked.length">
          <div class="small muted" style="margin-top:12px">{{ $t('slayer.blocked', { n: sl.blocked.length, max: BLOCK_MAX }) }}</div>
          <div class="row wrap" style="gap:6px;margin-top:6px">
            <button v-for="id in sl.blocked" :key="id" class="tag blocked" v-tooltip.top="$t('slayer.unblock')" @click="G.unblockMonster(id)">
              {{ MONSTERS[id]?.name }} <i class="pi pi-times" style="font-size:9px" />
            </button>
          </div>
        </template>
      </div>
    </div>

    <div class="section-title">{{ $t('slayer.perks') }} <HelpTip k="sections.slayerPerks" /></div>
    <div class="grid-wide">
      <div v-for="p in SLAYER_PERKS" :key="p.id" class="card" :class="{ done: G.slayerPerk(p.id) }">
        <div class="row">
          <ItemTile :icon="p.icon" tint="#b5179e" size="md" :tip="false" />
          <div class="grow"><div class="card-name">{{ $t(`slayer.perkList.${p.id}.name`) }}</div><div class="card-sub">{{ $t(`slayer.perkList.${p.id}.desc`) }}</div></div>
        </div>
        <Button v-if="G.slayerPerk(p.id)" :label="$t('slayer.owned')" icon="pi pi-check" fluid disabled style="margin-top:14px" />
        <Button v-else :label="$t('slayer.cost', { n: p.cost })" icon="pi pi-lock-open" fluid style="margin-top:14px" :disabled="state.slayer.points < p.cost" @click="perk(p)" />
      </div>
    </div>

    <div class="section-title">{{ $t('slayer.shop') }} <HelpTip k="sections.slayerShop" /></div>
    <div class="grid-wide">
      <div v-for="it in SLAYER_SHOP" :key="it.id" class="card">
        <div class="row">
          <ItemTile :icon="it.icon" :item="it.item || null" tint="#b5179e" size="md" :tip="false" />
          <div class="grow"><div class="card-name">{{ it.name }}</div><div class="card-sub">{{ it.desc }}</div></div>
        </div>
        <Button :label="$t('slayer.cost', { n: it.cost })" icon="pi pi-shopping-cart" fluid style="margin-top:14px" :disabled="state.slayer.points < it.cost || (it.id === 'skip' && !task)" @click="buy(it)" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.reward { gap: 6px; margin-top: 14px; }
.offers { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.offer { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 12px 10px; border-radius: var(--radius); text-align: center;
  background: var(--tint-1); border: 1px solid var(--line); color: inherit; font: inherit; cursor: pointer; }
.offer:hover { border-color: var(--line-hi); background: var(--tint-2); }
.offer.kind-hard { border-color: rgba(224, 85, 75, 0.35); }
.tag.kind-easy { color: var(--tag-ok); }
.tag.kind-standard { color: var(--gold-hi); }
.tag.kind-hard { color: var(--tag-bad); }
.tag.blocked { cursor: pointer; font: inherit; font-size: 12px; }
@media (max-width: 640px) { .offers { grid-template-columns: 1fr; } }
</style>
