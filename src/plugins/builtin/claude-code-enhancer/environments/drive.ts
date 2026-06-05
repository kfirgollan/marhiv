// The "vehicle" driver: opens Claude's native "Update cloud environment" editor
// by reproducing the only path that reaches it — a routine's Edit modal →
// Environment dropdown → that environment's cogwheel. Marhiv never writes the
// environment itself; it just gets the user to Claude's own (correct, safe)
// editor in one click instead of six.
//
// Slots-only exception: a Plugin normally reaches the host page only through the
// Slots engine. Driving a multi-step native flow (click → wait → click) isn't
// something Slots models, so this module clicks host elements directly. To keep a
// host redesign a localized fix, every target uses a STABLE anchor (aria-label,
// role, visible text) — never hashed ids or Tailwind classes — and each step
// fails loudly via a toast naming where it broke, so breakage is diagnosable.

// Stable host anchors, gathered from a recording of the manual path.
const SEL = {
  sidebar: 'aside[aria-label="Sidebar"]',
  editButton: 'button[aria-label="Edit"]',
  dialog: '[role="dialog"]',
  envButton: 'button[aria-label="Environment"]',
  editEnvButton: 'button[aria-label="Edit environment"]',
  envOption: '[role="option"]',
} as const

const STEP_TIMEOUT = 6000

// Resolve as soon as `find` returns a node; reject on timeout or route-leave.
function waitFor<T>(
  find: () => T | null | undefined,
  signal: AbortSignal,
  timeout = STEP_TIMEOUT,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const immediate = find()
    if (immediate) return resolve(immediate)

    const cleanup = (): void => {
      observer.disconnect()
      clearTimeout(timer)
      signal.removeEventListener('abort', onAbort)
    }
    const observer = new MutationObserver(() => {
      const el = find()
      if (el) {
        cleanup()
        resolve(el)
      }
    })
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true })
    const timer = setTimeout(() => {
      cleanup()
      reject(new Error('timeout'))
    }, timeout)
    const onAbort = (): void => {
      cleanup()
      reject(new Error('aborted'))
    }
    signal.addEventListener('abort', onAbort, { once: true })
  })
}

// A routine-edit dialog is the one carrying the Environment dropdown button.
function openRoutineDialog(): HTMLElement | null {
  for (const dialog of document.querySelectorAll<HTMLElement>(SEL.dialog)) {
    if (dialog.querySelector(SEL.envButton)) return dialog
  }
  return null
}

// An environment option in the dropdown, matched by its visible name.
function findEnvOption(name: string): HTMLElement | null {
  for (const option of document.querySelectorAll<HTMLElement>(SEL.envOption)) {
    if (option.textContent?.trim().startsWith(name)) return option
  }
  return null
}

// A sidebar row button by its visible label (e.g. "Routines").
function sidebarButton(label: string): HTMLElement | null {
  const sidebar = document.querySelector(SEL.sidebar)
  if (!sidebar) return null
  for (const button of sidebar.querySelectorAll<HTMLElement>('button')) {
    if (button.textContent?.trim() === label) return button
  }
  return null
}

// Any routine row on the list page — every routine shows a "Next run …" line, so
// that's a stable-enough signal to grab the first one as the editor "vehicle".
// We don't care WHICH routine: it's only used to open its Edit modal, where the
// environment editor lives.
function findFirstRoutineRow(): HTMLElement | null {
  const main = document.getElementById('dframe-main') ?? document.body
  for (const button of main.querySelectorAll<HTMLElement>('button')) {
    if (/Next run/i.test(button.textContent ?? '')) return button
  }
  return null
}

// Get a routine-edit modal open, from wherever the user currently is: reuse an
// open one, click Edit on a routine detail page, or navigate (in-SPA, by
// clicking) to a routine first.
async function ensureRoutineDialog(signal: AbortSignal): Promise<HTMLElement> {
  const existing = openRoutineDialog()
  if (existing) return existing

  if (!document.querySelector(SEL.editButton)) {
    // Not on a routine detail page — navigate there by driving the SPA (clicking,
    // not location.assign, so this flow's JS context survives).
    if (!location.pathname.startsWith('/code/routines')) {
      const routines = sidebarButton('Routines')
      if (!routines) throw new DriveError('open the Routines section')
      routines.click()
    }
    const row = await waitFor(findFirstRoutineRow, signal).catch(() => {
      throw new DriveError('find a routine to open')
    })
    row.click()
  }

  const editButton = await waitFor(
    () => document.querySelector<HTMLElement>(SEL.editButton),
    signal,
  ).catch(() => {
    throw new DriveError("reach the routine's Edit button")
  })
  editButton.click()
  return waitFor(openRoutineDialog, signal).catch(() => {
    throw new DriveError('open the routine editor')
  })
}

// Carries which step failed, for a precise toast.
class DriveError extends Error {
  constructor(public readonly step: string) {
    super(`could not ${step}`)
  }
}

// Drive all the way to the chosen environment's native editor.
export async function openEnvironmentEditor(envName: string, signal: AbortSignal): Promise<void> {
  const dialog = await ensureRoutineDialog(signal)

  const envButton = dialog.querySelector<HTMLElement>(SEL.envButton)
  if (!envButton) throw new DriveError('find the Environment dropdown')
  envButton.click()

  const option = await waitFor(() => findEnvOption(envName), signal).catch(() => {
    throw new DriveError(`find the "${envName}" environment`)
  })
  const cog = option.querySelector<HTMLElement>(SEL.editEnvButton)
  if (!cog) throw new DriveError('find the environment edit button')
  cog.click()

  // Confirm the native editor actually opened (a second, nested dialog).
  await waitFor(
    () =>
      Array.from(document.querySelectorAll<HTMLElement>(SEL.dialog)).find((d) =>
        /cloud environment/i.test(d.textContent ?? ''),
      ),
    signal,
  ).catch(() => {
    throw new DriveError('open the environment editor')
  })
}

export { DriveError }
