// Persisted user scripts: the user-authored "userscripts" that the custom-scripts
// plugin manages. A list (order = the editor's list order) stored on the generic
// persisted-value factory, so an edit in the Panel propagates to every page — and
// to the background worker, which (re)registers them with `chrome.userScripts`.
//
// The code itself never runs in this isolated world. The background worker hands
// each enabled script to `chrome.userScripts`, which executes it in its own world
// (the only Chrome Web Store-compliant way to run user-authored code on MV3).

import { createPersistedValue } from './persisted'

// Which JS world a script runs in — mirrors chrome.userScripts' `world`. USER_SCRIPT
// is isolated from the page's own JS (safer, the default); MAIN shares the page's
// globals (full classic-userscript power, more risk). The user picks per script.
export type ScriptWorld = 'USER_SCRIPT' | 'MAIN'

export interface UserScript {
  // Stable id; the storage identity, the userScripts registration id (suffix), and
  // the correlation key the bridge uses to tear down this script's effects.
  id: string
  name: string
  // The author's source. Runs verbatim in the script's world, after the injected
  // `marhiv` bridge shim (see src/userscripts/shim.ts).
  code: string
  enabled: boolean
  world: ScriptWorld
  // URL match patterns. Intersected with the extension's host_permissions before
  // registration (a script can't run where Marhiv has no host access).
  matches: string[]
  // Epoch ms; set by the editor. Stamped by the caller (we don't read the clock here).
  createdAt: number
  updatedAt: number
}

function isUserScript(value: unknown): value is UserScript {
  if (typeof value !== 'object' || value === null) return false
  const s = value as Record<string, unknown>
  return (
    typeof s.id === 'string' &&
    typeof s.name === 'string' &&
    typeof s.code === 'string' &&
    typeof s.enabled === 'boolean' &&
    (s.world === 'USER_SCRIPT' || s.world === 'MAIN') &&
    Array.isArray(s.matches) &&
    s.matches.every((m) => typeof m === 'string') &&
    typeof s.createdAt === 'number' &&
    typeof s.updatedAt === 'number'
  )
}

function isUserScriptArray(value: unknown): value is UserScript[] {
  return Array.isArray(value) && value.every(isUserScript)
}

// The scripts list. The reactive store in src/store/scripts.ts wraps it for the
// editor; the background worker uses the loose load/onChange to reconcile registrations.
export const scriptsValue = createPersistedValue<UserScript[]>('customScripts', isUserScriptArray)

export const loadScripts = scriptsValue.load
export const onScriptsChange = scriptsValue.onChange

// Whether `chrome.userScripts` is usable right now. From Chrome 138 the user must
// flip a per-extension "Allow user scripts" toggle (off by default), so the API is
// absent until they do. The background worker writes this; the editor reads it to
// show enablement guidance instead of silently doing nothing.
export const userScriptsAvailableValue = createPersistedValue<boolean>(
  'userScriptsAvailable',
  (v): v is boolean => typeof v === 'boolean',
)
