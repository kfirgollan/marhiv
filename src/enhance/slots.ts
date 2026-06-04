// The Slots engine — the cross-site half of the Enhancement API's UI surface.
//
// A *Slot* is a stable, semantic name for a region of a host AI site's UI (the
// sidebar, the "New session" row, the composer input). Plugins target a slot by
// NAME; a per-route registry of resolvers (defined next to each site) maps that
// name to the live DOM. When the host changes its markup, only the resolver in
// the registry changes — every plugin that targets the slot keeps working. That
// indirection is the whole point: one fix-site instead of N broken plugins.
//
// Slots form a TREE via `parent`. A child resolves *within its parent's
// subtree*, which (1) disambiguates duplicates (e.g. the real composer vs. the
// hidden side-chat composer), (2) lets observers scope to the parent, and (3)
// makes teardown cascade — a parent leaving aborts everything under it. The
// reactive binding mirrors the Router's enter/leave + AbortSignal idiom.

// The shared vocabulary of slot names. Dotted paths mirror the tree. Sites
// implement the subset they have; a plugin targeting a slot a route doesn't
// provide simply never activates there.
export const Slot = {
  Sidebar: 'sidebar',
  SidebarNewSession: 'sidebar.newSession',
  SidebarRecents: 'sidebar.recents',
  UserMenu: 'sidebar.userMenu',
  Composer: 'main.composer',
  ComposerInput: 'composer.input',
} as const

export type SlotKey = (typeof Slot)[keyof typeof Slot]

// One slot's resolution strategy, for one (site, route). `resolve` runs against
// the parent's resolved element (or the document for a root slot) and returns
// the slot's element, or null when it isn't on the page right now.
export interface SlotDef {
  // The slot this one resolves inside. Omit for a root slot (scoped to document).
  readonly parent?: SlotKey
  // Human description — for debugging and a future anchor-health readout.
  readonly description: string
  // Find the element within `scope`. Prefer stable anchors (data-testid,
  // aria-*, data-* keys, design-system classes) over hashed Tailwind classes.
  resolve(scope: ParentNode): Element | null
}

// A site+route's slot resolvers. Partial: a route only binds the slots it has.
export type SlotRegistry = Partial<Record<SlotKey, SlotDef>>

// What a site contributes to the engine: which slots exist on a given route.
export interface SiteEnhancements {
  // The slot registry for a named route, or undefined if the route adds none.
  slotsForRoute(route: string): SlotRegistry | undefined
}

// Resolve a slot to its current element, walking parents top-down so each level
// is scoped to the one above it. Returns null if the slot or any ancestor is
// absent.
function resolveSlot(registry: SlotRegistry, key: SlotKey): Element | null {
  const def = registry[key]
  if (!def) return null
  const scope: ParentNode | null = def.parent ? resolveSlot(registry, def.parent) : document
  return scope ? def.resolve(scope) : null
}

interface PresenceOptions {
  readonly signal: AbortSignal
}

// Run `onPresent` whenever the slot's element is present, re-running if the host
// swaps the node (a React re-render) and aborting the per-presence signal when
// the element goes away or `parentSignal` aborts. A single MutationObserver
// drives it; insertion done inside `onPresent` is idempotent because re-resolving
// returns the same node, so syncing is a no-op.
function watchSlot(
  registry: SlotRegistry,
  key: SlotKey,
  parentSignal: AbortSignal,
  onPresent: (el: Element, opts: PresenceOptions) => void,
): void {
  if (parentSignal.aborted) return
  let current: Element | null = null
  let presence: AbortController | null = null

  const sync = (): void => {
    const el = resolveSlot(registry, key)
    if (el === current) return
    presence?.abort()
    presence = null
    current = el
    if (!el) return
    presence = new AbortController()
    parentSignal.addEventListener('abort', () => presence?.abort(), {
      once: true,
      signal: presence.signal,
    })
    onPresent(el, { signal: presence.signal })
  }

  const observer = new MutationObserver(() => sync())
  observer.observe(document.documentElement, { childList: true, subtree: true })
  parentSignal.addEventListener(
    'abort',
    () => {
      observer.disconnect()
      presence?.abort()
    },
    { once: true },
  )
  sync()
}

// A semantic action a plugin adds to a slot — rendered to look native.
export interface SlotAction {
  // Stable id; also the dedupe key (`data-marhiv-slot-action`) so a re-render
  // can't duplicate the item.
  readonly id: string
  readonly label: string
  onClick(): void
}

// The plugin-facing handle for one slot, scoped to a route's AbortSignal.
export interface SlotHandle {
  // Run a callback each time the slot's element is present (see watchSlot).
  whenPresent(onPresent: (el: Element, opts: PresenceOptions) => void): void
  // Insert a native-looking action button immediately after the slot's element
  // (e.g. under the "New session" row), reusing the host row's styling.
  addAction(action: SlotAction): void
}

const SLOT_ACTION_ATTR = 'data-marhiv-slot-action'

export function createSlotHandle(
  registry: SlotRegistry | undefined,
  key: SlotKey,
  signal: AbortSignal,
): SlotHandle {
  const reg = registry ?? {}
  return {
    whenPresent(onPresent) {
      watchSlot(reg, key, signal, onPresent)
    },
    addAction(action) {
      watchSlot(reg, key, signal, (reference, { signal: present }) => {
        const parent = reference.parentElement
        if (!parent || parent.querySelector(`[${SLOT_ACTION_ATTR}="${action.id}"]`)) return
        const button = document.createElement('button')
        button.type = 'button'
        // Clone the host row's classes so the item inherits native styling, and
        // degrades gracefully if those classes change.
        button.className = (reference as HTMLElement).className
        button.setAttribute(SLOT_ACTION_ATTR, action.id)
        const lead = document.createElement('span')
        lead.className = 'df-leading-slot'
        const label = document.createElement('span')
        label.textContent = action.label
        button.append(lead, label)
        button.addEventListener('click', action.onClick, { signal: present })
        reference.insertAdjacentElement('afterend', button)
        present.addEventListener('abort', () => button.remove(), { once: true })
      })
    },
  }
}
