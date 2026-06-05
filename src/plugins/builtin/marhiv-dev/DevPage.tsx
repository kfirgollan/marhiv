// The Dev Panel Page, contributed by the marhiv-dev plugin. A developer-facing
// readout of Marhiv's live internal state, to make what's happening observable
// while building.
//
// It shows current_route (the path the Router last detected) and an "Export
// state" button that copies a JSON debug snapshot — Marhiv's state plus the host
// page's real theme tokens and computed colors — to the clipboard, to paste into
// a bug report (see snapshot.ts).
//
// It reads live state through the Plugin Context (`ctx.stores`) rather than
// importing Marhiv's stores directly — that's the capability the plugin is lent.

import { useEffect, useReducer, useState, type ReactNode } from 'react'
import type { PluginContext } from '../../types'
import { collectDebugState } from './snapshot'
import { writeToClipboard } from './clipboard'
import { recorder } from './recorder/recorder'
import { Field, PanelPage } from '../../../ui/panel/PanelPage'

// A labelled monospace readout that adapts to the Panel's size mode: inline
// beside its label when there's room (maximized), and stacked onto its own
// full-width line when space is tight (mini). Either way the value is capped to
// one line and truncated with an ellipsis when too long (see .marhiv-readout).
function Readout({
  label,
  maximized,
  children,
}: {
  label: string
  maximized: boolean
  children: ReactNode
}): ReactNode {
  const value = <code className="marhiv-readout">{children}</code>
  if (maximized) return <Field label={label}>{value}</Field>
  return (
    <div className="marhiv-stack">
      <span className="marhiv-field__label">{label}</span>
      {value}
    </div>
  )
}

// Explanatory help for a Dev tool, shown only when there's room (the maximized,
// full-page view). The mini view stays compact — just the controls.
function Help({ show, children }: { show: boolean; children: ReactNode }): ReactNode {
  return show ? <p className="marhiv-help">{children}</p> : null
}

export function DevPage({ ctx }: { ctx: PluginContext }): ReactNode {
  const route = ctx.stores.route((s) => s.path)
  // Adapt the readouts to the Panel's size mode (lent via the Plugin Context).
  const maximized = ctx.stores.panelMaximized((s) => s.value)
  const [status, setStatus] = useState('')

  const onExport = async (): Promise<void> => {
    setStatus('Collecting…')
    const json = JSON.stringify(await collectDebugState(), null, 2)
    setStatus((await writeToClipboard(json)) ? 'Copied to clipboard ✓' : 'Copy failed')
  }

  // The recorder is a page-level singleton that survives this page unmounting; the
  // Dev page just observes it. Re-render whenever its state changes so we reflect
  // an in-progress session even after the panel was closed and reopened.
  const [, rerender] = useReducer((n: number) => n + 1, 0)
  useEffect(() => recorder.subscribe(rerender), [])
  const recording = recorder.recording
  const counts = recorder.getCounts()
  const [recStatus, setRecStatus] = useState('')

  const onToggleRecord = async (): Promise<void> => {
    if (!recorder.recording) {
      setRecStatus('')
      recorder.start()
      return
    }
    const result = recorder.stop()
    const json = JSON.stringify(result, null, 2)
    const ok = await writeToClipboard(json)
    setRecStatus(
      ok
        ? `Copied ${result.timeline.length} entries to clipboard ✓`
        : `Capture done (${result.timeline.length} entries) — copy failed`,
    )
  }

  return (
    <PanelPage title="Dev">
      <p className="marhiv-page__lead">Live internal state, for developers building Marhiv.</p>
      <Help show={maximized}>
        These tools observe Marhiv&apos;s live state and let you dump it as JSON into a coding
        editor like Claude Code — the fastest way to debug an issue or build a new Marhiv feature
        against what the page is actually doing, instead of describing it by hand.
      </Help>

      <Readout label="current_route" maximized={maximized}>
        {route}
      </Readout>
      <Help show={maximized}>
        The host route the Router currently matches, updated live as you navigate the site&apos;s
        SPA. Plugins scope behavior to routes (e.g. <code>claude.ai/code</code>), so this confirms
        what a route-scoped plugin sees right now.
      </Help>

      <button type="button" className="marhiv-button" onClick={() => void onExport()}>
        Export state
      </button>
      {status && <p className="marhiv-page__meta">{status}</p>}
      <Help show={maximized}>
        Copies a one-shot snapshot to the clipboard as JSON: the enabled plugins, the panel/route
        state, and the host page&apos;s real theme tokens and computed colors. Paste it into Claude
        Code to debug a specific moment — e.g. why a theme isn&apos;t recoloring a particular
        surface, or which token a color comes from.
      </Help>

      <Readout label="record" maximized={maximized}>
        {recording
          ? `● recording — ${counts.events} events · ${counts.mutations} mutations · ${counts.network} requests · ${counts.navigations} nav · ${counts.errors} err`
          : 'idle'}
      </Readout>
      <button type="button" className="marhiv-button" onClick={() => void onToggleRecord()}>
        {recording ? 'Stop recording' : 'Start recording'}
      </button>
      {recStatus && <p className="marhiv-page__meta">{recStatus}</p>}
      <Help show={maximized}>
        Records a timeline while you interact with the page — DOM mutations, events, network
        requests and navigations. Stop to copy the captured session as JSON, then paste it into
        Claude Code to debug dynamic behavior over time, or to spec a new feature from what the host
        site actually does (rather than guessing at its markup).
      </Help>
    </PanelPage>
  )
}
