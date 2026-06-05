// Marhiv network bridge — runs in the page's MAIN world.
//
// MV3 content scripts run in an isolated world with their own globals, so they
// can't observe the host SPA's `fetch`/`XMLHttpRequest` calls. This shim runs in
// the page's own world, wraps both, and — while recording is on — relays each
// request's metadata (method, URL, bodies, status, timing) to Marhiv's isolated
// recorder via `window.postMessage`. Injected at document_start so the patch is
// in place before the app issues its first request.
//
// It is PASSIVE by default: the wrappers are always installed (so early requests
// aren't missed) but stay silent until the recorder posts a NET_CONTROL message
// turning recording on. Capture is scoped to claude.ai to keep the dump focused
// on the host's own API rather than analytics/CDN noise.

import {
  BODY_CAP,
  NET_CONTROL,
  NET_FETCH,
  NET_FETCH_RESULT,
  NET_MESSAGE,
  NET_ORG,
  NET_ORG_REQUEST,
  ORG_ID_RE,
  type NetFetchMessage,
  type NetFetchResultMessage,
  type NetOrgMessage,
  type NetworkMessage,
} from './net-protocol'

let recording = false

// The org uuid sniffed from the page's own API calls — always correct, so the
// isolated world needn't guess it from a cookie. Broadcast once, when first seen.
let orgId: string | null = null
function noteOrg(url: string): void {
  if (orgId) return
  const match = url.match(ORG_ID_RE)
  if (!match) return
  orgId = match[1]
  const message: NetOrgMessage = { source: NET_ORG, orgId }
  window.postMessage(message, location.origin)
}

// Perform a GET in the page's own world and relay the result back, so the
// isolated caller gets exactly the auth (cookies + any app fetch-wrapper headers)
// the page itself would send. Uses the CURRENT window.fetch, so an app-level
// wrapper still applies; never throws — failures come back as `error`.
function handleProxyFetch(id: string, url: string): void {
  const reply = (result: Omit<NetFetchResultMessage, 'source' | 'id'>): void => {
    const message: NetFetchResultMessage = { source: NET_FETCH_RESULT, id, ...result }
    window.postMessage(message, location.origin)
  }
  let absolute: string
  try {
    absolute = new URL(url, location.href).href
  } catch {
    reply({ ok: false, status: 0, body: '', error: 'invalid url' })
    return
  }
  void window
    .fetch(absolute, { credentials: 'include', headers: { accept: 'application/json' } })
    .then(async (res) => reply({ ok: res.ok, status: res.status, body: await res.text() }))
    .catch((err: unknown) => reply({ ok: false, status: 0, body: '', error: String(err) }))
}

// Listen for control messages from the isolated world. Guard on `event.source ===
// window` so we only honor messages from this same window (both worlds share it).
window.addEventListener('message', (event: MessageEvent) => {
  if (event.source !== window) return
  const data = event.data as { source?: unknown; recording?: unknown } | null
  if (data?.source === NET_CONTROL) recording = data.recording === true
  // Answer a request for the sniffed org id, if we've seen one.
  if (data?.source === NET_ORG_REQUEST && orgId) {
    const message: NetOrgMessage = { source: NET_ORG, orgId }
    window.postMessage(message, location.origin)
  }
  // Run a first-party GET on the caller's behalf.
  if (data?.source === NET_FETCH) {
    const m = data as unknown as NetFetchMessage
    handleProxyFetch(m.id, m.url)
  }
})

// Only host requests are interesting; relative URLs resolve against claude.ai, so
// they pass too. Anything off-host (analytics, CDNs, fonts) is dropped.
function isHostRequest(url: string): boolean {
  try {
    return new URL(url, location.href).hostname.endsWith('claude.ai')
  } catch {
    return false
  }
}

function cap(text: string): { body: string; truncated: boolean } {
  return text.length > BODY_CAP
    ? { body: text.slice(0, BODY_CAP), truncated: true }
    : { body: text, truncated: false }
}

function emit(entry: Omit<NetworkMessage, 'source'>): void {
  const message: NetworkMessage = { source: NET_MESSAGE, ...entry }
  window.postMessage(message, location.origin)
}

// Best-effort stringify of a fetch request body. FormData/Blob/streams can't be
// read without consuming them, so they're labelled rather than inlined.
function describeRequestBody(body: BodyInit | null | undefined): string | undefined {
  if (body == null) return undefined
  if (typeof body === 'string') return body
  if (body instanceof URLSearchParams) return body.toString()
  if (body instanceof FormData) return `[FormData: ${Array.from(body.keys()).join(', ')}]`
  if (body instanceof Blob) return `[Blob ${body.size}b ${body.type}]`
  return '[unserializable body]'
}

// --- fetch -----------------------------------------------------------------
const originalFetch = window.fetch
window.fetch = function (
  this: typeof globalThis,
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const call = originalFetch.call(this, input, init)
  const url = input instanceof Request ? input.url : String(input)
  noteOrg(url)
  if (!recording) return call
  if (!isHostRequest(url)) return call

  const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()
  // A Request's body is a consumed stream we can't safely read; only inline a
  // body passed via `init`.
  const requestBody = input instanceof Request ? undefined : describeRequestBody(init?.body)
  const startedAt = Date.now()
  const startedPerf = performance.now()

  return call.then((response) => {
    void response
      .clone()
      .text()
      .then((text) => {
        const req = requestBody !== undefined ? cap(requestBody) : null
        const res = cap(text)
        emit({
          method,
          url,
          status: response.status,
          requestBody: req?.body,
          requestBodyTruncated: req?.truncated,
          responseBody: res.body,
          responseBodyTruncated: res.truncated,
          startedAt,
          durationMs: Math.round(performance.now() - startedPerf),
        })
      })
      .catch(() => {
        /* response not readable as text (e.g. opaque) — skip body */
      })
    return response
  })
}

// --- XMLHttpRequest --------------------------------------------------------
// Stash the per-instance call metadata on the object so `send`/`load` can read
// what `open` saw, without a shared map that would leak across instances.
interface TrackedXhr extends XMLHttpRequest {
  __marhiv?: {
    method: string
    url: string
    requestBody?: string
    startedAt: number
    startedPerf: number
  }
}

const originalOpen = XMLHttpRequest.prototype.open
XMLHttpRequest.prototype.open = function (
  this: TrackedXhr,
  method: string,
  url: string | URL,
  ...rest: unknown[]
): void {
  this.__marhiv = {
    method: method.toUpperCase(),
    url: String(url),
    startedAt: 0,
    startedPerf: 0,
  }
  noteOrg(String(url))
  // Preserve the native signature; `rest` carries async/user/password.
  return (originalOpen as (this: XMLHttpRequest, ...a: unknown[]) => void).call(
    this,
    method,
    url,
    ...rest,
  )
}

const originalSend = XMLHttpRequest.prototype.send
XMLHttpRequest.prototype.send = function (
  this: TrackedXhr,
  body?: Document | XMLHttpRequestBodyInit | null,
): void {
  const tracked = this.__marhiv
  if (recording && tracked && isHostRequest(tracked.url)) {
    tracked.requestBody = describeRequestBody(body as BodyInit | null | undefined)
    tracked.startedAt = Date.now()
    tracked.startedPerf = performance.now()
    this.addEventListener('load', () => {
      let responseText = ''
      try {
        // responseText throws for responseType 'arraybuffer'/'blob'; tolerate it.
        responseText =
          this.responseType === '' || this.responseType === 'text' ? this.responseText : ''
      } catch {
        responseText = ''
      }
      const req = tracked.requestBody !== undefined ? cap(tracked.requestBody) : null
      const res = cap(responseText)
      emit({
        method: tracked.method,
        url: tracked.url,
        status: this.status,
        requestBody: req?.body,
        requestBodyTruncated: req?.truncated,
        responseBody: res.body,
        responseBodyTruncated: res.truncated,
        startedAt: tracked.startedAt,
        durationMs: Math.round(performance.now() - tracked.startedPerf),
      })
    })
  }
  return originalSend.call(this, body ?? null)
}
