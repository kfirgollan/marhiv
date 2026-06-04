// marhiv-theme — the first-party Marhiv theme (the alpenglow palette). Built
// from the shared claude-theme kit; see ../claude-theme.ts for how the host
// token mapping works.

import { createClaudeTheme } from '../claude-theme'

export const marhivTheme = createClaudeTheme({
  id: 'marhiv-theme',
  name: 'Marhiv Theme',
  description: 'Recolors the page with the Marhiv alpenglow palette.',
  accent: { hex: '#7a2bb4', channels: '274.6 61.4% 43.7%' }, // Twilight Violet
  accentEmphasized: { hex: '#c42c9e', channels: '315 63.3% 47.1%' }, // Aurora Magenta
  surfaceHue: 262,
  surfaceSat: 42,
  selectionBg: '#c42c9e',
  selectionFg: '#ffffff',
})
