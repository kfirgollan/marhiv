// Persisted state for the settings Panel: its size, the page the user last had
// open, and whether the menu is collapsed. Open/closed is deliberately NOT
// persisted — the Panel always starts closed on a fresh page load.

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

const sizeStore = createPersistedValue<PanelSize>('panelSize', isPanelSize)

export const loadPanelSize = sizeStore.load
export const savePanelSize = sizeStore.save
export const onPanelSizeChange = sizeStore.onChange

const pageStore = createPersistedValue<string>(
  'panelPage',
  (value): value is string => typeof value === 'string',
)

export const loadPanelPage = pageStore.load
export const savePanelPage = pageStore.save

const menuCollapsedStore = createPersistedValue<boolean>(
  'panelMenuCollapsed',
  (value): value is boolean => typeof value === 'boolean',
)

export const loadPanelMenuCollapsed = menuCollapsedStore.load
export const savePanelMenuCollapsed = menuCollapsedStore.save
