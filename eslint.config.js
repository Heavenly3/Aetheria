import js from '@eslint/js'
import vue from 'eslint-plugin-vue'
import globals from 'globals'

// Rules that catch mistakes, not style: formatting is left to the code as it is
export default [
  { ignores: ['dist/**', 'dist-single/**', 'node_modules/**', 'unl/**', 'docs/**'] },
  js.configs.recommended,
  ...vue.configs['flat/essential'],
  {
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: { ...globals.browser } },
    rules: {
      'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none', ignoreRestSiblings: true }],
      'vue/multi-word-component-names': 'off',
      // `let ok = false; try { ok = check() } catch { ok = false }` is how risky checks are written here
      'no-useless-assignment': 'off',
    },
  },
  { files: ['scripts/**', '*.config.js', 'public/sw.js'], languageOptions: { globals: { ...globals.node, ...globals.serviceworker } } },
  { files: ['tests/**'], languageOptions: { globals: { ...globals.node } } },
]
