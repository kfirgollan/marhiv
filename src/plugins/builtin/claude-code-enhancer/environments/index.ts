// The Environments shortcut — a capability of the claude-code-enhancer plugin.
//
// Natively, editing a Claude Code environment is a six-step slog: Routines → pick
// a routine → Edit → Environment dropdown → hover the name → click the cogwheel.
// This adds an "Environments" row to the Code sidebar (via the Slots engine) that
// lists the org's environments and, on pick, drives Claude's own native editor
// open for it (see drive.ts) — Marhiv never writes the environment, it just
// removes the clicking.

import { Slot } from '../../../../enhance/slots'
import type { RouteScope } from '../../../types'
import {
  fetchEnvironments,
  fetchFirstRoutine,
  type EnvironmentSummary,
  type RoutineSummary,
} from './api'
import { openEnvMenu, showToast } from './menu'
import { DriveError, openEnvironmentEditor } from './drive'
import { log } from '../../../../log'

const ACTION_ID = 'marhiv-environments'

// Leading icon for the sidebar row (a stacked-servers glyph), to match the host
// rows that carry an icon. Trusted constant — assigned as innerHTML by the Slots
// engine (see SlotAction.icon).
const ENV_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="8" x="2" y="2" rx="2"/><rect width="20" height="8" x="2" y="14" rx="2"/><line x1="6" x2="6.01" y1="6" y2="6"/><line x1="6" x2="6.01" y1="18" y2="18"/></svg>'

// Wire the Environments row into the Code sidebar for this route scope.
export function addEnvironmentsShortcut({ slot, signal }: RouteScope): void {
  slot(Slot.SidebarNewSession).addAction({
    id: ACTION_ID,
    label: 'Environments',
    icon: ENV_ICON,
    onClick: () => void openPicker(signal),
  })
}

// Fetch the org's environments + a vehicle routine, then show the picker menu.
async function openPicker(signal: AbortSignal): Promise<void> {
  const anchor = document.querySelector(`[data-marhiv-slot-action="${ACTION_ID}"]`)
  const toast = showToast('Loading environments…', signal)

  let environments: EnvironmentSummary[]
  let routine: RoutineSummary | null
  try {
    ;[environments, routine] = await Promise.all([fetchEnvironments(), fetchFirstRoutine()])
  } catch (err) {
    // Logged (not just toasted) so a dev recording / the diagnostics export
    // captures the exact failing URL.
    log.error('environments load failed:', (err as Error).message)
    toast.update(`Couldn't load environments: ${(err as Error).message}`)
    return
  }
  toast.dismiss()

  if (!routine) {
    showToast('No routines exist to open the environment editor from.', signal)
    return
  }

  openEnvMenu(
    anchor,
    environments.map((env) => ({ id: env.environment_id, name: env.name })),
    (item) => void driveToEditor(item.name, routine, signal),
    signal,
  )
}

// Drive the native editor open for the picked environment, reporting where it
// breaks if a host step can't be found.
async function driveToEditor(
  envName: string,
  routine: RoutineSummary,
  signal: AbortSignal,
): Promise<void> {
  const toast = showToast(`Opening "${envName}"…`, signal)
  try {
    await openEnvironmentEditor(envName, routine, signal)
    toast.dismiss()
  } catch (err) {
    if (err instanceof DriveError) toast.update(`Couldn't ${err.step}.`)
    else if ((err as Error).message === 'aborted') toast.dismiss()
    else toast.update('Could not open the environment editor.')
  }
}
