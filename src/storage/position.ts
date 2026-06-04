// Persisted screen position for Marhiv's on-page indicator.
//
// Backed by `chrome.storage.local`, so the position is shared across every
// page Marhiv runs on and survives reloads. (Use `.sync` later if we want it
// to follow the user across devices.)

export interface Position {
  left: number
  top: number
}

const STORAGE_KEY = 'indicatorPosition'

function isPosition(value: unknown): value is Position {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Position).left === 'number' &&
    typeof (value as Position).top === 'number'
  )
}

export async function loadPosition(): Promise<Position | null> {
  const result = await chrome.storage.local.get(STORAGE_KEY)
  const value = result[STORAGE_KEY]
  return isPosition(value) ? value : null
}

export async function savePosition(position: Position): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: position })
}

// Subscribe to position changes made by other pages/tabs. Returns an
// unsubscribe function. Fires only for genuine value changes in local storage.
export function onPositionChange(handler: (position: Position) => void): () => void {
  const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string): void => {
    if (area !== 'local') return
    const change = changes[STORAGE_KEY]
    if (change && isPosition(change.newValue)) {
      handler(change.newValue)
    }
  }
  chrome.storage.onChanged.addListener(listener)
  return () => chrome.storage.onChanged.removeListener(listener)
}
