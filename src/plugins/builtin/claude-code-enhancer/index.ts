// claude-code-enhancer — enhancements for the Claude Code surface
// (claude.ai/code). It loads site-wide but scopes its on-page behavior to the
// Code route via `ctx.onRoute(RouteKey.Code, …)`, and reaches the UI through the
// Slots engine rather than raw selectors — so when Claude reworks its markup,
// only the slot resolver in src/sites/claude/slots.ts changes, not this plugin.
//
// First behavior: add a "marhiv test button" row directly under the sidebar's
// "+ New session" entry. The Slots engine inserts it natively (cloning the host
// row's styling), keeps it present across re-renders, and removes it when the
// route is left or the plugin is disabled — all via the route scope's signal,
// so there's nothing to undo in `onUnload`.

import { Slot } from '../../../enhance/slots'
import { RouteKey } from '../../../sites/claude/routes'
import type { Plugin } from '../../types'

export const claudeCodeEnhancer: Plugin = {
  meta: {
    id: 'claude-code-enhancer',
    name: 'Claude Code Enhancer',
    description: 'Adds Marhiv actions to the Claude Code UI (claude.ai/code).',
    matches: ['https://claude.ai/*'],
    defaultEnabled: true,
  },
  onLoad(ctx) {
    ctx.onRoute(RouteKey.Code, ({ slot }) => {
      slot(Slot.SidebarNewSession).addAction({
        id: 'marhiv-test-button',
        label: 'marhiv test button',
        onClick: () => console.info('[marhiv] test button clicked'),
      })
    })
  },
}
