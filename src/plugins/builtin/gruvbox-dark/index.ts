// gruvbox-dark — the Gruvbox Dark palette (warm, retro). Built from the shared
// claude-theme kit; see ../claude-theme.ts for the mapping.

import { createClaudeTheme } from '../claude-theme'

export const gruvboxDark = createClaudeTheme({
  id: 'gruvbox-dark',
  name: 'Gruvbox Dark',
  description: 'Recolors the page with the Gruvbox Dark palette.',
  accent: { hex: '#fe8019', channels: '27 99% 55%' }, // orange
  accentEmphasized: { hex: '#fabd2f', channels: '42 95% 58%' }, // yellow
  surfaceHue: 20, // warm neutral
  surfaceSat: 8,
  selectionBg: '#504945',
  selectionFg: '#ebdbb2',
})
