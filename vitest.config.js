import { defineConfig } from 'vitest/config'

export default defineConfig({
  // Its own cache, apart from the dev server's: a dev server rewriting node_modules/.vite while the
  // tests start could leave them loading two copies of Vitest
  cacheDir: 'node_modules/.vitest-cache',
  test: {
    environment: 'node',
    setupFiles: ['tests/setup.js'],
    include: ['tests/**/*.test.js'],
    // Some suites simulate hours of play; with every suite running at once they need more than the default 5 s
    testTimeout: 30000,
    // Spies and mocks are undone before every test
    restoreMocks: true,
  },
})
