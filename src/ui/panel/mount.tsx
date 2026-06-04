// Mounts the settings Panel into its own shadow root and returns an imperative
// handle the Menu Ball uses to open/close it. The shadow root keeps the Panel's
// React tree and styles isolated from whatever AI site it's injected into.

import { createRoot } from 'react-dom/client'
import { Panel } from './Panel'
// `?inline` hands us the stylesheet as a string so we can inject it INTO the
// shadow root, instead of Vite's default of appending it to the host page's
// <head> (which would leak styles and miss the shadow tree entirely).
import panelCss from './panel.css?inline'

const HOST_ID = 'marhiv-panel'

export interface PanelHandle {
  open(): void
  close(): void
  isOpen(): boolean
}

export function mountPanel(
  callbacks: { onOpenChange?: (open: boolean) => void } = {},
): PanelHandle {
  const host = document.createElement('div')
  host.id = HOST_ID
  const shadow = host.attachShadow({ mode: 'open' })

  const style = document.createElement('style')
  style.textContent = panelCss
  const mountPoint = document.createElement('div')
  shadow.append(style, mountPoint)
  document.body.appendChild(host)

  const root = createRoot(mountPoint)
  let open = false

  const render = (): void => {
    root.render(open ? <Panel onClose={() => handle.close()} /> : null)
  }

  const handle: PanelHandle = {
    open() {
      if (open) return
      open = true
      render()
      callbacks.onOpenChange?.(true)
    },
    close() {
      if (!open) return
      open = false
      render()
      callbacks.onOpenChange?.(false)
    },
    isOpen: () => open,
  }

  render()
  return handle
}
