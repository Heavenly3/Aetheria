/*
  Moving a save between browsers and devices without a server:
  - a .json file to download and load again,
  - a transfer code / link: the save deflated and base64url-encoded, so it fits in a URL.
  Older plain base64 codes from the "Export" button are still accepted.
*/
const CODE_PREFIX = 'AE1.'
const LINK_PARAM = 'import'
const FILE_FORMAT = 1

const toB64Url = bytes => {
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
const fromB64Url = str => {
  const bin = atob(str.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(bin, c => c.charCodeAt(0))
}
const pipe = async (bytes, stream) => new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer())

export async function encodeCode(save) {
  const json = new TextEncoder().encode(JSON.stringify(save))
  return CODE_PREFIX + toB64Url(await pipe(json, new CompressionStream('deflate-raw')))
}

function validate(s) {
  if (!s || typeof s !== 'object' || !s.skills || !s.name) throw new Error('Invalid save')
  return s
}

// Accepts a transfer code, an old base64 code, a link containing a code, or the text of a save file
export async function decodeAny(text) {
  let str = String(text || '').trim()
  const fromLink = str.match(new RegExp(`[#&?]${LINK_PARAM}=([^&\\s]+)`))
  if (fromLink) str = decodeURIComponent(fromLink[1])
  if (str.startsWith(CODE_PREFIX)) {
    const bytes = await pipe(fromB64Url(str.slice(CODE_PREFIX.length)), new DecompressionStream('deflate-raw'))
    return validate(JSON.parse(new TextDecoder().decode(bytes)))
  }
  if (str.startsWith('{')) {
    const data = JSON.parse(str)
    return validate(data.game === 'aetheria' ? data.save : data)
  }
  return validate(JSON.parse(decodeURIComponent(escape(atob(str)))))
}

export async function makeLink(save) {
  const base = location.href.split('#')[0].split('?')[0]
  return `${base}#${LINK_PARAM}=${await encodeCode(save)}`
}

// A save waiting in the address bar (opened from a transfer link); the hash is cleared once read
export function takeLinkCode() {
  const m = location.hash.match(new RegExp(`${LINK_PARAM}=([^&]+)`))
  if (!m) return null
  history.replaceState(null, '', location.pathname + location.search)
  return decodeURIComponent(m[1])
}

const slug = s => String(s || 'hero').normalize('NFKD').replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'hero'

export function downloadFile(save) {
  const data = { game: 'aetheria', format: FILE_FORMAT, exported: new Date().toISOString(), save }
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `aetheria-${slug(save.name)}-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

// Opens the file picker and resolves with the decoded save (or null if cancelled)
export function pickFile() {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,application/json,.txt,text/plain'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return resolve(null)
      try { resolve(await decodeAny(await file.text())) } catch (e) { reject(e) }
    }
    input.click()
  })
}
