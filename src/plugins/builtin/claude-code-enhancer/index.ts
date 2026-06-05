// claude-code-enhancer — enhancements for the Claude Code surface
// (claude.ai/code). It loads site-wide but scopes its on-page behavior to the
// Code route via `ctx.onRoute(RouteKey.Code, …)`, and reaches the UI through the
// Slots engine rather than raw selectors — so when Claude reworks its markup,
// only the slot resolver in src/sites/claude/slots.ts changes, not this plugin.
//
// Capabilities (each bundled in; this plugin has a single on/off):
//   - Environments shortcut: an "Environments" row under the sidebar's "New
//     session" that jumps straight to a routine environment's native editor,
//     skipping the six-step native path (see ./environments).

import { RouteKey } from '../../../sites/claude/routes'
import type { Plugin } from '../../types'
import { addEnvironmentsShortcut } from './environments'

export const claudeCodeEnhancer: Plugin = {
  meta: {
    id: 'claude-code-enhancer',
    name: 'Claude Code Enhancer',
    description: 'Adds Marhiv actions to the Claude Code UI (claude.ai/code).',
    matches: ['https://claude.ai/*'],
    defaultEnabled: true,
    category: 'Enhancement',
  },
  onLoad(ctx) {
    ctx.onRoute(RouteKey.Code, (scope) => {
      addEnvironmentsShortcut(scope)
    })
  },
}
