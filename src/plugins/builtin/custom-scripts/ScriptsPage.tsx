// The Custom Scripts Panel Page — a master/detail editor for the user's scripts.
// The list (left) toggles/selects scripts; the detail (right) edits the selected
// one in a CodeMirror editor with name, world, and match patterns. Saving writes
// to the scripts store; the background worker (watching that storage) re-registers
// the scripts with chrome.userScripts, and the in-page bridge runs their `marhiv`
// calls. Editing here and running there are decoupled through storage.

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { PanelPage } from '../../../ui/panel/PanelPage'
import { useScripts, useUserScriptsAvailable } from '../../../store/scripts'
import { usePanelMaximized } from '../../../store/panel'
import type { ScriptWorld, UserScript } from '../../../storage/scripts'
import { log } from '../../../log'
import type { EditorHandle } from './editor'

// The layout adapts to the Panel's size mode. Anchored (mini): a single column —
// the script list collapses to a horizontal strip on top, the editor takes the
// full width below (a narrow panel can't afford a side rail). Maximized: a roomy
// master/detail — the list becomes a left rail and the editor fills the height.
// The DOM is identical in both; only the modifier class on .marhiv-scripts differs.
const STYLES = `
.marhiv-scripts { display: flex; gap: 12px; align-items: stretch; flex: 1 1 auto; min-height: 0; }
.marhiv-scripts--mini { flex-direction: column; }
.marhiv-scripts--max { flex-direction: row; }

.marhiv-scripts__list { display: flex; gap: 6px; min-width: 0; min-height: 0; }
.marhiv-scripts--max .marhiv-scripts__list { flex: 0 0 200px; flex-direction: column; }
.marhiv-scripts--mini .marhiv-scripts__list { flex: 0 0 auto; flex-direction: row; align-items: center; }
.marhiv-scripts__new { flex: 0 0 auto; }

.marhiv-scripts__items { display: flex; gap: 2px; min-width: 0; flex: 1 1 auto; }
.marhiv-scripts--max .marhiv-scripts__items { flex-direction: column; overflow-y: auto; }
.marhiv-scripts--mini .marhiv-scripts__items { flex-direction: row; overflow-x: auto; }

.marhiv-scripts__item { display: flex; align-items: center; gap: 6px; padding: 6px 8px; border: 0; border-radius: 6px; background: transparent; color: var(--marhiv-text-muted); font: inherit; font-size: 12px; text-align: left; cursor: pointer; }
.marhiv-scripts--mini .marhiv-scripts__item { flex: 0 0 auto; }
.marhiv-scripts__item:hover { background: var(--marhiv-peak-shadow); color: var(--marhiv-snow); }
.marhiv-scripts__item--active { background: var(--marhiv-primary); color: var(--marhiv-snow); }
.marhiv-scripts__item-name { flex: 1 1 auto; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; max-width: 160px; }
.marhiv-scripts__empty { padding: 8px; color: var(--marhiv-text-muted); font-size: 11px; }
.marhiv-scripts__detail { flex: 1 1 auto; display: flex; flex-direction: column; gap: 8px; min-width: 0; min-height: 0; }
.marhiv-scripts__editor { flex: 1 1 auto; min-height: 140px; min-width: 0; display: flex; }
.marhiv-scripts__editor > .cm-editor { width: 100%; }
.marhiv-scripts__actions { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
.marhiv-scripts__input { width: 100%; font: inherit; color: var(--marhiv-snow); background: var(--marhiv-surface); border: 1px solid var(--marhiv-hairline); border-radius: 6px; padding: 5px 8px; }
.marhiv-scripts__input:focus-visible { outline: 2px solid var(--marhiv-accent); outline-offset: 1px; }
.marhiv-scripts__matches { width: 100%; min-height: 44px; resize: vertical; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; color: var(--marhiv-snow); background: var(--marhiv-surface); border: 1px solid var(--marhiv-hairline); border-radius: 6px; padding: 5px 8px; }
.marhiv-scripts__banner { padding: 8px 10px; border: 1px solid var(--marhiv-hairline); border-radius: 6px; background: var(--marhiv-surface); color: var(--marhiv-text-muted); font-size: 11px; line-height: 1.5; }
.marhiv-scripts__banner code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; color: var(--marhiv-snow); }
.marhiv-scripts__row { display: flex; flex-direction: column; gap: 4px; }
.marhiv-scripts__row-label { font-size: 11px; color: var(--marhiv-text-muted); }
.marhiv-button--ghost { background: transparent; }
`

// Loaded into every new script: a complete reference for the API a script gets.
// It's written so you can copy the whole thing into Claude Code (or paste it with
// a request) and it has enough context to write a working Marhiv user script.
const TEMPLATE = `// ===========================================================================
// Marhiv user script
//
// Runs on the pages set under "Runs on" below the editor (default
// https://claude.ai/*), injected via Chrome's userScripts API. You have normal
// page access here -- document, window, fetch, timers -- PLUS a global "marhiv"
// object (documented below) that mirrors a slice of Marhiv's plugin API.
//
// "World" (the dropdown by Save): "Isolated world" runs sandboxed from the
// page's own JS (recommended); "Page world" shares the page's globals -- more
// power, more risk.
//
// --- marhiv.injectCss(css) -------------------------------------------------
// Inject a <style> into the host page. Removed automatically when this script
// is disabled.
//   marhiv.injectCss('header { display: none }')
//
// --- marhiv.onRoute(route, handler) ----------------------------------------
// Run handler(scope) whenever a named route is active; it re-runs each time you
// navigate back to that route. Routes:
//   'code' -- claude.ai/code and its sessions
//   'chat' -- a chat thread, claude.ai/chat/:id
//   'new'  -- the new-chat page, claude.ai/new
//
// The handler receives a "scope":
//   scope.url      a URL object for the active page (scope.url.pathname, etc.)
//   scope.signal   an AbortSignal that fires when you leave the route OR the
//                  script is disabled. Pass it to your own listeners so they
//                  clean up: el.addEventListener('click', fn, { signal: scope.signal })
//   scope.slot(key)  target a named region of the host UI; returns { addAction }
//
//     slot.addAction({ id, label, icon, onClick })
//       Insert a native-looking button next to the slot. Auto-removed when you
//       leave the route or disable the script.
//         id       unique string (also the de-dupe key)
//         label    button text
//         icon     optional inline SVG markup string
//         onClick  function run when the button is clicked
//
//   Slot keys (these currently resolve on the 'code' route only):
//     'sidebar'             the left sidebar
//     'sidebar.newSession'  the "New session" row   <- best target for addAction
//     'sidebar.recents'     the Recents section
//     'sidebar.userMenu'    the account / plan button
//     'main.composer'       the prompt composer
//     'composer.input'      the contenteditable prompt input
//
// --- Notes -----------------------------------------------------------------
//   * marhiv.* effects (injected CSS, route handlers, slot actions) are torn
//     down for you on disable / navigation. Anything YOU add to the DOM
//     directly, tie to scope.signal (or remove it yourself) so it cleans up too.
//   * For anything without a slot, just use the DOM: document.querySelector(...).
//     A MutationObserver bound to scope.signal is the usual way to wait for an
//     element on Claude's SPA, e.g.:
//       const obs = new MutationObserver(() => { /* find + act */ })
//       obs.observe(document.body, { childList: true, subtree: true })
//       scope.signal.addEventListener('abort', () => obs.disconnect())
//   * Not exposed to scripts yet: live element handles (whenPresent) and adding
//     Panel pages. Use addAction + raw DOM for now.
//
// Replace the example below with what you want (or describe it to Claude Code).
// ===========================================================================

marhiv.onRoute('code', (scope) => {
  // Example: add a button under "New session" that greets you.
  scope.slot('sidebar.newSession').addAction({
    id: 'hello',
    label: 'Hello',
    onClick() {
      alert('Hello from ' + scope.url.pathname)
    },
  })
})
`

interface Draft {
  name: string
  world: ScriptWorld
  matchesText: string
  code: string
}

const linesToMatches = (text: string): string[] =>
  text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

const now = (): number => Date.now()

export function ScriptsPage(): ReactNode {
  const scripts = useScripts((s) => s.value)
  const setScripts = useScripts((s) => s.set)
  const available = useUserScriptsAvailable((s) => s.value)
  // Full-page view gets a master/detail rail; the anchored view stacks (see STYLES).
  const maximized = usePanelMaximized((s) => s.value)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)

  const editorHandleRef = useRef<EditorHandle | null>(null)
  // Monotonic token to drop a stale async editor load if the selection changed
  // (or the node unmounted) before its dynamic import resolved.
  const loadTokenRef = useRef(0)
  const scriptsRef = useRef(scripts)
  scriptsRef.current = scripts

  const selected = scripts.find((s) => s.id === selectedId) ?? null

  // Seed the editing buffer from the selected script when the selection changes —
  // during render, so the detail pane (and the editor's mount node) exist before
  // the editor's callback ref fires. (The React "adjust state on prop change"
  // pattern; cheaper and flicker-free vs. doing it in an effect.)
  const lastSelectedRef = useRef<string | null>(null)
  if (lastSelectedRef.current !== selectedId) {
    lastSelectedRef.current = selectedId
    setDraft(
      selected
        ? {
            name: selected.name,
            world: selected.world,
            matchesText: selected.matches.join('\n'),
            code: selected.code,
          }
        : null,
    )
  }

  // Mount the editor when its node appears, tear it down when it leaves. A callback
  // ref (not an effect reading a ref) guarantees the node exists when we create the
  // editor — the bug that left an empty editor slot. CodeMirror is heavy, so it's a
  // dynamic import kept out of the per-page content-script bundle.
  const mountEditor = useCallback(
    (node: HTMLDivElement | null) => {
      const token = (loadTokenRef.current += 1)
      editorHandleRef.current?.destroy()
      editorHandleRef.current = null
      if (!node) return
      const script = scriptsRef.current.find((s) => s.id === selectedId)
      if (!script) return
      void import('./editor')
        .then(({ createEditor }) => {
          if (token !== loadTokenRef.current) return // selection changed; this load is stale
          editorHandleRef.current = createEditor(node, script.code, (code) =>
            setDraft((d) => (d ? { ...d, code } : d)),
          )
        })
        .catch((error: unknown) => log.error('failed to load the script editor', error))
    },
    [selectedId],
  )

  // The editor's container changes size when the Panel is maximized/restored;
  // CodeMirror needs a nudge to re-measure since it doesn't watch container resizes.
  useEffect(() => {
    editorHandleRef.current?.measure()
  }, [maximized])

  const dirty =
    !!selected &&
    !!draft &&
    (draft.name !== selected.name ||
      draft.code !== selected.code ||
      draft.world !== selected.world ||
      linesToMatches(draft.matchesText).join('\n') !== selected.matches.join('\n'))

  const addScript = (): void => {
    const script: UserScript = {
      id: crypto.randomUUID(),
      name: 'New script',
      code: TEMPLATE,
      enabled: false,
      world: 'USER_SCRIPT',
      matches: ['https://claude.ai/*'],
      createdAt: now(),
      updatedAt: now(),
    }
    setScripts([...scripts, script])
    setSelectedId(script.id)
  }

  const save = (): void => {
    if (!selected || !draft) return
    setScripts(
      scripts.map((s) =>
        s.id === selected.id
          ? {
              ...s,
              name: draft.name.trim() || 'Untitled',
              code: draft.code,
              world: draft.world,
              matches: linesToMatches(draft.matchesText),
              updatedAt: now(),
            }
          : s,
      ),
    )
  }

  const duplicate = (): void => {
    if (!selected) return
    const copy: UserScript = {
      ...selected,
      id: crypto.randomUUID(),
      name: `${selected.name} copy`,
      enabled: false,
      createdAt: now(),
      updatedAt: now(),
    }
    setScripts([...scripts, copy])
    setSelectedId(copy.id)
  }

  const remove = (): void => {
    if (!selected) return
    setScripts(scripts.filter((s) => s.id !== selected.id))
    setSelectedId(null)
  }

  const toggle = (id: string, enabled: boolean): void => {
    setScripts(scripts.map((s) => (s.id === id ? { ...s, enabled, updatedAt: now() } : s)))
  }

  return (
    <PanelPage title="Custom Scripts">
      <style>{STYLES}</style>

      {!available && (
        <div className="marhiv-scripts__banner" role="status">
          Chrome blocks user scripts until you allow them. Open <code>chrome://extensions</code>,
          open Marhiv&rsquo;s details, and turn on <strong>Allow user scripts</strong>. Saved
          scripts run once it&rsquo;s enabled.
        </div>
      )}

      <div
        className={'marhiv-scripts ' + (maximized ? 'marhiv-scripts--max' : 'marhiv-scripts--mini')}
      >
        <div className="marhiv-scripts__list">
          <button type="button" className="marhiv-button marhiv-scripts__new" onClick={addScript}>
            + New
          </button>
          <div className="marhiv-scripts__items">
            {scripts.map((s) => (
              <div
                key={s.id}
                className={
                  'marhiv-scripts__item' +
                  (s.id === selectedId ? ' marhiv-scripts__item--active' : '')
                }
                onClick={() => setSelectedId(s.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') setSelectedId(s.id)
                }}
              >
                <span className="marhiv-scripts__item-name">{s.name}</span>
                <input
                  type="checkbox"
                  role="switch"
                  className="marhiv-toggle"
                  checked={s.enabled}
                  aria-label={`Enable ${s.name}`}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => toggle(s.id, e.currentTarget.checked)}
                />
              </div>
            ))}
            {scripts.length === 0 && (
              <div className="marhiv-scripts__empty">No scripts yet. Click “New”.</div>
            )}
          </div>
        </div>

        {selected && draft ? (
          <div className="marhiv-scripts__detail">
            <input
              className="marhiv-scripts__input"
              aria-label="Script name"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.currentTarget.value })}
            />
            <div className="marhiv-scripts__editor" ref={mountEditor} />
            <div className="marhiv-scripts__row">
              <span className="marhiv-scripts__row-label">
                Runs on (one match pattern per line)
              </span>
              <textarea
                className="marhiv-scripts__matches"
                aria-label="Match patterns"
                value={draft.matchesText}
                onChange={(e) => setDraft({ ...draft, matchesText: e.currentTarget.value })}
              />
            </div>
            <div className="marhiv-scripts__actions">
              <select
                className="marhiv-select"
                aria-label="World"
                value={draft.world}
                onChange={(e) =>
                  setDraft({ ...draft, world: e.currentTarget.value as ScriptWorld })
                }
              >
                <option value="USER_SCRIPT">Isolated world</option>
                <option value="MAIN">Page world</option>
              </select>
              <button type="button" className="marhiv-button" onClick={save} disabled={!dirty}>
                {dirty ? 'Save' : 'Saved'}
              </button>
              <button
                type="button"
                className="marhiv-button marhiv-button--ghost"
                onClick={duplicate}
              >
                Duplicate
              </button>
              <button type="button" className="marhiv-button marhiv-button--ghost" onClick={remove}>
                Delete
              </button>
            </div>
          </div>
        ) : (
          <div className="marhiv-scripts__detail">
            <div className="marhiv-scripts__empty">Select a script, or create one.</div>
          </div>
        )}
      </div>
    </PanelPage>
  )
}
