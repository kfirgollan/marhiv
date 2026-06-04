// Marhiv content-script host — Claude (https://claude.ai).
//
// Thin entry point. It starts two cross-site subsystems for this page:
//   - the router, which drives per-route behavior as the SPA navigates
//     (per-page behavior lives in src/sites/claude.ts, not here);
//   - the Plugin Manager, which activates enabled plugins whose `matches` fit
//     the current URL (src/plugins/manager.ts).

import { startRouter } from '../routing/router'
import { claudeSite } from '../sites/claude'
import { PluginManager } from '../plugins/manager'

startRouter(claudeSite)
void new PluginManager().init()
