// Routing state: the path the Router last detected (e.g. '/new', '/code/123').
//
// This is ephemeral, per-document state — it lives only for the page, so it
// stays entirely in memory here (no chrome.storage; contrast src/storage/*,
// which is the durable, cross-tab layer). The Router writes it from non-React
// code via `useRouteStore.getState().setPath(url)` on every reconcile; React
// reads it with the hook. Selector equality means subscribers re-render only
// when their selected value actually changes, so republishing the same path is
// effectively free.

import { create } from 'zustand'

interface RouteState {
  path: string
  setPath: (url: URL) => void
}

export const useRouteStore = create<RouteState>((set) => ({
  path: location.pathname,
  setPath: (url) => set({ path: url.pathname }),
}))
