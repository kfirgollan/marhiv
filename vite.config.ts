import { defineConfig } from 'vite'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.config'
import pkg from './package.json'

// Build-time constants, inlined as globals the bundle can read:
//   __MARHIV_VERSION__ / __MARHIV_BUILD__ — identity, so a loaded extension can
//     announce exactly which build it is (confirms a reload picked up new code).
//   __MARHIV_RELEASE__ — true only for an explicit release build
//     (`npm run build:release`, i.e. `--mode release`). It forces info-level
//     logging even when side-loaded; ordinary builds stay verbose when unpacked
//     and quiet when store-installed (decided at runtime — see src/log.ts).
export default defineConfig(({ mode }) => ({
  define: {
    __MARHIV_VERSION__: JSON.stringify(pkg.version),
    __MARHIV_BUILD__: JSON.stringify(new Date().toISOString()),
    __MARHIV_RELEASE__: JSON.stringify(mode === 'release'),
  },
  plugins: [crx({ manifest })],
}))
