// Builds a PluginContext for one active plugin and tracks everything it touches
// so the manager can cleanly tear it down. Each active plugin gets its own
// context instance; disposing it reverses the plugin's effects (injected styles,
// registered Panel pages), which is why most plugins don't need to implement
// `onUnload` themselves.

import { usePanelPages } from '../store/panelPages'
import { useRouteStore } from '../store/route'
import { usePanelMaximized } from '../store/panel'
import { createSlotHandle, type SiteEnhancements } from '../enhance/slots'
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

export function createPluginContext(
  pluginId: string,
  enhancements: SiteEnhancements,
): ManagedContext {
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
      panelMaximized: usePanelMaximized,
    },
    onRoute(route, handler, options) {
      // Already-aborted caller signal: never subscribe.
      if (options?.signal?.aborted) return
      // A mini-router for one route name, driven by the active routes the
      // content script publishes to the route store. `evaluate` is idempotent:
      // it only acts on the active↔inactive transition, so subscribing to every
      // store change (not just routes) is harmless.
      let scope: AbortController | null = null
      const evaluate = (routes: string[]): void => {
        const active = routes.includes(route)
        if (active && !scope) {
          scope = new AbortController()
          const registry = enhancements.slotsForRoute(route)
          const signal = scope.signal
          handler({
            url: new URL(location.href),
            signal,
            slot: (key) => createSlotHandle(registry, key, signal),
          })
        } else if (!active && scope) {
          scope.abort()
          scope = null
        }
      }
      evaluate(useRouteStore.getState().routes)
      const unsubscribe = useRouteStore.subscribe((state) => evaluate(state.routes))
      const teardown = (): void => {
        scope?.abort()
        scope = null
        unsubscribe()
      }
      cleanups.push(teardown)
      // End early when the caller's signal aborts (e.g. one user script disabled).
      options?.signal?.addEventListener('abort', teardown, { once: true })
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
