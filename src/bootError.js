/* =========================================================
   BOOT ERROR — what the player sees if the game cannot start at all: a plain page (no Vue, no
   translations loaded) that offers to reload, to download every save kept in this browser and to
   copy the error for a bug report. It reuses the loading screen's styles from index.html.
   ========================================================= */

const TEXTS = {
  en: {
    title: 'Aetheria could not start',
    body: 'Something went wrong while loading the game. Your saves are still in this browser: download a copy to keep them safe, then try again.',
    reload: 'Try again', download: 'Download my saves', copy: 'Copy the error', copied: 'Copied', report: 'Report it on itch.io',
  },
  es: {
    title: 'Aetheria no ha podido arrancar',
    body: 'Algo ha fallado al cargar el juego. Tus partidas siguen en este navegador: descarga una copia para tenerlas a salvo y vuelve a intentarlo.',
    reload: 'Reintentar', download: 'Descargar mis partidas', copy: 'Copiar el error', copied: 'Copiado', report: 'Informar en itch.io',
  },
}

// Every key the game keeps in localStorage, as one JSON file
function savesBlob() {
  const out = {}
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k?.startsWith('aetheria-')) out[k] = localStorage.getItem(k)
    }
  } catch { /* storage unavailable */ }
  return new Blob([JSON.stringify(out, null, 1)], { type: 'application/json' })
}

export function showBootError(err, version = '') {
  const lang = (() => { try { return localStorage.getItem('aetheria-locale') } catch { return null } })() || navigator.language || 'en'
  const tx = TEXTS[lang.slice(0, 2)] || TEXTS.en
  const detail = `Aetheria ${version}\n${navigator.userAgent}\n${err?.stack || err?.message || err}`
  const root = document.getElementById('app')
  if (!root) return
  root.innerHTML = ''
  const wrap = document.createElement('div')
  wrap.className = 'boot'
  wrap.setAttribute('role', 'alert')
  const box = document.createElement('div')
  box.className = 'boot-inner'
  box.style.cssText = 'max-width:440px;padding:16px;text-align:center;font-family:system-ui,sans-serif'
  const h = document.createElement('h1')
  h.textContent = tx.title
  h.style.cssText = 'margin:0;font:600 24px Georgia,serif;color:#e2b65a'
  const p = document.createElement('p')
  p.textContent = tx.body
  p.style.cssText = 'margin:0;color:#cfc8b8;line-height:1.5;font-size:15px'
  const row = document.createElement('div')
  row.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;justify-content:center'
  const button = (label, primary, fn) => {
    const b = document.createElement('button')
    b.textContent = label
    b.style.cssText = `padding:9px 14px;border-radius:10px;font:600 14px system-ui,sans-serif;cursor:pointer;border:1px solid #e2b65a;${primary ? 'background:#e2b65a;color:#1a1206' : 'background:none;color:#e2b65a'}`
    b.onclick = () => fn(b)
    row.append(b)
  }
  button(tx.reload, true, () => location.reload())
  button(tx.download, false, () => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(savesBlob())
    a.download = `aetheria-saves-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
  })
  button(tx.copy, false, async b => { try { await navigator.clipboard.writeText(detail); b.textContent = tx.copied } catch { pre.hidden = false } })
  const link = document.createElement('a')
  link.href = 'https://3vynia.itch.io/aetheria'
  link.target = '_blank'
  link.rel = 'noopener'
  link.textContent = tx.report
  link.style.cssText = 'color:#a89f8c;font-size:13px'
  const pre = document.createElement('pre')
  pre.hidden = true
  pre.textContent = detail
  pre.style.cssText = 'max-width:100%;max-height:160px;overflow:auto;text-align:start;font-size:11px;color:#a89f8c;white-space:pre-wrap;word-break:break-word'
  box.append(h, p, row, link, pre)
  wrap.append(box)
  root.append(wrap)
}
