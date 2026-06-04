// nord — the Nord palette (arctic, muted blue). Built from the shared
// claude-theme kit; see ../claude-theme.ts for how the mapping works.

import { createClaudeTheme } from '../claude-theme'

export const nord = createClaudeTheme({
  id: 'nord',
  name: 'Nord',
  description: 'Recolors the page with the Nord palette.',
  accent: { hex: '#88c0d0', channels: '193 43% 67%' }, // Frost
  accentEmphasized: { hex: '#81a1c1', channels: '210 34% 63%' },
  surfaceHue: 220, // Polar Night
  surfaceSat: 16,
  selectionBg: '#434c5e',
  selectionFg: '#eceff4',
})
