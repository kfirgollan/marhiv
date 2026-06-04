// tokyo-night — the Tokyo Night palette (deep indigo, neon accents). Built from
// the shared claude-theme kit; see ../claude-theme.ts for how the mapping works.

import { createClaudeTheme } from '../claude-theme'

export const tokyoNight = createClaudeTheme({
  id: 'tokyo-night',
  name: 'Tokyo Night',
  description: 'Recolors the page with the Tokyo Night palette.',
  accent: { hex: '#7aa2f7', channels: '221 89% 72%' }, // blue
  accentEmphasized: { hex: '#bb9af7', channels: '261 86% 79%' }, // purple
  surfaceHue: 235,
  surfaceSat: 19,
  selectionBg: '#283457',
  selectionFg: '#c0caf5',
})
