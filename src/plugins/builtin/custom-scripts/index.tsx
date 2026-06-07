// custom-scripts — the userscripts escape hatch as a first-party Plugin. On load
// it (1) installs the isolated-world bridge endpoint that runs scripts' `marhiv`
// API calls against the real PluginContext, and (2) contributes the Scripts Panel
// Page for editing them. The actual execution of user code happens via
// chrome.userScripts, driven by the background worker (src/background) — this
// plugin is the in-page half: the editor UI and the API bridge.
//
// The plugin is the feature's master switch: the background worker only registers
// user scripts while it's enabled, so disabling it both removes the bridge (here,
// via onUnload) and unregisters every script.

import type { Plugin } from '../../types'
import { installScriptBridge } from '../../../userscripts/bridge'
import {
  CUSTOM_SCRIPTS_PLUGIN_ID,
  CUSTOM_SCRIPTS_DEFAULT_ENABLED,
} from '../../../userscripts/constants'
import { ScriptsPage } from './ScriptsPage'

// One content-script instance per page; the manager won't double-load a plugin, so
// a module-level handle to the bridge's teardown is enough to reach it from onUnload.
let disposeBridge: (() => void) | null = null

export const customScripts: Plugin = {
  meta: {
    id: CUSTOM_SCRIPTS_PLUGIN_ID,
    name: 'Custom Scripts',
    description: 'Write, save, and run your own userscripts with the marhiv API.',
    matches: ['https://claude.ai/*'],
    defaultEnabled: CUSTOM_SCRIPTS_DEFAULT_ENABLED,
    category: 'Enhancement',
  },
  onLoad(ctx) {
    disposeBridge = installScriptBridge(ctx)
    ctx.registerPage({
      id: 'custom-scripts',
      menu: { label: 'Scripts', icon: '📝' },
      Page: () => <ScriptsPage />,
    })
  },
  onUnload() {
    // The registered page is torn down by the context automatically; the bridge is
    // ours to dispose (it owns a message listener and per-script effect controllers).
    disposeBridge?.()
    disposeBridge = null
  },
}
