// The isolated-world half of navigation tracking.
//
// It listens for two things and reports the current URL on either: the
// MAIN-world bridge's custom event (fired on SPA `pushState`/`replaceState`,
// which the isolated world can't observe directly — see
// src/content/navigation-bridge.ts) and the native `popstate` (back/forward,
// which surfaces in both worlds). The event carries no payload; by the time it
// fires, `location` already reflects the new URL.

export const NAVIGATION_EVENT = 'marhiv:navigation'

export function observeNavigation(onChange: (url: URL) => void): () => void {
  const handler = (): void => onChange(new URL(location.href))
  window.addEventListener(NAVIGATION_EVENT, handler)
  window.addEventListener('popstate', handler)
  return () => {
    window.removeEventListener(NAVIGATION_EVENT, handler)
    window.removeEventListener('popstate', handler)
  }
}
