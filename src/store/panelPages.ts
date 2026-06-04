// Registry of Panel Pages contributed at runtime by Plugins (via the Plugin
// Context's `registerPage`). The built-in pages (General, Plugins, About) stay
// static in src/ui/panel/pages.tsx; this store holds only the dynamic ones, and
// the Panel renders the two merged.
//
// Ephemeral, per-document state — it's rebuilt from scratch each page load as
// plugins activate, so it lives purely in memory (like src/store/route.ts), not
// chrome.storage. The Plugin Manager runs in the same content-script realm as
// the Panel's React root, so this singleton store is shared between them: a
// plugin registering a page here re-renders the open Panel.

import { create } from 'zustand'
import type { PanelPageDef } from '../ui/panel/pages'

interface PanelPagesState {
  pages: PanelPageDef[]
  // Add a page; returns an unregister function that removes exactly this entry.
  // A later registration with the same id won't be removed by an earlier
  // unregister, so plugin reloads stay correct.
  register: (def: PanelPageDef) => () => void
}

export const usePanelPages = create<PanelPagesState>((set) => ({
  pages: [],
  register: (def) => {
    // Replace any existing page with the same id so a re-register can't leave a
    // duplicate (React would also warn on the repeated key).
    set((state) => ({ pages: [...state.pages.filter((p) => p.id !== def.id), def] }))
    return () => set((state) => ({ pages: state.pages.filter((p) => p !== def) }))
  },
}))
