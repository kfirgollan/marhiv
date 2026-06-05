// Persisted screen position for Marhiv's Menu Ball.

import { createPersistedValue } from './persisted'

export interface Position {
  left: number
  top: number
}

const BALL_SIZE = 32
const MARGIN = 16

// The Menu Ball's resting spot when nothing is stored yet (bottom-right corner).
// Shared by the indicator (to place the ball) and the Panel (to anchor to it), so
// a fresh install — or a reinstall that cleared storage — still positions both
// consistently instead of leaving the Panel with no anchor (and thus invisible).
export function defaultPosition(): Position {
  return {
    left: window.innerWidth - BALL_SIZE - MARGIN,
    top: window.innerHeight - BALL_SIZE - MARGIN,
  }
}

function isPosition(value: unknown): value is Position {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Position).left === 'number' &&
    typeof (value as Position).top === 'number'
  )
}

const store = createPersistedValue<Position>('indicatorPosition', isPosition)

export const loadPosition = store.load
export const savePosition = store.save
export const onPositionChange = store.onChange
