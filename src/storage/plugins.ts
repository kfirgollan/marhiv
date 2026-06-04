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

const store = createPersistedValue<PluginStates>('pluginStates', isPluginStates)

export const loadPluginStates = store.load
export const savePluginStates = store.save
export const onPluginStatesChange = store.onChange
