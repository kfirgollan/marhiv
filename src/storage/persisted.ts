// A small generic over `chrome.storage.local`: one named value, validated on
// read, with a change subscription. Both the Menu Ball's position and the
// settings panel's size are built on this, so the load/save/subscribe plumbing
// lives in exactly one place.
//
// Backed by `.local`, so values are shared across every page Marhiv runs on and
// survive reloads. (Switch a value to `.sync` later if it should follow the
// user across devices.)
//
// Every access is guarded against extension-context invalidation: in a tab left
// open across an extension reload, the content script is a zombie whose chrome.*
// calls throw. Rather than surface that as unhandled rejections, reads return
// `null`, writes no-op, and subscriptions become inert — the zombie degrades
// quietly until the page is reloaded. See src/runtime/lifecycle.ts.

import { isExtensionContextValid, isContextInvalidatedError } from '../runtime/lifecycle'
import { log } from '../log'

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
      if (!isExtensionContextValid()) return null
      try {
        const result = await chrome.storage.local.get(key)
        const value = result[key]
        if (value !== undefined && !isValid(value)) {
          // Don't swallow it: a stored value that fails validation is unexpected
          // (schema drift, corruption) and silently returning null is exactly the
          // kind of invisible failure that's hard to trace later.
          log.warn(`stored value for "${key}" is malformed; ignoring`, value)
          return null
        }
        return isValid(value) ? value : null
      } catch (error) {
        if (isContextInvalidatedError(error)) return null
        throw error
      }
    },
    async save(value: T) {
      if (!isExtensionContextValid()) return
      try {
        await chrome.storage.local.set({ [key]: value })
      } catch (error) {
        if (isContextInvalidatedError(error)) return
        throw error
      }
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
      // A zombie tab can't register listeners; hand back an inert unsubscribe so
      // callers don't special-case the failure.
      if (!isExtensionContextValid()) return () => {}
      chrome.storage.onChanged.addListener(listener)
      return () => {
        if (!isExtensionContextValid()) return
        chrome.storage.onChanged.removeListener(listener)
      }
    },
  }
}
