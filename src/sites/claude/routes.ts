// Named routes for Claude — the single source of "what /code means".
//
// Like Slots, routes are shared vocabulary: plugins scope behavior to a route
// by NAME (`RouteKey.Code`), never by URL pattern. When Claude moves a path,
// only the pattern here changes; every route-scoped plugin keeps working. The
// content script publishes the active routes to the route store on each
// navigation, and `ctx.onRoute` reacts to them.

export const RouteKey = {
  // The Claude Code surface — claude.ai/code and its sessions.
  Code: 'code',
  // A regular chat thread — claude.ai/chat/:id.
  Chat: 'chat',
  // The new-chat landing — claude.ai/new.
  New: 'new',
} as const

export type RouteKey = (typeof RouteKey)[keyof typeof RouteKey]

const PATTERNS: Record<RouteKey, URLPattern> = {
  [RouteKey.Code]: new URLPattern({ pathname: '/code{/*}?' }),
  [RouteKey.Chat]: new URLPattern({ pathname: '/chat/:id' }),
  [RouteKey.New]: new URLPattern({ pathname: '/new' }),
}

// Every named route the URL currently matches (a URL maps to at most one of
// these today, but the array keeps the contract open).
export function matchRoutes(url: URL): RouteKey[] {
  return (Object.keys(PATTERNS) as RouteKey[]).filter((key) => PATTERNS[key].test(url.href))
}
