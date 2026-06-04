// The Plugin contract and the first slice of the Enhancement API.
//
// A Plugin is a curated enhancement that targets one or more AI sites and adds
// behavior through lifecycle hooks. `onLoad` runs when the plugin becomes
// active on a matching page (enabled + URL matches); `onUnload` runs when it
// stops (disabled, or the page goes away). Both receive a `PluginContext` — the
// capabilities Marhiv lends the plugin. That context is the seed of the
// Enhancement API: it starts tiny (just CSS injection, which is all a theme
// needs) and grows as plugins need more.

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

// The capabilities Marhiv lends a Plugin for the duration of its active life.
// Anything mutating the page is tracked so the manager can undo it on unload —
// so a well-behaved plugin often needs no `onUnload` at all.
export interface PluginContext {
  // Injects a stylesheet into the HOST page (not a shadow root — a theme must
  // reach into the host document to restyle it). The injected <style> is
  // tracked and removed automatically when the plugin unloads.
  injectCss(css: string): void
}

export interface Plugin {
  meta: PluginMeta
  onLoad(ctx: PluginContext): void | Promise<void>
  onUnload?(ctx: PluginContext): void | Promise<void>
}
