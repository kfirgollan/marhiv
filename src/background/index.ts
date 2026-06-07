// Marhiv's background service worker — the project's first. Its sole job today is
// to keep `chrome.userScripts` registrations in sync with the user's saved scripts
// (src/storage/scripts.ts). The userScripts API is the only Chrome Web Store-
// compliant way to run user-authored code on MV3, and it isn't reachable from a
// content script — only from here (a worker / extension page).
//
// It reconciles on startup and whenever the scripts list or the custom-scripts
// plugin's enabled state changes: clear our registrations, then re-add one per
// enabled script (prefixed with the `marhiv` bridge shim) while the plugin is on.

import { wrapUserScript } from '../userscripts/shim'
import {
  CUSTOM_SCRIPTS_PLUGIN_ID,
  CUSTOM_SCRIPTS_DEFAULT_ENABLED,
  userScriptRegistrationId,
} from '../userscripts/constants'
import { loadScripts, userScriptsAvailableValue, type UserScript } from '../storage/scripts'
import { loadPluginStates } from '../storage/plugins'
import { log } from '../log'

// Whether the custom-scripts plugin is on — the master switch for the feature.
// Mirrors the Plugin Manager's isEnabled (states[id] ?? defaultEnabled ?? false).
async function pluginEnabled(): Promise<boolean> {
  const states = (await loadPluginStates()) ?? {}
  return states[CUSTOM_SCRIPTS_PLUGIN_ID] ?? CUSTOM_SCRIPTS_DEFAULT_ENABLED
}

// Remove every user script we previously registered. getScripts returns only this
// extension's registrations, so clearing them all is safe.
async function clearOurScripts(): Promise<void> {
  const existing = await chrome.userScripts.getScripts()
  if (existing.length > 0) {
    await chrome.userScripts.unregister({ ids: existing.map((s) => s.id) })
  }
}

// Register one script. Done individually so a single bad pattern (e.g. matches
// outside our host_permissions, which chrome rejects) can't block the others.
async function register(script: UserScript): Promise<void> {
  try {
    await chrome.userScripts.register([
      {
        id: userScriptRegistrationId(script.id),
        matches: script.matches,
        js: [{ code: wrapUserScript(script.id, script.code) }],
        world: script.world,
        runAt: 'document_idle',
      },
    ])
  } catch (error) {
    log.warn(`failed to register user script "${script.id}"`, error)
  }
}

async function reconcile(): Promise<void> {
  // From Chrome 138 `chrome.userScripts` is absent until the user enables the
  // per-extension "Allow user scripts" toggle. Record availability so the editor
  // can guide the user, and bail out cleanly when it's off.
  if (!chrome.userScripts) {
    await userScriptsAvailableValue.save(false)
    return
  }
  await userScriptsAvailableValue.save(true)

  try {
    await clearOurScripts()
    if (!(await pluginEnabled())) return
    const scripts = (await loadScripts()) ?? []
    for (const script of scripts) {
      if (script.enabled) await register(script)
    }
  } catch (error) {
    log.error('failed to reconcile user scripts', error)
  }
}

// Reconcile on every lifecycle entry point, plus whenever the scripts list or the
// plugin's enabled state changes in storage.
void reconcile()
chrome.runtime.onInstalled.addListener(() => void reconcile())
chrome.runtime.onStartup.addListener(() => void reconcile())
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return
  if ('customScripts' in changes || 'pluginStates' in changes) void reconcile()
})
