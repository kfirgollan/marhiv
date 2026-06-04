// dracula — the Dracula palette. Built from the shared claude-theme kit; see
// ../claude-theme.ts for how the host token mapping works.

import { createClaudeTheme } from '../claude-theme'

export const dracula = createClaudeTheme({
  id: 'dracula',
  name: 'Dracula',
  description: 'Recolors the page with the Dracula palette.',
  accent: { hex: '#bd93f9', channels: '264.7 89.5% 77.6%' }, // purple
  accentEmphasized: { hex: '#ff79c6', channels: '325.5 100% 73.7%' }, // pink
  surfaceHue: 231,
  surfaceSat: 16,
  selectionBg: '#44475a',
  selectionFg: '#f8f8f2',
})
