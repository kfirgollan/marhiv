# Marhiv — Brand & Visual Identity

**Marhiv** (Hebrew מרהיב, _"spectacular"_) makes the AI chatbots you use your own.
The identity is a colorful **alpine peak at alpenglow**, framed in a circle — a spectacular
summit you reach, rendered in a vivid sunset-over-the-Alps palette. The circular framing keeps
it equally at home as a browser-toolbar icon, a favicon, or a TanStack-style dev badge.

> All artifacts in this directory are **Apache-2.0**, like the rest of the repo.

## Logo

| Variant               | Source                | Use                                                                 |
| --------------------- | --------------------- | ------------------------------------------------------------------- |
| **Mark** (detailed)   | `marhiv-mark.svg`     | Hero / large sizes (≥128px): full scene with layered ranges & lake. |
| **Icon** (simplified) | `marhiv-icon.svg`     | Small sizes & app icons. Bold single peak — legible down to 16px.   |
| **Wordmark**          | `marhiv-wordmark.svg` | Horizontal lockup: icon + "Marhiv" in the alpenglow gradient.       |
| **Social / OG**       | `marhiv-social.svg`   | 1200×630 share card with tagline.                                   |

**SVG is the source of truth.** PNGs are generated from it (see _Regenerating assets_).

### Rasterized exports

- `icons/icon-{16,32,48,128,256,512}.png` — transparent-corner app/extension icons (from `marhiv-icon.svg`).
- `marhiv-mark-{512,1024}.png` — detailed mark for marketing.
- `marhiv-wordmark.png` — 1520×400 transparent lockup.
- `marhiv-social.png` — 1200×630 share card.

### Usage rules

- **Keep it circular.** Don't crop the disc into a square or add a square plate behind it.
- **Clear space:** leave at least 25% of the disc diameter as padding on all sides.
- **Minimum size:** use the simplified **icon** below 64px; never shrink the detailed **mark** under 96px.
- **Don't** recolor, rotate, add drop shadows/outlines, or stretch (preserve aspect ratio).
- On busy or light backgrounds, the white inner rim (built into the SVG) keeps the disc readable.

## Color

The palette is a single **alpenglow** sweep — deep summit indigo climbing through violet and
magenta into coral and amber — cooled by a glacier teal accent.

### Core palette

| Token           | Hex       | Role                                   |
| --------------- | --------- | -------------------------------------- |
| Summit Indigo   | `#3A1378` | Deepest sky / dark surfaces            |
| Twilight Violet | `#7A2BB4` | **Primary** brand color                |
| Aurora Magenta  | `#C42C9E` | Primary accent / mid-gradient          |
| Alpenglow Coral | `#FB6F57` | Warm accent, CTAs                      |
| Sunlit Amber    | `#FFC24B` | Highlight / horizon glow               |
| Glacier Teal    | `#2DD4BF` | Cool accent (success, "fresh")         |
| Sky Cyan        | `#38BDF8` | Info / links                           |
| Snow White      | `#F8FAFF` | Snow caps, text on dark                |
| Peak Shadow     | `#371765` | Shaded mountain faces                  |
| Ink             | `#1A1033` | Body text on light, darkest background |

### Neutrals (violet-tinted)

`#160A2E` (canvas dark) · `#2A1052` (raised dark) · `#C9B8E8` (muted lavender text) · `#E9E1F7` (hairlines) · `#FFFFFF`

### Signature gradients

- **Alpenglow** (the brand gradient): `#3A1378 → #7A2BB4 → #C42C9E → #FB6F57 → #FFC24B` (vertical).
- **Wordmark** (horizontal): `#7A2BB4 → #C42C9E → #FB6F57`.
- **Glacier** (cool, for secondary surfaces): `#2DD4BF → #0E7490`.

## Typography

- **Wordmark / display:** Inter, weight 800 (Extra-Bold), tight tracking (≈ −3% / −0.03em).
  Falls back to `'Helvetica Neue', Arial, sans-serif`.
- **UI:** Inter for the extension's popup and options pages, with the system sans fallback above.

## Regenerating assets

PNGs are derived from the SVGs with [`@resvg/resvg-js`](https://github.com/yisibl/resvg-js)
(pure-Rust, no system libraries, honors transparency and aspect ratio):

```bash
npm i @resvg/resvg-js --no-save
node assets/brand/render.mjs
```

Design tokens for code live in `tokens.css` (CSS custom properties).
