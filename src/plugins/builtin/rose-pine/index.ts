// rose-pine — the Rosé Pine palette (muted rose/iris, "main" dark variant).
// Built from the shared claude-theme kit; see ../claude-theme.ts for the mapping.

import { createClaudeTheme } from '../claude-theme'

export const rosePine = createClaudeTheme({
  id: 'rose-pine',
  name: 'Rosé Pine',
  description: 'Recolors the page with the Rosé Pine palette.',
  accent: { hex: '#c4a7e7', channels: '267 57% 78%' }, // iris
  accentEmphasized: { hex: '#eb6f92', channels: '343 76% 68%' }, // love
  surfaceHue: 249,
  surfaceSat: 22,
  selectionBg: '#403d52',
  selectionFg: '#e0def4',
})
