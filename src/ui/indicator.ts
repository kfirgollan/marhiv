// Marhiv's on-page indicator: a draggable 32×32 circle pinned above the page.
//
// Hovering reveals a drag handle to its left; dragging the handle moves the
// circle, and its position is persisted (and kept in sync across pages) via
// `chrome.storage`. All styles are inline so the widget is self-contained and
// independent of the host page's stylesheets.

import { loadPosition, savePosition, onPositionChange, type Position } from '../storage/position'

const CONTAINER_ID = 'marhiv-indicator'
const SIZE = 32
const MARGIN = 16

function defaultPosition(): Position {
  return {
    left: window.innerWidth - SIZE - MARGIN,
    top: window.innerHeight - SIZE - MARGIN,
  }
}

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

function createCircle(): HTMLDivElement {
  const circle = document.createElement('div')
  Object.assign(circle.style, {
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #7c3aed, #ec4899)',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
  } satisfies Partial<CSSStyleDeclaration>)
  return circle
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

export async function mountIndicator(): Promise<void> {
  // Content scripts can run more than once across a page's lifetime; never
  // mount a second indicator.
  if (document.getElementById(CONTAINER_ID)) return

  const container = document.createElement('div')
  container.id = CONTAINER_ID
  Object.assign(container.style, {
    position: 'fixed',
    width: `${SIZE}px`,
    height: `${SIZE}px`,
    zIndex: '2147483647',
  } satisfies Partial<CSSStyleDeclaration>)

  const handle = createHandle()
  const circle = createCircle()
  container.append(handle, circle)
  document.body.appendChild(container)

  applyPosition(container, clampToViewport((await loadPosition()) ?? defaultPosition()))

  let dragging = false

  const showHandle = (): void => {
    handle.style.opacity = '1'
    handle.style.pointerEvents = 'auto'
  }
  const hideHandle = (): void => {
    handle.style.opacity = '0'
    handle.style.pointerEvents = 'none'
  }

  container.addEventListener('mouseenter', showHandle)
  container.addEventListener('mouseleave', () => {
    if (!dragging) hideHandle()
  })

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
  onPositionChange((position) => {
    if (!dragging) applyPosition(container, clampToViewport(position))
  })
}
