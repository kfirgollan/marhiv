// dracula — a built-in theme Plugin that restyles the host AI site with the
// Dracula palette. Like marhiv-theme it only injects CSS through the context
// (which the manager tracks and removes on unload), so there's no `onUnload`.

import type { Plugin } from '../../types'
// `?inline` hands us the stylesheet as a string so we can inject it into the
// host page ourselves (see PluginContext.injectCss), rather than letting Vite
// append it to <head> at build time regardless of whether the plugin is on.
import themeCss from './theme.css?inline'

export const dracula: Plugin = {
  meta: {
    id: 'dracula',
    name: 'Dracula',
    description: 'Recolors the page with the Dracula palette.',
    matches: ['https://claude.ai/*'],
    defaultEnabled: false,
  },
  onLoad(ctx) {
    ctx.injectCss(themeCss)
  },
}
