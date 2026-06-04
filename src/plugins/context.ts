// Builds a PluginContext for one active plugin and tracks everything it touches
// so the manager can cleanly tear it down. Each active plugin gets its own
// context instance; disposing it reverses the plugin's page mutations, which is
// why most plugins don't need to implement `onUnload` themselves.

import type { PluginContext } from './types'

// Marks each <style> the context injects with its owning plugin's id. Lets the
// manager find what to remove, and lets debugging (the Dev page's state export)
// see which plugins actually got their CSS onto the page — and find the element
// in DevTools.
export const PLUGIN_STYLE_ATTR = 'data-marhiv-plugin'

export interface ManagedContext {
  ctx: PluginContext
  // Reverses every mutation made through `ctx` (e.g. removes injected styles).
  dispose(): void
}

export function createPluginContext(pluginId: string): ManagedContext {
  const injected: HTMLStyleElement[] = []

  const ctx: PluginContext = {
    injectCss(css) {
      const style = document.createElement('style')
      style.setAttribute(PLUGIN_STYLE_ATTR, pluginId)
      style.textContent = css
      document.head.appendChild(style)
      injected.push(style)
    },
  }

  return {
    ctx,
    dispose() {
      for (const style of injected) style.remove()
      injected.length = 0
    },
  }
}
