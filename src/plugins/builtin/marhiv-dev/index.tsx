// marhiv-dev — the developer-tools Plugin. Instead of injecting CSS into the
// host page, it contributes UI to Marhiv's own settings Panel: on load it
// registers the Dev Panel Page (and, automatically, its left-rail menu item)
// through the Plugin Context. The context tracks the registration, so disabling
// the plugin removes the page with no `onUnload`.
//
// The page is built here as a closure over `ctx` so it can read live app state
// through `ctx.stores` (see DevPage).

import type { Plugin } from '../../types'
import { DevPage } from './DevPage'

export const marhivDev: Plugin = {
  meta: {
    id: 'marhiv-dev',
    name: 'Developer Tools',
    description: 'Adds a Dev page with live internal state and a debug state export.',
    matches: ['https://claude.ai/*'],
    defaultEnabled: true,
  },
  onLoad(ctx) {
    ctx.registerPage({
      id: 'dev',
      menu: { label: 'Dev', icon: '🛠' },
      Page: () => <DevPage ctx={ctx} />,
    })
  },
}
