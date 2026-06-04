// The built-in Plugin registry: the curated, first-party plugins that ship with
// Marhiv. Declarative, like the Panel's SECTIONS — adding a plugin is appending
// one entry. (Community plugins from the Registry will extend this set later.)

import type { Plugin } from './types'
import { marhivTheme } from './builtin/marhiv-theme'

export const BUILTIN_PLUGINS: Plugin[] = [marhivTheme]
