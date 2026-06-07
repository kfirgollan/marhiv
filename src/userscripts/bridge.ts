// The isolated-world endpoint of the user-script bridge. The custom-scripts plugin
// installs it on load with its real PluginContext; it listens for `marhiv` API
// calls relayed from script worlds (see shim.ts / protocol.ts) and performs them
// here — where the live Slots engine and PluginContext actually are — relaying
// callbacks (route enter/leave, action clicks) back to the originating script.
//
// Effects are tracked per script (an AbortController each), so disabling one
// script tears down just its effects; `dispose()` tears down all of them when the
// plugin unloads. We deliberately route through the real `ctx` so route handling
// reuses the engine (no reimplemented mini-router), with `ctx.onRoute`'s `signal`
// option giving us the per-script early teardown.

import type { PluginContext, RouteScope } from '../plugins/types'
import { Slot, type SlotKey } from '../enhance/slots'
import { useScripts } from '../store/scripts'
import { log } from '../log'
import { US_REQ, US_CB, US_HELLO, type UsRequest, type UsCallback } from './protocol'

const SLOT_KEYS = new Set<string>(Object.values(Slot))
const isSlotKey = (key: string): key is SlotKey => SLOT_KEYS.has(key)

const USERSCRIPT_STYLE_ATTR = 'data-marhiv-userscript'

// Install the bridge. Returns a dispose() the plugin calls on unload.
export function installScriptBridge(ctx: PluginContext): () => void {
  const master = new AbortController()
  // One controller per script; aborting it removes that script's CSS, route
  // handlers, and slot actions. Created lazily on first message from a script.
  const controllers = new Map<string, AbortController>()
  // Live route scopes a script can attach actions to, by the id we minted on enter.
  const scopes = new Map<string, RouteScope>()
  let scopeSeq = 0

  const post = (msg: UsCallback): void => {
    window.postMessage(msg, location.origin)
  }

  const controllerFor = (scriptId: string): AbortController => {
    let ac = controllers.get(scriptId)
    if (!ac) {
      ac = new AbortController()
      controllers.set(scriptId, ac)
    }
    return ac
  }

  const injectCss = (css: string, signal: AbortSignal): void => {
    if (signal.aborted) return
    const style = document.createElement('style')
    style.setAttribute(USERSCRIPT_STYLE_ATTR, '')
    style.textContent = css
    document.head.appendChild(style)
    signal.addEventListener('abort', () => style.remove(), { once: true })
  }

  const handleOnRoute = (
    scriptId: string,
    route: string,
    token: string,
    signal: AbortSignal,
  ): void => {
    ctx.onRoute(
      route,
      (scope) => {
        scopeSeq += 1
        const scopeId = `${scriptId}:scope:${scopeSeq}`
        scopes.set(scopeId, scope)
        post({ source: US_CB, scriptId, op: 'routeEnter', token, scopeId, url: scope.url.href })
        scope.signal.addEventListener(
          'abort',
          () => {
            scopes.delete(scopeId)
            post({ source: US_CB, scriptId, op: 'routeLeave', scopeId })
          },
          { once: true },
        )
      },
      { signal },
    )
  }

  const handleAddAction = (
    scriptId: string,
    scopeId: string,
    slotKey: string,
    action: { id: string; label: string; icon?: string },
    clickToken: string,
  ): void => {
    const scope = scopes.get(scopeId)
    if (!scope) return
    if (!isSlotKey(slotKey)) {
      log.warn(`user script "${scriptId}" referenced unknown slot "${slotKey}"`)
      return
    }
    scope.slot(slotKey).addAction({
      // Namespace by script so two scripts can't collide on the dedupe id.
      id: `${scriptId}:${action.id}`,
      label: action.label,
      icon: action.icon,
      onClick: () => post({ source: US_CB, scriptId, op: 'click', clickToken }),
    })
  }

  const onMessage = (event: MessageEvent): void => {
    if (event.source !== window) return
    const data = event.data as { source?: unknown } | null
    if (data?.source === US_HELLO) {
      const { scriptId } = data as { scriptId: string }
      post({ source: US_CB, scriptId, op: 'ready' })
      return
    }
    if (data?.source !== US_REQ) return
    const req = data as UsRequest
    const signal = controllerFor(req.scriptId).signal
    if (signal.aborted) return
    switch (req.op) {
      case 'injectCss':
        injectCss(req.css, signal)
        break
      case 'onRoute':
        handleOnRoute(req.scriptId, req.route, req.token, signal)
        break
      case 'addAction':
        handleAddAction(req.scriptId, req.scopeId, req.slotKey, req.action, req.clickToken)
        break
    }
  }

  window.addEventListener('message', onMessage, { signal: master.signal })
  // Broadcast readiness for any script world that loaded before us (its hello
  // would have missed our listener); scripts loading later get a direct reply.
  post({ source: US_CB, scriptId: '*', op: 'ready' })

  // Disabling a script (enabled → false) tears its effects down live. Deleting a
  // running script unregisters it (so it won't run again) but its current-page
  // effects persist until reload — same as a classic userscript's raw DOM changes.
  const unsubscribe = useScripts.subscribe((state) => {
    for (const script of state.value) {
      if (!script.enabled) {
        const ac = controllers.get(script.id)
        if (ac) {
          ac.abort()
          controllers.delete(script.id)
        }
      }
    }
  })

  return () => {
    master.abort()
    unsubscribe()
    for (const ac of controllers.values()) ac.abort()
    controllers.clear()
    scopes.clear()
  }
}
