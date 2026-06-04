// The Plugins Panel Page — the first page wired to real behavior. It lists the
// available plugins in a searchable table, each row toggling the plugin on/off.
// Toggling writes the plugin states to storage; the Plugin Manager (subscribed
// to that storage) loads or unloads the plugin live, so the effect is immediate
// and needs no reload. Editing here and reacting there are decoupled through
// storage.
//
// The search toolbar and the table's column header are sticky (see panel.css):
// with many plugins the list scrolls, but you can still search and read the
// columns — like frozen rows in a spreadsheet.
//
// The page also ADAPTS to the Panel's size mode: it reads usePanelMaximized and
// only shows the (space-hungry) Category column in the maximized, full-page view.
// This is the pattern for any page that wants mode-aware content — read the
// store, branch on it; the page re-renders when the user maximizes/restores.

import { useMemo, useState, type ReactNode } from 'react'
import { usePluginStates } from '../../store/plugins'
import { usePanelMaximized } from '../../store/panel'
import { BUILTIN_PLUGINS } from '../../plugins/registry'
import { isEnabled } from '../../plugins/manager'
import { PanelPage } from './PanelPage'

export function PluginsPage(): ReactNode {
  // States hydrate and stay in sync with other tabs through the store.
  const states = usePluginStates((s) => s.value)
  const setStates = usePluginStates((s) => s.set)
  // Full-page view has room for more columns than the anchored mini view.
  const maximized = usePanelMaximized((s) => s.value)
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

  // Header + empty-state span widen by one when the Category column is shown.
  const columnCount = maximized ? 3 : 2

  return (
    <PanelPage title="Plugins">
      <div className="marhiv-plugins">
        <div className="marhiv-plugins__bar">
          <input
            type="search"
            className="marhiv-search"
            placeholder="Search plugins…"
            aria-label="Search plugins"
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
          />
        </div>

        <table className="marhiv-table">
          <thead>
            <tr>
              <th scope="col">Plugin</th>
              {maximized && <th scope="col">Category</th>}
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
                {maximized && (
                  <td>
                    {plugin.meta.category && (
                      <span className="marhiv-tag">{plugin.meta.category}</span>
                    )}
                  </td>
                )}
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
                <td colSpan={columnCount} className="marhiv-table__empty">
                  No plugins match “{query.trim()}”.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </PanelPage>
  )
}
