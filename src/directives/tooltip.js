import Tooltip from 'primevue/tooltip'

/*
  PrimeVue's tooltip rebuilds itself on every update of the element it sits on, and that removes a
  tooltip that is on screen. The game re-renders many screens ten times a second, so tooltips would
  flash for a single frame. This wrapper skips updates that do not change the tooltip, and refreshes
  the content of a visible tooltip in place when only its content changes.
  Rich tooltips (src/ui/tips.js) pass escaped HTML with `escape: false`.
*/
const textOf = v => (typeof v === 'string' ? v : v && typeof v === 'object' ? v.value : '') || ''
const sameValue = (a, b) => {
  if (a && b && typeof a === 'object' && typeof b === 'object')
    return a.value === b.value && !!a.disabled === !!b.disabled && a.escape === b.escape && a.class === b.class
  return a === b
}
const target = el => (el.classList?.contains('p-inputwrapper') && el.querySelector('input')) || el

export default {
  ...Tooltip,
  updated(el, binding, vnode, prevVnode) {
    if (sameValue(binding.value, binding.oldValue)) return
    const t = target(el)
    const shown = t.$_ptooltipId && document.getElementById(t.$_ptooltipId)
    const text = textOf(binding.value)
    const old = binding.oldValue
    const sameShape = typeof old === typeof binding.value && (typeof old !== 'object' || (old?.escape === binding.value?.escape && old?.class === binding.value?.class))
    if (shown && sameShape && text.trim() && !binding.value?.disabled) {
      t.$_ptooltipValue = text
      const node = shown.querySelector('[data-pc-section="text"]')
      if (node) {
        if (binding.value?.escape === false) node.innerHTML = text
        else node.textContent = text
      }
      return
    }
    return Tooltip.updated(el, binding, vnode, prevVnode)
  },
}
