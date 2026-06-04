// marhiv-theme — the first built-in Plugin. Restyles the host AI site to
// Marhiv's branding (accent + surfaces only) by injecting a stylesheet that
// overrides the host's design tokens. Because it only injects CSS through the
// context — which the manager tracks and removes on unload — there's nothing to
// do in `onUnload`.

import type { Plugin } from '../../types'
// `?inline` hands us the stylesheet as a string so we can inject it into the
// host page ourselves (see PluginContext.injectCss), rather than letting Vite
// append it to <head> at build time regardless of whether the plugin is on.
import themeCss from './theme.css?inline'

export const marhivTheme: Plugin = {
  meta: {
    id: 'marhiv-theme',
    name: 'Marhiv Theme',
    description: 'Recolors the page with the Marhiv alpenglow palette.',
    matches: ['https://claude.ai/*'],
    defaultEnabled: false,
  },
  onLoad(ctx) {
    ctx.injectCss(themeCss)
  },
}
