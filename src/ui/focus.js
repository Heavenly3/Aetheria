/* =========================================================
   FOCUS — takes the player to a screen and points at one thing on it: scrolls it into view and
   makes it glow for a moment. Targets are found by their data-tut or data-focus attribute
   ("action:bronze_bar", "monster:goblin", "crop:potato", "shop:feathers"…). A screen can ask
   what is wanted (wantedFocus) to clear a filter or open a tab that would hide it.
   ========================================================= */
import { ref } from 'vue'

const GLOW_MS = 2600
const WAIT_MS = 2500
// What the last jump asked to show, until it is shown
export const wantedFocus = ref(null)

const find = key => [...document.querySelectorAll(`[data-focus="${key}"], [data-tut="${key}"]`)].find(el => el.getClientRects().length)

export function focusOn(key) {
  if (!key) return
  wantedFocus.value = key
  const start = performance.now()
  const look = () => {
    const el = find(key)
    if (!el) {
      if (performance.now() - start < WAIT_MS) return setTimeout(look, 80)
      wantedFocus.value = null
      return
    }
    const reduce = document.documentElement.dataset.motion === 'reduce' || matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' })
    // A screen still settling (a filter cleared, a tab opened) can move it again: look once more
    setTimeout(() => { const r = el.getBoundingClientRect(); if (r.top < 0 || r.bottom > innerHeight) el.scrollIntoView({ block: 'center' }) }, 700)
    el.classList.remove('focus-glow')
    void el.offsetWidth
    el.classList.add('focus-glow')
    setTimeout(() => el.classList.remove('focus-glow'), GLOW_MS)
    wantedFocus.value = null
  }
  setTimeout(look, 60)
}

// Goes to `to` (any router location) and points at `focus` there
export function goTo(router, go) {
  if (!go) return
  const done = () => focusOn(go.focus)
  router.push(go.to).then(done, done)
}
