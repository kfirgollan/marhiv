// The recording data model — the shape of the JSON a recording session produces.
//
// A recording is a header plus one ordered `timeline` of entries, each stamped
// with `t` (ms since the session started) so cause → effect is reconstructable:
// a click, the DOM mutations it triggered, the network call it fired, and any
// navigation that followed all interleave on one clock.

// A robust, serializable description of a DOM element — enough to re-identify it
// later and author a Slot resolver against it. Favors the stable anchors Claude's
// resolvers already key on (aria-*, data-testid, data-row-key) over hashed
// classes, and records which Slot (if any) the element belongs to.
export interface ElementDescriptor {
  tag: string
  id?: string
  classes?: string[]
  // Trimmed, capped text content — to recognize "the cogwheel" / "Save" by label.
  text?: string
  // Stable identifying attributes (data-*, aria-*, role, title, name, type, …).
  attrs?: Record<string, string>
  // An nth-child CSS path from a stable ancestor — a last-resort locator.
  cssPath: string
  // The semantic Slot this element is, or sits inside, when one matches.
  slot?: string
}

export type TimelineEntry =
  | {
      t: number
      type: 'event'
      kind: string
      target: ElementDescriptor
      // Verbatim input value (the user opted into full capture), or pressed key.
      value?: string
      key?: string
    }
  | {
      t: number
      type: 'mutation'
      added: ElementDescriptor[]
      removed: ElementDescriptor[]
      attrs: Array<{ target: ElementDescriptor; name: string; value: string | null }>
    }
  | {
      t: number
      type: 'network'
      method: string
      url: string
      status: number
      requestBody?: string
      responseBody?: string
      requestBodyTruncated?: boolean
      responseBodyTruncated?: boolean
      durationMs: number
    }
  | { t: number; type: 'navigation'; url: string; routes: string[] }
  | {
      t: number
      type: 'error'
      // Where it came from: an uncaught error, a rejected promise, or console.error
      // (which React and Marhiv use to report problems).
      kind: 'error' | 'rejection' | 'console'
      message: string
      stack?: string
    }

export interface Recording {
  meta: {
    marhivVersion: string
    startedAt: string
    startHref: string
    userAgent: string
    durationMs: number
    counts: RecorderCounts
  }
  timeline: TimelineEntry[]
}

// Live tallies surfaced in the Dev page while a session runs.
export interface RecorderCounts {
  events: number
  mutations: number
  network: number
  navigations: number
  errors: number
}
