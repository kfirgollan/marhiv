// A small generic over `chrome.storage.local`: one named value, validated on
// read, with a change subscription. Both the Menu Ball's position and the
// settings panel's size are built on this, so the load/save/subscribe plumbing
// lives in exactly one place.
//
// Backed by `.local`, so values are shared across every page Marhiv runs on and
// survive reloads. (Switch a value to `.sync` later if it should follow the
// user across devices.)

export interface PersistedValue<T> {
  // Returns the stored value, or `null` when absent or malformed.
  load(): Promise<T | null>
  save(value: T): Promise<void>
  // Subscribe to changes made by other pages/tabs. Returns an unsubscribe
  // function. Fires only for genuine value changes in local storage.
  onChange(handler: (value: T) => void): () => void
}

export function createPersistedValue<T>(
  key: string,
  isValid: (value: unknown) => value is T,
): PersistedValue<T> {
  return {
    async load() {
      const result = await chrome.storage.local.get(key)
      const value = result[key]
      return isValid(value) ? value : null
    },
    async save(value: T) {
      await chrome.storage.local.set({ [key]: value })
    },
    onChange(handler) {
      const listener = (
        changes: Record<string, chrome.storage.StorageChange>,
        area: string,
      ): void => {
        if (area !== 'local') return
        const change = changes[key]
        if (change && isValid(change.newValue)) handler(change.newValue)
      }
      chrome.storage.onChanged.addListener(listener)
      return () => chrome.storage.onChanged.removeListener(listener)
    },
  }
}
