// Marhiv content script — Claude (https://claude.ai/new)
//
// v0.0.1: mounts Marhiv's draggable corner indicator. This is the entry point
// for the Claude integration; the indicator itself is a shared, cross-tool UI
// piece (see src/ui/indicator.ts).

import { mountIndicator } from '../ui/indicator'

// `run_at: document_idle` usually fires after `load`, so the page is often
// already complete by the time we run — but guard for the early case too.
if (document.readyState === 'complete') {
  void mountIndicator()
} else {
  window.addEventListener('load', () => void mountIndicator(), { once: true })
}
