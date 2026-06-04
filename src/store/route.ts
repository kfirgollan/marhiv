// Routing state: the path the Router last detected (e.g. '/new', '/code/123')
// and the named routes the URL currently matches (e.g. ['code']).
//
// This is ephemeral, per-document state — it lives only for the page, so it
// stays entirely in memory here (no chrome.storage; contrast src/storage/*,
// which is the durable, cross-tab layer). The Router writes `path` from non-React
// code via `useRouteStore.getState().setPath(url)`; the content script writes
// `routes` from its per-site matcher. React reads with the hook; `ctx.onRoute`
// subscribes to `routes` so route-scoped plugin behavior enters/leaves with
// navigation. Selector equality means subscribers re-render only when their
// selected value actually changes, so republishing the same value is free.

import { create } from 'zustand'

interface RouteState {
  path: string
  routes: string[]
  setPath: (url: URL) => void
  setRoutes: (routes: string[]) => void
}

export const useRouteStore = create<RouteState>((set) => ({
  path: location.pathname,
  routes: [],
  setPath: (url) => set({ path: url.pathname }),
  setRoutes: (routes) => set({ routes }),
}))
