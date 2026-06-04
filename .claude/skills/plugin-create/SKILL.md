---
description: 'Create a new Marhiv Plugin — scaffolds the plugin module under src/plugins/builtin/, wires its lifecycle (onLoad/onUnload + PluginContext), and registers it so it gets an enable/disable toggle. Use when the user wants to add a plugin/enhancement to Marhiv. For theme/restyling plugins specifically, use /plugin-create-theme (which builds on this).'
---

# Create Plugin

Add a new **Plugin** to Marhiv: a curated enhancement that targets one or more
AI sites and adds behavior through lifecycle hooks. The enable/disable toggle,
its persisted state, the Plugins page row, and live load/unload on toggle all
come for free — you write the plugin module and register it; the **Plugin
Manager** does the rest.

Consult `docs/taxonomy.md` for the precise meaning of **Plugin**, **Plugin
Manager**, **Plugin Context**, and **Enhancement API** before starting.

> Building a **theme** (restyling the host page's colors/look)? Use
> `/plugin-create-theme` instead — it builds on this skill with the
> token-discovery workflow and brand mapping themes need. Come back here for the
> plugin mechanics.

## Input

Arguments: $ARGUMENTS

Interpret flexibly; infer sensible defaults and only ask when a required choice
is genuinely ambiguous:

- **id** — stable, unique, kebab-case (e.g. `auto-scroll`, `marhiv-theme`). This
  is the storage key for the plugin's enabled state and the `data-marhiv-plugin`
  tag on anything it injects. Derive from the name if not given.
- **name** — human-facing, shown in the Plugins page (e.g. `Auto Scroll`).
- **description** — one line, shown under the name in the Plugins table.
- **matches** — URL pattern(s) the plugin targets (e.g. `['https://claude.ai/*']`).
  See the constraint in Step 2.
- **defaultEnabled** — whether a fresh install starts with it on. Defaults to
  `false` (don't change a host site unprompted unless the user asks).
- **behavior** — what `onLoad` does. If vague, scaffold a minimal, clearly
  commented `onLoad` rather than inventing behavior.

## Background: how a Plugin works

A Plugin is a plain object — `{ meta, onLoad, onUnload? }` (see
`src/plugins/types.ts`):

```ts
export interface Plugin {
  meta: PluginMeta // id, name, description, matches[], defaultEnabled?
  onLoad(ctx: PluginContext): void | Promise<void>
  onUnload?(ctx: PluginContext): void | Promise<void>
}
```

The **Plugin Manager** (`src/plugins/manager.ts`) owns the lifecycle on a page:

- It calls **`onLoad`** when the plugin is enabled **and** its `matches` fit the
  current URL.
- It calls **`onUnload`** when the plugin is disabled or the URL stops matching
  (it also reacts live to toggles in this or another tab, and to SPA navigation).
- It hands both hooks a **Plugin Context** (`src/plugins/context.ts`) — the
  capabilities Marhiv lends the plugin. Today that's `injectCss(css)` (inject a
  tracked `<style>` into the host page), `registerPage(page)` (contribute a Panel
  Page + its menu item to the settings Panel), and `stores` (read-only access to
  Marhiv's reactive app stores). Everything created through the context is
  **tracked**, so the manager reverses it automatically on unload.

The key consequence: **anything you do through the context is torn down for you,
so most plugins need no `onUnload`.** If you mutate the page outside the context
(add elements, listeners, observers), you must undo it in `onUnload`.

## Execution

### Step 1: Read the current state

Read these to match the established shape:

- `src/plugins/types.ts` — the `Plugin` / `PluginMeta` / `PluginContext` contract.
- `src/plugins/builtin/marhiv-theme/index.ts` — the canonical example plugin.
- `src/plugins/registry.ts` — the `BUILTIN_PLUGINS` array.
- `src/plugins/manager.ts` — skim so you understand when `onLoad`/`onUnload` fire.

Confirm the chosen `id` isn't already used by an entry in `BUILTIN_PLUGINS`.

### Step 2: Check the `matches` constraint

`meta.matches` is the **finer, per-plugin** gate. The **coarse** gate is the
content script's `matches` in `manifest.config.ts` — the script only runs on
sites declared there (currently `https://claude.ai/*`). So:

- Targeting a page within an already-covered site (e.g. `https://claude.ai/code`)
  → just set `meta.matches`; no manifest change.
- Targeting a **new** AI site (e.g. `chatgpt.com`) → that needs a new per-site
  content script + manifest entry (a bigger change, out of scope here). Flag it
  to the user rather than silently setting unreachable `matches`.

Use the narrowest pattern that fits (the project convention: prefer per-site
activation over broad matching).

### Step 3: Decide whether the Plugin Context is enough

- **Injecting CSS is all you need** → great, `injectCss` covers it (this is the
  theme case → `/plugin-create-theme`).
- **You need a capability the context doesn't expose** (e.g. observe the DOM,
  add UI, register a command, read/write plugin settings) → you're **extending
  the Enhancement API**. Do it deliberately:
  1. Add the method to `PluginContext` in `src/plugins/types.ts`.
  2. Implement it in `createPluginContext` in `src/plugins/context.ts`, and
     **track whatever it creates** so `dispose()` reverses it (mirror how
     `injectCss` pushes to `injected[]` and removes them on dispose). This is
     what lets plugins stay `onUnload`-free.
     Keep the capability generic and cross-tool — it's shared by every plugin (and,
     later, userscripts), not a one-off for this plugin. If it's a real new concept,
     register it with `/register-term`.

Avoid touching the page outside the context. If you must, pair every mutation
with its teardown in `onUnload`.

### Step 4: Write the plugin module

Create `src/plugins/builtin/<id>/index.ts` exporting a `Plugin`. Follow
`marhiv-theme`:

```ts
import type { Plugin } from '../../types'

export const autoScroll: Plugin = {
  meta: {
    id: 'auto-scroll',
    name: 'Auto Scroll',
    description: 'Keeps the conversation pinned to the latest message.',
    matches: ['https://claude.ai/*'],
    defaultEnabled: false,
  },
  onLoad(ctx) {
    // Use ctx capabilities; prefer them over raw page access so teardown is
    // automatic. For page mutations outside ctx, undo them in onUnload.
  },
  // onUnload(ctx) { /* only if you mutated the page outside ctx */ },
}
```

Co-locate plugin assets in the same folder (e.g. a stylesheet imported with
`?inline`, as `marhiv-theme/theme.css` does). Don't rely on the host page's CSS.

### Step 5: Register it

Add the plugin to `BUILTIN_PLUGINS` in `src/plugins/registry.ts`:

```ts
import { autoScroll } from './builtin/auto-scroll'

export const BUILTIN_PLUGINS: Plugin[] = [marhivTheme, autoScroll]
```

That's the only wiring needed. **Do not** touch the Plugins page, the storage
layer, or the Plugin Manager — registering is what gives the plugin its toggle,
its persisted enabled state, and live load/unload. (Enable/disable state flows
through `src/storage/plugins.ts` + `src/store/plugins.ts`; see `/state-management`
if you're curious, but you shouldn't need to edit them.)

### Step 6: Verify

Run the quality gates and fix anything they flag:

```bash
npm run typecheck
npm run lint
npm run format
npm run check:dup
npm run build
```

The gates check types/lint/format/duplication/build, **not** runtime behavior.
Plugin loading happens in a live page, so suggest a manual check: `npm run build`,
reload the unpacked extension, open a matching page, toggle the plugin in the
Plugins panel, and confirm it loads (and cleanly unloads when toggled off). The
Dev page's **Export state** button reports `plugins[].styleInjected` and enabled
state, which is a quick objective check that the pipeline ran.

### Step 7: Report

State the plugin's `id`, `name`, `matches`, and `defaultEnabled`; where its module
lives; whether you extended the Plugin Context (and if so, what capability —
flag it as an Enhancement API addition); and that the gates passed. Note that the
toggle and persistence are wired automatically via the registry, and that runtime
behavior was verified by build/typecheck only — recommend the manual toggle
check.
