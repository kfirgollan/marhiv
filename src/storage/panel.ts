// Persisted state for the settings Panel: its size, the page the user last had
// open, whether the menu is collapsed, and whether it's maximized (full-page
// modal). Open/closed is deliberately NOT persisted — the Panel always starts
// closed on a fresh page load — but maximized IS, so reopening restores it.

import { createPersistedValue } from './persisted'

export interface PanelSize {
  width: number
  height: number
}

function isPanelSize(value: unknown): value is PanelSize {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as PanelSize).width === 'number' &&
    typeof (value as PanelSize).height === 'number'
  )
}

// Exposed as PersistedValue objects; the reactive Panel stores in
// src/store/panel.ts wrap them for the UI.
export const panelSizeValue = createPersistedValue<PanelSize>('panelSize', isPanelSize)

export const panelPageValue = createPersistedValue<string>(
  'panelPage',
  (value): value is string => typeof value === 'string',
)

export const panelMenuCollapsedValue = createPersistedValue<boolean>(
  'panelMenuCollapsed',
  (value): value is boolean => typeof value === 'boolean',
)

export const panelMaximizedValue = createPersistedValue<boolean>(
  'panelMaximized',
  (value): value is boolean => typeof value === 'boolean',
)
