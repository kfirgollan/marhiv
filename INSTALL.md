# Installing Marhiv

> ⏳ **The Chrome Web Store listing is in review.** Once it's approved, installing
> Marhiv will be a single click and it'll auto-update. Until then, install it
> manually by **loading it as an unpacked extension** — the same way developers
> run it locally. It takes about a minute.

Marhiv is a Manifest V3 extension, so it runs in any Chromium-based browser:
**Chrome, Edge, Brave, Arc, Opera, Vivaldi**, and others.

---

## Prerequisites

You'll build Marhiv from source, which needs:

- **[Node.js](https://nodejs.org)** — version **20.19+** or **22.12+** (the build uses Vite 8).
  Check with `node -v`.
- **[Git](https://git-scm.com)** — to clone the repository.
- A **Chromium-based browser**.

> Don't have the toolchain and just want the files? See
> [Without building from source](#without-building-from-source) at the bottom.

---

## 1. Get the code

```bash
git clone https://github.com/kfirgollan/marhiv.git
cd marhiv
```

## 2. Build it

```bash
npm install
npm run build
```

This produces a **`dist/`** folder in the project root — that's the unpacked
extension you'll load. (For active development, `npm run dev` builds with
hot-reload instead.)

## 3. Load it into your browser

You only point the browser at the `dist/` folder once; it stays installed.

### Chrome / Brave / Arc / Opera / Vivaldi

1. Open **`chrome://extensions`** (Brave: `brave://extensions`, etc.).
2. Toggle **Developer mode** on (top-right corner).
3. Click **Load unpacked**.
4. Select the **`dist/`** folder inside the project.

### Microsoft Edge

1. Open **`edge://extensions`**.
2. Toggle **Developer mode** on (bottom-left).
3. Click **Load unpacked**.
4. Select the **`dist/`** folder inside the project.

## 4. Verify

Open **[claude.ai](https://claude.ai)**. The **Menu Ball** — a small Marhiv logo
disc — appears in a corner of the page. Click it to open the settings Panel, go
to the **Plugins** page, and toggle an enhancement (try a theme) to confirm it's
working.

---

## Updating

Because this is an unpacked build, updates are manual:

```bash
git pull
npm install      # in case dependencies changed
npm run build    # rebuild dist/
```

Then open your browser's extensions page and click the **reload/refresh** icon
on the Marhiv card (or remove and re-load `dist/`). Refresh any open `claude.ai`
tabs.

When the Web Store listing goes live, switch to that version for automatic updates.

## Disabling or removing

- **Disable temporarily:** open the extensions page and toggle Marhiv off.
- **Remove:** click **Remove** on the Marhiv card. Your settings live in the
  browser's extension storage and are cleared on removal.

---

## Troubleshooting

**The "Load unpacked" button isn't there.**
Make sure **Developer mode** is enabled — the button only appears once it's on.

**"Manifest file is missing or unreadable" / nothing loads.**
You probably selected the wrong folder. Select the **`dist/`** folder (the one
containing `manifest.json`), not the repository root.

**`dist/` doesn't exist.**
Run `npm run build` first. If the build failed, confirm your Node version meets
the [prerequisites](#prerequisites) (`node -v`).

**The Menu Ball doesn't appear on `claude.ai`.**
Reload the page after loading the extension. Confirm the Marhiv card shows no
errors on the extensions page, and that it's enabled.

**Custom Scripts (userscripts) don't run.**
The Custom Scripts plugin uses Chrome's `chrome.userScripts` API, which requires
a one-time opt-in: on the extensions page, open Marhiv's **Details** and turn on
**Allow user scripts** (visible while Developer mode is on). Newer Chrome
versions expose this per-extension toggle automatically.

---

## Without building from source

If you can't run the toolchain, you can still load a prebuilt copy once one is
published: download the packaged build attached to a
[GitHub Release](https://github.com/kfirgollan/marhiv/releases) (when available),
unzip it, and load that unzipped folder via **Load unpacked** following
[step 3](#3-load-it-into-your-browser). Until a release is posted — or the Web
Store listing is approved — building from source above is the way in.
