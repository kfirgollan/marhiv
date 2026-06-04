// Claude's slot resolvers — the per-route map from semantic slot names to live
// DOM. THIS is the file that changes when Claude reworks its markup; plugins
// targeting these slots stay untouched.
//
// Selectors prefer stable anchors found in the Claude Code DOM: aria-label,
// aria-keyshortcuts, data-row-key prefixes, data-testid, and the `dframe-*` /
// `epitaxy-*` design-system classes — never the hashed `_r_xx_` ids or Tailwind
// hashes, which churn every render.

import { Slot, type SiteEnhancements, type SlotRegistry } from '../../enhance/slots'
import { RouteKey } from './routes'

// claude.ai/code. Tree: Sidebar ⊃ { NewSession, Recents, UserMenu }, and the
// composer in the main pane.
const claudeCodeSlots: SlotRegistry = {
  [Slot.Sidebar]: {
    description: 'Claude Code left sidebar',
    resolve: (scope) => scope.querySelector('aside[aria-label="Sidebar"]'),
  },
  [Slot.SidebarNewSession]: {
    parent: Slot.Sidebar,
    description: 'The "New session" row (⇧⌘O)',
    resolve: (scope) => scope.querySelector('[aria-keyshortcuts="Shift+Meta+O"]'),
  },
  [Slot.SidebarRecents]: {
    parent: Slot.Sidebar,
    description: 'The Recents section',
    resolve: (scope) =>
      scope.querySelector('[data-row-key="label:recents"]')?.closest('.group\\/section') ?? null,
  },
  [Slot.UserMenu]: {
    parent: Slot.Sidebar,
    description: 'The user menu button (account + plan)',
    resolve: (scope) => scope.querySelector('[data-testid="user-menu-button"]'),
  },
  [Slot.Composer]: {
    description: 'The main prompt composer (excludes the side-chat composer)',
    // There are two `.epitaxy-prompt`s on the page; pick the one NOT inside the
    // side-chat overlay. A pure-document lookup, so `scope` is unused.
    resolve: () =>
      Array.from(document.querySelectorAll('.epitaxy-prompt')).find(
        (el) => !el.closest('[aria-label="Side chat"]'),
      ) ?? null,
  },
  [Slot.ComposerInput]: {
    parent: Slot.Composer,
    description: 'The contenteditable prompt input',
    resolve: (scope) => scope.querySelector('[aria-label="Prompt"]'),
  },
}

const SLOTS_BY_ROUTE: Partial<Record<RouteKey, SlotRegistry>> = {
  [RouteKey.Code]: claudeCodeSlots,
}

// What the content script hands the Plugin Manager: the slot registry for a
// given active route. Other sites (ChatGPT, …) will export their own.
export const claudeEnhancements: SiteEnhancements = {
  slotsForRoute: (route) => SLOTS_BY_ROUTE[route as RouteKey],
}
