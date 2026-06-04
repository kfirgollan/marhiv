// everforest — the Everforest palette (green, low-contrast, easy on the eyes).
// Built from the shared claude-theme kit; see ../claude-theme.ts for the mapping.

import { createClaudeTheme } from '../claude-theme'

export const everforest = createClaudeTheme({
  id: 'everforest',
  name: 'Everforest',
  description: 'Recolors the page with the Everforest palette.',
  accent: { hex: '#a7c080', channels: '83 34% 63%' }, // green
  accentEmphasized: { hex: '#83c092', channels: '135 33% 63%' }, // aqua
  surfaceHue: 205,
  surfaceSat: 14,
  selectionBg: '#4f5b58',
  selectionFg: '#d3c6aa',
})
