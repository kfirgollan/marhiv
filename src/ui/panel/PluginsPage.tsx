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
// The page ADAPTS to the Panel's size mode (it reads usePanelMaximized): the
// maximized, full-page view has room for the Category column and the category /
// status filters; the anchored mini view shows just search + the list. This is
// the pattern for any mode-aware page — read the store, branch on it; the page
// re-renders when the user maximizes/restores.

import { useMemo, useState, type ReactNode } from 'react'
import { usePluginStates } from '../../store/plugins'
import { usePanelMaximized } from '../../store/panel'
import { BUILTIN_PLUGINS } from '../../plugins/registry'
import { isEnabled } from '../../plugins/manager'
import { PanelPage } from './PanelPage'

type StatusFilter = 'all' | 'enabled' | 'disabled'

export function PluginsPage(): ReactNode {
  // States hydrate and stay in sync with other tabs through the store.
  const states = usePluginStates((s) => s.value)
  const setStates = usePluginStates((s) => s.set)
  // Full-page view has room for the Category column and the filters below.
  const maximized = usePanelMaximized((s) => s.value)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [status, setStatus] = useState<StatusFilter>('all')

  // The category options offered by the filter — every distinct category any
  // plugin declares.
  const categories = useMemo(() => {
    const set = new Set<string>()
    for (const { meta } of BUILTIN_PLUGINS) if (meta.category) set.add(meta.category)
    return [...set].sort()
  }, [])

  // Apply search always; apply the category/status filters only in the maximized
  // view, where their controls are shown (so the mini view can't be left in a
  // filtered state with no way to clear it).
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return BUILTIN_PLUGINS.filter((plugin) => {
      const { meta } = plugin
      if (q && !(meta.name.toLowerCase().includes(q) || meta.description.toLowerCase().includes(q)))
        return false
      if (!maximized) return true
      if (category !== 'all' && meta.category !== category) return false
      if (status !== 'all' && isEnabled(plugin, states) !== (status === 'enabled')) return false
      return true
    })
  }, [query, maximized, category, status, states])

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
          {maximized && (
            <>
              <select
                className="marhiv-select"
                aria-label="Filter by category"
                value={category}
                onChange={(e) => setCategory(e.currentTarget.value)}
              >
                <option value="all">All categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <select
                className="marhiv-select"
                aria-label="Filter by status"
                value={status}
                onChange={(e) => setStatus(e.currentTarget.value as StatusFilter)}
              >
                <option value="all">All</option>
                <option value="enabled">Enabled</option>
                <option value="disabled">Disabled</option>
              </select>
            </>
          )}
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
            {visible.map((plugin) => (
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
            {visible.length === 0 && (
              <tr>
                <td colSpan={columnCount} className="marhiv-table__empty">
                  {query.trim()
                    ? `No plugins match “${query.trim()}”.`
                    : 'No plugins match the current filters.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </PanelPage>
  )
}
