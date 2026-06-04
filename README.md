# Marhiv

**Marhiv** (Hebrew: מרהיב, _"spectacular"_) is a Chromium browser extension that makes the AI chatbots you already use _your own_.

Think **Tampermonkey × Oh My Zsh**, purpose-built for AI tools: a framework for layering enhancements — UI tweaks, prompt helpers, keyboard shortcuts, themes, and automations — onto sites like ChatGPT, Claude, Gemini, and more. Install curated plugins from a community registry, or write your own userscript-style enhancements when you want full control.

> ⚠️ **Status: pre-alpha.** Marhiv is at its very first commit. The vision below is the destination; the code is just getting started. Expect things to change.

## Why Marhiv

AI chat interfaces are powerful but one-size-fits-all. Marhiv is the customization layer on top:

- **Make it yours** — themes, layout tweaks, and quality-of-life fixes for the AI sites you live in.
- **Curated, not chaotic** — a community registry of vetted plugins you can browse and install in a click (the _Oh My Zsh_ part).
- **Escape hatch for power users** — write or paste your own site-matched scripts when no plugin exists (the _Tampermonkey_ part).
- **Cross-tool** — one place to manage enhancements across every AI chatbot, instead of one bookmarklet per site.

## How it works (planned)

Marhiv has two ways to enhance a page:

1. **Plugins** — first-party, curated enhancements that ship in the repo and are published to a registry. Each declares which AI sites it targets and what it does. Browse, toggle, and configure them from the extension UI.
2. **Userscripts** — sandboxed, site-matched scripts you author yourself, for the cases the curated plugins don't cover.

Both run through the same content-script host on supported AI sites, with a shared API for interacting with the chat UI.

## Supported AI tools

The initial target set (subject to change as we build):

- ChatGPT
- Claude
- Gemini

…with the plugin model designed so adding new sites is straightforward.

## Getting started

Marhiv is built with **TypeScript + Vite (CRXJS)**, targeting **Manifest V3**.

```bash
npm install
npm run dev      # watch build with HMR for local development
npm run build    # production build → dist/
```

### Load it in your browser

After `npm run build` (or `npm run dev`), load the unpacked extension:

**Chrome:** open `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, and select the `dist/` directory.

**Edge:** open `edge://extensions`, enable **Developer mode** (toggle on the left), click **Load unpacked**, and select the `dist/` directory.

### What v0.0.1 does

A single content script targets `https://claude.ai/new`. When that page finishes loading, it logs `Hello from Marhiv!` to the page's DevTools console — a minimal proof that Marhiv's injection pipeline works end to end. Open DevTools (F12) on that page to see it.

### Linting & formatting

Code is linted with **ESLint** and formatted with **Prettier**; types are checked with **tsc**.

```bash
npm run lint         # eslint
npm run format       # prettier --write
npm run typecheck    # tsc --noEmit
```

A **Husky** pre-commit hook runs `typecheck` and, via **lint-staged**, ESLint + Prettier on staged files — so commits stay clean automatically. The hook installs itself on `npm install`.

## Contributing

Marhiv is meant to be community-driven — the plugin registry only matters if people build for it. Contribution guidelines, a plugin authoring guide, and the registry format are on the roadmap. In the meantime, issues and ideas are welcome.

## License

[Apache License 2.0](LICENSE).
