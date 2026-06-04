// Bridges the durable storage layer (src/storage/*, backed by chrome.storage)
// to a reactive Zustand store the UI consumes. Each store hydrates from storage
// on creation and stays in sync with changes from any tab; writes go back
// through to storage. Contrast src/store/route.ts, which is purely in-memory.
//
// Three ways to update, so a high-frequency gesture doesn't hammer storage:
//   - setLocal: update in memory only (e.g. live during a drag)
//   - set:      update in memory AND persist (the common case)
//   - persist:  persist whatever is currently in memory (commit after a drag)

import { create } from 'zustand'
import type { PersistedValue } from '../storage/persisted'

export interface PersistedState<T> {
  value: T
  setLocal: (value: T) => void
  set: (value: T) => void
  persist: () => void
}

export function createPersistedStore<T>(persisted: PersistedValue<T>, initial: T) {
  const useStore = create<PersistedState<T>>((set, get) => ({
    value: initial,
    setLocal: (value) => set({ value }),
    set: (value) => {
      set({ value })
      void persisted.save(value)
    },
    persist: () => void persisted.save(get().value),
  }))

  // Hydrate from storage, then track changes made by other tabs.
  void persisted.load().then((loaded) => {
    if (loaded !== null) useStore.setState({ value: loaded })
  })
  persisted.onChange((value) => useStore.setState({ value }))

  return useStore
}
