import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['tests/setup.js'],
    include: ['tests/**/*.test.js'],
    // Some suites simulate hours of play; with every suite running at once they need more than the default 5 s
    testTimeout: 30000,
  },
})
