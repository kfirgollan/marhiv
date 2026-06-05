// Marhiv's logger.
//
// Every line is `[marhiv]`-prefixed so it stays greppable even when the host page
// (or an ad blocker) floods the console. Prefer this over `console.*` everywhere,
// so logging is consistent and a filter on "marhiv" always surfaces exactly our
// output.
//
// Verbosity is build/install-aware: a locally-loaded (unpacked) extension logs
// `debug` and up; a packaged (store-installed) one logs `info` and up. So
// `log.debug` is for the noisy, trace-level "what's happening" detail that's
// invaluable while developing but should stay out of a shipped build's console.
//
// `warn`/`error` are always kept in a small ring buffer (regardless of level), so
// the Dev page's diagnostics export can include "what recently went wrong"
// without the user copying the console by hand. Guiding principle: nothing Marhiv
// does should fail silently — if a code path bails on an unexpected condition, it
// should say so through here.

const PREFIX = '[marhiv]'
const RING_MAX = 50

export interface LogEntry {
  at: string
  level: 'warn' | 'error'
  message: string
}

const ring: LogEntry[] = []

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent'
const RANK: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40, silent: 99 }

// Verbose when loaded locally (unpacked), quiet when packaged: an explicit release
// build forces info+, otherwise a store-installed extension (one with an
// `update_url` in its manifest) logs info+ and an unpacked load logs debug. The
// same artifact is thus chatty while you develop and quiet once published.
function defaultLevel(): LogLevel {
  if (__MARHIV_RELEASE__) return 'info'
  try {
    return 'update_url' in chrome.runtime.getManifest() ? 'info' : 'debug'
  } catch {
    return 'info' // no chrome.* (e.g. a unit test) — stay conservative
  }
}

let threshold = RANK[defaultLevel()]

// Override the level at runtime — e.g. a debug toggle that cranks verbosity on a
// packaged install, or 'silent' to mute everything.
export function setLogLevel(level: LogLevel): void {
  threshold = RANK[level]
}

// The active level — for the startup banner and the diagnostics export.
export function currentLevel(): LogLevel {
  return (Object.keys(RANK) as LogLevel[]).find((level) => RANK[level] === threshold) ?? 'info'
}

// Render one log/console argument to a string (for the ring buffer and the dev
// recorder). Exported so both share one implementation.
export function stringify(arg: unknown): string {
  if (typeof arg === 'string') return arg
  if (arg instanceof Error) return arg.stack ?? arg.message
  try {
    return JSON.stringify(arg)
  } catch {
    return String(arg)
  }
}

function record(level: 'warn' | 'error', args: unknown[]): void {
  ring.push({ at: new Date().toISOString(), level, message: args.map(stringify).join(' ') })
  if (ring.length > RING_MAX) ring.shift()
}

export const log = {
  debug(...args: unknown[]): void {
    if (RANK.debug >= threshold) console.debug(PREFIX, ...args)
  },
  info(...args: unknown[]): void {
    if (RANK.info >= threshold) console.info(PREFIX, ...args)
  },
  warn(...args: unknown[]): void {
    record('warn', args)
    if (RANK.warn >= threshold) console.warn(PREFIX, ...args)
  },
  error(...args: unknown[]): void {
    record('error', args)
    if (RANK.error >= threshold) console.error(PREFIX, ...args)
  },
}

// The recent warnings/errors Marhiv recorded on this page — for the diagnostics
// export. A copy, so callers can't mutate the buffer.
export function recentLogs(): LogEntry[] {
  return [...ring]
}

// Route uncaught errors and rejected promises that originate IN Marhiv into the
// logger + ring buffer, so nothing escapes unseen. Attributed by the extension id
// in the error's file/stack, so the host page's own errors (which share this
// window) aren't mislabeled as ours. Bound to `signal` for teardown.
export function installGlobalErrorSink(signal?: AbortSignal): void {
  const ours = (text: string | undefined): boolean => !!text && text.includes(chrome.runtime.id)

  window.addEventListener(
    'error',
    (e: ErrorEvent) => {
      const stack = e.error instanceof Error ? e.error.stack : undefined
      if (ours(e.filename) || ours(stack)) log.error('uncaught:', e.message, stack ?? '')
    },
    { signal },
  )
  window.addEventListener(
    'unhandledrejection',
    (e: PromiseRejectionEvent) => {
      const reason: unknown = e.reason
      const stack = reason instanceof Error ? reason.stack : undefined
      if (ours(stack)) {
        log.error('unhandled rejection:', reason instanceof Error ? reason.message : String(reason))
      }
    },
    { signal },
  )
}
