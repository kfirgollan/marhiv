// Builds a PluginContext for one active plugin and tracks everything it touches
// so the manager can cleanly tear it down. Each active plugin gets its own
// context instance; disposing it reverses the plugin's effects (injected styles,
// registered Panel pages), which is why most plugins don't need to implement
// `onUnload` themselves.

import { usePanelPages } from '../store/panelPages'
import { useRouteStore } from '../store/route'
import type { PluginContext } from './types'

// Marks each <style> the context injects with its owning plugin's id. Lets the
// manager find what to remove, and lets debugging (the Dev page's state export)
// see which plugins actually got their CSS onto the page — and find the element
// in DevTools.
export const PLUGIN_STYLE_ATTR = 'data-marhiv-plugin'

export interface ManagedContext {
  ctx: PluginContext
  // Reverses every effect made through `ctx` (injected styles, registered pages).
  dispose(): void
}

export function createPluginContext(pluginId: string): ManagedContext {
  // Every capability that creates something records how to undo it here, so
  // dispose() is a single uniform teardown regardless of what the plugin used.
  const cleanups: Array<() => void> = []

  const ctx: PluginContext = {
    injectCss(css) {
      const style = document.createElement('style')
      style.setAttribute(PLUGIN_STYLE_ATTR, pluginId)
      style.textContent = css
      document.head.appendChild(style)
      cleanups.push(() => style.remove())
    },
    registerPage(page) {
      cleanups.push(usePanelPages.getState().register(page))
    },
    stores: {
      route: useRouteStore,
    },
  }

  return {
    ctx,
    dispose() {
      // Undo in reverse order of creation.
      for (const cleanup of cleanups.reverse()) cleanup()
      cleanups.length = 0
    },
  }
}
