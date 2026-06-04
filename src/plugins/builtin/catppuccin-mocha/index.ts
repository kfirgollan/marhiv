// catppuccin-mocha — the Catppuccin Mocha palette (pastel, soft, dark). Built
// from the shared claude-theme kit; see ../claude-theme.ts for the mapping.

import { createClaudeTheme } from '../claude-theme'

export const catppuccinMocha = createClaudeTheme({
  id: 'catppuccin-mocha',
  name: 'Catppuccin Mocha',
  description: 'Recolors the page with the Catppuccin Mocha palette.',
  accent: { hex: '#cba6f7', channels: '267 84% 81%' }, // mauve
  accentEmphasized: { hex: '#f5c2e7', channels: '316 72% 86%' }, // pink
  surfaceHue: 240,
  surfaceSat: 21,
  selectionBg: '#45475a',
  selectionFg: '#cdd6f4',
})
