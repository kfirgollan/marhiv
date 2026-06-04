// The Dev Panel Page — a developer-facing readout of Marhiv's live internal
// state, to make what's happening observable while building.
//
// It shows current_route (the path the router last detected, kept live via the
// routing snapshot) and an "Export state" button that copies a JSON debug
// snapshot — Marhiv's state plus the host page's real theme tokens and computed
// colors — to the clipboard, to paste into a bug report (see debug/snapshot.ts).

import { useState, type ReactNode } from 'react'
import { useRouteStore } from '../../store/route'
import { collectDebugState } from '../../debug/snapshot'
import { writeToClipboard } from '../../debug/clipboard'
import { Field, PanelPage } from './PanelPage'

export function DevPage(): ReactNode {
  const route = useRouteStore((s) => s.path)
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
