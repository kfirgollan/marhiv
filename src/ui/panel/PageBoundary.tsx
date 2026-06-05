// React error boundaries for the Panel. A Panel Page is often contributed by a
// plugin and can throw at render time; the Panel frame itself can also throw.
// Without a boundary, either unmounts the whole tree and the Menu Ball just
// vanishes with nothing shown. These catch the error, render the message, and —
// importantly — log it with a `[marhiv]` prefix so it survives a console filter.

import { Component, type ErrorInfo, type ReactNode } from 'react'
import { log } from '../../log'

interface Props {
  // Remounts the boundary (clearing a caught error) when the active page changes.
  pageId?: string
  // Render a self-contained fixed box (for wrapping the whole Panel, where the
  // panel chrome may be the thing that failed) instead of inline page content.
  standalone?: boolean
  children: ReactNode
}

interface State {
  error: Error | null
}

const STANDALONE_STYLE: Record<string, string> = {
  position: 'fixed',
  right: '16px',
  bottom: '16px',
  zIndex: '2147483647',
  maxWidth: '420px',
  padding: '12px 14px',
  borderRadius: '10px',
  background: 'rgba(22, 10, 46, 0.98)',
  border: '1px solid rgba(233, 225, 247, 0.16)',
  color: '#f8faff',
  font: '13px sans-serif',
}

export class PageBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidUpdate(prev: Props): void {
    // A different page is showing now — drop the previous page's error.
    if (prev.pageId !== this.props.pageId && this.state.error) this.setState({ error: null })
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    const where = this.props.standalone ? 'panel' : 'panel page'
    log.error(`${where} crashed:`, error, info.componentStack)
  }

  render(): ReactNode {
    const { error } = this.state
    if (!error) return this.props.children

    if (this.props.standalone) {
      return (
        <div style={STANDALONE_STYLE}>
          <strong>Marhiv panel crashed</strong>
          <div style={{ marginTop: '6px', opacity: '0.85', wordBreak: 'break-word' }}>
            {error.message}
          </div>
        </div>
      )
    }

    return (
      <div className="marhiv-page">
        <header className="marhiv-page__header">
          <h1 className="marhiv-page__title">Page error</h1>
        </header>
        <div className="marhiv-page__body">
          <p className="marhiv-page__lead">This page threw while rendering:</p>
          <code className="marhiv-readout">{error.message}</code>
        </div>
      </div>
    )
  }
}
