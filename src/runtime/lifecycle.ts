// Detecting MV3 "extension context invalidated".
//
// When the extension is reloaded, updated, or disabled, Chrome leaves the old
// content script running in already-open tabs but severs its bridge to the
// extension. From that moment every `chrome.*` call throws "Extension context
// invalidated", and `chrome.runtime.id` flips from a string to `undefined` —
// the cheapest reliable signal that this tab has become a zombie.
//
// Two consumers, matching the two layers of defense:
//   - `isExtensionContextValid` / `isContextInvalidatedError`: guards that
//     chrome.* callers (see src/storage/persisted.ts) check so a zombie tab
//     degrades quietly instead of throwing unhandled rejections.
//   - `onContextInvalidated`: a poll that fires once when the context dies, so
//     the content script can tear itself down (stop reacting to drags and
//     navigation, remove its on-page chrome) rather than linger as a zombie.

// True while this content script can still reach the extension. Reads
// `chrome.runtime.id`, which is defined only inside a live context; the
// try/catch guards the rare case where touching `chrome.runtime` itself throws
// post-invalidation.
export function isExtensionContextValid(): boolean {
  try {
    return chrome.runtime?.id != null
  } catch {
    return false
  }
}

// Whether a thrown error is the invalidation symptom, so callers can swallow it
// specifically and let genuine failures (quota, serialization) surface.
export function isContextInvalidatedError(error: unknown): boolean {
  return error instanceof Error && error.message.includes('Extension context invalidated')
}

// How often to check for invalidation. Chrome gives no event for it, so we
// poll; a couple of seconds is well below human-perceptible lag for tearing
// down a dead tab while staying effectively free.
const POLL_INTERVAL_MS = 2000

// Invoke `handler` once, the first time the extension context goes invalid.
// Returns an unsubscribe that stops the poll (so a real teardown — e.g. the
// page unloading normally — doesn't leave the timer running).
export function onContextInvalidated(handler: () => void): () => void {
  const timer = setInterval(() => {
    if (isExtensionContextValid()) return
    clearInterval(timer)
    handler()
  }, POLL_INTERVAL_MS)
  return () => clearInterval(timer)
}
