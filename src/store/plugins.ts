// Reactive store for plugin enable/disable state, backed by the PersistedValue
// in src/storage/plugins.ts. The Plugins page reads and writes it; because the
// value lives in chrome.storage, the Plugin Manager (on the storage layer) sees
// the same changes and loads/unloads plugins live.

import { pluginStatesValue, type PluginStates } from '../storage/plugins'
import { createPersistedStore } from './persisted'

export const usePluginStates = createPersistedStore<PluginStates>(pluginStatesValue, {})
