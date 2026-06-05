// The recorder — the isolated-world half of record mode.
//
// On start it switches the MAIN-world network bridge on (NET_CONTROL) and wires
// four capture streams onto one timeline: user events and DOM mutations (the
// isolated world shares the host DOM, so these need no bridge), navigations, and
// the network messages the bridge relays. Everything is held under one
// AbortController; stop() tears it all down and returns the assembled Recording.
//
// NOTE — Slots-only exception: a Plugin normally touches the host page only
// through the Slots engine. This recorder instead observes the whole document
// directly. That's deliberate and acceptable here because it is READ-ONLY and
// GLOBAL by nature: a diagnostic that captures the entire page can't be expressed
// as a targeted, route-scoped slot. It mutates nothing on the host.

import { observeNavigation } from '../../../../routing/navigation'
import { matchRoutes } from '../../../../sites/claude'
import {
  NET_CONTROL,
  NET_MESSAGE,
  type NetControlMessage,
  type NetworkMessage,
} from '../../../../content/net-protocol'
import { stringify } from '../../../../log'
import { describe, liveSlots } from './descriptor'
import type { ElementDescriptor, Recording, RecorderCounts, TimelineEntry } from './model'

// Per-mutation-batch caps, so a single host re-render can't flood the timeline.
const MUTATION_NODE_CAP = 30
// Cap captured errors — an ad blocker can emit thousands of console.errors, which
// would otherwise bloat the recording and thrash re-renders.
const MAX_ERRORS = 100
// Events to capture, in the capturing phase so a host `stopPropagation` can't
// hide them from us.
const CAPTURED_EVENTS = ['click', 'input', 'change', 'submit'] as const

function setBridgeRecording(recording: boolean): void {
  const message: NetControlMessage = { source: NET_CONTROL, recording }
  window.postMessage(message, location.origin)
}

// A named key, or any modifier combo, is worth recording; bare printable keys
// arrive via `input` already, so they'd only be noise.
function isInterestingKey(e: KeyboardEvent): boolean {
  return e.key.length > 1 || e.ctrlKey || e.metaKey || e.altKey
}

function isMarhivNode(el: Element): boolean {
  return (
    el.id.startsWith('marhiv') ||
    el.className.toString().includes('marhiv') ||
    Array.from(el.attributes).some((a) => a.name.startsWith('data-marhiv'))
  )
}

// The editable value behind an input event — a form control's `value`, or the
// text of a contenteditable (Claude's composer). Captured verbatim by choice.
function editableValue(el: Element): string | undefined {
  if (
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    el instanceof HTMLSelectElement
  )
    return el.value
  if (el instanceof HTMLElement && el.isContentEditable) return el.innerText
  return undefined
}

export class Recorder {
  private timeline: TimelineEntry[] = []
  private counts: RecorderCounts = {
    events: 0,
    mutations: 0,
    network: 0,
    navigations: 0,
    errors: 0,
  }
  private startedAtIso = ''
  private startHref = ''
  private startPerf = 0
  private controller: AbortController | null = null
  private observer: MutationObserver | null = null
  private stopNav: (() => void) | null = null
  private originalConsoleError: typeof console.error | null = null
  private readonly listeners = new Set<() => void>()

  get recording(): boolean {
    return this.controller !== null
  }

  // A live snapshot of the running tallies, for the Dev page readout.
  getCounts(): RecorderCounts {
    return this.counts
  }

  // Subscribe to state changes (counts ticking, start/stop). Returns an
  // unsubscribe. The recorder outlives any one panel mount, so the UI observes
  // it from outside rather than owning it.
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify(): void {
    for (const listener of this.listeners) listener()
  }

  private now(): number {
    return Math.round(performance.now() - this.startPerf)
  }

  private push(entry: TimelineEntry, kind: keyof RecorderCounts): void {
    this.timeline.push(entry)
    this.counts[kind] += 1
    this.notify()
  }

  start(): void {
    if (this.controller) return
    this.timeline = []
    this.counts = { events: 0, mutations: 0, network: 0, navigations: 0, errors: 0 }
    this.startedAtIso = new Date().toISOString()
    this.startHref = location.href
    this.startPerf = performance.now()
    const controller = new AbortController()
    this.controller = controller
    const { signal } = controller

    for (const type of CAPTURED_EVENTS) {
      document.addEventListener(type, (e) => this.onEvent(e), { capture: true, signal })
    }
    document.addEventListener('keydown', (e) => this.onKeydown(e), { capture: true, signal })

    this.observer = new MutationObserver((records) => this.onMutations(records))
    this.observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
    })

    this.stopNav = observeNavigation((url) => {
      this.push(
        { t: this.now(), type: 'navigation', url: url.href, routes: matchRoutes(url) },
        'navigations',
      )
    })

    window.addEventListener('message', this.onMessage, { signal })

    // Error capture — the point of recording a failing flow. Uncaught errors and
    // rejected promises come through window events; console.error catches what
    // React and Marhiv log (e.g. a failed env fetch's URL + status).
    window.addEventListener(
      'error',
      (e) => this.pushError('error', e.message, (e.error as Error | undefined)?.stack),
      { signal },
    )
    window.addEventListener(
      'unhandledrejection',
      (e) => {
        const reason: unknown = e.reason
        this.pushError(
          'rejection',
          reason instanceof Error ? reason.message : String(reason),
          reason instanceof Error ? reason.stack : undefined,
        )
      },
      { signal },
    )
    this.originalConsoleError = console.error
    console.error = (...args: unknown[]): void => {
      this.pushError('console', args.map(stringify).join(' '))
      this.originalConsoleError?.apply(console, args)
    }

    setBridgeRecording(true)
    this.notify()
  }

  private pushError(
    kind: 'error' | 'rejection' | 'console',
    message: string,
    stack?: string,
  ): void {
    if (this.counts.errors >= MAX_ERRORS) return
    this.push(
      { t: this.now(), type: 'error', kind, message, ...(stack ? { stack } : {}) },
      'errors',
    )
  }

  stop(): Recording {
    setBridgeRecording(false)
    this.controller?.abort()
    this.observer?.disconnect()
    this.stopNav?.()
    if (this.originalConsoleError) {
      console.error = this.originalConsoleError
      this.originalConsoleError = null
    }
    this.controller = null
    this.observer = null
    this.stopNav = null

    const recording: Recording = {
      meta: {
        marhivVersion: chrome.runtime.getManifest().version,
        startedAt: this.startedAtIso,
        startHref: this.startHref,
        userAgent: navigator.userAgent,
        durationMs: this.now(),
        counts: { ...this.counts },
      },
      timeline: this.timeline,
    }
    this.notify()
    return recording
  }

  private onEvent(e: Event): void {
    const target = e.target
    if (!(target instanceof Element) || isMarhivNode(target)) return
    const value = e.type === 'input' || e.type === 'change' ? editableValue(target) : undefined
    this.push(
      {
        t: this.now(),
        type: 'event',
        kind: e.type,
        target: describe(target),
        ...(value !== undefined ? { value } : {}),
      },
      'events',
    )
  }

  private onKeydown(e: KeyboardEvent): void {
    const target = e.target
    if (!(target instanceof Element) || isMarhivNode(target) || !isInterestingKey(e)) return
    const combo = [
      e.ctrlKey && 'Ctrl',
      e.metaKey && 'Meta',
      e.altKey && 'Alt',
      e.shiftKey && 'Shift',
      e.key,
    ]
      .filter(Boolean)
      .join('+')
    this.push(
      { t: this.now(), type: 'event', kind: 'keydown', target: describe(target), key: combo },
      'events',
    )
  }

  private onMutations(records: MutationRecord[]): void {
    const slots = liveSlots()
    const added: ElementDescriptor[] = []
    const removed: ElementDescriptor[] = []
    const attrs: Array<{ target: ElementDescriptor; name: string; value: string | null }> = []

    for (const record of records) {
      if (record.target instanceof Element && isMarhivNode(record.target)) continue
      if (
        record.type === 'attributes' &&
        record.target instanceof Element &&
        record.attributeName
      ) {
        attrs.push({
          target: describe(record.target, slots),
          name: record.attributeName,
          value: record.target.getAttribute(record.attributeName),
        })
      }
      for (const node of Array.from(record.addedNodes)) {
        if (node instanceof Element && !isMarhivNode(node) && added.length < MUTATION_NODE_CAP)
          added.push(describe(node, slots))
      }
      for (const node of Array.from(record.removedNodes)) {
        if (node instanceof Element && !isMarhivNode(node) && removed.length < MUTATION_NODE_CAP)
          removed.push(describe(node, slots))
      }
    }

    if (!added.length && !removed.length && !attrs.length) return
    this.push({ t: this.now(), type: 'mutation', added, removed, attrs }, 'mutations')
  }

  // Bound so add/removeEventListener see the same reference.
  private onMessage = (event: MessageEvent): void => {
    if (event.source !== window) return
    const data = event.data as Partial<NetworkMessage> | null
    if (data?.source !== NET_MESSAGE) return
    const m = data as NetworkMessage
    this.push(
      {
        t: this.now(),
        type: 'network',
        method: m.method,
        url: m.url,
        status: m.status,
        ...(m.requestBody !== undefined ? { requestBody: m.requestBody } : {}),
        ...(m.responseBody !== undefined ? { responseBody: m.responseBody } : {}),
        ...(m.requestBodyTruncated ? { requestBodyTruncated: true } : {}),
        ...(m.responseBodyTruncated ? { responseBodyTruncated: true } : {}),
        durationMs: m.durationMs,
      },
      'network',
    )
  }
}

// The page-level recording session. A singleton, not panel state: a recording
// must survive the panel (and the whole Dev page) unmounting when the user
// clicks away to perform the flow being recorded. It lives for the content
// script's lifetime — across panel open/close and SPA navigations alike — so the
// Dev page can reconnect to an in-progress session and still stop it.
export const recorder = new Recorder()
