// The Plugin Manager: owns plugin lifecycle on a page. It reads persisted
// enable/disable state, activates the plugins that are enabled and whose
// `matches` fit the current URL, and — by subscribing to storage changes —
// loads/unloads them LIVE as the user toggles them (in this tab or another).
//
// Runs in the content script alongside the router. No background worker is
// involved yet; themes live entirely in the page. Like the router, it observes
// SPA navigation and re-reconciles, so a plugin scoped to part of a site
// activates and deactivates as the user moves around it.

import { loadPluginStates, onPluginStatesChange, type PluginStates } from '../storage/plugins'
import { observeNavigation } from '../routing/navigation'
import type { SiteEnhancements } from '../enhance/slots'
import { BUILTIN_PLUGINS } from './registry'
import { createPluginContext, type ManagedContext } from './context'
import type { Plugin } from './types'

// Whether a plugin is enabled given the stored states, falling back to its
// declared default when the user has never toggled it.
export function isEnabled(plugin: Plugin, states: PluginStates): boolean {
  return states[plugin.meta.id] ?? plugin.meta.defaultEnabled ?? false
}

// A deliberately small subset of Chrome match patterns: `*` is the only
// wildcard (any run of characters). Enough for host-wide patterns like
// `https://claude.ai/*`; expand if a plugin needs finer matching.
function matchesUrl(patterns: string[], url: string): boolean {
  return patterns.some((pattern) => {
    const re = new RegExp(
      '^' + pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$',
    )
    return re.test(url)
  })
}

export class PluginManager {
  private active = new Map<string, ManagedContext>()
  private states: PluginStates = {}
  private url = location.href

  // `enhancements` is the host site's slot/route data, lent to each plugin's
  // context so `ctx.onRoute`/`slot(...)` resolve against this site.
  constructor(private readonly enhancements: SiteEnhancements) {}

  // Activate currently-enabled plugins and keep them in sync with two inputs:
  // storage (the user toggling a plugin, here or in another tab) and SPA
  // navigation (the URL a plugin's `matches` are tested against).
  async init(): Promise<void> {
    this.states = (await loadPluginStates()) ?? {}
    this.reconcile()
    onPluginStatesChange((next) => {
      this.states = next
      this.reconcile()
    })
    observeNavigation((url) => {
      this.url = url.href
      this.reconcile()
    })
  }

  // Bring the set of active plugins in line with the desired state: load those
  // that should run but aren't, unload those that are running but shouldn't.
  private reconcile(): void {
    for (const plugin of BUILTIN_PLUGINS) {
      const shouldRun = isEnabled(plugin, this.states) && matchesUrl(plugin.meta.matches, this.url)
      const running = this.active.has(plugin.meta.id)
      if (shouldRun && !running) void this.load(plugin)
      else if (!shouldRun && running) void this.unload(plugin)
    }
  }

  private async load(plugin: Plugin): Promise<void> {
    const managed = createPluginContext(plugin.meta.id, this.enhancements)
    // Register before awaiting so a concurrent reconcile can't double-load.
    this.active.set(plugin.meta.id, managed)
    try {
      await plugin.onLoad(managed.ctx)
    } catch (error) {
      console.error(`[marhiv] plugin "${plugin.meta.id}" failed to load`, error)
      this.active.delete(plugin.meta.id)
      managed.dispose()
    }
  }

  private async unload(plugin: Plugin): Promise<void> {
    const managed = this.active.get(plugin.meta.id)
    if (!managed) return
    this.active.delete(plugin.meta.id)
    try {
      await plugin.onUnload?.(managed.ctx)
    } catch (error) {
      console.error(`[marhiv] plugin "${plugin.meta.id}" failed to unload`, error)
    } finally {
      // Undo whatever the plugin did through its context regardless.
      managed.dispose()
    }
  }
}
