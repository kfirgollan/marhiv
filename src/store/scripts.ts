// Reactive stores for the custom-scripts editor, backed by the PersistedValues in
// src/storage/scripts.ts. The editor reads and writes `useScripts`; because the
// list lives in chrome.storage, the background worker (on the storage layer) sees
// the same changes and (re)registers the userScripts live. `useUserScriptsAvailable`
// surfaces the Chrome "Allow user scripts" toggle state the worker reports.

import { scriptsValue, userScriptsAvailableValue, type UserScript } from '../storage/scripts'
import { createPersistedStore } from './persisted'

export const useScripts = createPersistedStore<UserScript[]>(scriptsValue, [])

export const useUserScriptsAvailable = createPersistedStore<boolean>(
  userScriptsAvailableValue,
  true,
)
