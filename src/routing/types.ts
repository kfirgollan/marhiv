// Core routing types. A Site is bound to one AI tool and owns a set of Routes;
// each Route claims a slice of that site's URL space and drives the behavior
// Marhiv layers onto it.

export interface RouteContext {
  // The URL that triggered this enter.
  readonly url: URL
  // Named groups captured from the route's pattern (e.g. `:id` → params.id).
  readonly params: Record<string, string | undefined>
  // Aborted when the route stops matching — navigation away, or a param change
  // that re-enters. Wire listeners and observers to it (`{ signal }`,
  // `signal.addEventListener('abort', …)`) for automatic teardown on leave.
  readonly signal: AbortSignal
}

export interface Route {
  // Stable identifier, unique within a Site; used to track active routes.
  readonly id: string
  // Matched against the full URL. Typically only the pathname is constrained;
  // unspecified URLPattern components default to a wildcard, so a Router that
  // only ever sees its own site can match on pathname alone.
  readonly pattern: URLPattern
  // Runs when the route starts matching. Return a promise for async setup; the
  // Router reports a rejection but does not block other routes on it.
  enter(context: RouteContext): void | Promise<void>
}

export interface SiteContext {
  // Aborted when site-level chrome should be torn down. In practice it lives
  // for the whole document (the Menu Ball is always present), but handlers
  // should still bind their teardown to it for correctness.
  readonly signal: AbortSignal
}

export interface Site {
  // Stable identifier for the site (e.g. 'claude').
  readonly id: string
  // Optional site-level setup, run once when the host loads — for chrome that
  // should appear on every page regardless of route (e.g. the Menu Ball). Runs
  // before the first route is matched.
  enter?(context: SiteContext): void | Promise<void>
  readonly routes: readonly Route[]
}
