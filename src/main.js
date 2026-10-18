import { createApp } from 'vue'
import PrimeVue from 'primevue/config'
import ToastService from 'primevue/toastservice'
import ConfirmationService from 'primevue/confirmationservice'
import Tooltip from './directives/tooltip.js'
import 'primeicons/primeicons.css'
import './styles/main.css'
import App from './App.vue'
import router, { initialRoute } from './router.js'
import { AetheriaPreset, applyTheme } from './theme.js'
import { i18n, setLocale, detectLocale } from './i18n/index.js'
import { G } from './game/engine.js'
import { installErrorLog, recordError } from './game/feedback.js'
import { CHANGELOG } from './game/data/changelog.js'
import { showBootError } from './bootError.js'

// Expose the engine and the router for debugging from the console in development builds
if (import.meta.env.DEV) Object.assign(window, { __G: G, __router: router })

// After an update the files of the old version are gone: a page still running it reloads once to pick up the new one
window.addEventListener('vite:preloadError', e => {
  try {
    if (sessionStorage.getItem('aetheria-reloaded')) return
    sessionStorage.setItem('aetheria-reloaded', '1')
  } catch { return }
  e.preventDefault()
  location.reload()
})

try {
  await boot()
  try { sessionStorage.removeItem('aetheria-reloaded') } catch { /* storage unavailable */ }
} catch (err) {
  // The game could not start: a plain page to reload, keep the saves and report it
  recordError(err, 'boot')
  showBootError(err, CHANGELOG[0].version)
}

async function boot() {
  applyTheme()

  // Embedded in another page (itch.io): the host iframe may not scroll, so the game scrolls its own panels
  try { if (window.self !== window.top) document.documentElement.classList.add('embedded') } catch { document.documentElement.classList.add('embedded') }
  await setLocale(detectLocale())

  const app = createApp(App)
    .use(PrimeVue, { theme: { preset: AetheriaPreset, options: { darkModeSelector: '.app-dark', cssLayer: false } }, ripple: true })
    .use(ToastService)
    .use(ConfirmationService)
    .use(i18n)
    .use(router)
    .directive('tooltip', Tooltip)

  // Errors are kept for this session so a bug report can include them
  installErrorLog(app)

  // Restore the last visited screen (memory history always starts at "/")
  router.replace(initialRoute()).catch(() => router.replace('/'))
  app.mount('#app')
  // An error while setting up the app leaves nothing on screen
  if (!document.getElementById('app')?.children.length) throw new Error('The app rendered nothing')
}

// Installable and playable offline in production builds
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  const register = () => navigator.serviceWorker.register('./sw.js').catch(() => {})
  if (document.readyState === 'complete') register()
  else window.addEventListener('load', register)
}
