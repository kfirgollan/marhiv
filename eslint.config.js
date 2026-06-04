import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'
import globals from 'globals'

// Flat config. Order matters: base JS rules, then typescript-eslint's
// recommended set, then our overrides, and finally `prettier` last so it can
// switch off any stylistic rules that would fight the formatter.
export default tseslint.config(
  // `assets/` holds brand source + a Node render script, not app code.
  { ignores: ['dist/', 'node_modules/', 'assets/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Content scripts and any future extension code run in the browser with
    // access to the WebExtension `chrome` APIs.
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.webextensions,
      },
    },
  },
  // Node-context config files (vite/eslint/manifest configs).
  {
    files: ['*.config.{js,ts}', 'manifest.config.ts'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  prettier,
)
