// The settings Panel: a left-rail menu beside the active Panel Page, anchored
// over the Menu Ball and resizable from its open-direction corner.
//
// The Panel is a frame — it owns the menu, the close control, and the resize
// grip, and it loads one Panel Page at a time into its content area. Each page
// brings its own title and body (see PanelPage.tsx / pages.tsx). Geometry lives
// in geometry.ts; this component owns the React state and interactions.

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { loadPosition, onPositionChange, type Position } from '../../storage/position'
import {
  loadPanelSize,
  savePanelSize,
  loadPanelPage,
  savePanelPage,
  loadPanelMenuCollapsed,
  savePanelMenuCollapsed,
  type PanelSize,
} from '../../storage/panel'
import {
  clamp,
  computeGeometry,
  DEFAULT_SIZE,
  MIN_HEIGHT,
  MIN_WIDTH,
  type Corner,
} from './geometry'
import { PAGES } from './pages'
import { PanelMenuItem } from './PanelMenuItem'

const GRIP_CURSOR: Record<Corner, string> = {
  tl: 'nwse-resize',
  br: 'nwse-resize',
  tr: 'nesw-resize',
  bl: 'nesw-resize',
}

export function Panel({ onClose }: { onClose: () => void }) {
  const [ball, setBall] = useState<Position | null>(null)
  const [size, setSize] = useState<PanelSize>(DEFAULT_SIZE)
  const [viewport, setViewport] = useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }))
  const [activeId, setActiveId] = useState(PAGES[0].id)
  // The whole menu collapses to icons-only; expanded by default. Each menu item
  // renders its collapsed/expanded state from this.
  const [collapsed, setCollapsed] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  // Latest size, readable from the pointerup handler without stale closures.
  const sizeRef = useRef(size)
  sizeRef.current = size

  // Load persisted state and keep ball position current across tabs.
  useEffect(() => {
    void loadPosition().then((p) => p && setBall(p))
    void loadPanelSize().then((s) => s && setSize(s))
    void loadPanelPage().then((id) => {
      if (id && PAGES.some((p) => p.id === id)) setActiveId(id)
    })
    // `!== null` rather than truthiness: `false` (expanded) is a real value.
    void loadPanelMenuCollapsed().then((value) => {
      if (value !== null) setCollapsed(value)
    })
    return onPositionChange(setBall)
  }, [])

  useEffect(() => {
    const onResize = (): void =>
      setViewport({ width: window.innerWidth, height: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Dismiss on Escape or a click outside the panel. composedPath() sees through
  // the shadow boundary, so clicks inside the panel are correctly excluded.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    const onPointer = (e: PointerEvent): void => {
      const el = containerRef.current
      if (el && !e.composedPath().includes(el)) onClose()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [onClose])

  const geometry = useMemo(
    () => (ball ? computeGeometry(ball, size, viewport) : null),
    [ball, size, viewport],
  )

  if (!geometry) return null

  const onGripPointerDown = (e: ReactPointerEvent<HTMLDivElement>): void => {
    e.preventDefault()
    const grip = e.currentTarget
    grip.setPointerCapture(e.pointerId)
    // The pinned corner is fixed while the ball can't move (it's hidden when the
    // panel is open), so the size is just the box from that corner to the cursor.
    const { anchorX, anchorY } = geometry

    const onMove = (move: PointerEvent): void => {
      setSize({
        width: clamp(Math.abs(move.clientX - anchorX), MIN_WIDTH, viewport.width),
        height: clamp(Math.abs(move.clientY - anchorY), MIN_HEIGHT, viewport.height),
      })
    }
    const onUp = (): void => {
      grip.releasePointerCapture(e.pointerId)
      grip.removeEventListener('pointermove', onMove)
      grip.removeEventListener('pointerup', onUp)
      void savePanelSize(sizeRef.current)
    }
    grip.addEventListener('pointermove', onMove)
    grip.addEventListener('pointerup', onUp)
  }

  const selectPage = (id: string): void => {
    setActiveId(id)
    void savePanelPage(id)
  }

  const toggleMenu = (): void => {
    const next = !collapsed
    setCollapsed(next)
    void savePanelMenuCollapsed(next)
  }

  const active = PAGES.find((p) => p.id === activeId) ?? PAGES[0]
  const ActivePage = active.Page

  return (
    <div
      ref={containerRef}
      className="marhiv-panel"
      style={{
        left: geometry.left,
        top: geometry.top,
        width: geometry.width,
        height: geometry.height,
      }}
    >
      <nav className={'marhiv-panel__nav' + (collapsed ? ' marhiv-panel__nav--collapsed' : '')}>
        <button
          type="button"
          className="marhiv-menu-toggle"
          onClick={toggleMenu}
          aria-label={collapsed ? 'Expand menu' : 'Collapse menu'}
          title={collapsed ? 'Expand menu' : 'Collapse menu'}
        >
          {collapsed ? '»' : '«'}
        </button>
        {PAGES.map((p) => (
          <PanelMenuItem
            key={p.id}
            icon={p.menu.icon}
            label={p.menu.label}
            active={p.id === active.id}
            collapsed={collapsed}
            onSelect={() => selectPage(p.id)}
          />
        ))}
      </nav>

      <section className="marhiv-panel__content">
        <button type="button" className="marhiv-close" aria-label="Close" onClick={onClose}>
          ×
        </button>
        <ActivePage />
      </section>

      <div
        className={`marhiv-grip marhiv-grip--${geometry.grip}`}
        style={{ cursor: GRIP_CURSOR[geometry.grip] }}
        onPointerDown={onGripPointerDown}
        role="separator"
        aria-label="Resize panel"
      />
    </div>
  )
}
