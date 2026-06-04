// Shared kit for building claude.ai theme Plugins. Every theme recolors the same
// way (the mapping verified via the Dev page's Export state against claude.ai's
// "Claude Design System"), so the CSS is generated from a palette here rather
// than hand-written per theme — one code path, no duplicated stylesheets.
//
// The mapping:
//   - Accent: Claude's brand "clay" exists as hex aliases (--cds-clay /
//     --cds-clay-emphasized) and raw HSL channels (--_brand-clay /
//     --_brand-clay-emphasized, consumed as hsl(var(--…))). We override both
//     forms so every component that reads either follows.
//   - Surfaces: backgrounds/borders come from a neutral --_gray-<weight> ramp
//     (body = --_gray-800). We retint the DARK end of the ramp to the palette's
//     surface hue/saturation while PRESERVING each step's lightness — keeping
//     all contrast relationships and the sidebar-vs-canvas separation, just
//     brand-tinted. The light weights (text) are left alone.
//   - The "Claude Code" bar is a token-less <aside> (a flat neutral outside the
//     ramp), so it gets an element-targeted background as a fallback.
//
// `!important` on the custom-property overrides lets them win over Claude's
// mode-scoped redefinitions (e.g. under [data-mode="dark"]) regardless of
// selector specificity. Injected into the HOST document (PluginContext.injectCss),
// so selectors target the page, not a shadow root. If Claude renames these
// tokens, this file is the single place to update. Apache-2.0.

import type { Plugin, PluginMeta } from '../types'

// A color in the two representations Claude's tokens use.
export interface ThemeColor {
  // `#rrggbb`, for the hex token aliases (var(--cds-clay)).
  hex: string
  // HSL channel triplet `H S% L%`, for the raw channels (hsl(var(--_brand-clay))).
  channels: string
}

export interface ClaudeThemePalette {
  id: string
  name: string
  description: string
  defaultEnabled?: boolean
  matches?: string[]
  // The brand accent, and its "emphasized" (hover/pressed) variant.
  accent: ThemeColor
  accentEmphasized: ThemeColor
  // Surface tint applied across the dark gray ramp (lightness is preserved).
  surfaceHue: number
  surfaceSat: number
  // Lightness for the token-less sidebar <aside>; defaults a touch above the
  // canvas (--_gray-800 = 12%) so the bar still reads as raised.
  sidebarLightness?: number
  // Text-selection colors (hex).
  selectionBg: string
  selectionFg: string
}

// Dark end of Claude's --_gray ramp: [weight, lightness%] pairs. The lightness
// is Claude's own per-weight value, preserved so only hue/saturation change.
const GRAY_RAMP: ReadonlyArray<readonly [number, number]> = [
  [600, 31],
  [650, 26],
  [700, 21],
  [750, 17],
  [800, 12],
  [810, 12],
  [820, 11],
  [830, 10],
  [840, 9],
  [850, 8],
  [860, 7],
  [870, 7],
  [880, 6],
  [890, 5],
  [900, 4],
]

function buildThemeCss(p: ClaudeThemePalette): string {
  const { surfaceHue: h, surfaceSat: s } = p
  const ramp = GRAY_RAMP.map(
    ([weight, l]) => `  --_gray-${weight}: ${h} ${s}% ${l}% !important;`,
  ).join('\n')
  const sidebarL = p.sidebarLightness ?? 16
  return `:root {
  /* Accent → ${p.name}. */
  --_brand-clay: ${p.accent.channels} !important;
  --_brand-clay-emphasized: ${p.accentEmphasized.channels} !important;
  --cds-clay: ${p.accent.hex} !important;
  --cds-clay-emphasized: ${p.accentEmphasized.hex} !important;

  /* Surfaces: dark gray ramp retinted to hue ${h}, sat ${s}%, lightness preserved. */
${ramp}
  --cds-gray-650: hsl(${h} ${s}% 26%) !important;
}

/* The token-less "Claude Code" <aside>, tinted directly (raised above canvas). */
aside {
  background-color: hsl(${h} ${s}% ${sidebarL}%) !important;
}

::selection {
  background: ${p.selectionBg};
  color: ${p.selectionFg};
}
`
}

// Build a theme Plugin from a palette. The CSS is generated once at module load
// and injected through the context on `onLoad` — which tracks and removes it on
// unload, so no `onUnload` is needed.
export function createClaudeTheme(palette: ClaudeThemePalette): Plugin {
  const meta: PluginMeta = {
    id: palette.id,
    name: palette.name,
    description: palette.description,
    matches: palette.matches ?? ['https://claude.ai/*'],
    defaultEnabled: palette.defaultEnabled ?? false,
  }
  const css = buildThemeCss(palette)
  return {
    meta,
    onLoad(ctx) {
      ctx.injectCss(css)
    },
  }
}
