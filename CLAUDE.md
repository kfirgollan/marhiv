# CLAUDE.md

Guidance for Claude Code (and other agents) working in this repository.

## What Marhiv is

**Marhiv** (Hebrew מרהיב, "spectacular") is a **Chromium browser extension (Manifest V3)** that enhances the experience of using online AI chatbots. The mental model is **Tampermonkey × Oh My Zsh, geared toward AI tools**: a framework for layering enhancements onto AI chat sites (ChatGPT, Claude, Gemini, …) so users can make those tools their own.

Two complementary enhancement mechanisms (the **hybrid** model):

1. **Plugins** — curated, first-party enhancements that live in this repo and are published to a community **registry**. Each plugin declares the AI sites it targets and the behavior it adds. This is the _Oh My Zsh_ half: vetted, installable, configurable.
2. **Userscripts** — sandboxed, user-authored, site-matched scripts for cases curated plugins don't cover. This is the _Tampermonkey_ half: an escape hatch for power users.

Keep both in mind when making architectural decisions — anything plugins can do should ideally be expressible through a shared, documented enhancement API that userscripts also use.

## Current status

**Pre-alpha — v0.0.1.** The build toolchain is in place and produces a loadable MV3 extension. The only behavior so far is a single content script on `https://claude.ai/new` that logs `Hello from Marhiv!` once the page loads (`src/content/claude.ts`) — a seed proving the injection pipeline works end to end. No background worker, extension UI, plugin system, or tests exist yet. Update this file as those land; don't describe code that doesn't exist as if it does.

## Tech stack

The chosen stack. Honor it unless the user redirects:

- **Language:** TypeScript (strict). See `tsconfig.json`.
- **Extension platform:** Chromium **Manifest V3** (service worker background, content scripts).
- **Bundler:** **Vite 8** with **CRXJS** (`@crxjs/vite-plugin` ^2.4) for MV3 builds + HMR.
- **UI:** **React** for the popup and options/settings pages _(not added yet — introduce when the first UI surface appears)_.
- **Output:** a loadable unpacked extension in `dist/`.

## Build & layout

- `npm run dev` — watch build with HMR. `npm run build` — production build to `dist/`.
- `manifest.config.ts` — the MV3 manifest via CRXJS `defineManifest`, version sourced from `package.json`. **Add new content scripts / permissions here.**
- `vite.config.ts` — wires the CRXJS plugin.
- `src/content/<tool>.ts` — one content script per AI tool. Each is declared in `manifest.config.ts` with its `matches` URL pattern.
- No test runner is configured yet; add one (e.g. Vitest) when there's logic worth testing.

### Quality gates

- **Lint:** ESLint flat config (`eslint.config.js`) — `npm run lint` / `lint:fix`.
- **Format:** Prettier (`.prettierrc.json`) — `npm run format` / `format:check`. No semicolons, single quotes.
- **Types:** `npm run typecheck` (`tsc --noEmit`).
- **Pre-commit:** a Husky hook (`.husky/pre-commit`) runs `typecheck` then `lint-staged` (ESLint + Prettier on staged files). Keep code lint-clean; don't bypass the hook with `--no-verify` without good reason.

## Anticipated architecture

A likely shape once code lands (revise as the real structure emerges):

- `manifest` — MV3 manifest (often generated/typed via the Vite plugin).
- **Background service worker** — lifecycle, registry sync, message routing, storage.
- **Content script host** — injected into supported AI sites; loads enabled plugins/userscripts and exposes the shared enhancement API to them.
- **Enhancement API** — the contract both plugins and userscripts use to read/modify the chat UI, register commands, add UI, persist settings. This is the keystone abstraction; design it deliberately.
- **Plugins** — first-party enhancements in-repo, each with a manifest (target sites, permissions, settings schema) and entry point.
- **Registry** — format + tooling for publishing/installing community plugins.
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
