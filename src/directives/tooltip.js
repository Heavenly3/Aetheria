import Tooltip from 'primevue/tooltip'

/*
  PrimeVue's tooltip rebuilds itself on every update of the element it sits on, and that removes a
  tooltip that is on screen. The game re-renders many screens ten times a second, so tooltips would
  flash for a single frame. This wrapper skips updates that do not change the tooltip, and refreshes
  the content of a visible tooltip in place when only its content changes.
  Rich tooltips (src/ui/tips.js) pass escaped HTML with `escape: false`.
  A function value is a lazy tooltip: item cards are costly to build and most are never hovered, so
  the function runs when the pointer or focus arrives (and on updates while it is on screen), not on
  every render.
*/
const textOf = v => (typeof v === 'string' ? v : v && typeof v === 'object' ? v.value : '') || ''
const sameValue = (a, b) => {
  if (a && b && typeof a === 'object' && typeof b === 'object')
    return a.value === b.value && !!a.disabled === !!b.disabled && a.escape === b.escape && a.class === b.class
  return a === b
}
const target = el => (el.classList?.contains('p-inputwrapper') && el.querySelector('input')) || el
const lazy = v => typeof v === 'function'

let lazyIds = 0
// Fills in what PrimeVue reads when it shows a tooltip, from the lazy function's current result
function resolve(t) {
  if (!t.$_tipFn) return null
  const v = t.$_tipFn()
  const text = textOf(v)
  Object.assign(t, {
    $_ptooltipValue: text, $_ptooltipDisabled: !text.trim() || !!v?.disabled,
    $_ptooltipEscape: typeof v === 'object' && v ? v.escape !== false : true, $_ptooltipClass: (typeof v === 'object' && v?.class) || null,
    $_ptooltipFitContent: true, $_ptooltipShowDelay: 0, $_ptooltipHideDelay: 0, $_ptooltipAutoHide: true,
  })
  t.$_ptooltipIdAttr ||= `tip_${++lazyIds}_tooltip`
  return v
}
function makeLazy(el, binding) {
  const t = target(el)
  t.$_tipFn = binding.value
  if (!t.$_tipLazy) {
    // Registered before PrimeVue's own listeners, so the content is ready when it shows
    t.$_tipLazy = () => resolve(t)
    t.addEventListener('mouseenter', t.$_tipLazy)
    t.addEventListener('focus', t.$_tipLazy)
  }
}

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

/*
  PrimeVue sets every tooltip up as it mounts and again on every update (its theme, watchers and
  listeners), which made screens with hundreds of them slow to open and to redraw. A tooltip stays
  dormant until the pointer or focus first reaches its element: then PrimeVue takes over with the
  latest value and shows it straight away.
*/
function wake(el) {
  const d = el.$_tipDormant
  if (!d) return
  el.$_tipDormant = null
  const t = target(el)
  t.removeEventListener('mouseenter', d.wake)
  t.removeEventListener('focus', d.wake)
  const { binding, vnode } = d
  Tooltip.created(el, binding, vnode)
  if (lazy(binding.value)) makeLazy(el, binding)
  Tooltip.beforeMount(el, binding, vnode)
  Tooltip.mounted(el, binding, vnode)
  // PrimeVue started listening after the event that woke it, so it is shown by hand this once
  if (lazy(binding.value)) resolve(t)
  const show = d.event === 'focus' ? t.$_ptooltipFocusEvent : t.$_ptooltipMouseEnterEvent
  show?.({ currentTarget: t })
}
function sleep(el, binding, vnode) {
  const t = target(el)
  const d = { binding, vnode, event: null }
  d.wake = e => { d.event = e.type; wake(el) }
  el.$_tipDormant = d
  t.addEventListener('mouseenter', d.wake)
  t.addEventListener('focus', d.wake)
}
const awake = (hook, alt) => (el, ...args) => (el.$_tipDormant ? undefined : (alt || Tooltip[hook])?.(el, ...args))

export default {
  ...Tooltip,
  created() {},
  beforeMount(el, binding, vnode) { sleep(el, binding, vnode) },
  mounted() {},
  beforeUpdate: awake('beforeUpdate'),
  beforeUnmount: awake('beforeUnmount'),
  unmounted: awake('unmounted'),
  updated(el, binding, vnode, prevVnode) {
    if (el.$_tipDormant) { Object.assign(el.$_tipDormant, { binding, vnode }); return }
    if (lazy(binding.value)) {
      const t = target(el)
      if (!lazy(binding.oldValue)) {
        // Switching from a plain tooltip (or none): drop its listeners and bind afresh
        Tooltip.updated(el, { ...binding, value: null }, vnode, prevVnode)
        makeLazy(el, binding)
        return Tooltip.beforeMount(el, binding, vnode, prevVnode)
      }
      t.$_tipFn = binding.value
      const shown = t.$_ptooltipId && document.getElementById(t.$_ptooltipId)
      const node = shown?.querySelector('[data-pc-section="text"]')
      if (node && resolve(t) && !t.$_ptooltipDisabled) {
        if (t.$_ptooltipEscape === false) node.innerHTML = t.$_ptooltipValue
        else node.textContent = t.$_ptooltipValue
        keepInView(t)
      }
      return
    }
    if (lazy(binding.oldValue)) target(el).$_tipFn = null
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
