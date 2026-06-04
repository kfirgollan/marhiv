// Reactive stores for the settings Panel's persisted state — its size, the page
// the user last had open, and whether the menu is collapsed — each backed by the
// matching PersistedValue in src/storage/panel.ts. See src/store/persisted.ts
// for the read/write contract.

import {
  panelSizeValue,
  panelPageValue,
  panelMenuCollapsedValue,
  panelMaximizedValue,
  type PanelSize,
} from '../storage/panel'
import { DEFAULT_SIZE } from '../ui/panel/geometry'
import { createPersistedStore } from './persisted'

export const usePanelSize = createPersistedStore<PanelSize>(panelSizeValue, DEFAULT_SIZE)
// '' is a sentinel "nothing chosen yet"; the Panel falls back to its first page.
export const usePanelPage = createPersistedStore<string>(panelPageValue, '')
export const usePanelCollapsed = createPersistedStore<boolean>(panelMenuCollapsedValue, false)
export const usePanelMaximized = createPersistedStore<boolean>(panelMaximizedValue, false)
