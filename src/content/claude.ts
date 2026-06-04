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

startRouter(claudeSite)

// Publish the active named routes on every navigation, so route-scoped plugin
// behavior (ctx.onRoute) and the Panel can react. One tracker for the page,
// rather than each plugin re-matching the URL itself.
const publishRoutes = (url: URL): void => useRouteStore.getState().setRoutes(matchRoutes(url))
publishRoutes(new URL(location.href))
observeNavigation(publishRoutes)

void new PluginManager(claudeEnhancements).init()
