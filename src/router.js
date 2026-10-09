import { createRouter, createMemoryHistory } from 'vue-router'
import { FEATURES } from './game/features.js'

const ROUTE_KEY = 'aetheria-route'

const routes = [
  { path: '/', name: 'hero', component: () => import('./views/HeroView.vue'), meta: { titleKey: 'nav.hero' } },
  { path: '/inventory', name: 'inventory', component: () => import('./views/InventoryView.vue'), meta: { titleKey: 'nav.inventory' } },
  { path: '/skill/:id', name: 'skill', component: () => import('./views/SkillView.vue') },
  { path: '/combat', name: 'combat', component: () => import('./views/CombatView.vue'), meta: { titleKey: 'nav.combat' } },
  { path: '/slayer', name: 'slayer', component: () => import('./views/SlayerView.vue'), meta: { titleKey: 'nav.slayer' } },
  { path: '/tower', name: 'tower', component: () => import('./views/TowerView.vue'), meta: { titleKey: 'nav.tower' } },
  { path: '/quests', name: 'quests', component: () => import('./views/QuestsView.vue'), meta: { titleKey: 'nav.quests' } },
  { path: '/achievements', name: 'achievements', component: () => import('./views/AchievementsView.vue'), meta: { titleKey: 'nav.achievements' } },
  { path: '/ascension', name: 'ascension', component: () => import('./views/AscensionView.vue'), meta: { titleKey: 'nav.ascension' } },
  { path: '/bestiary', name: 'bestiary', component: () => import('./views/BestiaryView.vue'), meta: { titleKey: 'nav.bestiary' } },
  { path: '/weekly', name: 'weekly', component: () => import('./views/WeeklyView.vue'), meta: { titleKey: 'nav.weekly' } },
  { path: '/journal', name: 'journal', component: () => import('./views/JournalView.vue'), meta: { titleKey: 'nav.journal' } },
  { path: '/omens', name: 'omens', component: () => import('./views/OmensView.vue'), meta: { titleKey: 'nav.omens' } },
  // Festivals are switched off for now (src/game/features.js); the screen sends players back to the hero
  { path: '/festival', name: 'festival', component: () => import('./views/FestivalView.vue'), meta: { titleKey: 'nav.festival' }, beforeEnter: () => (FEATURES.festivals ? true : '/') },
  { path: '/pets', name: 'pets', component: () => import('./views/PetsView.vue'), meta: { titleKey: 'nav.pets' } },
  { path: '/forge', name: 'forge', component: () => import('./views/ForgeView.vue'), meta: { titleKey: 'nav.forge' } },
  { path: '/stats', name: 'stats', component: () => import('./views/StatsView.vue'), meta: { titleKey: 'nav.stats' } },
  { path: '/guilds', name: 'guilds', component: () => import('./views/GuildsView.vue'), meta: { titleKey: 'nav.guilds' } },
  { path: '/tavern', name: 'tavern', component: () => import('./views/TavernView.vue'), meta: { titleKey: 'nav.tavern' } },
  { path: '/home', name: 'home', component: () => import('./views/HousingView.vue'), meta: { titleKey: 'nav.home' } },
  { path: '/church', name: 'church', component: () => import('./views/ChurchView.vue'), meta: { titleKey: 'nav.church' } },
  { path: '/shop', name: 'shop', component: () => import('./views/ShopView.vue'), meta: { titleKey: 'nav.shop' } },
  { path: '/settings', name: 'settings', component: () => import('./views/SettingsView.vue'), meta: { titleKey: 'nav.settings' } },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

// In-memory history works the same standalone or embedded in an iframe; the last route is remembered
const router = createRouter({ history: createMemoryHistory(), routes, scrollBehavior: () => ({ top: 0 }) })

export function initialRoute() {
  try { return localStorage.getItem(ROUTE_KEY) || '/' } catch { return '/' }
}
router.afterEach(to => {
  try { localStorage.setItem(ROUTE_KEY, to.fullPath) } catch { /* storage unavailable */ }
  window.scrollTo({ top: 0 })
  document.querySelector('.main')?.scrollTo({ top: 0 })
})

export default router
