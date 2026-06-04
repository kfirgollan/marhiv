// Panel Page — the base construct the settings Panel renders. A page is a title
// plus a body, nothing more; the Panel frames it (menu, close, resize) and shows
// one page at a time. Build a new page by composing <PanelPage title="…">…body…
// </PanelPage>, then register it in pages.tsx so the menu picks it up.

import type { ReactNode } from 'react'

export function PanelPage({ title, children }: { title: string; children: ReactNode }): ReactNode {
  return (
    <article className="marhiv-page">
      <header className="marhiv-page__header">
        <h1 className="marhiv-page__title">{title}</h1>
      </header>
      <div className="marhiv-page__body">{children}</div>
    </article>
  )
}

// A labelled form row — the common building block for a page's controls.
export function Field({ label, children }: { label: string; children: ReactNode }): ReactNode {
  return (
    <label className="marhiv-field">
      <span className="marhiv-field__label">{label}</span>
      {children}
    </label>
  )
}
