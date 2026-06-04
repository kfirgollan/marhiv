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
      matches: ['https://claude.ai/new'],
      js: ['src/content/claude.ts'],
      run_at: 'document_idle',
    },
  ],
})
