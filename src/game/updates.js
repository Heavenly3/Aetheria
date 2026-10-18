/* =========================================================
   UPDATES — a game left open for days never loads a new release on its own. Every so often the page
   asks the server for the current index.html and compares its entry script with the one running;
   when they differ, the game says once that a reload brings the new version.
   ========================================================= */

const EVERY = 30 * 60e3
const entryOf = html => html.match(/<script[^>]+type="module"[^>]+src="([^"]+)"/)?.[1] || null

export function watchForUpdates(onNew) {
  const running = entryOf(document.documentElement.outerHTML)
  if (!running) return () => {}
  let told = false
  const check = async () => {
    if (told || document.hidden) return
    try {
      const res = await fetch('./index.html', { cache: 'no-store' })
      const latest = res.ok ? entryOf(await res.text()) : null
      if (latest && latest !== running) { told = true; onNew() }
    } catch { /* offline: try again later */ }
  }
  const timer = setInterval(check, EVERY)
  return () => clearInterval(timer)
}
