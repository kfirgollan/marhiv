---
description: "Create a Marhiv theme Plugin — a plugin that restyles a host AI site to a target palette by injecting CSS that overrides the site's design tokens. Builds on /plugin-create with the token-discovery workflow (via the Dev page's Export state dump) and brand mapping. Use when the user wants to add or build a theme/skin/recolor plugin."
---

# Create Theme Plugin

A **theme** is a Plugin whose `onLoad` injects a stylesheet into the host page to
recolor it. This skill builds on `/plugin-create` (which covers all the plugin
mechanics — `meta`, lifecycle, registration, the toggle) and adds the part unique
to themes: **discovering the host site's real design tokens and remapping them to
the target palette.**

Consult `docs/taxonomy.md` for **Plugin**, **Plugin Context**, and **Enhancement
API**. The canonical, working example is `src/plugins/builtin/marhiv-theme/`
(`index.ts` + `theme.css`) — read it first; this skill generalizes how it was
built.

## The golden rule

**Recolor by overriding the host's CSS custom properties (design tokens), not by
targeting its class names.** Class names on AI sites are obfuscated and churn;
the design-token layer is stable and is what every component reads its color
from. Override the tokens and the whole UI follows; chase class names and you get
a brittle, half-working theme.

The corollary: **don't guess token names — measure them.** Marhiv ships a debug
dump exactly for this (Dev page → **Export state**, implemented in
`src/debug/snapshot.ts`).

## Input

Arguments: $ARGUMENTS

- **target site** — which host the theme restyles (must be a site Marhiv already
  runs on; see the `matches` constraint in `/plugin-create` Step 2).
- **palette** — the colors to apply. Default to the **Marhiv** brand palette in
  `assets/brand/tokens.css` / `assets/brand/BRAND.md`:
  - Primary **Twilight Violet** `#7a2bb4`, accent **Aurora Magenta** `#c42c9e`,
    **Alpenglow Coral** `#fb6f57`, **Sunlit Amber** `#ffc24b`, **Glacier Teal**
    `#2dd4bf`, **Sky Cyan** `#38bdf8` (links/info); dark surfaces **canvas**
    `#160a2e`, **surface** `#2a1052`.
- **scope** — accent only, or accent **+ surfaces** (backgrounds/borders). Ask if
  unspecified; accent-only is the safe default, surfaces is higher-impact.

## Execution

### Step 1: Scaffold the plugin (via /plugin-create)

Create the plugin module and register it exactly as `/plugin-create` describes.
The theme specifics:

- `meta.defaultEnabled` is almost always `false` (don't restyle a site unprompted).
- `onLoad` just injects the stylesheet; **no `onUnload`** (the Plugin Context
  tracks the injected `<style>` and removes it on unload).
- Import the CSS as a string with `?inline` so it's injected only when the plugin
  is on — not appended to `<head>` at build time:

```ts
import type { Plugin } from '../../types'
import themeCss from './theme.css?inline'

export const myTheme: Plugin = {
  meta: {
    id: 'my-theme',
    name: 'My Theme',
    description: 'Recolors the page with the … palette.',
    matches: ['https://claude.ai/*'],
    defaultEnabled: false,
  },
  onLoad(ctx) {
    ctx.injectCss(themeCss)
  },
}
```

Start `theme.css` with just a sentinel rule (e.g. recolor links) so you can
confirm the pipeline before doing real work.

### Step 2: Discover the host's tokens (measure, don't guess)

Build and load the extension, open a target page, enable the draft theme, then
Dev page → **Export state**. In the JSON, inspect `host`:

- **`host.rootCustomProps`** — custom properties declared on `:root`/`html`/`body`
  (the raw palette + base tokens).
- **`host.semanticTokens`** — the semantic surface/text family (`--bg-*`,
  `--border-*`, `--text-*`, `--surface-*`, `--t*`, …), including **mode-scoped**
  ones (e.g. defined under `[data-mode="dark"]`) that the root scan misses.
- **`host.accentishProps`** — a pre-filtered slice whose names hint at color.
- **`host.computed`** (`html`/`body`/`link`) and **`host.surfaces[]`** (the
  `nav`/`aside`/`header`/`main` elements with tag, class, and computed
  background) — your before/after ground truth and a class hook when no token
  drives a surface.

From this, identify: the **brand/accent** token(s), and (for surfaces) the
**background/border ramp**. Watch the value **format** — a site may store colors
as hex (`var(--x)`) or as **HSL channel triplets** like `14.8 63.1% 59.6%`
consumed via `hsl(var(--x))`. Match whatever format the token uses, and override
**every representation** a value has (e.g. clay existed as both `--cds-clay` hex
and `--_brand-clay` channels — both needed remapping).

> Example from the real claude.ai mapping: brand accent = "clay" (`--cds-clay`
> `#d97757` **and** `--_brand-clay` `14.8 63.1% 59.6%`); surfaces = a neutral
> `--_gray-<weight>` ramp; body bg = `--_gray-800`. The "Claude Code" bar,
> though, used a flat-neutral `--bg-*` token outside that ramp.

### Step 3: Map the palette onto the tokens

Write the real `theme.css` as `:root` overrides. Principles that make it land:

- **Use `!important` on the custom-property overrides.** Sites often redefine
  tokens under a mode-scoped selector (`[data-mode="dark"]`, `.dark`) with higher
  specificity than `:root`; `!important` wins regardless of specificity.
- **Accent:** remap the brand accent token(s) to the target accent (and its
  "emphasized"/hover variant to a second brand color for a tasteful shift).
  Convert your hex brand colors to the token's format (compute HSL channels if
  the token uses `hsl(var(--x))`).
- **Surfaces (if in scope): retint the dark ramp but PRESERVE each step's
  lightness.** Shift only hue + saturation; keep `L%` per weight. This keeps all
  contrast relationships (text stays readable; sidebar-vs-canvas separation is
  retained) while everything picks up the brand hue. Leave the light end of the
  ramp (text colors) untouched so foreground contrast is never reduced.
- **Token-less surfaces:** if a surface is driven by a flat color outside the
  ramp (the dump's `host.surfaces[]` shows it unchanged after the ramp retint),
  fall back to an **element-targeted** rule (e.g. `aside { background-color: … !important }`)
  using the tag/class from the dump. Comment it as a fallback and prefer moving
  it onto a token override once you've identified the token.

Sketch (mirrors `marhiv-theme/theme.css`):

```css
:root {
  /* Accent — both representations the host uses. */
  --_brand-accent: 274.6 61.4% 43.7% !important; /* HSL channels of #7a2bb4 */
  --cds-accent: #7a2bb4 !important; /* hex alias */

  /* Surfaces — dark ramp retinted to hue 262, sat 42%, lightness preserved. */
  --_gray-800: 262 42% 12% !important; /* main canvas */
  /* …other dark weights, same hue/sat, each keeping its own L% … */
}
```

Document the mapping in a header comment with the source (a live snapshot) and
note that it's the single place to update if the host renames tokens. Keep the
file self-contained and injected into the host document (it must reach the page,
not a shadow root).

### Step 4: Verify against the dump

After rebuilding and reloading, **Export state** again and confirm objectively:

- `plugins[].styleInjected: true` and a non-zero `styleChars` — the CSS is on the
  page.
- `host.accentishProps` / `host.semanticTokens` now show your values for the
  tokens you overrode.
- `host.computed.body` / `host.surfaces[]` backgrounds moved to the target hue
  (and surfaces still differ from each other — you didn't flatten them).

Any surface still showing the original color is driven by a token you haven't hit
— go back to Step 2 with the richer `semanticTokens`/`surfaces` data and remap
it.

### Step 5: Run the gates

```bash
npm run typecheck
npm run lint
npm run format
npm run check:dup
npm run build
```

## Report

State the theme's `id`/`name`, the target site, the palette, and the scope
(accent / accent + surfaces). List the host tokens you remapped (and any
element-targeted fallbacks, flagged for later token-ization). Confirm the gates
passed and that you verified the recolor against the Export-state dump (cite the
before/after `computed`/`surfaces` values). Themes are inherently coupled to the
host's token names — note that they may need updating if the site's design system
changes, and that `theme.css`'s header comment is where to do it.
