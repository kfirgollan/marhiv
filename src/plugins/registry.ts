// The built-in Plugin registry: the curated, first-party plugins that ship with
// Marhiv. Declarative, like the Panel's BUILTIN_PAGES — adding a plugin is
// appending one entry. (Community plugins from the Registry will extend this set
// later.)

import type { Plugin } from './types'
import { marhivTheme } from './builtin/marhiv-theme'
import { dracula } from './builtin/dracula'
import { nord } from './builtin/nord'
import { tokyoNight } from './builtin/tokyo-night'
import { catppuccinMocha } from './builtin/catppuccin-mocha'
import { gruvboxDark } from './builtin/gruvbox-dark'
import { solarizedDark } from './builtin/solarized-dark'
import { oneDark } from './builtin/one-dark'
import { monokai } from './builtin/monokai'
import { rosePine } from './builtin/rose-pine'
import { everforest } from './builtin/everforest'
import { marhivDev } from './builtin/marhiv-dev'
import { claudeCodeEnhancer } from './builtin/claude-code-enhancer'

// Themes first (marhiv-theme is the flagship), then non-theme plugins.
export const BUILTIN_PLUGINS: Plugin[] = [
  marhivTheme,
  dracula,
  nord,
  tokyoNight,
  catppuccinMocha,
  gruvboxDark,
  solarizedDark,
  oneDark,
  monokai,
  rosePine,
  everforest,
  marhivDev,
  claudeCodeEnhancer,
]
