// Wire protocol between a user script's world (USER_SCRIPT or MAIN, where the
// injected `marhiv` shim runs — see shim.ts) and Marhiv's isolated content-script
// world (where the bridge endpoint with the real PluginContext lives — see
// bridge.ts). Like net-protocol.ts, this module is SIDE-EFFECT FREE: just the
// envelope constants and types, so both worlds can import the shapes without
// pulling in each other's code.
//
// User-authored code can't run in our isolated world (MV3's CSP blocks eval, and
// it'd violate the store policy), so it runs in a separate world via
// chrome.userScripts. That means it can't hold our live PluginContext (DOM nodes,
// AbortSignals, callbacks don't cross worlds). Instead the shim exposes a
// serializable mirror of the API and relays each call across the boundary with
// `window.postMessage` — the same cross-world pattern the network bridge uses.
//
// Security note: these messages are forgeable by the host page (every world shares
// `window`). That's fine — the bridge only performs page-level DOM work the page
// could already do to itself (inject CSS, add a button). No chrome.* capability is
// ever exposed to a script, so a forged message escalates nothing.

// Script world → isolated. A call the script made on the `marhiv` API.
export const US_REQ = 'marhiv:us-req'
// Isolated → script world. A callback firing back into the script (route
// enter/leave, an action click), or the readiness handshake.
export const US_CB = 'marhiv:us-cb'
// Script world → isolated, posted once when the shim loads. Prompts the bridge to
// answer with `ready` so a script that loaded before the bridge still gets served.
export const US_HELLO = 'marhiv:us-hello'

// --- requests (script → isolated) ------------------------------------------

interface UsReqBase {
  source: typeof US_REQ
  // Which user script made the call (the bridge ties effects to it for teardown).
  scriptId: string
}

export interface UsReqInjectCss extends UsReqBase {
  op: 'injectCss'
  css: string
}

export interface UsReqOnRoute extends UsReqBase {
  op: 'onRoute'
  route: string
  // Identifies the script's route handler, so enter/leave callbacks reach it.
  token: string
}

export interface UsReqAddAction extends UsReqBase {
  op: 'addAction'
  // The live route scope (from a routeEnter callback) this action attaches to.
  scopeId: string
  slotKey: string
  action: { id: string; label: string; icon?: string }
  // Identifies the script's onClick, so click callbacks reach it.
  clickToken: string
}

export type UsRequest = UsReqInjectCss | UsReqOnRoute | UsReqAddAction

// --- callbacks (isolated → script) -----------------------------------------

interface UsCbBase {
  source: typeof US_CB
  scriptId: string
}

export interface UsCbReady extends UsCbBase {
  op: 'ready'
}

export interface UsCbRouteEnter extends UsCbBase {
  op: 'routeEnter'
  token: string
  // A fresh id for this entry's scope; the script passes it back on addAction.
  scopeId: string
  // The active URL, serialized (the shim rebuilds a `URL` from it).
  url: string
}

export interface UsCbRouteLeave extends UsCbBase {
  op: 'routeLeave'
  scopeId: string
}

export interface UsCbClick extends UsCbBase {
  op: 'click'
  clickToken: string
}

export type UsCallback = UsCbReady | UsCbRouteEnter | UsCbRouteLeave | UsCbClick

// A script world announcing its shim is live.
export interface UsHello {
  source: typeof US_HELLO
  scriptId: string
}
