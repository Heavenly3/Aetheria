import { createApp } from 'vue'
import PrimeVue from 'primevue/config'
import ToastService from 'primevue/toastservice'
import ConfirmationService from 'primevue/confirmationservice'
import Tooltip from 'primevue/tooltip'
import 'primeicons/primeicons.css'
import './styles/main.css'
import App from './App.vue'
import router, { initialRoute } from './router.js'
import { AetheriaPreset } from './theme.js'
import { i18n, applyDocumentLocale } from './i18n/index.js'
import { G } from './game/engine.js'

// Expose the engine for debugging from the console in development builds
if (import.meta.env.DEV) window.__G = G

document.documentElement.classList.add('app-dark')
applyDocumentLocale()

const app = createApp(App)
  .use(PrimeVue, { theme: { preset: AetheriaPreset, options: { darkModeSelector: '.app-dark', cssLayer: false } }, ripple: true })
  .use(ToastService)
  .use(ConfirmationService)
  .use(i18n)
  .use(router)
  .directive('tooltip', Tooltip)

// Restore the last visited screen (memory history always starts at "/")
router.replace(initialRoute()).catch(() => router.replace('/'))
app.mount('#app')
