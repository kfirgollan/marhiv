// one-dark — the Atom One Dark palette (balanced, familiar). Built from the
// shared claude-theme kit; see ../claude-theme.ts for the mapping.

import { createClaudeTheme } from '../claude-theme'

export const oneDark = createClaudeTheme({
  id: 'one-dark',
  name: 'One Dark',
  description: 'Recolors the page with the Atom One Dark palette.',
  accent: { hex: '#61afef', channels: '207 82% 66%' }, // blue
  accentEmphasized: { hex: '#c678dd', channels: '286 60% 67%' }, // purple
  surfaceHue: 220,
  surfaceSat: 13,
  selectionBg: '#3e4451',
  selectionFg: '#abb2bf',
})
