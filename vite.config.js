import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { viteSingleFile } from 'vite-plugin-singlefile'

// `npm run build`        -> dist/ (regular deploy with chunks)
// `npm run build:single` -> dist-single/index.html (one self-contained file)
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [vue(), ...(mode === 'single' ? [viteSingleFile()] : [])],
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
