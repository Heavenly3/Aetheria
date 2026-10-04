import { definePreset } from '@primeuix/themes'
import Aura from '@primeuix/themes/aura'

// Aura with forged gold as the primary colour and indigo-night surfaces
export const AetheriaPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#fdf7e8', 100: '#f9ebc6', 200: '#f3d891', 300: '#ecc463', 400: '#e5b448',
      500: '#d9a23a', 600: '#b9832c', 700: '#946524', 800: '#6f4b1e', 900: '#4d3416', 950: '#2c1d0b',
    },
    colorScheme: {
      dark: {
        surface: {
          0: '#ffffff', 50: '#ece8f3', 100: '#d0cbdb', 200: '#aaa5b9', 300: '#837f96', 400: '#625e76',
          500: '#48455c', 600: '#353347', 700: '#282638', 800: '#1d1b2b', 900: '#15141f', 950: '#0d0c15',
        },
        primary: { color: '{primary.400}', contrastColor: '#1a1206', hoverColor: '{primary.300}', activeColor: '{primary.200}' },
        highlight: { background: 'color-mix(in srgb, {primary.400}, transparent 84%)', focusBackground: 'color-mix(in srgb, {primary.400}, transparent 76%)', color: '{primary.200}', focusColor: '{primary.100}' },
      },
    },
  },
})
