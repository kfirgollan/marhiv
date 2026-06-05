// Wire protocol between the MAIN-world network bridge (network-bridge.ts) and the
// isolated-world recorder (marhiv-dev/recorder). MV3 content scripts run in an
// isolated world that can't see the page's own `fetch`/`XHR`, so the bridge runs
// in the page's world, intercepts requests there, and relays each one across the
// world boundary with `window.postMessage`. Both worlds share the same window, so
// the isolated recorder hears it.
//
// This module is deliberately SIDE-EFFECT FREE — just constants and types — so
// the isolated recorder can import the shape without pulling in the bridge's
// `fetch` patching (which must only ever run in the MAIN world).

// Message tag for a captured request/response, MAIN → isolated.
export const NET_MESSAGE = 'marhiv:net'
// Message tag for the recording on/off switch, isolated → MAIN. The bridge stays
// passive (patches installed but silent) until it receives `recording: true`.
export const NET_CONTROL = 'marhiv:net-control'
// Org-id sniffing: the bridge watches the page's own API calls and remembers the
// organization uuid it sees in their URLs (always correct, no cookie/endpoint
// guessing). The isolated world asks for it with NET_ORG_REQUEST; the bridge
// answers — and also volunteers it the moment it first learns it — with NET_ORG.
export const NET_ORG = 'marhiv:net-org'
export const NET_ORG_REQUEST = 'marhiv:net-org-request'

// Matches the organization uuid in a Claude API path, e.g.
// `/v1/.../organizations/<uuid>/environments` or `/api/organizations/<uuid>/…`.
export const ORG_ID_RE =
  /\/organizations\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i

// Request and response bodies are capped to keep a recording a sane size; the
// `*Truncated` flags mark when content was cut.
export const BODY_CAP = 32_768

// A single captured request/response, posted once the response settles.
export interface NetworkMessage {
  source: typeof NET_MESSAGE
  method: string
  url: string
  status: number
  requestBody?: string
  responseBody?: string
  requestBodyTruncated?: boolean
  responseBodyTruncated?: boolean
  // Wall-clock ms (page clock) when the request started, and how long it took.
  startedAt: number
  durationMs: number
}

// The recorder telling the bridge to start or stop emitting.
export interface NetControlMessage {
  source: typeof NET_CONTROL
  recording: boolean
}

// The bridge handing the isolated world the org uuid it sniffed from the page.
export interface NetOrgMessage {
  source: typeof NET_ORG
  orgId: string
}

// The isolated world asking the bridge for the sniffed org uuid.
export interface NetOrgRequestMessage {
  source: typeof NET_ORG_REQUEST
}
