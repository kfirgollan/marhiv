// The `marhiv` bridge shim: the bootstrap prepended to every user script before
// the background worker hands it to chrome.userScripts. It runs in the script's
// own world and defines the `marhiv` global — a serializable mirror of the slice
// of the Plugin Enhancement API we expose to scripts (injectCss, onRoute,
// slot().addAction). Each call is relayed to Marhiv's isolated world over
// `window.postMessage` (see protocol.ts / bridge.ts), because the live API objects
// can't cross a world boundary.
//
// This is emitted as a STRING (it executes in another world, so it can't import
// our modules). The protocol constants are interpolated from protocol.ts so the
// two sides can't drift. `scriptId` is baked in per script for callback correlation.

import { US_REQ, US_CB, US_HELLO } from './protocol'

// Wrap a user's source with the shim bootstrap. The result is the `code` string
// registered with chrome.userScripts. User code runs inside the same IIFE as the
// shim, so `marhiv` is in scope (and also set on `globalThis`); a throw is caught
// and attributed rather than surfacing as an anonymous page error.
export function wrapUserScript(scriptId: string, code: string): string {
  const id = JSON.stringify(scriptId)
  const REQ = JSON.stringify(US_REQ)
  const CB = JSON.stringify(US_CB)
  const HELLO = JSON.stringify(US_HELLO)

  return `;(function () {
  var SCRIPT_ID = ${id};
  var US_REQ = ${REQ}, US_CB = ${CB}, US_HELLO = ${HELLO};
  var origin = location.origin;
  var send = function (msg) { window.postMessage(msg, origin); };

  // Buffer requests until the isolated-world bridge says it's listening, so a
  // script that loaded before the bridge isn't silently dropped.
  var ready = false;
  var queue = [];
  var post = function (msg) { if (ready) { send(msg); } else { queue.push(msg); } };

  var seq = 0;
  var nextToken = function () { seq += 1; return SCRIPT_ID + ':' + seq; };

  var routeHandlers = new Map(); // token -> (scope) => void
  var scopeSignals = new Map();  // scopeId -> AbortController
  var clickHandlers = new Map(); // clickToken -> () => void

  var marhiv = {
    injectCss: function (css) {
      post({ source: US_REQ, scriptId: SCRIPT_ID, op: 'injectCss', css: String(css) });
    },
    onRoute: function (route, handler) {
      if (typeof handler !== 'function') return;
      var token = nextToken();
      routeHandlers.set(token, handler);
      post({ source: US_REQ, scriptId: SCRIPT_ID, op: 'onRoute', route: String(route), token: token });
    },
  };

  var makeScope = function (scopeId, url) {
    var ac = new AbortController();
    scopeSignals.set(scopeId, ac);
    return {
      url: new URL(url),
      signal: ac.signal,
      slot: function (key) {
        return {
          addAction: function (action) {
            action = action || {};
            var clickToken = nextToken();
            clickHandlers.set(clickToken, typeof action.onClick === 'function' ? action.onClick : function () {});
            post({
              source: US_REQ, scriptId: SCRIPT_ID, op: 'addAction',
              scopeId: scopeId, slotKey: String(key),
              action: {
                id: String(action.id),
                label: String(action.label),
                icon: action.icon != null ? String(action.icon) : undefined,
              },
              clickToken: clickToken,
            });
          },
        };
      },
    };
  };

  window.addEventListener('message', function (event) {
    if (event.source !== window) return;
    var data = event.data;
    if (!data || data.source !== US_CB) return;
    // Readiness accepts a direct reply (our hello) or the bridge's broadcast
    // ('*'), which covers a bridge that installed after this script loaded.
    if (data.op === 'ready' && (data.scriptId === SCRIPT_ID || data.scriptId === '*')) {
      ready = true;
      var pending = queue.slice();
      queue.length = 0;
      for (var i = 0; i < pending.length; i++) send(pending[i]);
      return;
    }
    if (data.scriptId !== SCRIPT_ID) return;
    if (data.op === 'routeEnter') {
      var handler = routeHandlers.get(data.token);
      if (!handler) return;
      try { handler(makeScope(data.scopeId, data.url)); }
      catch (e) { console.error('[marhiv] user script "' + SCRIPT_ID + '" onRoute handler failed:', e); }
      return;
    }
    if (data.op === 'routeLeave') {
      var ac = scopeSignals.get(data.scopeId);
      if (ac) { ac.abort(); scopeSignals.delete(data.scopeId); }
      return;
    }
    if (data.op === 'click') {
      var cb = clickHandlers.get(data.clickToken);
      if (cb) {
        try { cb(); }
        catch (e) { console.error('[marhiv] user script "' + SCRIPT_ID + '" onClick failed:', e); }
      }
      return;
    }
  });

  globalThis.marhiv = marhiv;
  send({ source: US_HELLO, scriptId: SCRIPT_ID });

  try {
    // ---- begin user script ${scriptId} ----
${code}
    // ---- end user script ----
  } catch (marhivUserError) {
    console.error('[marhiv] user script "' + SCRIPT_ID + '" failed:', marhivUserError);
  }
})();
`
}
