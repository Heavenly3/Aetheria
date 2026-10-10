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

// PrimeVue flips a tooltip that does not fit above its element, but it measures before the content
// settles, so tall tooltips near the top of the screen could end up cut off. After a tooltip shows (or
// its content changes) this puts it below, above or inside the window, wherever it fits
const GAP = 8
function keepInView(host) {
  const tip = host?.$_ptooltipId && document.getElementById(host.$_ptooltipId)
  if (!tip) return
  const r = tip.getBoundingClientRect(), h = host.getBoundingClientRect(), vh = window.innerHeight
  if (r.top >= 0 && r.bottom <= vh) return
  let top
  if (r.height <= vh - h.bottom - GAP) { top = h.bottom + GAP; tip.classList.replace('p-tooltip-top', 'p-tooltip-bottom') }
  else if (r.height <= h.top - GAP) { top = h.top - GAP - r.height; tip.classList.replace('p-tooltip-bottom', 'p-tooltip-top') }
  else top = Math.max(4, Math.min(vh - r.height - 4, h.bottom + GAP))
  tip.style.top = top + window.scrollY + 'px'
}
const hostOf = node => { while (node && !node.$_ptooltipId) node = node.parentElement; return node }
function check(e) {
  const host = hostOf(e.target)
  if (!host) return
  requestAnimationFrame(() => requestAnimationFrame(() => keepInView(host)))
  setTimeout(() => keepInView(host), 150)
}
if (typeof document !== 'undefined') {
  document.addEventListener('mouseover', check, true)
  document.addEventListener('focusin', check, true)
}

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
      keepInView(t)
      return
    }
    return Tooltip.updated(el, binding, vnode, prevVnode)
  },
}
