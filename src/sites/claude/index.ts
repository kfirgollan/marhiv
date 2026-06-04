// Claude (https://claude.ai) site definition.
//
// `enter` runs once when the host loads, for chrome that belongs on every page.
// Routes own page-specific behavior; the router mounts a route's `enter` when
// its pattern starts matching and aborts the supplied signal when it stops.
// Adding page-specific behavior (e.g. claude.ai/code/*) is a new route entry
// here, not a change to the routing infrastructure.

import { mountIndicator } from '../../ui/indicator'
import type { Site } from '../../routing/types'

export { matchRoutes, RouteKey } from './routes'
export { claudeEnhancements } from './slots'

export const claudeSite: Site = {
  id: 'claude',
  // The Menu Ball is Marhiv's entry point on every Claude page, so it mounts at
  // the site level rather than per route: it lives for the whole document and
  // stays put across in-app navigation.
  enter: ({ signal }) => mountIndicator(signal),
  // Per-page behavior is added here as the project grows; each route mounts on
  // enter and tears down on leave via its signal.
  routes: [],
}
