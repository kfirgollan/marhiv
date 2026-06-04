// The built-in Plugin registry: the curated, first-party plugins that ship with
// Marhiv. Declarative, like the Panel's BUILTIN_PAGES — adding a plugin is
// appending one entry. (Community plugins from the Registry will extend this set
// later.)

import type { Plugin } from './types'
import { marhivTheme } from './builtin/marhiv-theme'
import { dracula } from './builtin/dracula'
import { marhivDev } from './builtin/marhiv-dev'

export const BUILTIN_PLUGINS: Plugin[] = [marhivTheme, dracula, marhivDev]
