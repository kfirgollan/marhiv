// The Router matches the current URL against a Site's routes and drives their
// enter/leave lifecycle.
//
// One Router instance per Site (per content-script host): Claude gets its own,
// ChatGPT would get another, each with its own routes. The router never
// navigates — it only observes (see ./navigation) and reacts, entering a route
// when its pattern starts matching and aborting that route's signal when it
// stops, so handlers can tear themselves down. Site-level chrome that should
// appear on every page (the Menu Ball) mounts once via the Site's own `enter`,
// outside the per-route machinery.

import { publishCurrentRoute } from './currentRoute'
import { observeNavigation } from './navigation'
import type { Route, Site } from './types'

interface ActiveRoute {
  readonly controller: AbortController
  readonly params: Record<string, string | undefined>
}

// Run an enter handler in the background, isolating and logging any failure so
// one handler can't take down navigation handling or another route.
function runEnter(label: string, enter: () => void | Promise<void>): void {
  void (async (): Promise<void> => {
    try {
      await enter()
    } catch (error) {
      console.error(`[marhiv] ${label} failed to enter`, error)
    }
  })()
}

export class Router {
  private readonly site: Site
  private readonly active = new Map<string, ActiveRoute>()
  // Scopes site-level chrome. It lives for the whole document and is never
  // aborted today; a future `stop()` would abort it to tear that chrome down.
  private readonly siteController = new AbortController()

  constructor(site: Site) {
    this.site = site
  }

  // Mount site-level chrome — the parts that persist across every page, like
  // the Menu Ball. Call once when the host loads, before the first reconcile.
  enterSite(): void {
    const { enter } = this.site
    if (!enter) return
    runEnter(`site "${this.site.id}"`, () => enter({ signal: this.siteController.signal }))
  }

  // Bring the set of active routes in line with `url`: enter newly matching
  // routes, leave ones that no longer match, and re-enter a still-matching
  // route whose captured params changed (e.g. /chat/a → /chat/b) so its
  // handler rebinds to the new identity.
  reconcile(url: URL): void {
    publishCurrentRoute(url)
    for (const route of this.site.routes) {
      const match = route.pattern.exec(url.href)
      const current = this.active.get(route.id)
      if (!match) {
        if (current) this.leave(route.id)
        continue
      }
      if (!current) {
        this.enter(route, url, match.pathname.groups)
      } else if (!sameParams(current.params, match.pathname.groups)) {
        this.leave(route.id)
        this.enter(route, url, match.pathname.groups)
      }
    }
  }

  private enter(route: Route, url: URL, params: Record<string, string | undefined>): void {
    const controller = new AbortController()
    this.active.set(route.id, { controller, params })
    runEnter(`route "${route.id}"`, () => route.enter({ url, params, signal: controller.signal }))
  }

  private leave(id: string): void {
    const current = this.active.get(id)
    if (!current) return
    this.active.delete(id)
    current.controller.abort()
  }
}

function sameParams(
  a: Record<string, string | undefined>,
  b: Record<string, string | undefined>,
): boolean {
  const keys = Object.keys(a)
  return keys.length === Object.keys(b).length && keys.every((key) => a[key] === b[key])
}

// Wire a Site's routes to live navigation: mount site-level chrome, then
// reconcile immediately against the current URL and on every navigation.
// Returns the Router so callers can hold or inspect it.
export function startRouter(site: Site): Router {
  const router = new Router(site)
  router.enterSite()
  observeNavigation((url) => router.reconcile(url))
  router.reconcile(new URL(location.href))
  return router
}
