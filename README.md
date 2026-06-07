<p align="center">
  <img src="assets/brand/marhiv-social.png" alt="Marhiv — makes the AI chatbots you use your own" width="100%" />
</p>

# Marhiv

[![CI](https://github.com/kfirgollan/marhiv/actions/workflows/ci.yml/badge.svg)](https://github.com/kfirgollan/marhiv/actions/workflows/ci.yml)
[![License: Apache 2.0](https://img.shields.io/github/license/kfirgollan/marhiv)](LICENSE)
[![Version](https://img.shields.io/github/package-json/v/kfirgollan/marhiv)](package.json)

**Marhiv** (Hebrew: מרהיב, _"spectacular"_) is a Chromium browser extension that makes the AI chatbots you already use _your own_.

Think **Tampermonkey × Oh My Zsh**, purpose-built for AI tools: a framework for layering enhancements — UI tweaks, prompt helpers, keyboard shortcuts, themes, and automations — onto sites like ChatGPT, Claude, Gemini, and more. Toggle on curated plugins that ship with the extension, or write your own userscript-style enhancements when you want full control.

## Why Marhiv

AI chat interfaces are powerful but one-size-fits-all. Marhiv is the customization layer on top:

- **Make it yours** — themes, layout tweaks, and quality-of-life fixes for the AI sites you live in.
- **Curated, not chaotic** — a collection of vetted plugins that ship with the extension (delivered through the Chrome Web Store) and toggle on in a click (the _Oh My Zsh_ part).
- **Escape hatch for power users** — write or paste your own site-matched scripts when no plugin exists (the _Tampermonkey_ part).
- **Cross-tool** — one place to manage enhancements across every AI chatbot, instead of one bookmarklet per site.

## Screenshots

The settings Panel running on `claude.ai/code`, opened from the draggable Menu Ball. _(These are the images used on the Chrome Web Store listing.)_

|                                                                                                                                       |                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| ![The Marhiv Plugins page with the Marhiv Theme enabled, recoloring Claude in the alpenglow palette](assets/store/marhiv-store-1.png) | ![A different theme applied to the page, with the Plugins list showing Catppuccin, Gruvbox, Solarized, and more](assets/store/marhiv-store-2.png) |
| **Toggle a plugin** — the Plugins page, with the first-party Marhiv Theme on.                                                         | **Pick a look** — switch the whole host site to any bundled theme.                                                                                |

![The expanded Plugins page listing the full registry by category — themes, developer tools, and enhancements](assets/store/marhiv-store-3.png)

**Browse the registry** — every bundled plugin in one place, grouped by category (themes, developer tools, enhancements).

## How it works

Marhiv has two ways to enhance a page:

1. **Plugins** — first-party, curated enhancements that live in the repo and ship **bundled into the extension**, delivered and updated through the **Chrome Web Store** (Manifest V3 doesn't allow loading code from a remote registry at runtime). Each declares which AI sites it targets and what it does. Browse, toggle, and configure them from the extension UI.
2. **Userscripts** — sandboxed, site-matched scripts you author yourself, for the cases the curated plugins don't cover.

Both run through the same content-script host on supported AI sites, with a shared API for interacting with the chat UI.

## Supported AI tools

Marhiv currently runs on **Claude** (`claude.ai`). ChatGPT and Gemini are next — the plugin model is designed so adding a new site is a small, well-defined change.

## Install

> ⏳ **Coming to the Chrome Web Store** — the listing is in review. Until it's approved, install Marhiv manually by loading it as an unpacked extension, the way developers do. It takes about a minute and works in any Chromium browser (Chrome, Edge, Brave, …).

In short: **build it**, then load the output folder.

```bash
npm install
npm run build      # produces dist/
```

Then open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked**, and select the `dist/` folder. Open `claude.ai` and the Menu Ball appears in the corner.

👉 **Full step-by-step guide** — prerequisites, per-browser instructions, updating, uninstalling, and troubleshooting: **[INSTALL.md](INSTALL.md)**.

## Getting started

Marhiv is built with **TypeScript + Vite (CRXJS)**, targeting **Manifest V3**.

```bash
npm install
npm run dev      # watch build with HMR for local development
npm run build    # production build → dist/
```

### Load it in your browser

After `npm run build` (or `npm run dev`), load the built `dist/` folder as an unpacked extension — see **[INSTALL.md](INSTALL.md)** for the full, per-browser walkthrough.

### What it does

On `claude.ai`, Marhiv mounts a draggable **Menu Ball** (the logo disc) in the corner — drag it by the handle that appears on hover; its position is remembered across pages. Click it to open the **settings Panel**, a resizable window that anchors over the ball and opens into whichever corner of the screen has room. From the **Plugins** page you toggle the bundled enhancements — themes that recolor the site, developer tools, and the **Custom Scripts** editor for your own userscripts — applied live.

### Linting & formatting

Code is linted with **ESLint** and formatted with **Prettier**; types are checked with **tsc**.

```bash
npm run lint         # eslint
npm run format       # prettier --write
npm run typecheck    # tsc --noEmit
```

Duplication is detected with **jscpd**:

```bash
npm run check:dup    # fails if any copy-paste clones are found
```

**Git hooks** (via Husky, installed automatically on `npm install`):

- **pre-commit** — `typecheck` + `lint-staged` (ESLint + Prettier on staged files).
- **pre-push** — `check:dup` (jscpd), blocking pushes that introduce duplicated code.

## Contributing

Marhiv is meant to be community-driven — the plugin collection only matters if people build for it. Because Manifest V3 requires all code to ship inside the reviewed extension, community plugins are contributed to this repo and reach users in a Chrome Web Store release (rather than installed at runtime from a remote registry). Contribution guidelines and a plugin authoring guide are on the roadmap. In the meantime, issues and ideas are welcome.

## License

[Apache License 2.0](LICENSE).
