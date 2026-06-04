// The Plugin contract and the growing Enhancement API.
//
// A Plugin is a curated enhancement that targets one or more AI sites and adds
// behavior through lifecycle hooks. `onLoad` runs when the plugin becomes
// active on a matching page (enabled + URL matches); `onUnload` runs when it
// stops (disabled, or the page goes away). Both receive a `PluginContext` — the
// capabilities Marhiv lends the plugin. That context is the Enhancement API:
// it started tiny (just CSS injection) and grows as plugins need more — now it
// can also contribute UI to the settings Panel and read app state.

import type { PanelPageDef } from '../ui/panel/pages'
import type { useRouteStore } from '../store/route'

export interface PluginMeta {
  // Stable, unique identifier; the storage key for this plugin's enabled state.
  id: string
  // Human-facing name and one-line description, shown in the Plugins panel.
  name: string
  description: string
  // URL patterns the plugin targets. The content script's manifest `matches`
  // are the coarse gate (the script only runs on declared sites); this is the
  // finer, per-plugin gate that lets one content script host many plugins.
  matches: string[]
  // Whether a fresh install starts with this plugin enabled. Defaults to false.
  defaultEnabled?: boolean
}

// The app's reactive stores, lent to a Plugin so its UI can read live state
// without importing Marhiv internals directly. These are the actual Zustand
// hooks — call them inside a registered page like any hook
// (`ctx.stores.route((s) => s.path)`). Grows as plugins need more state.
export interface PluginStores {
  // Ephemeral routing state — the path the Router last detected.
  route: typeof useRouteStore
}

// The capabilities Marhiv lends a Plugin for the duration of its active life.
// Anything that mutates the page or registers UI is tracked so the manager can
// undo it on unload — so a well-behaved plugin often needs no `onUnload` at all.
export interface PluginContext {
  // Injects a stylesheet into the HOST page (not a shadow root — a theme must
  // reach into the host document to restyle it). The injected <style> is
  // tracked and removed automatically when the plugin unloads.
  injectCss(css: string): void
  // Contributes a Panel Page (and, automatically, its left-rail menu item) to
  // the settings Panel. Registered on load, removed on unload. The page's `Page`
  // is a React component rendered inside the Panel, so it can use React hooks and
  // the stores on `ctx.stores`.
  registerPage(page: PanelPageDef): void
  // Marhiv's app stores, for a plugin's UI to read live state.
  stores: PluginStores
}

export interface Plugin {
  meta: PluginMeta
  onLoad(ctx: PluginContext): void | Promise<void>
  onUnload?(ctx: PluginContext): void | Promise<void>
}
