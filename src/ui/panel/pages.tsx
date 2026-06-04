// The Panel's pages and the left-rail menu that selects them. Each entry links
// one menu item (icon + label) to one Panel Page component — selecting the item
// makes that page appear. Add an entry here and it shows up in the menu
// automatically.
//
// These pages are scaffolding: the controls render but aren't wired to behavior
// yet. Real configuration will flow through the Enhancement API once it exists.

import type { ReactNode } from 'react'
import { Field, PanelPage } from './PanelPage'
import { PluginsPage } from './PluginsPage'

export interface PanelPageDef {
  id: string
  menu: { label: string; icon: string }
  // Which menu group the item sits in: 'top' (default) anchors to the top of the
  // rail; 'bottom' anchors to the bottom, below a divider (e.g. About).
  group?: 'top' | 'bottom'
  // Always a Panel Page (a <PanelPage>); the Panel renders this for the entry.
  Page: () => ReactNode
}

function GeneralPage(): ReactNode {
  return (
    <PanelPage title="General">
      <p className="marhiv-page__lead">These settings apply across every AI site Marhiv runs on.</p>
      <Field label="Enable on this site">
        <input type="checkbox" defaultChecked />
      </Field>
      <Field label="Menu Ball size">
        <select defaultValue="md">
          <option value="sm">Small</option>
          <option value="md">Medium</option>
          <option value="lg">Large</option>
        </select>
      </Field>
    </PanelPage>
  )
}

function AboutPage(): ReactNode {
  return (
    <PanelPage title="About">
      <p className="marhiv-page__lead">Make the AI chatbots you use your own.</p>
      <p className="marhiv-page__meta">Marhiv · pre-alpha · v0.0.1</p>
    </PanelPage>
  )
}

// The first-party pages that always exist. Plugins contribute additional pages
// at runtime via the Plugin Context (see src/store/panelPages.ts); the Panel
// renders the two sets merged.
export const BUILTIN_PAGES: PanelPageDef[] = [
  { id: 'general', menu: { label: 'General', icon: '⚙' }, Page: GeneralPage },
  { id: 'plugins', menu: { label: 'Plugins', icon: '🧩' }, Page: PluginsPage },
  { id: 'about', menu: { label: 'About', icon: 'ⓘ' }, group: 'bottom', Page: AboutPage },
]
