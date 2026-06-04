// solarized-dark — the Solarized Dark palette (saturated teal-grey, classic).
// Built from the shared claude-theme kit; see ../claude-theme.ts for the mapping.
// Surface saturation is held below Solarized's full value so the large page
// surfaces read as teal-tinted rather than vivid.

import { createClaudeTheme } from '../claude-theme'

export const solarizedDark = createClaudeTheme({
  id: 'solarized-dark',
  name: 'Solarized Dark',
  description: 'Recolors the page with the Solarized Dark palette.',
  accent: { hex: '#268bd2', channels: '205 69% 49%' }, // blue
  accentEmphasized: { hex: '#2aa198', channels: '175 59% 40%' }, // cyan
  surfaceHue: 193,
  surfaceSat: 45,
  selectionBg: '#073642',
  selectionFg: '#839496',
})
