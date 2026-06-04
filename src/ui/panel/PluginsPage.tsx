// The Plugins Panel Page — the first page wired to real behavior. It lists the
// built-in plugins with an enable/disable toggle each. Toggling writes the
// plugin states to storage; the Plugin Manager (subscribed to that storage)
// loads or unloads the plugin live, so the effect is immediate and needs no
// reload. Editing here and reacting there are decoupled through storage.

import { useEffect, useState, type ReactNode } from 'react'
import {
  loadPluginStates,
  savePluginStates,
  onPluginStatesChange,
  type PluginStates,
} from '../../storage/plugins'
import { BUILTIN_PLUGINS } from '../../plugins/registry'
import { isEnabled } from '../../plugins/manager'
import { Field, PanelPage } from './PanelPage'

export function PluginsPage(): ReactNode {
  const [states, setStates] = useState<PluginStates>({})

  // Load once, then track changes from other tabs/pages so the toggles stay
  // truthful while the Panel is open.
  useEffect(() => {
    void loadPluginStates().then((s) => s && setStates(s))
    return onPluginStatesChange(setStates)
  }, [])

  const toggle = (id: string, enabled: boolean): void => {
    const next = { ...states, [id]: enabled }
    setStates(next)
    void savePluginStates(next)
  }

  return (
    <PanelPage title="Plugins">
      <p className="marhiv-page__lead">Enable curated enhancements. Changes apply immediately.</p>
      {BUILTIN_PLUGINS.map((plugin) => (
        <Field key={plugin.meta.id} label={plugin.meta.name}>
          <input
            type="checkbox"
            checked={isEnabled(plugin, states)}
            onChange={(e) => toggle(plugin.meta.id, e.currentTarget.checked)}
          />
        </Field>
      ))}
    </PanelPage>
  )
}
