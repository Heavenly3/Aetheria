<script setup>
import { ref } from 'vue'
import Popover from 'primevue/popover'
import InputNumber from 'primevue/inputnumber'
import Button from 'primevue/button'
import { G, state } from '../game/engine.js'

// Adds an action to the queue with a repeat count
const props = defineProps({ skill: String, action: Object })
const pop = ref()
const qty = ref(50)
function add() {
  G.enqueue(props.skill, props.action.id, qty.value || 1)
  G.toast('hourglass', 'queue.added', { n: qty.value, action: `@action:${props.skill}/${props.action.id}` }, 'success')
  pop.value.hide()
}
</script>

<template>
  <span class="qb" @click.stop>
    <Button icon="pi pi-list" size="small" text rounded :aria-label="$t('queue.addAria', { name: action.name })" v-tooltip.top="$t('queue.add')" @click="pop.toggle($event)" />
    <Popover ref="pop">
      <div class="qb-pop">
        <b class="small">{{ action.name }}</b>
        <div class="small muted">{{ $t('queue.howMany') }}</div>
        <div class="row">
          <InputNumber v-model="qty" :min="1" :max="100000" size="small" class="grow" :inputId="'qb-' + skill + '-' + action.id" />
          <Button :label="$t('common.add')" icon="pi pi-plus" size="small" @click="add" />
        </div>
        <div class="row wrap" style="gap:4px">
          <Button v-for="n in [10, 50, 100, 500]" :key="n" :label="String(n)" size="small" severity="secondary" text @click="qty = n" />
        </div>
        <div class="small faint">{{ $t('queue.count', { n: state.queue.length }) }}</div>
      </div>
    </Popover>
  </span>
</template>

<style scoped>
.qb { display: inline-flex; }
.qb-pop { display: flex; flex-direction: column; gap: 8px; width: 260px; }
</style>
