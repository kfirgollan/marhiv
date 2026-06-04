# Marhiv Taxonomy

A shared vocabulary for reasoning about Marhiv's components. When a term is
defined here, use it precisely — in code, docs, commits, and conversation — so
that everyone (humans and agents) means the same thing.

Add or update terms with the `/register-term` skill rather than editing this
file by hand, so entries stay consistently formatted.

## Conventions

- Terms are listed **alphabetically**.
- Each term has a one-line **definition**, optional **notes**, and optional
  **see also** links to related terms.
- Prefer the canonical term over synonyms; list synonyms under the canonical
  entry so they remain searchable.

## Terms

### Enhancement API

The shared contract that both **Plugins** and **Userscripts** use to read and
modify the chat UI, register commands, add UI, and persist settings. The
keystone abstraction of the project — anything a Plugin can do should be
expressible through it.

_See also: [Plugin](#plugin), [Userscript](#userscript)._

### Menu Ball

The circular control that appears when a supported page loads; it is the user's
primary entry point for interacting with Marhiv.

On hover it reveals a handle bar. As the main interaction surface, it is where
user-facing enhancement controls are surfaced.

### Panel Menu Item

One entry in the **Settings Panel**'s left menu, linking a menu item to a
**Panel Page**; selecting it activates that page.

It has two states — collapsed (icon only, label as a tooltip) and expanded (icon
and label) — chosen by the parent Panel, which owns whether the whole menu is
collapsed (expanded by default, persisted). Implemented as the `PanelMenuItem`
React component (`src/ui/panel/PanelMenuItem.tsx`); the Panel renders one per
registered page.

_See also: [Settings Panel](#settings-panel), [Panel Page](#panel-page), [Menu Ball](#menu-ball)._

### Panel Page

The base construct the **Settings Panel** renders: a title plus a body, with one
page shown at a time.

The Panel frames the page (left menu, close control, resize) and each left-rail
menu item links to exactly one Panel Page — selecting the item makes that page
appear. Implemented as the `PanelPage` React component (`src/ui/panel/PanelPage.tsx`);
concrete pages compose it and are registered in `src/ui/panel/pages.tsx`. This is
where configuration forms — and eventually **Plugin** and **Enhancement API**
settings — live. Synonyms: _Marhiv Page_; `PanelPage` (the React component).

_See also: [Settings Panel](#settings-panel), [Menu Ball](#menu-ball), [Enhancement API](#enhancement-api)._

### Plugin

A curated, first-party enhancement that lives in this repo and is published to
the **Registry**. Each Plugin declares the AI sites it targets and the behavior
it adds. The "Oh My Zsh" half of the model: vetted, installable, configurable.

A Plugin is `{ meta, onLoad, onUnload? }`: `meta` declares its id, name, target
`matches`, and default enabled state; `onLoad`/`onUnload` are the lifecycle hooks
the **Plugin Manager** calls, both receiving a **Plugin Context**. Built-in
Plugins are registered in `src/plugins/registry.ts`; the first is `marhiv-theme`.

_See also: [Plugin Manager](#plugin-manager), [Plugin Context](#plugin-context), [Userscript](#userscript), [Registry](#registry), [Enhancement API](#enhancement-api)._

### Plugin Context

The capabilities Marhiv lends a **Plugin** for the duration of its active life,
passed to `onLoad`/`onUnload` — the live surface of the **Enhancement API**.

It offers `injectCss` (inject a tracked stylesheet into the host page),
`registerPage` (contribute a **Panel Page** and its **Panel Menu Item** to the
settings Panel), and `stores` (read-only access to Marhiv's reactive app stores —
e.g. the route store — so plugin UI can show live state). Every effect created
through the context is tracked, so disposing it on unload reverses the plugin's
changes (removed styles, unregistered pages) — which is why a well-behaved Plugin
often needs no `onUnload`. Grows as plugins need more. Lives at
`src/plugins/context.ts`.

_See also: [Plugin](#plugin), [Plugin Manager](#plugin-manager), [Panel Page](#panel-page), [Enhancement API](#enhancement-api)._

### Plugin Manager

The content-script subsystem that owns **Plugin** lifecycle on a page: it reads
persisted enable/disable state, activates Plugins that are enabled and whose
`matches` fit the current URL by calling their `onLoad`, and unloads them
(`onUnload` plus **Plugin Context** disposal) when disabled or when the URL stops
matching.

It reacts live to storage changes (a toggle in this tab or another) and to SPA
navigation, reconciling the active set each time. Runs alongside the per-site
Router; no background worker is involved. Lives at `src/plugins/manager.ts`.

_See also: [Plugin](#plugin), [Plugin Context](#plugin-context), [Enhancement API](#enhancement-api)._

### Registry

The format and tooling for publishing and installing community **Plugins**.

_See also: [Plugin](#plugin)._

### Resolver

The per-site, per-route function that maps a **Slot** name to a live element on
the host page, keyed on stable anchors (`data-testid`, `aria-*`, `data-*` keys)
rather than hashed classes.

The single point that changes when the host reworks its markup: fix the Resolver
and every **Plugin** targeting that Slot keeps working. Resolvers live in
`src/sites/<site>/slots.ts` as a `SlotRegistry`; a child Slot's Resolver runs
within its parent's resolved subtree, which disambiguates duplicates.

_See also: [Slot](#slot), [Route Scope](#route-scope)._

### Route Scope

The route-bound context a **Plugin** enters via `ctx.onRoute(routeKey, handler)`,
active only while a named route matches and torn down (via an `AbortSignal`) when
the route is left.

It hands the handler `{ url, signal, slot }`, where `slot(key)` resolves **Slots**
against that route's registry — so on-page behavior is scoped to part of a site
(e.g. `claude.ai/code`) even though the Plugin loads site-wide. Named routes are
defined per site in `src/sites/<site>/routes.ts` (`RouteKey` + `matchRoutes`) and
published to the route store on navigation. Teardown nests: plugin unload ⊃ route
leave ⊃ slot absent.

_See also: [Slot](#slot), [Resolver](#resolver), [Plugin Context](#plugin-context), [Plugin Manager](#plugin-manager)._

### Settings Panel

The resizable settings window that opens when the user clicks the **Menu Ball**;
it holds Marhiv's user-facing configuration.

Anchors over the ball and covers it (the ball hides while the Panel is open),
opening into the corner of the viewport with the most room. Built in React
inside a shadow root so its styles stay isolated from the host AI site.
Internally it has a left rail of sections and a switchable content page where
configuration forms live — the surface where **Plugin** and **Enhancement API**
settings will appear as they land. Synonym: _Panel_.

_See also: [Menu Ball](#menu-ball), [Plugin](#plugin), [Enhancement API](#enhancement-api)._

### Slot

A stable, semantic name for a region of a host AI site's UI (e.g. the sidebar,
the "New session" row, the composer input) that **Plugins** target instead of
writing selectors.

Slots form a tree via `parent` — a child resolves within its parent's subtree —
and each is mapped to live DOM per route by a **Resolver**. The shared `Slot`
enum lives in `src/enhance/slots.ts`; per-site/route Resolvers live in
`src/sites/<site>/slots.ts`. A Plugin reaches a Slot through a **Route Scope**
(`ctx.onRoute(...).slot(key)`), getting a handle that adds native UI
(`addAction`) or observes the element's presence (`whenPresent`) with teardown
that survives host re-renders. The cross-site engine that resolves Slots and
tracks their presence is the _Slots engine_.

_See also: [Resolver](#resolver), [Route Scope](#route-scope), [Plugin Context](#plugin-context), [Enhancement API](#enhancement-api)._

### Userscript

A sandboxed, user-authored, site-matched script for cases curated **Plugins**
don't cover. The "Tampermonkey" half of the model: an escape hatch for power
users, treated as untrusted and run through the **Enhancement API**.

_See also: [Plugin](#plugin), [Enhancement API](#enhancement-api)._
