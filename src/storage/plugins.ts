// Persisted enable/disable state for plugins: a map of plugin id → enabled.
// Built on the generic persisted-value factory like the other stored values, so
// a toggle in one tab propagates to every open page via `onChange` — which is
// what lets the Plugin Manager load/unload plugins live.

import { createPersistedValue } from './persisted'

export type PluginStates = Record<string, boolean>

function isPluginStates(value: unknown): value is PluginStates {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every((v) => typeof v === 'boolean')
  )
}

// Exposed as a PersistedValue; the reactive store in src/store/plugins.ts wraps
// it for the Plugins page. The loose load/onChange are kept for the (non-React)
// Plugin Manager.
export const pluginStatesValue = createPersistedValue<PluginStates>('pluginStates', isPluginStates)

export const loadPluginStates = pluginStatesValue.load
export const onPluginStatesChange = pluginStatesValue.onChange
