// A live, observable snapshot of the route the Router is currently on.
//
// The Router republishes here on every reconcile (see ./router), so UI — like
// the Dev page — can display and react to navigation without holding a
// reference to the Router. Shaped for React's useSyncExternalStore: a stable
// string snapshot plus a subscribe function.

let current = location.pathname
const listeners = new Set<() => void>()

// Called by the Router whenever it reconciles a URL. No-ops when the route is
// unchanged so subscribers only wake on a genuine move (e.g. /new → /code).
export function publishCurrentRoute(url: URL): void {
  if (url.pathname === current) return
  current = url.pathname
  for (const notify of listeners) notify()
}

export function getCurrentRoute(): string {
  return current
}

export function subscribeCurrentRoute(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
