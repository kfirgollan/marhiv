---
description: 'Decide where a piece of state lives and wire it correctly in Marhiv: ephemeral state in a Zustand store (src/store/), durable state in chrome.storage (src/storage/) wrapped by a reactive store, and how to hydrate, sync across tabs, and write through. Use when adding or reviewing any client state — settings, toggles, live readouts, cross-tab values.'
---

# Manage state (Zustand + storage)

Marhiv keeps state in **two layers**. New state almost always touches both, and
putting a value in the wrong layer is the most common mistake — so decide
deliberately before writing code.

```
src/storage/*   Durable, cross-context source of truth.
                chrome.storage.local + onChanged. Persists across reloads and
                syncs across every page/tab (and, later, popup/background).
      ▲ wrapped by
src/store/*     Reactive, in-memory layer the UI consumes (Zustand).
                Per JS context. React reads it with hooks; non-React code reads
                it with getState()/subscribe().
```

The keystone rule: **`chrome.storage` is the only thing that crosses contexts
and survives reloads. Zustand state is per-context and disappears on reload.**
So anything that must persist or sync lives in `src/storage/*`; the Zustand
store is a reactive cache layered on top.

Canonical files to read before starting:

- `src/store/route.ts` — ephemeral store (no persistence).
- `src/store/persisted.ts` — `createPersistedStore`, the storage→Zustand bridge.
- `src/store/panel.ts`, `src/store/plugins.ts` — persisted stores.
- `src/storage/persisted.ts` — `createPersistedValue`, the chrome.storage primitive.
- `src/storage/panel.ts`, `src/storage/plugins.ts` — `PersistedValue` definitions.

## Input

Arguments: $ARGUMENTS

If invoked to add or change state, interpret flexibly: what the value is, who
reads/writes it, and whether it must survive reloads or sync across tabs. When
used with no clear task, treat this file as the reference and apply it to the
state in question. Ask only when persistence/cross-context behavior is genuinely
ambiguous — it determines the layer.

## Decision: where does this state go?

Answer two questions.

**1. Must it survive a page reload, or be shared across tabs / the popup /
background?**

- **No → Ephemeral.** Zustand store in `src/store/*`, no storage. It lives for
  the document and resets on reload. Examples: the current route, transient UI
  flags. Pattern **A**.
- **Yes → Persisted.** A `PersistedValue<T>` in `src/storage/*` **plus** a
  `createPersistedStore` wrapper in `src/store/*`. Examples: panel size, last-open
  page, plugin enable/disable, Menu Ball position. Pattern **B**.

**2. Who reads and writes it?**

- **React components** → consume the store with a hook + selector. Pattern **C**.
- **Non-React code** (router, Plugin Manager, the indicator) → use
  `store.getState()` / `store.subscribe()` for an ephemeral store, or the
  storage layer's loose `load`/`save`/`onChange` for a persisted one. Both stay
  consistent with the React side because the persisted store subscribes to
  `chrome.storage.onChanged`, which fires in **every** context — including the
  one that made the write. Pattern **C**.

Default for genuinely new state: put it in `src/store/*`. The exception is a
value that is **read-only in React and whose only writer is non-React code** —
that may stay purely on the storage layer (this is why `position` is read with
`loadPosition`/`onPositionChange` in `Panel.tsx` rather than a store; its sole
writer is the vanilla Menu Ball). When in doubt, use a store.

## Patterns

### A. Ephemeral state (in-memory, per document)

A plain Zustand store. No storage, no hydration, no sync. See `src/store/route.ts`.

```ts
import { create } from 'zustand'

interface FooState {
  value: string
  set: (value: string) => void
}

export const useFooStore = create<FooState>((set) => ({
  value: '',
  set: (value) => set({ value }),
}))
```

Non-React writers call `useFooStore.getState().set(x)`; the router publishes the
route exactly this way in `reconcile()`.

### B. Persisted state (survives reload, syncs across tabs)

Two pieces. First a `PersistedValue<T>` in `src/storage/*` — never re-implement
`chrome.storage` plumbing (the duplication gate forbids it); always go through
`createPersistedValue`, which gives you `load`/`save`/`onChange`:

```ts
// src/storage/foo.ts
import { createPersistedValue } from './persisted'

export interface Foo {
  /* … */
}

function isFoo(value: unknown): value is Foo {
  /* validate shape — runs on every read */
}

export const fooValue = createPersistedValue<Foo>('foo', isFoo)
```

Then wrap it in a reactive store with `createPersistedStore`, which hydrates from
storage on creation, keeps in sync with other tabs via `onChange`, and writes
back through on update:

```ts
// src/store/foo.ts
import { fooValue, type Foo } from '../storage/foo'
import { createPersistedStore } from './persisted'

const DEFAULT_FOO: Foo = {
  /* … */
}

export const useFooStore = createPersistedStore<Foo>(fooValue, DEFAULT_FOO)
```

The initial value must be a real `T` (non-null). For "nothing chosen yet" use a
sentinel and resolve it at the edge — e.g. the panel-page store defaults to `''`
and `Panel.tsx` falls back to its first page. Avoid a nullable
"not-loaded-yet" store unless the UI genuinely must render nothing until
hydration (rare); prefer a sane default.

If a non-React consumer also needs the persisted value (like the Plugin
Manager), keep the loose `load`/`onChange` exports in the storage module for it
and let it stay on the storage layer — do **not** give it the Zustand hook.

### C. Reading and writing state

**In React** — hook with a selector, so the component re-renders only when its
slice changes (Zustand compares selector output with `Object.is`):

```tsx
const value = useFooStore((s) => s.value)
const set = useFooStore((s) => s.set) // action identities are stable
```

Select narrowly. Don't select the whole store object — that re-renders on every
change. See `Panel.tsx` and `PluginsPage.tsx`.

**In non-React code** — use the vanilla store API:

```ts
useFooStore.getState().value
useFooStore.getState().set(next)
const unsubscribe = useFooStore.subscribe((s) => {
  /* react to changes */
})
```

### D. High-frequency updates (drag / scroll / typing through to storage)

A persisted store from `createPersistedStore` exposes three updaters so a gesture
doesn't write to `chrome.storage` on every frame:

- `set(value)` — update memory **and** persist. The common, one-shot case
  (toggling a checkbox, selecting a page).
- `setLocal(value)` — update memory **only**. Use during a drag/scroll.
- `persist()` — persist whatever is currently in memory. Call once on release.

The panel resize uses `setLocal` on every pointer move and `persist()` on
pointer-up (see `Panel.tsx`), so a drag produces one storage write, not sixty.

## How load + sync works (the lifecycle)

`createPersistedStore` wires this for you; understand it so you don't fight it:

1. **Create** — the store starts at `initial`.
2. **Hydrate** — `persisted.load()` resolves and overwrites `value` with the
   stored value (if any). Asynchronous, so the first render shows `initial`.
3. **Sync** — the store subscribes to `persisted.onChange`. When **any** context
   writes (this tab or another), `chrome.storage.onChanged` fires everywhere and
   the store updates. This is what keeps tabs — and the storage-layer and
   store-layer consumers — consistent.
4. **Write** — `set`/`persist` call `persisted.save()`, which triggers (3)
   everywhere, including a harmless same-value echo back into this store
   (selector equality means no needless re-render).

Because of (3), you never manually push updates between contexts or between the
two layers — write to one place and the change propagates.

## Rules & pitfalls

- **Don't persist by hand.** Reuse `createPersistedValue` and
  `createPersistedStore`; duplicating the load/save/onChange or hydrate/sync
  blocks trips the jscpd gate (threshold 0). Fix duplication by extracting, not
  by raising the threshold.
- **Don't put cross-context state only in Zustand.** It won't persist or sync.
  It must be backed by a `PersistedValue`.
- **One store per logical value** (module singleton). Don't create a second
  `PersistedValue` for the same key — wrap the existing one.
- **Select narrowly** in React; never `useStore((s) => s)`.
- **Keep non-React consumers on the layer that fits** — ephemeral store via
  `getState`/`subscribe`, persisted value via the loose storage exports. Don't
  import React hooks into non-React modules.
- **Initial value is non-null `T`.** Use a sentinel + edge fallback instead of a
  nullable store when you can.

## Execution (when adding state)

1. Read the canonical files listed above.
2. Run the decision: ephemeral vs persisted; React vs non-React consumers.
3. Create the storage piece if persisted (`src/storage/<name>.ts` via
   `createPersistedValue`), then the store (`src/store/<name>.ts`). For ephemeral
   state, just the store.
4. Wire consumers: hooks+selectors in React; `getState`/`subscribe` or the
   storage layer in non-React code.
5. For drag/scroll-style updates, use `setLocal` + `persist`.

## Verify

Run the gates and fix anything they flag:

```bash
npm run typecheck
npm run lint
npm run format
npm run check:dup
npm run build
```

Behavior is verified by build/typecheck, not a browser; for persisted, cross-tab
state, suggest a quick two-tab click-through (change in one tab, confirm the
other updates) since that path isn't exercised by the gates.

## Report

State what was added, which layer(s) it landed in and why, the storage key (if
persisted), how it's consumed (React hook vs vanilla), and that the gates passed.
If this introduced a new project concept (e.g. a new kind of store), consider
`/register-term` to capture the vocabulary in `docs/taxonomy.md`.
