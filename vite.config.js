import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { readdirSync, readFileSync } from 'node:fs'

// Every package the source imports, bundled once when the dev server starts. Found later (on opening a
// screen for the first time) they would be bundled again under new names, and a page already open would
// end up with two copies of Vue Router or PrimeVue and blank screens
function sourceDeps(dir = 'src', found = new Set()) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const path = `${dir}/${e.name}`
    if (e.isDirectory()) sourceDeps(path, found)
    else if (/\.(js|vue)$/.test(e.name)) for (const [, dep] of readFileSync(path, 'utf8').matchAll(/from '((?:@[\w-]+\/)?[a-z][\w-]*(?:\/[\w-]+)*)'/g)) found.add(dep)
  }
  return [...found]
}

// `npm run build`        -> dist/ (regular deploy with chunks)
// `npm run build:single` -> dist-single/index.html (one self-contained file)
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [vue(), ...(mode === 'single' ? [viteSingleFile()] : [])],
  optimizeDeps: { include: sourceDeps() },
  build: {
    outDir: mode === 'single' ? 'dist-single' : 'dist',
    chunkSizeWarningLimit: 2000,
    // Keep the game code in its own long-lived chunk
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'game', test: /src[\\/](game|i18n[\\/](index|bind|mods|names|locales[\\/]en))/ },
          ],
        },
      },
    },
  },
}))
