// The settings Panel: a left-rail menu beside the active Panel Page, anchored
// over the Menu Ball and resizable from its open-direction corner.
//
// The Panel is a frame — it owns the menu, the close control, and the resize
// grip, and it loads one Panel Page at a time into its content area. Each page
// brings its own title and body (see PanelPage.tsx / pages.tsx). Geometry lives
// in geometry.ts; this component owns the React state and interactions.

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import {
  defaultPosition,
  loadPosition,
  onPositionChange,
  type Position,
} from '../../storage/position'
import { usePanelSize, usePanelPage, usePanelCollapsed, usePanelMaximized } from '../../store/panel'
import { clamp, computeGeometry, MIN_HEIGHT, MIN_WIDTH, type Corner } from './geometry'
import { BUILTIN_PAGES, type PanelPageDef } from './pages'
import { usePanelPages } from '../../store/panelPages'
import { PanelMenuItem } from './PanelMenuItem'
import { PageBoundary } from './PageBoundary'
import { MARHIV_LOGO_URL } from '../logo'
import { MARHIV_SITE_URL } from '../../links'

const GRIP_CURSOR: Record<Corner, string> = {
  tl: 'nwse-resize',
  br: 'nwse-resize',
  tr: 'nesw-resize',
  bl: 'nesw-resize',
}

// Padding from each viewport edge when the Panel is maximized into a modal.
const MODAL_INSET = 15

export function Panel({ onClose }: { onClose: () => void }) {
  const [ball, setBall] = useState<Position | null>(null)
  const [viewport, setViewport] = useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }))
  // The Panel's own persisted settings live in Zustand stores (src/store/panel),
  // which hydrate from and write through chrome.storage and sync across tabs.
  const size = usePanelSize((s) => s.value)
  const setSizeLocal = usePanelSize((s) => s.setLocal)
  const persistSize = usePanelSize((s) => s.persist)
  const storedPage = usePanelPage((s) => s.value)
  const setPage = usePanelPage((s) => s.set)
  const collapsed = usePanelCollapsed((s) => s.value)
  const setCollapsed = usePanelCollapsed((s) => s.set)
  // Maximized = a full-page modal (inset 15px); persisted, so reopening restores it.
  const maximized = usePanelMaximized((s) => s.value)
  const setMaximized = usePanelMaximized((s) => s.set)
  // Pages contributed by plugins at runtime, merged with the built-ins below.
  const registeredPages = usePanelPages((s) => s.pages)
  const containerRef = useRef<HTMLDivElement>(null)

  // The ball's position is owned by the Menu Ball (src/ui/indicator.ts) on the
  // storage layer; mirror it here and keep it current across tabs so the Panel
  // stays anchored to it.
  useEffect(() => {
    // Fall back to the default spot when nothing is stored (e.g. a reinstall that
    // cleared storage) — otherwise `ball` stays null, geometry can't compute, and
    // the Panel renders nothing at all.
    void loadPosition().then((p) => setBall(p ?? defaultPosition()))
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
      // Update in memory live; persist once on release so a drag doesn't write
      // to storage on every pointer move.
      setSizeLocal({
        width: clamp(Math.abs(move.clientX - anchorX), MIN_WIDTH, viewport.width),
        height: clamp(Math.abs(move.clientY - anchorY), MIN_HEIGHT, viewport.height),
      })
    }
    const onUp = (): void => {
      grip.releasePointerCapture(e.pointerId)
      grip.removeEventListener('pointermove', onMove)
      grip.removeEventListener('pointerup', onUp)
      persistSize()
    }
    grip.addEventListener('pointermove', onMove)
    grip.addEventListener('pointerup', onUp)
  }

  const selectPage = (id: string): void => setPage(id)

  const toggleMenu = (): void => setCollapsed(!collapsed)

  const toggleMaximized = (): void => setMaximized(!maximized)

  // Maximized fills the viewport minus a uniform inset; otherwise anchor to the
  // Menu Ball via the computed geometry.
  const panelStyle = maximized
    ? {
        left: MODAL_INSET,
        top: MODAL_INSET,
        width: viewport.width - MODAL_INSET * 2,
        height: viewport.height - MODAL_INSET * 2,
      }
    : { left: geometry.left, top: geometry.top, width: geometry.width, height: geometry.height }

  const pages = [...BUILTIN_PAGES, ...registeredPages]
  const active = pages.find((p) => p.id === storedPage) ?? pages[0]
  const ActivePage = active.Page

  const topPages = pages.filter((p) => p.group !== 'bottom')
  const bottomPages = pages.filter((p) => p.group === 'bottom')

  const renderItem = (p: PanelPageDef): ReactNode => (
    <PanelMenuItem
      key={p.id}
      icon={p.menu.icon}
      label={p.menu.label}
      active={p.id === active.id}
      collapsed={collapsed}
      onSelect={() => selectPage(p.id)}
    />
  )

  return (
    <>
      {/* Dim the page behind the maximized modal. */}
      {maximized && <div className="marhiv-backdrop" />}
      <div
        ref={containerRef}
        className={'marhiv-panel' + (maximized ? ' marhiv-panel--maximized' : '')}
        style={panelStyle}
      >
        <nav className={'marhiv-panel__nav' + (collapsed ? ' marhiv-panel__nav--collapsed' : '')}>
          {/* Persistent brand mark at the head of the rail; the logo opens the
              Marhiv site in a new tab. */}
          <div className="marhiv-brand">
            <a
              className="marhiv-brand__home"
              href={MARHIV_SITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              title="Open marhiv.app"
              aria-label="Open marhiv.app in a new tab"
            >
              <img
                className="marhiv-brand__logo"
                src={MARHIV_LOGO_URL}
                alt="Marhiv"
                draggable={false}
              />
            </a>
            {!collapsed && <span className="marhiv-brand__name">Marhiv</span>}
          </div>
          <button
            type="button"
            className="marhiv-menu-toggle"
            onClick={toggleMenu}
            aria-label={collapsed ? 'Expand menu' : 'Collapse menu'}
            title={collapsed ? 'Expand menu' : 'Collapse menu'}
          >
            {collapsed ? '»' : '«'}
          </button>
          <div className="marhiv-menu-group">{topPages.map(renderItem)}</div>
          {bottomPages.length > 0 && (
            <div className="marhiv-menu-group marhiv-menu-group--bottom">
              {bottomPages.map(renderItem)}
            </div>
          )}
        </nav>

        <section className="marhiv-panel__content">
          <div className="marhiv-panel__controls">
            <button
              type="button"
              className="marhiv-iconbtn"
              onClick={toggleMaximized}
              aria-label={maximized ? 'Restore panel' : 'Maximize panel'}
              title={maximized ? 'Restore' : 'Maximize'}
            >
              {maximized ? '❐' : '⛶'}
            </button>
            <button
              type="button"
              className="marhiv-iconbtn marhiv-close"
              aria-label="Close"
              title="Close"
              onClick={onClose}
            >
              ×
            </button>
          </div>
          <PageBoundary pageId={active.id}>
            <ActivePage />
          </PageBoundary>
        </section>

        {/* No resize handle while maximized — the modal is sized to the viewport. */}
        {!maximized && (
          <div
            className={`marhiv-grip marhiv-grip--${geometry.grip}`}
            style={{ cursor: GRIP_CURSOR[geometry.grip] }}
            onPointerDown={onGripPointerDown}
            role="separator"
            aria-label="Resize panel"
          />
        )}
      </div>
    </>
  )
}
