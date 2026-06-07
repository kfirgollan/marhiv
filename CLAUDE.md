# CLAUDE.md

Guidance for Claude Code (and other agents) working in this repository.

## Taxonomy

`docs/taxonomy.md` is the project's shared vocabulary — the canonical, precise
meaning of each component or concept (Plugin, Userscript, Registry, Enhancement
API, …). Consult it when a term is ambiguous, and use registered terms exactly
as defined in code, docs, commits, and conversation. Register or refine terms
with the `/register-term` skill rather than editing the file by hand.

## What Marhiv is

**Marhiv** (Hebrew מרהיב, "spectacular") is a **Chromium browser extension (Manifest V3)** that enhances the experience of using online AI chatbots. The mental model is **Tampermonkey × Oh My Zsh, geared toward AI tools**: a framework for layering enhancements onto AI chat sites (ChatGPT, Claude, Gemini, …) so users can make those tools their own.

Two complementary enhancement mechanisms (the **hybrid** model):

1. **Plugins** — curated, first-party enhancements that live in this repo and ship **bundled in the extension package**, distributed and updated through the **Chrome Web Store**. Each plugin declares the AI sites it targets and the behavior it adds. This is the _Oh My Zsh_ half: vetted, installable, configurable. They do **not** load at runtime from a remote registry — Manifest V3 forbids remotely hosted code (all executable logic must ship in the reviewed package), so community plugins reach users by being merged into the repo and shipped in a store release. The "**registry**" is therefore the curated in-repo collection (a discovery/catalog surface), never a runtime code loader.
2. **Userscripts** — sandboxed, user-authored, site-matched scripts for cases curated plugins don't cover. This is the _Tampermonkey_ half: an escape hatch for power users. Because user-authored code can't ship in the reviewed package, userscripts are the one place external logic runs — which on MV3 means going through the sanctioned **`chrome.userScripts` API** (not `eval`/remote `<script>`), with its own permission and per-extension user opt-in.

Keep both in mind when making architectural decisions — anything plugins can do should ideally be expressible through a shared, documented enhancement API that userscripts also use.

## Current status

**v0.0.1 — launched on the Chrome Web Store.** The build toolchain is in place and produces a loadable MV3 extension. A content script on `https://claude.ai/*` (`src/content/claude.ts`) starts two subsystems: a per-site **Router** (`src/routing/`, driven by the site definition in `src/sites/claude/`) that mounts route behavior as the SPA navigates, and the **Plugin Manager** (`src/plugins/manager.ts`). The router mounts the on-page UI: the **Menu Ball** (`src/ui/indicator.ts`) — a draggable logo disc whose position persists across pages — and, on click, the **settings Panel** (`src/ui/panel/`), a React UI rendered in a shadow root that anchors over the ball and is resizable. The Panel renders one **Panel Page** at a time (a title + body construct); a left-rail menu links each item to a page, split into a top group and a bottom group (About). The **Plugins** page is wired to real behavior (enable/disable toggles persisted to storage, applied live); the General/About pages are still **scaffolding**. A plugin system exists: Plugins implement `onLoad`/`onUnload` and receive a **Plugin Context** (the live Enhancement API surface — `injectCss`, `registerPage`, and read-only `stores`); built-ins are `marhiv-theme` (recolors the host page), `marhiv-dev` (contributes the **Dev** page — live route readout + a debug-state export — demonstrating a plugin that adds UI and reads app state), `claude-code-enhancer` (adds a native item under "New session" on `claude.ai/code`, demonstrating the Slots engine), and `custom-scripts` (the userscripts escape hatch — a CodeMirror editor for user-authored scripts that run via `chrome.userScripts`, reaching a bridged subset of the Enhancement API; see `src/userscripts/`). Plugin pages register at runtime via `ctx.registerPage` into an in-memory registry the Panel merges with its built-in pages. Plugins reach the host page through the **Slots** engine (`src/enhance/`), never raw selectors: `ctx.onRoute(RouteKey.Code, …)` enters/leaves a named **Route Scope** with an `AbortSignal`, and `slot(key)` maps a semantic **Slot** name to live DOM via per-route **Resolvers** (`src/sites/claude/slots.ts`), with presence tracking that survives host re-renders — so a host redesign is a one-file fix. A **background service worker** (`src/background/`) now exists — its sole job is keeping `chrome.userScripts` registrations in sync with the user's saved scripts (that API isn't reachable from a content script). No tests exist yet. Update this file as those land; don't describe code that doesn't exist as if it does.

## Tech stack

The chosen stack. Honor it unless the user redirects:

- **Language:** TypeScript (strict). See `tsconfig.json`.
- **Extension platform:** Chromium **Manifest V3** (service worker background, content scripts).
- **Bundler:** **Vite 8** with **CRXJS** (`@crxjs/vite-plugin` ^2.4) for MV3 builds + HMR.
- **UI:** **React** for extension UI. The first surface is the settings Panel (`src/ui/panel/`), rendered into a **shadow root** for CSS isolation from host AI sites. JSX uses the automatic runtime (`"jsx": "react-jsx"` in `tsconfig.json`); Vite/esbuild handles the transform — no separate React Vite plugin. Stylesheets for shadow-mounted UI are imported with `?inline` and injected into the shadow root (Vite's default would append them to the host page's `<head>`).
- **Output:** a loadable unpacked extension in `dist/`.

## Build & layout

- `npm run dev` — watch build with HMR. `npm run build` — production build to `dist/`.
- `manifest.config.ts` — the MV3 manifest via CRXJS `defineManifest`, version sourced from `package.json`. **Add new content scripts / permissions here.**
- `vite.config.ts` — wires the CRXJS plugin.
- `src/content/<tool>.ts` — one content script per AI tool. Each is declared in `manifest.config.ts` with its `matches` URL pattern. The entry is thin: it mounts shared UI, which lives under `src/ui/`.
- `src/ui/` — shared, cross-tool on-page UI. `indicator.ts` is the **Menu Ball**; `panel/` is the **settings Panel** (`mount.tsx` shadow-root + React root, `Panel.tsx` the frame, `geometry.ts` pure anchor/resize math, `PanelPage.tsx` the base **Panel Page** construct + form helpers, `PanelMenuItem.tsx` a **Panel Menu Item** (collapsible left-menu entry), `pages.tsx` the built-in pages (`BUILTIN_PAGES`) that map menu items to pages, `panel.css` shadow-scoped styles). Add a first-party page by composing `<PanelPage>` and registering it in `pages.tsx`; plugins instead contribute pages at runtime via `ctx.registerPage` (the Panel merges built-ins with those). Use the `/panel-page-create` skill.
- `src/routing/` — the per-site **Router** (`router.ts`): matches the URL against a Site's routes and drives their enter/leave via an `AbortSignal`; `navigation.ts` observes SPA navigation. Adding page-specific behavior is a new route entry on the Site, not a change here.
- `src/sites/<tool>/` — per-AI-tool definitions. For Claude: `index.ts` (the `Site` — site-level chrome + route table), `routes.ts` (the `RouteKey` enum + `matchRoutes` — the one place a path is defined), and `slots.ts` (per-route **Resolvers** mapping **Slot** names to live DOM, plus `claudeEnhancements`). The slot resolvers are the file that changes on a host redesign.
- `src/enhance/` — the cross-site **Slots** engine (`slots.ts`): the `Slot` enum (shared vocabulary), `SlotDef`/`SlotRegistry`, and the presence-tracking core (`watchSlot`, `createSlotHandle` → `whenPresent`/`addAction`). Generic over any site; sites supply the resolver data. A plugin that touches the host page must go through this — use the `/host-element-access` skill. New `SlotHandle` verbs are Enhancement API additions: keep them generic and signal-tracked.
- `src/plugins/` — the plugin system. `types.ts` defines the `Plugin` contract and `PluginContext` (the Enhancement API surface — `injectCss`, `registerPage`, `stores`, `onRoute`); `context.ts` builds a context and tracks every effect for clean teardown; `manager.ts` is the **Plugin Manager** (lifecycle + storage/navigation reactivity, lent the site's `SiteEnhancements`); `registry.ts` lists the built-ins; `builtin/<id>/` holds each plugin (`marhiv-theme` injects CSS; `marhiv-dev` contributes the Dev page; `claude-code-enhancer` adds a route-scoped sidebar item via Slots). Add one with the `/plugin-create` skill. Extending `PluginContext` with a new capability is an Enhancement API change — keep it generic and tracked for teardown.
- `src/userscripts/` — the **Custom Scripts** machinery (the userscripts escape hatch). `protocol.ts` is the side-effect-free wire protocol (like `net-protocol.ts`); `shim.ts` builds the `marhiv` API bootstrap prepended to each user script (it runs in the script's own world, so it relays calls over `window.postMessage`); `bridge.ts`'s `installScriptBridge(ctx)` is the isolated-world endpoint that performs those calls against the real Plugin Context and relays callbacks back; `constants.ts` holds shared ids the background worker reads. User code never runs in our world — only via `chrome.userScripts` (the one MV3-sanctioned path).
- `src/background/` — the MV3 background service worker. Today it only reconciles `chrome.userScripts` registrations to the user's saved scripts (prefixing each with the shim), gated on the `custom-scripts` plugin being enabled, and records whether Chrome's "Allow user scripts" toggle is on.
- `src/store/` — reactive **Zustand** stores for the UI. `persisted.ts` bridges a `chrome.storage` `PersistedValue` to a hydrating, cross-tab-synced store (`panel.ts`, `plugins.ts` use it); `route.ts` (the path + active named routes the content script publishes) and `panelPages.ts` are purely in-memory, ephemeral per page. Pick the right home with the `/state-management` skill.
- `src/storage/` — typed `chrome.storage.local` wrappers. `persisted.ts` is a generic load/save/subscribe factory; `position.ts` (Menu Ball position), `panel.ts` (Panel size + last section), and `plugins.ts` (plugin enable/disable states) are built on it. Add new persisted values via the factory rather than re-implementing the plumbing (the duplication gate enforces this).
- No test runner is configured yet; add one (e.g. Vitest) when there's logic worth testing. `geometry.ts` is pure and the obvious first candidate.

### Quality gates

- **Lint:** ESLint flat config (`eslint.config.js`) — `npm run lint` / `lint:fix`.
- **Format:** Prettier (`.prettierrc.json`) — `npm run format` / `format:check`. No semicolons, single quotes.
- **Types:** `npm run typecheck` (`tsc --noEmit`).
- **Duplication:** jscpd (`.jscpd.json`, threshold 0) — `npm run check:dup`. Scans `src/` and the root config files. Fix clones by extracting shared code, not by raising the threshold.
- **Git hooks (Husky):** `.husky/pre-commit` runs `typecheck` + `lint-staged` (ESLint + Prettier on staged files); `.husky/pre-push` runs `check:dup`. Keep code clean; don't bypass hooks with `--no-verify` without good reason.

## Anticipated architecture

A likely shape once code lands (revise as the real structure emerges):

- `manifest` — MV3 manifest (often generated/typed via the Vite plugin).
- **Background service worker** — lifecycle, registry sync, message routing, storage.
- **Content script host** — injected into supported AI sites; loads enabled plugins/userscripts and exposes the shared enhancement API to them.
- **Enhancement API** — the contract both plugins and userscripts use to read/modify the chat UI, register commands, add UI, persist settings. This is the keystone abstraction; design it deliberately.
- **Plugins** — first-party enhancements in-repo, each with a manifest (target sites, permissions, settings schema) and entry point.
- **Registry** — the curated, in-repo collection of plugins (`src/plugins/registry.ts` today) plus any discovery/catalog tooling. Plugins are distributed **bundled in the extension via the Chrome Web Store**, not installed at runtime from a remote source (MV3's no-remotely-hosted-code rule).
- **Extension UI** (React) — popup + options page to browse, toggle, and configure plugins and manage userscripts.

When introducing the directory layout, document it here.

## Conventions

- **Site targeting:** plugins/userscripts match AI sites by URL pattern; keep these declarative and centralized so adding a new AI tool is a small, well-defined change.
- **Permissions:** MV3 — request the narrowest host permissions needed; prefer per-site activation over broad `<all_urls>`.
- **Isolation:** treat userscripts as untrusted; run them through the shared API rather than giving raw page/extension access.
- **Cross-tool first:** prefer abstractions that work across multiple AI sites over one-off hacks for a single site.

## Working agreements for agents

- This is a greenfield repo. Prefer establishing clean, conventional structure over clever shortcuts; you are setting precedents others will follow.
- After scaffolding tooling, add the real **build / dev / test / lint** commands to this file and to `README.md`.
- Keep `README.md` (user-facing) and `CLAUDE.md` (agent-facing) in sync on facts like stack and status, but don't duplicate prose.
- License is **Apache 2.0**; keep new files compatible.
