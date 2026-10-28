import { ref } from 'vue'
import { definePreset } from '@primeuix/themes'
import Aura from '@primeuix/themes/aura'

// Aura with forged gold as the primary colour, indigo-night surfaces in the dark and parchment in the light.
// Steps 300-400 carry muted text (inactive tabs, toggles, tags), so they keep 4.5:1 on every surface
export const AetheriaPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#fdf7e8', 100: '#f9ebc6', 200: '#f3d891', 300: '#ecc463', 400: '#e5b448',
      500: '#d9a23a', 600: '#b9832c', 700: '#946524', 800: '#6f4b1e', 900: '#4d3416', 950: '#2c1d0b',
    },
    colorScheme: {
      light: {
        surface: {
          0: '#ffffff', 50: '#fbf8f1', 100: '#f3eee3', 200: '#e6dfcf', 300: '#cfc5b0', 400: '#a99e88',
          500: '#6e6554', 600: '#5c5445', 700: '#4d4638', 800: '#363026', 900: '#231f18', 950: '#15120d',
        },
        primary: { color: '{primary.700}', contrastColor: '#fffaf0', hoverColor: '{primary.800}', activeColor: '{primary.900}' },
        highlight: { background: '{primary.100}', focusBackground: '{primary.200}', color: '{primary.800}', focusColor: '{primary.900}' },
      },
      dark: {
        surface: {
          0: '#ffffff', 50: '#ece8f3', 100: '#d0cbdb', 200: '#aaa5b9', 300: '#9692a9', 400: '#8a869e',
          500: '#48455c', 600: '#353347', 700: '#282638', 800: '#1d1b2b', 900: '#15141f', 950: '#0d0c15',
        },
        primary: { color: '{primary.400}', contrastColor: '#1a1206', hoverColor: '{primary.300}', activeColor: '{primary.200}' },
        highlight: { background: 'color-mix(in srgb, {primary.400}, transparent 84%)', focusBackground: 'color-mix(in srgb, {primary.400}, transparent 76%)', color: '{primary.200}', focusColor: '{primary.100}' },
      },
    },
  },
})

/* ================= light / dark mode ================= */
// The choice is per device, not per save: it also applies to the title screen
const STORAGE_KEY = 'aetheria-theme'
export const THEMES = ['system', 'dark', 'light']
const BAR_COLOR = { dark: '#0c0b14', light: '#f3ede1' }
const media = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: light)') : null

function storedTheme() {
  try { const v = localStorage.getItem(STORAGE_KEY); return THEMES.includes(v) ? v : 'system' } catch { return 'system' }
}
export const themePref = ref(storedTheme())

export const resolvedTheme = () => (themePref.value === 'system' ? (media?.matches ? 'light' : 'dark') : themePref.value)

export function applyTheme() {
  const mode = resolvedTheme()
  const root = document.documentElement
  root.dataset.theme = mode
  root.classList.toggle('app-dark', mode === 'dark')
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', BAR_COLOR[mode])
}

export function setTheme(v) {
  if (!THEMES.includes(v)) return
  themePref.value = v
  try { localStorage.setItem(STORAGE_KEY, v) } catch { /* storage unavailable */ }
  applyTheme()
}

media?.addEventListener?.('change', () => { if (themePref.value === 'system') applyTheme() })
