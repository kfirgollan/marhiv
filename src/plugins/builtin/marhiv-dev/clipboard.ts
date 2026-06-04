// Best-effort copy-to-clipboard. Prefers the async Clipboard API; falls back to
// a temporary off-screen textarea + execCommand for contexts where the async API
// is unavailable or blocked (which can happen inside content scripts). Returns
// whether the copy succeeded so the caller can report it.

export async function writeToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return copyViaTextarea(text)
  }
}

function copyViaTextarea(text: string): boolean {
  const textarea = document.createElement('textarea')
  textarea.value = text
  Object.assign(textarea.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    opacity: '0',
    pointerEvents: 'none',
  } satisfies Partial<CSSStyleDeclaration>)
  document.body.appendChild(textarea)
  textarea.focus()
  textarea.select()

  let copied = false
  try {
    copied = document.execCommand('copy')
  } catch {
    copied = false
  }
  textarea.remove()
  return copied
}
