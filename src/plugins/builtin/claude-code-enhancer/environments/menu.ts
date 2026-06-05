// Marhiv-owned on-page UI for the routine-environments plugin: the environment
// picker popover and a small status toast. These are Marhiv's OWN elements (not
// host mutations), created in plain DOM and tagged `data-marhiv-*` so they're
// easy to find, can't collide with the host, and are ignored by the dev recorder.
// Everything is torn down on the route scope's signal.

const MENU_ATTR = 'data-marhiv-env-menu'
const TOAST_ATTR = 'data-marhiv-env-toast'
const Z = '2147483640'

export interface MenuItem {
  id: string
  name: string
}

function style(el: HTMLElement, styles: Partial<CSSStyleDeclaration>): void {
  Object.assign(el.style, styles)
}

// Open the environment picker anchored beside the sidebar item. Dismisses on
// pick, outside-click, Escape, or route leave (signal).
export function openEnvMenu(
  anchor: Element | null,
  items: MenuItem[],
  onPick: (item: MenuItem) => void,
  signal: AbortSignal,
): void {
  document.querySelector(`[${MENU_ATTR}]`)?.remove()

  const menu = document.createElement('div')
  menu.setAttribute(MENU_ATTR, '')
  const rect = anchor?.getBoundingClientRect()
  style(menu, {
    position: 'fixed',
    left: `${rect ? rect.left : 16}px`,
    top: `${rect ? rect.bottom + 6 : 64}px`,
    zIndex: Z,
    minWidth: '200px',
    maxHeight: '60vh',
    overflowY: 'auto',
    padding: '6px',
    borderRadius: '10px',
    background: 'rgba(22, 10, 46, 0.98)',
    border: '1px solid rgba(233, 225, 247, 0.16)',
    boxShadow: '0 12px 32px rgba(0, 0, 0, 0.45)',
    font: '13px sans-serif',
    color: '#f8faff',
  })

  if (!items.length) {
    const empty = document.createElement('div')
    empty.textContent = 'No environments found'
    style(empty, { padding: '8px 10px', color: '#c9b8e8' })
    menu.appendChild(empty)
  }

  for (const item of items) {
    const row = document.createElement('button')
    row.type = 'button'
    row.textContent = item.name
    style(row, {
      display: 'block',
      width: '100%',
      textAlign: 'left',
      padding: '8px 10px',
      borderRadius: '6px',
      border: '0',
      background: 'transparent',
      color: 'inherit',
      font: 'inherit',
      cursor: 'pointer',
    })
    row.addEventListener('mouseenter', () => style(row, { background: 'rgba(196, 44, 158, 0.22)' }))
    row.addEventListener('mouseleave', () => style(row, { background: 'transparent' }))
    row.addEventListener('click', () => {
      dismiss()
      onPick(item)
    })
    menu.appendChild(row)
  }

  document.body.appendChild(menu)

  const dismiss = (): void => {
    menu.remove()
    document.removeEventListener('pointerdown', onOutside, true)
    document.removeEventListener('keydown', onKey, true)
    signal.removeEventListener('abort', dismiss)
  }
  const onOutside = (e: Event): void => {
    if (!menu.contains(e.target as Node) && e.target !== anchor) dismiss()
  }
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') dismiss()
  }
  // Defer outside-click wiring so the opening click doesn't immediately close it.
  setTimeout(() => document.addEventListener('pointerdown', onOutside, true), 0)
  document.addEventListener('keydown', onKey, true)
  signal.addEventListener('abort', dismiss, { once: true })
}

export interface Toast {
  update(message: string): void
  dismiss(): void
}

// A small status toast, bottom-center. Auto-dismisses on route leave.
export function showToast(message: string, signal: AbortSignal): Toast {
  document.querySelector(`[${TOAST_ATTR}]`)?.remove()

  const el = document.createElement('div')
  el.setAttribute(TOAST_ATTR, '')
  el.textContent = message
  style(el, {
    position: 'fixed',
    left: '50%',
    bottom: '24px',
    transform: 'translateX(-50%)',
    zIndex: Z,
    padding: '10px 14px',
    borderRadius: '8px',
    background: 'rgba(22, 10, 46, 0.98)',
    border: '1px solid rgba(233, 225, 247, 0.16)',
    boxShadow: '0 12px 32px rgba(0, 0, 0, 0.45)',
    font: '13px sans-serif',
    color: '#f8faff',
    maxWidth: '80vw',
  })
  document.body.appendChild(el)

  const dismiss = (): void => {
    el.remove()
    signal.removeEventListener('abort', dismiss)
  }
  signal.addEventListener('abort', dismiss, { once: true })

  return {
    update: (msg: string) => {
      el.textContent = msg
    },
    dismiss,
  }
}
