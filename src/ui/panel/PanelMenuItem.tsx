// Panel Menu Item — one entry in the Settings Panel's left menu, linking to a
// Panel Page. It has two states, collapsed and expanded, chosen by the parent
// (the Panel owns whether the whole menu is collapsed): expanded shows the icon
// and label, collapsed shows just the icon with the label as a tooltip. Clicking
// it activates the linked page.

import type { ReactNode } from 'react'

export function PanelMenuItem({
  icon,
  label,
  active,
  collapsed,
  onSelect,
}: {
  icon: string
  label: string
  active: boolean
  collapsed: boolean
  onSelect: () => void
}): ReactNode {
  return (
    <button
      type="button"
      className={
        'marhiv-menuitem' +
        (collapsed ? ' marhiv-menuitem--collapsed' : '') +
        (active ? ' marhiv-menuitem--active' : '')
      }
      onClick={onSelect}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
    >
      <span className="marhiv-menuitem__icon" aria-hidden="true">
        {icon}
      </span>
      {collapsed ? (
        // Collapsed hides the inline label, so reveal it as a styled tooltip
        // beside the item on hover/focus (see panel.css).
        <span className="marhiv-menuitem__tooltip" role="tooltip">
          {label}
        </span>
      ) : (
        <span className="marhiv-menuitem__label">{label}</span>
      )}
    </button>
  )
}
