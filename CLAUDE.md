# CLAUDE.md

Guidance for Claude Code (and other agents) working in this repository.

## What Marhiv is

**Marhiv** (Hebrew מרהיב, "spectacular") is a **Chromium browser extension (Manifest V3)** that enhances the experience of using online AI chatbots. The mental model is **Tampermonkey × Oh My Zsh, geared toward AI tools**: a framework for layering enhancements onto AI chat sites (ChatGPT, Claude, Gemini, …) so users can make those tools their own.

Two complementary enhancement mechanisms (the **hybrid** model):

1. **Plugins** — curated, first-party enhancements that live in this repo and are published to a community **registry**. Each plugin declares the AI sites it targets and the behavior it adds. This is the *Oh My Zsh* half: vetted, installable, configurable.
2. **Userscripts** — sandboxed, user-authored, site-matched scripts for cases curated plugins don't cover. This is the *Tampermonkey* half: an escape hatch for power users.

Keep both in mind when making architectural decisions — anything plugins can do should ideally be expressible through a shared, documented enhancement API that userscripts also use.

## Current status

**Pre-alpha — first commit.** As of now the repo contains only `LICENSE`, `README.md`, and this file. There is **no build tooling, source code, or tests yet**. When you scaffold something, update this file so it reflects reality rather than intentions. Do not describe code that doesn't exist as if it does.

## Intended tech stack

These are the chosen defaults for the project. Honor them unless the user redirects:

- **Language:** TypeScript (strict).
- **Extension platform:** Chromium **Manifest V3** (service worker background, content scripts).
- **Bundler:** **Vite** with **CRXJS** (`@crxjs/vite-plugin`) for MV3 builds + HMR.
- **UI:** **React** for the popup and options/settings pages.
- **Output:** a loadable unpacked extension in `dist/`.

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
