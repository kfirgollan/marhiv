// A thin CodeMirror 6 wrapper for the Custom Scripts editor. Kept out of the React
// component so the page just mounts/destroys a view and reacts to changes.
// CodeMirror mounts into the Panel's shadow root and injects its own styles there,
// so it stays isolated from the host page (no web workers, unlike Monaco).

import { EditorView, basicSetup } from 'codemirror'
import { EditorState } from '@codemirror/state'
import { javascript, javascriptLanguage } from '@codemirror/lang-javascript'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'
import type { CompletionContext, CompletionResult } from '@codemirror/autocomplete'

// Autocomplete for the `marhiv` API the bridge exposes to scripts — added
// alongside CodeMirror's built-in JS completion, so typing `marhiv.` suggests the
// supported verbs and a route handler skeleton.
function marhivCompletions(context: CompletionContext): CompletionResult | null {
  const word = context.matchBefore(/[\w.]*/)
  if (!word || (word.from === word.to && !context.explicit)) return null
  return {
    from: word.from,
    options: [
      { label: 'marhiv', type: 'namespace', info: 'Marhiv user-script API' },
      {
        label: 'marhiv.injectCss',
        type: 'method',
        info: 'Inject CSS into the host page',
        apply: "marhiv.injectCss('')",
      },
      {
        label: 'marhiv.onRoute',
        type: 'method',
        info: 'Run a handler whenever a named route is active',
        apply: "marhiv.onRoute('code', (scope) => {\n  \n})",
      },
      {
        label: 'scope.slot',
        type: 'method',
        info: 'Target a named slot on the host UI',
        apply: "scope.slot('sidebar.newSession')",
      },
      {
        label: 'addAction',
        type: 'method',
        info: 'Add a native-looking action button to a slot',
        apply: "addAction({ id: '', label: '', onClick() {} })",
      },
    ],
  }
}

// Dark theme keyed off the Panel's shadow-root brand tokens, so the editor matches
// the surrounding UI.
const theme = EditorView.theme(
  {
    '&': {
      fontSize: '12px',
      backgroundColor: 'var(--marhiv-surface)',
      color: 'var(--marhiv-snow)',
      border: '1px solid var(--marhiv-hairline)',
      borderRadius: '6px',
      height: '100%',
    },
    '.cm-content': {
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      caretColor: '#f8faff',
    },
    '.cm-cursor, .cm-dropCursor': { borderLeftColor: '#f8faff' },
    '.cm-gutters': {
      backgroundColor: 'var(--marhiv-canvas)',
      color: 'var(--marhiv-text-muted)',
      border: 'none',
    },
    '.cm-activeLine, .cm-activeLineGutter': { backgroundColor: 'var(--marhiv-peak-shadow)' },
    '&.cm-focused': { outline: '2px solid var(--marhiv-accent)', outlineOffset: '1px' },
    // Selection needs enough contrast to read selected code over the purple surface.
    '.cm-selectionBackground, .cm-content ::selection': {
      backgroundColor: 'rgba(196, 44, 158, 0.35)',
    },
    '&.cm-focused .cm-selectionBackground': { backgroundColor: 'rgba(196, 44, 158, 0.45)' },
    '.cm-scroller': { overflow: 'auto' },
    // Autocomplete popover, themed to match the panel.
    '.cm-tooltip': {
      background: 'var(--marhiv-canvas)',
      border: '1px solid var(--marhiv-hairline)',
      color: 'var(--marhiv-snow)',
    },
    '.cm-tooltip-autocomplete ul li[aria-selected]': {
      background: 'var(--marhiv-primary)',
      color: 'var(--marhiv-snow)',
    },
  },
  { dark: true },
)

// Syntax colors tuned for the dark-purple surface. CodeMirror's default highlight
// style is built for a light background (dark blues that are unreadable here), so
// we replace it with a high-contrast palette of distinct, light hues — warm and
// cyan tones read far better over purple than the default blues.
const highlightStyle = HighlightStyle.define([
  { tag: t.comment, color: '#9d8ec9', fontStyle: 'italic' },
  { tag: [t.keyword, t.controlKeyword, t.moduleKeyword, t.operatorKeyword], color: '#ff86c8' },
  { tag: [t.string, t.special(t.string), t.regexp], color: '#86e2a8' },
  { tag: [t.number, t.bool, t.null, t.atom], color: '#ffc777' },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: '#82d9ff' },
  { tag: [t.typeName, t.className, t.namespace], color: '#ffd479' },
  { tag: t.propertyName, color: '#e6dcff' },
  { tag: [t.operator, t.punctuation, t.separator, t.bracket], color: '#cbb8ef' },
  { tag: [t.variableName, t.definition(t.variableName)], color: '#f8faff' },
  { tag: t.invalid, color: '#ff5c57' },
])

export interface EditorHandle {
  getValue(): string
  // Force a re-measure after the editor's container is resized (e.g. the Panel was
  // maximized/restored) — CodeMirror doesn't observe arbitrary container resizes.
  measure(): void
  destroy(): void
}

// Create an editor in `parent` with `doc`, calling `onChange` on every edit.
export function createEditor(
  parent: HTMLElement,
  doc: string,
  onChange: (value: string) => void,
): EditorHandle {
  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc,
      extensions: [
        basicSetup,
        javascript(),
        javascriptLanguage.data.of({ autocomplete: marhivCompletions }),
        // After basicSetup so it overrides the default (light-background) highlight.
        syntaxHighlighting(highlightStyle),
        theme,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) onChange(update.state.doc.toString())
        }),
      ],
    }),
  })
  return {
    getValue: () => view.state.doc.toString(),
    measure: () => view.requestMeasure(),
    destroy: () => view.destroy(),
  }
}
