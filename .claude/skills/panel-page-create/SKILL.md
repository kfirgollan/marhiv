---
description: 'Create a new Panel Page in the Marhiv settings Panel — scaffolds the page component, registers it, and wires its left-rail Panel Menu Item. Use when the user wants to add a settings/config/info page to the Panel.'
---

# Create Panel Page

Add a new **Panel Page** to the settings Panel (`src/ui/panel/`). A Panel Page is
a title + body shown one at a time; each registered page automatically gets a
left-rail **Panel Menu Item** (icon + label) that activates it. The persisted
"last open page" and the collapsed/expanded menu behavior come for free — you
only write the page and register it.

Consult `docs/taxonomy.md` for the precise meaning of **Panel Page**, **Panel
Menu Item**, and **Settings Panel** before starting.

## Input

Arguments: $ARGUMENTS

Interpret the arguments flexibly. A request usually implies most of these — infer
sensible defaults and only ask the user when a required choice is genuinely
ambiguous:

- **title** — the heading shown at the top of the page (e.g. `Appearance`).
- **menu label** — the left-rail text. Defaults to the title (often identical).
- **menu icon** — a single emoji glyph, matching the existing set
  (`⚙` General, `🧩` Plugins, `ⓘ` About, `🛠` Dev). Pick one that fits; ask only
  if nothing obvious applies.
- **id** — a short, stable, lowercase identifier (e.g. `appearance`). Derive from
  the title if not given. Must be unique in the registry (it's the persistence
  key for "last open page").
- **body** — what the page contains: which controls/fields, static text, or live
  readouts. If the user is vague, scaffold a minimal, clearly-labeled placeholder
  rather than inventing behavior.

## Execution

### Step 1: Read the current state

Read `src/ui/panel/pages.tsx` (the registry + the `PanelPageDef` shape and the
inline `GeneralPage`/`AboutPage` examples) and `src/ui/panel/PanelPage.tsx` (the
`PanelPage` and `Field` building blocks). For a stateful page, also skim
`src/ui/panel/PluginsPage.tsx` and `src/ui/panel/DevPage.tsx` as references.

Confirm the chosen `id` and `menu.label` aren't already used in the `PAGES`
array.

### Step 2: Decide where the page lives

- **Inline in `pages.tsx`** — for a static page: a few labeled fields, text, no
  React state, hooks, or storage. Follow the `GeneralPage`/`AboutPage` pattern.
- **Its own file `src/ui/panel/<Name>Page.tsx`** — for anything with state, hooks,
  storage, or non-trivial logic. Follow the `PluginsPage.tsx` / `DevPage.tsx`
  pattern, then `import` it into `pages.tsx`.

Pick the lighter option that fits; don't create a file for a static page.

### Step 3: Write the page component

Every page returns a `<PanelPage title="…">` wrapping its body. Use the shared
building blocks and shadow-scoped classes so it matches the rest of the Panel
(styles live in `src/ui/panel/panel.css`):

- `<Field label="…">…control…</Field>` — a labeled form row (imported from
  `./PanelPage`).
- `.marhiv-page__lead` — intro paragraph. `.marhiv-page__meta` — small muted text.
- `.marhiv-readout` — monospace read-only value (see `DevPage`).
- `<select>` inside a `Field` is already styled; raw `<input type="checkbox">`
  works as-is.

Static page (inline in `pages.tsx`):

```tsx
function AppearancePage(): ReactNode {
  return (
    <PanelPage title="Appearance">
      <p className="marhiv-page__lead">Tune how Marhiv looks on this site.</p>
      <Field label="Theme">
        <select defaultValue="auto">
          <option value="auto">Auto</option>
          <option value="dark">Dark</option>
        </select>
      </Field>
    </PanelPage>
  )
}
```

Stateful page (own file, e.g. `src/ui/panel/AppearancePage.tsx`):

```tsx
import { useState, type ReactNode } from 'react'
import { Field, PanelPage } from './PanelPage'

export function AppearancePage(): ReactNode {
  const [theme, setTheme] = useState('auto')
  return (
    <PanelPage title="Appearance">
      <Field label="Theme">
        <select value={theme} onChange={(e) => setTheme(e.target.value)}>
          <option value="auto">Auto</option>
          <option value="dark">Dark</option>
        </select>
      </Field>
    </PanelPage>
  )
}
```

If the page needs to **persist** anything, add a value via the
`createPersistedValue` factory in `src/storage/` (see `src/storage/panel.ts`);
never re-implement `chrome.storage` plumbing (the duplication gate forbids it).
If it needs new styles, add scoped rules to `panel.css` — do not use inline
styles or rely on the host page's CSS.

### Step 4: Register it

Add one entry to the `PAGES` array in `src/ui/panel/pages.tsx`. This is what
creates the Panel Menu Item — **do not** edit `Panel.tsx` or `PanelMenuItem.tsx`;
the Panel maps the registry to menu items automatically.

```tsx
// at top, only for an own-file page:
import { AppearancePage } from './AppearancePage'

export const PAGES: PanelPageDef[] = [
  // …existing entries, in their current order…
  { id: 'appearance', menu: { label: 'Appearance', icon: '🎨' }, Page: AppearancePage },
]
```

Place the entry thoughtfully in the array — menu order follows array order.
Settings-like pages usually go before `about`/`dev`.

By default an item sits in the top menu group. To anchor it to the **bottom**
group (below the divider, where `About` lives — for meta/secondary pages), add
`group: 'bottom'`:

```tsx
{ id: 'about', menu: { label: 'About', icon: 'ⓘ' }, group: 'bottom', Page: AboutPage }
```

### Step 5: Verify

Run the quality gates and fix anything they flag:

```bash
npm run typecheck
npm run lint
npm run format
npm run check:dup
npm run build
```

If the new page introduces a genuinely new project concept (not just another
settings screen), consider registering a term with `/register-term`. A routine
settings page does not need one.

### Step 6: Report

State which page was added, where its component lives (inline vs file), its `id`,
menu label, and icon, and confirm the gates passed. Note that the menu item and
last-open-page persistence are wired automatically via the registry. Mention that
behavior was verified by build/typecheck, not in a browser, and suggest a quick
click-through if the page has real interactions.
