// Marhiv content script — Claude (https://claude.ai/new)
//
// v0.0.1: the smallest possible enhancement. It just confirms that Marhiv's
// content script is injected and runs once the page has finished loading.
// This is the seed the real enhancement pipeline will grow from.

function announce(): void {
  console.log('Hello from Marhiv!')
}

// `run_at: document_idle` usually fires after `load`, so the page is often
// already complete by the time we run — but guard for the early case too.
if (document.readyState === 'complete') {
  announce()
} else {
  window.addEventListener('load', announce, { once: true })
}
