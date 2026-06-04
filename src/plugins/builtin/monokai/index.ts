// monokai — the classic Monokai palette (high-contrast, vivid). Built from the
// shared claude-theme kit; see ../claude-theme.ts for the mapping.

import { createClaudeTheme } from '../claude-theme'

export const monokai = createClaudeTheme({
  id: 'monokai',
  name: 'Monokai',
  description: 'Recolors the page with the Monokai palette.',
  accent: { hex: '#f92672', channels: '338 95% 56%' }, // pink
  accentEmphasized: { hex: '#ae81ff', channels: '261 100% 75%' }, // purple
  surfaceHue: 70, // warm olive
  surfaceSat: 8,
  selectionBg: '#49483e',
  selectionFg: '#f8f8f2',
})
