// The Dev Panel Page — a developer-facing readout of Marhiv's live internal
// state, to make what's happening observable while building.
//
// For now it shows one attribute, current_route: the path the router last
// detected. It subscribes to the routing layer's live snapshot, so it updates
// on its own as you navigate (e.g. /new → /code) with the Panel open.

import { useSyncExternalStore, type ReactNode } from 'react'
import { getCurrentRoute, subscribeCurrentRoute } from '../../routing/currentRoute'
import { Field, PanelPage } from './PanelPage'

export function DevPage(): ReactNode {
  const route = useSyncExternalStore(subscribeCurrentRoute, getCurrentRoute)

  return (
    <PanelPage title="Dev">
      <p className="marhiv-page__lead">Live internal state, for developers building Marhiv.</p>
      <Field label="current_route">
        <code className="marhiv-readout">{route}</code>
      </Field>
    </PanelPage>
  )
}
