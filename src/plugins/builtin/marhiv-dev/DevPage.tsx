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

import { useState, type ReactNode } from 'react'
import type { PluginContext } from '../../types'
import { collectDebugState } from './snapshot'
import { writeToClipboard } from './clipboard'
import { Field, PanelPage } from '../../../ui/panel/PanelPage'

export function DevPage({ ctx }: { ctx: PluginContext }): ReactNode {
  const route = ctx.stores.route((s) => s.path)
  const [status, setStatus] = useState('')

  const onExport = async (): Promise<void> => {
    setStatus('Collecting…')
    const json = JSON.stringify(await collectDebugState(), null, 2)
    setStatus((await writeToClipboard(json)) ? 'Copied to clipboard ✓' : 'Copy failed')
  }

  return (
    <PanelPage title="Dev">
      <p className="marhiv-page__lead">Live internal state, for developers building Marhiv.</p>
      <Field label="current_route">
        <code className="marhiv-readout">{route}</code>
      </Field>
      <button type="button" className="marhiv-button" onClick={() => void onExport()}>
        Export state
      </button>
      {status && <p className="marhiv-page__meta">{status}</p>}
    </PanelPage>
  )
}
