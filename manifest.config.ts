import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json'

// The MV3 manifest, typed and driven off package.json so the version stays
// in one place. Content scripts are declared here; each targets a specific
// AI tool. v0.0.1 ships a single script that proves the injection pipeline
// end-to-end on Claude's new-chat page.
export default defineManifest({
  manifest_version: 3,
  name: 'Marhiv',
  version: pkg.version,
  description: pkg.description,
  icons: {
    16: 'assets/brand/icons/icon-16.png',
    32: 'assets/brand/icons/icon-32.png',
    48: 'assets/brand/icons/icon-48.png',
    128: 'assets/brand/icons/icon-128.png',
  },
  action: {
    default_title: 'Marhiv',
    default_icon: {
      16: 'assets/brand/icons/icon-16.png',
      32: 'assets/brand/icons/icon-32.png',
      48: 'assets/brand/icons/icon-48.png',
      128: 'assets/brand/icons/icon-128.png',
    },
  },
  // `storage` lets the indicator persist its position across page loads and
  // share it between every page Marhiv runs on.
  permissions: ['storage'],
  content_scripts: [
    {
      // Navigation bridge: runs in the page's own (MAIN) world so it can patch
      // the host SPA's History API and re-broadcast client-side navigations to
      // Marhiv's isolated content script. Injected at document_start so the
      // patch is in place before the app performs its first navigation.
      matches: ['https://claude.ai/*'],
      js: ['src/content/navigation-bridge.ts'],
      world: 'MAIN',
      run_at: 'document_start',
    },
    {
      // Marhiv's isolated-world host: runs the per-site Router, which matches
      // the URL against the site's routes and drives their enter/leave
      // lifecycle as the SPA navigates. Loaded site-wide (not just /new) so the
      // Router can react to every in-app navigation.
      matches: ['https://claude.ai/*'],
      js: ['src/content/claude.ts'],
      run_at: 'document_idle',
    },
  ],
})
