// Persisted screen position for Marhiv's Menu Ball.

import { createPersistedValue } from './persisted'

export interface Position {
  left: number
  top: number
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
