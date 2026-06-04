// Where the settings Panel sits relative to the Menu Ball.
//
// The Panel covers the ball: one of its corners is pinned to the ball's
// matching corner and the box grows away from it, into the larger empty half of
// the viewport. Which corner is pinned depends on the ball's quadrant, so the
// Panel opens sensibly whether the ball sits top-left, bottom-right, or
// anywhere else. The resize grip lives on the opposite (open-direction) corner,
// so dragging it always expands into free space without moving the pinned
// corner.

import type { Position } from '../../storage/position'
import type { PanelSize } from '../../storage/panel'

// Must match the Menu Ball's size in indicator.ts.
export const BALL_SIZE = 32
export const MIN_WIDTH = 200
export const MIN_HEIGHT = 280
export const DEFAULT_SIZE: PanelSize = { width: 280, height: 400 }

export type Corner = 'tl' | 'tr' | 'bl' | 'br'

export interface PanelGeometry {
  left: number
  top: number
  width: number
  height: number
  // Screen coordinates of the corner pinned to the ball — the fixed point the
  // box grows away from while resizing.
  anchorX: number
  anchorY: number
  // The open-direction corner, where the resize grip is rendered.
  grip: Corner
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function computeGeometry(
  ball: Position,
  size: PanelSize,
  viewport: { width: number; height: number },
): PanelGeometry {
  const ballRight = ball.left + BALL_SIZE
  const ballBottom = ball.top + BALL_SIZE
  // Open toward the side of the viewport with more room.
  const openRight = ball.left + BALL_SIZE / 2 < viewport.width / 2
  const openDown = ball.top + BALL_SIZE / 2 < viewport.height / 2

  const width = Math.min(size.width, viewport.width)
  const height = Math.min(size.height, viewport.height)

  const anchorX = openRight ? ball.left : ballRight
  const anchorY = openDown ? ball.top : ballBottom

  const left = clamp(openRight ? anchorX : anchorX - width, 0, Math.max(0, viewport.width - width))
  const top = clamp(openDown ? anchorY : anchorY - height, 0, Math.max(0, viewport.height - height))

  const grip = `${openDown ? 'b' : 't'}${openRight ? 'r' : 'l'}` as Corner

  return { left, top, width, height, anchorX, anchorY, grip }
}
