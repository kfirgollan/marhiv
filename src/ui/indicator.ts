// Marhiv's on-page indicator (the "Menu Ball"): a draggable 32×32 logo disc
// pinned above the page.
//
// Hovering reveals a drag handle to its left; dragging the handle moves the
// circle, and its position is persisted (and kept in sync across pages) via
// `chrome.storage`. All styles are inline so the widget is self-contained and
// independent of the host page's stylesheets.

import {
  loadPosition,
  savePosition,
  onPositionChange,
  defaultPosition,
  type Position,
} from '../storage/position'
import { mountPanel } from './panel/mount'
import { MARHIV_LOGO_URL } from './logo'

const CONTAINER_ID = 'marhiv-indicator'
const SIZE = 32

// Keep the circle fully inside the viewport — guards against a stored position
// from a larger window leaving it off-screen on a smaller one.
function clampToViewport({ left, top }: Position): Position {
  return {
    left: Math.min(Math.max(0, left), Math.max(0, window.innerWidth - SIZE)),
    top: Math.min(Math.max(0, top), Math.max(0, window.innerHeight - SIZE)),
  }
}

function applyPosition(el: HTMLElement, { left, top }: Position): void {
  el.style.left = `${left}px`
  el.style.top = `${top}px`
}

// The Menu Ball's face is the Marhiv logo. It's already a circular disc, so we
// render it as-is — no border-radius crop, square plate, or drop shadow (all
// disallowed by the brand guidelines).
function createLogo(): HTMLImageElement {
  const logo = document.createElement('img')
  logo.src = MARHIV_LOGO_URL
  logo.alt = 'Marhiv'
  // Disable the browser's native image drag so it never competes with our
  // handle-based dragging.
  logo.draggable = false
  Object.assign(logo.style, {
    width: '100%',
    height: '100%',
    display: 'block',
    objectFit: 'contain',
    userSelect: 'none',
  } satisfies Partial<CSSStyleDeclaration>)
  return logo
}

function createHandle(): HTMLDivElement {
  const handle = document.createElement('div')
  handle.setAttribute('aria-label', 'Drag Marhiv')
  handle.title = 'Drag Marhiv'
  handle.textContent = '⠿'
  Object.assign(handle.style, {
    position: 'absolute',
    // `right: 100%` parks the handle immediately left of the circle, touching
    // it so there's no dead gap to cross when moving the pointer between them.
    right: '100%',
    top: '0',
    height: `${SIZE}px`,
    width: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px 0 0 8px',
    background: 'rgba(17, 24, 39, 0.75)',
    color: 'rgba(255, 255, 255, 0.85)',
    font: '14px sans-serif',
    cursor: 'grab',
    opacity: '0',
    pointerEvents: 'none',
    transition: 'opacity 120ms ease',
    userSelect: 'none',
  } satisfies Partial<CSSStyleDeclaration>)
  return handle
}

export async function mountIndicator(signal?: AbortSignal): Promise<void> {
  // Content scripts can run more than once across a page's lifetime; never
  // mount a second indicator.
  if (document.getElementById(CONTAINER_ID)) return
  if (signal?.aborted) return

  const container = document.createElement('div')
  container.id = CONTAINER_ID
  Object.assign(container.style, {
    position: 'fixed',
    width: `${SIZE}px`,
    height: `${SIZE}px`,
    zIndex: '2147483647',
  } satisfies Partial<CSSStyleDeclaration>)

  const handle = createHandle()
  const logo = createLogo()
  container.append(handle, logo)
  document.body.appendChild(container)

  applyPosition(container, clampToViewport((await loadPosition()) ?? defaultPosition()))
  // The route may have left while the position was loading; if so, undo the
  // mount rather than leaving an orphaned indicator behind.
  if (signal?.aborted) {
    container.remove()
    return
  }

  // Clicking the ball opens the settings Panel, which covers the ball; hide the
  // ball while it's open so the Panel reads as a single surface, and restore it
  // when the Panel closes.
  const panel = mountPanel({
    onOpenChange: (open) => {
      container.style.display = open ? 'none' : ''
    },
  })
  logo.style.cursor = 'pointer'
  logo.addEventListener('click', () => panel.open())

  let dragging = false

  const showHandle = (): void => {
    handle.style.opacity = '1'
    handle.style.pointerEvents = 'auto'
  }
  const hideHandle = (): void => {
    handle.style.opacity = '0'
    handle.style.pointerEvents = 'none'
  }

  container.addEventListener('mouseenter', showHandle, { signal })
  container.addEventListener(
    'mouseleave',
    () => {
      if (!dragging) hideHandle()
    },
    { signal },
  )

  handle.addEventListener('pointerdown', (event: PointerEvent) => {
    event.preventDefault()
    dragging = true
    handle.style.cursor = 'grabbing'
    handle.setPointerCapture(event.pointerId)

    const rect = container.getBoundingClientRect()
    const grabOffsetX = event.clientX - rect.left
    const grabOffsetY = event.clientY - rect.top

    const onMove = (moveEvent: PointerEvent): void => {
      applyPosition(
        container,
        clampToViewport({
          left: moveEvent.clientX - grabOffsetX,
          top: moveEvent.clientY - grabOffsetY,
        }),
      )
    }

    const onUp = (): void => {
      dragging = false
      handle.style.cursor = 'grab'
      handle.releasePointerCapture(event.pointerId)
      handle.removeEventListener('pointermove', onMove)
      handle.removeEventListener('pointerup', onUp)

      const finalRect = container.getBoundingClientRect()
      void savePosition({ left: finalRect.left, top: finalRect.top })
      if (!container.matches(':hover')) hideHandle()
    }

    handle.addEventListener('pointermove', onMove)
    handle.addEventListener('pointerup', onUp)
  })

  // Keep this page's indicator in sync when another tab moves it. Ignore
  // updates mid-drag so we don't fight the user's pointer.
  const unsubscribe = onPositionChange((next) => {
    if (!dragging) applyPosition(container, clampToViewport(next))
  })

  // When the route leaves (the user navigates away from this page), tear the
  // indicator down: stop listening for cross-tab updates and remove the node.
  // The element-scoped listeners above are bound to `signal` and clean up on
  // their own. (The settings Panel is a separate, hidden surface and is left
  // as-is until it exposes a teardown handle.)
  signal?.addEventListener(
    'abort',
    () => {
      unsubscribe()
      container.remove()
    },
    { once: true },
  )
}
