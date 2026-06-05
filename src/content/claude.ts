// Marhiv content-script host — Claude (https://claude.ai).
//
// Thin entry point. It starts two cross-site subsystems for this page:
//   - the router, which drives per-route behavior as the SPA navigates
//     (per-page behavior lives in src/sites/claude.ts, not here);
//   - the Plugin Manager, which activates enabled plugins whose `matches` fit
//     the current URL (src/plugins/manager.ts).

import { startRouter } from '../routing/router'
import { claudeSite, claudeEnhancements, matchRoutes } from '../sites/claude'
import { observeNavigation } from '../routing/navigation'
import { useRouteStore } from '../store/route'
import { PluginManager } from '../plugins/manager'
import { onContextInvalidated } from '../runtime/lifecycle'
import { log, installGlobalErrorSink, currentLevel } from '../log'

// Catch anything Marhiv throws uncaught, then announce exactly which build is
// running (and at what log level) — so a stale-extension suspicion is confirmed
// or ruled out at a glance.
installGlobalErrorSink()
log.info(
  `version ${__MARHIV_VERSION__}, built ${__MARHIV_BUILD__} loaded (log level: ${currentLevel()})`,
)

const router = startRouter(claudeSite)

// Publish the active named routes on every navigation, so route-scoped plugin
// behavior (ctx.onRoute) and the Panel can react. One tracker for the page,
// rather than each plugin re-matching the URL itself.
const publishRoutes = (url: URL): void => useRouteStore.getState().setRoutes(matchRoutes(url))
publishRoutes(new URL(location.href))
const unobserveRoutes = observeNavigation(publishRoutes)

const plugins = new PluginManager(claudeEnhancements)
void plugins.init()

// When the extension is reloaded/updated/disabled, this content script becomes
// a zombie: it keeps running but can no longer reach the extension. Tear the
// page subsystems down so it stops reacting to drags and navigation and removes
// its on-page chrome, instead of lingering and throwing "Extension context
// invalidated". A fresh page load re-injects a clean content script.
onContextInvalidated(() => {
  unobserveRoutes()
  plugins.dispose()
  router.stop()
})
