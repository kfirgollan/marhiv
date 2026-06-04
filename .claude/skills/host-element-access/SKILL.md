---
description: "Add, observe, or modify elements on the host AI site from a Marhiv Plugin — the right way. Plugins must NOT touch the host DOM directly (no document.querySelector); they go through the Slots engine: route-scoped, named locators with automatic teardown. Use when a plugin needs to add a button/menu item, read or change a host element, or react to part of the page (e.g. add an item under 'New session' on claude.ai/code)."
---

# Access & Modify Host Page Elements

A Plugin that wants to reach into the host AI site — add a sidebar button, badge
a message, read the composer, hide a control — does it through the **Slots
engine**, never with raw `document.querySelector` or ad-hoc DOM code.

Why this is a hard rule: the host's markup is hostile and unstable (hashed
classes, React re-renders that wipe injected nodes, SPA navigation that mounts
and unmounts regions). The Slots engine turns that into a single, named,
route-scoped indirection so that **when the host changes its DOM, one resolver
changes and every plugin keeps working** — instead of N plugins breaking. A
plugin that hand-rolls selectors defeats the entire mechanism.

Consult `docs/taxonomy.md` for **Plugin**, **Plugin Context**, and **Enhancement
API**. The Slot / Route Scope vocabulary lives in code (below) until registered
with `/register-term`.

> This builds on `/plugin-create`. Create (or have) the plugin first; this skill
> is about how its `onLoad` reaches the page.

## The mechanism (three layers)

```
ctx.onRoute(RouteKey.Code, ({ slot, signal }) => {   // 1. ROUTE scope — only on /code, signal aborts on leave
  slot(Slot.SidebarNewSession)                        // 2. SLOT — a named locator resolved for this route
    .addAction({ id, label, onClick })                // 3. PRESENCE binding — native insert, survives re-render, auto-removed
})
```

- **Route scope** — `ctx.onRoute(route, handler)` (`src/plugins/types.ts`,
  implemented in `src/plugins/context.ts`). The handler runs while that named
  route is active and its `signal` aborts on leave. The plugin loads site-wide
  (`meta.matches: ['https://claude.ai/*']`) but scopes on-page work here.
- **Slot** — a stable, semantic name (`Slot.SidebarNewSession`) defined in
  `src/enhance/slots.ts`, mapped to live DOM per route by a resolver in
  `src/sites/<site>/slots.ts`. Slots form a tree via `parent`, so a child
  resolves inside its parent's subtree.
- **Presence binding** — `slot(key).addAction(...)` / `slot(key).whenPresent(...)`.
  A `MutationObserver` re-resolves, fires when the element appears, re-fires if
  the host swaps the node, and aborts the per-presence signal when it disappears.
  Insertion is idempotent. Teardown nests: **plugin unload ⊃ route leave ⊃ slot
  absent**, all `AbortSignal`.

The plugin only ever names a `RouteKey` and a `Slot`. No selectors, no URLs, no
manual teardown.

## Execution

### Step 1: Read the engine and the existing slots

- `src/enhance/slots.ts` — the `Slot` enum, `SlotDef`/`SlotRegistry`, and the
  `SlotHandle` surface (`whenPresent`, `addAction`). This is the cross-site core.
- `src/sites/claude/slots.ts` — the per-route resolver registry (the file that
  changes on a host redesign) + `claudeEnhancements`.
- `src/sites/claude/routes.ts` — the `RouteKey` enum + `matchRoutes`.
- `src/plugins/builtin/claude-code-enhancer/index.ts` — the canonical consumer.

### Step 2: Pick the route

Decide which `RouteKey` the behavior belongs to (e.g. `RouteKey.Code` for
claude.ai/code). If the route doesn't exist, add it to `src/sites/<site>/routes.ts`
(a `URLPattern` + enum member) — that's the one place a path is defined.

### Step 3: Find or add the Slot

- **Slot exists** (it's in the `Slot` enum and the route's registry) → use it.
- **Slot missing** → add it in two places:
  1. A member in the `Slot` enum (`src/enhance/slots.ts`) — the shared name.
  2. A resolver in the route's registry (`src/sites/<site>/slots.ts`).

Write the resolver robustly:

- **Selector priority:** `data-testid` → `data-*` keys (e.g. `data-row-key`,
  `aria-keyshortcuts`) → `aria-label` / `role` → `sr-only` text → stable
  design-system classes (`dframe-*`, `epitaxy-*`, `cds-*`). **Never** hashed
  `_r_xx_` ids or Tailwind hashes — they churn every render.
- **Scope to a parent** (`parent: Slot.X`) so the child resolves inside the
  parent's subtree. This disambiguates duplicates — e.g. the real composer vs.
  the hidden side-chat composer both match `.epitaxy-prompt`; scoping fixes it.
- **Verify against real DOM.** Get the host HTML (inspect, or use the Dev page's
  Export state dump), confirm the anchor exists, and prefer one that reads as
  semantic intent rather than incidental styling.
- Give every `SlotDef` a clear `description` (used for debugging / a future
  anchor-health readout).

### Step 4: Use it from the plugin

In the plugin's `onLoad`, scope to the route and act on the slot. Match the
project style (no semicolons, single quotes):

```ts
import { Slot } from '../../../enhance/slots'
import { RouteKey } from '../../../sites/claude/routes'

onLoad(ctx) {
  ctx.onRoute(RouteKey.Code, ({ slot, signal }) => {
    // add a native-looking item next to a slot
    slot(Slot.SidebarNewSession).addAction({
      id: 'my-action',
      label: 'My Action',
      onClick: () => {/* ... */},
    })

    // or react to an element's presence for richer changes
    slot(Slot.ComposerInput).whenPresent((el, { signal }) => {
      // mutate `el`; wire any listener/observer to `signal` so it tears down
      el.addEventListener('focus', onFocus, { signal })
    })
  })
}
```

### Step 5: Need a verb the SlotHandle doesn't have?

`SlotHandle` ships with `whenPresent` (observe + bind, the general escape hatch)
and `addAction` (insert a native item). If you need a new reusable primitive —
`setText`, `hide`, `badge`, `replaceIcon` — **add it to `SlotHandle` in
`src/enhance/slots.ts`**, not as one-off DOM code in the plugin:

- Implement it in `createSlotHandle` on top of `watchSlot`, so it inherits
  presence tracking, re-render survival, and signal-based teardown.
- Keep it **generic and cross-tool** (every plugin and, later, userscripts share
  it) — this is an **Enhancement API** addition. If it's a real new concept,
  register it with `/register-term`.

`whenPresent` already covers most needs; only promote something to a named verb
when more than one plugin would want it.

### Step 6: Verify

Gates (types/lint/format/duplication/build — not runtime):

```bash
npm run typecheck && npm run lint && npm run format && npm run check:dup && npm run build
```

Then a manual check, because the slot binding only proves out in a live page:
reload the unpacked extension, open a page on the target route, and confirm the
change (a) appears, (b) **survives a host re-render** (e.g. collapse/expand the
section, navigate within the route), (c) **disappears when you leave the route**
and returns on re-entry, and (d) is gone when the plugin is toggled off.

### Step 7: Report

State the route(s) and slot(s) used; whether you added a new `RouteKey`, a new
`Slot` + resolver (and the anchor it keys on), or a new `SlotHandle` verb (flag
that as an Enhancement API addition); that the gates passed; and that runtime was
verified by build only — recommend the manual route/re-render/toggle check.

## Anti-patterns (reject these)

- `document.querySelector(...)` / `document.body.append(...)` inside a plugin →
  use a Slot. If the element has no slot, add one (Step 3).
- Hard-coding a host URL or `location.pathname` check in a plugin → use
  `ctx.onRoute(RouteKey.X, …)`.
- Keying a resolver on a hashed class or `_r_xx_` id → use a stable anchor.
- Adding a listener/observer/element without wiring teardown → bind it to the
  presence/route `signal` (or use a `SlotHandle` verb that does).
- Putting one-off DOM mutation logic in the plugin instead of extending the
  generic `SlotHandle` → promote reusable verbs to the engine.
