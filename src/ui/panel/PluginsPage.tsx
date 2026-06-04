// The Plugins Panel Page — the first page wired to real behavior. It lists the
// available plugins in a searchable table, each row toggling the plugin on/off.
// Toggling writes the plugin states to storage; the Plugin Manager (subscribed
// to that storage) loads or unloads the plugin live, so the effect is immediate
// and needs no reload. Editing here and reacting there are decoupled through
// storage.

import { useMemo, useState, type ReactNode } from 'react'
import { usePluginStates } from '../../store/plugins'
import { BUILTIN_PLUGINS } from '../../plugins/registry'
import { isEnabled } from '../../plugins/manager'
import { PanelPage } from './PanelPage'

export function PluginsPage(): ReactNode {
  // States hydrate and stay in sync with other tabs through the store.
  const states = usePluginStates((s) => s.value)
  const setStates = usePluginStates((s) => s.set)
  const [query, setQuery] = useState('')

  // Match the query against name and description, case-insensitively.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return BUILTIN_PLUGINS
    return BUILTIN_PLUGINS.filter(
      ({ meta }) =>
        meta.name.toLowerCase().includes(q) || meta.description.toLowerCase().includes(q),
    )
  }, [query])

  const toggle = (id: string, enabled: boolean): void => {
    setStates({ ...states, [id]: enabled })
  }

  return (
    <PanelPage title="Plugins">
      <input
        type="search"
        className="marhiv-search"
        placeholder="Search plugins…"
        aria-label="Search plugins"
        value={query}
        onChange={(e) => setQuery(e.currentTarget.value)}
      />

      <table className="marhiv-table">
        <thead>
          <tr>
            <th scope="col">Plugin</th>
            <th scope="col" className="marhiv-table__toggle">
              Enabled
            </th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((plugin) => (
            <tr key={plugin.meta.id}>
              <td>
                <div className="marhiv-plugin__name">{plugin.meta.name}</div>
                <div className="marhiv-plugin__desc">{plugin.meta.description}</div>
              </td>
              <td className="marhiv-table__toggle">
                <input
                  type="checkbox"
                  role="switch"
                  className="marhiv-toggle"
                  checked={isEnabled(plugin, states)}
                  aria-label={`Enable ${plugin.meta.name}`}
                  onChange={(e) => toggle(plugin.meta.id, e.currentTarget.checked)}
                />
              </td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={2} className="marhiv-table__empty">
                No plugins match “{query.trim()}”.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </PanelPage>
  )
}
