// Marhiv navigation bridge — runs in the page's MAIN world.
//
// MV3 content scripts run in an isolated world with their own `history`
// wrapper, so they can't observe the host SPA's `pushState`/`replaceState`
// calls. This shim runs in the page's own world, patches those two methods, and
// re-broadcasts each as a DOM event on `window`. Both worlds share the same
// window, so Marhiv's isolated content script (src/routing/navigation.ts) hears
// it. Back/forward navigations already surface as `popstate` in both worlds and
// are handled there, not here.

import { NAVIGATION_EVENT } from '../routing/navigation'

type HistoryMethod = 'pushState' | 'replaceState'
// `pushState` and `replaceState` share this signature; pinning it avoids the
// union-of-identical-signatures that defeats spread/apply type-checking.
type HistoryFn = (data: unknown, unused: string, url?: string | URL | null) => void

function emit(): void {
  window.dispatchEvent(new CustomEvent(NAVIGATION_EVENT))
}

// Wrap one History method so it still does its job, then announces the change.
function patch(method: HistoryMethod): void {
  const original = history[method] as HistoryFn
  history[method] = function (this: History, ...args: Parameters<HistoryFn>): void {
    original.apply(this, args)
    emit()
  }
}

patch('pushState')
patch('replaceState')
