// Collects a debug snapshot of Marhiv + the host page, for the Dev page's
// "Export state" button. The point is to make the invisible visible when a
// plugin "runs" but has no effect: it reports whether each plugin's CSS reached
// the page AND what the host site actually exposes (its real CSS custom
// properties and computed colors), so theme issues can be diagnosed from the
// dump instead of guessed at.
//
// It reads only styling/metadata — never chat or message content.
//
// Note the import cycle this closes: registry → marhiv-dev → DevPage → snapshot
// → registry/manager. It's safe because `BUILTIN_PLUGINS` and `isEnabled` are
// only read at call time (inside collectDebugState), by which point every module
// has finished initializing — ES live bindings resolve them correctly.

import { loadPluginStates, type PluginStates } from '../../../storage/plugins'
import { PLUGIN_STYLE_ATTR } from '../../context'
import { BUILTIN_PLUGINS } from '../../registry'
import { isEnabled } from '../../manager'

interface ColorReadout {
  backgroundColor: string
  color: string
}

export interface DebugState {
  marhiv: { version: string; capturedAt: string }
  page: {
    href: string
    userAgent: string
    htmlClass: string
    htmlData: Record<string, string>
    colorScheme: string
    prefersDark: boolean
  }
  pluginStates: PluginStates
  plugins: Array<{
    id: string
    matches: string[]
    defaultEnabled: boolean
    enabled: boolean
    // Whether this plugin's injected <style> is present on the page right now.
    styleInjected: boolean
    styleChars: number
  }>
  host: {
    rootCustomPropCount: number
    // Subset whose name hints at color/theme, surfaced for quick scanning.
    accentishProps: Record<string, string>
    // Every custom property the host declares on :root/html/body.
    rootCustomProps: Record<string, string>
    computed: {
      html: ColorReadout | null
      body: ColorReadout | null
      link: ColorReadout | null
    }
    // The page's structural surfaces (the chrome around the main content), each
    // with its tag/class and computed background — to see which read differently
    // from the canvas and find a class hook when no token drives them.
    surfaces: Array<{
      selector: string
      tag: string
      className: string
      backgroundColor: string
    }>
    // Claude's semantic surface/text token family (--bg-*, --border-*, --text-*,
    // --surface-*, --t1/2/3, …), resolved to their active values. These live in
    // mode-scoped rules (e.g. [data-mode="dark"]) that the :root-only scan above
    // misses, and are what actually drives surfaces like the sidebar.
    semanticTokens: Record<string, string>
  }
}

// Does any selector in a (possibly comma-separated) selectorText target the
// document root, where sites declare their theme custom properties?
function isRootRule(selectorText: string): boolean {
  return selectorText.split(',').some((part) => {
    const sel = part.trim()
    return sel === ':root' || sel === 'html' || sel === 'body' || sel.startsWith(':root')
  })
}

// Visit every CSSStyleRule in the host's same-origin stylesheets, descending
// into grouping rules (@media, @supports). Skips Marhiv's own injected styles
// and cross-origin sheets (whose `cssRules` access throws).
function forEachHostStyleRule(fn: (rule: CSSStyleRule) => void): void {
  const walk = (rules: CSSRuleList): void => {
    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSStyleRule) fn(rule)
      else if (rule instanceof CSSGroupingRule) walk(rule.cssRules)
    }
  }
  for (const sheet of Array.from(document.styleSheets)) {
    const owner = sheet.ownerNode
    if (owner instanceof Element && owner.hasAttribute(PLUGIN_STYLE_ATTR)) continue
    try {
      walk(sheet.cssRules)
    } catch {
      // cross-origin: rules are not readable
    }
  }
}

// Harvest the host's own CSS custom properties declared on the document root,
// resolved to their computed values. Capped so the dump stays a reasonable size.
function collectHostCustomProps(limit = 1500): Record<string, string> {
  const props: Record<string, string> = {}
  const root = getComputedStyle(document.documentElement)
  forEachHostStyleRule((rule) => {
    if (!isRootRule(rule.selectorText)) return
    for (let i = 0; i < rule.style.length; i++) {
      const name = rule.style[i]
      if (!name.startsWith('--') || name in props || Object.keys(props).length >= limit) continue
      props[name] = root.getPropertyValue(name).trim() || rule.style.getPropertyValue(name).trim()
    }
  })
  return props
}

function computedColors(selector: string): ColorReadout | null {
  const el = document.querySelector(selector)
  if (!el) return null
  const cs = getComputedStyle(el)
  return { backgroundColor: cs.backgroundColor, color: cs.color }
}

// Structural surfaces worth comparing — the chrome around the main content.
const SURFACE_SELECTORS = [
  'nav',
  'aside',
  'header',
  'main',
  '[role="navigation"]',
  '[role="complementary"]',
  '[role="banner"]',
]

function collectSurfaces(): DebugState['host']['surfaces'] {
  const out: DebugState['host']['surfaces'] = []
  for (const selector of SURFACE_SELECTORS) {
    const el = document.querySelector(selector)
    if (!el) continue
    out.push({
      selector,
      tag: el.tagName.toLowerCase(),
      className: el.getAttribute('class') ?? '',
      backgroundColor: getComputedStyle(el).backgroundColor,
    })
  }
  return out
}

// Harvest Claude's semantic surface/text tokens (whatever selector defines them,
// including mode-scoped ones), resolved to their active values at the root.
const SEMANTIC_TOKEN_RE = /^--(bg|border|text|surface|fill|on|accent|ui|t\d)/i

function collectSemanticTokens(limit = 500): Record<string, string> {
  const out: Record<string, string> = {}
  const root = getComputedStyle(document.documentElement)
  forEachHostStyleRule((rule) => {
    for (let i = 0; i < rule.style.length; i++) {
      const name = rule.style[i]
      if (!name.startsWith('--') || !SEMANTIC_TOKEN_RE.test(name) || name in out) continue
      if (Object.keys(out).length >= limit) continue
      out[name] = root.getPropertyValue(name).trim() || rule.style.getPropertyValue(name).trim()
    }
  })
  return out
}

export async function collectDebugState(): Promise<DebugState> {
  const states = (await loadPluginStates()) ?? {}

  // Index injected <style> elements by the plugin that owns them.
  const styleByPlugin = new Map<string, HTMLStyleElement>()
  for (const node of document.querySelectorAll<HTMLStyleElement>(`style[${PLUGIN_STYLE_ATTR}]`)) {
    const id = node.getAttribute(PLUGIN_STYLE_ATTR)
    if (id) styleByPlugin.set(id, node)
  }

  const rootCustomProps = collectHostCustomProps()
  const accentishProps = Object.fromEntries(
    Object.entries(rootCustomProps).filter(([name]) =>
      /accent|colou?r|bg|background|text|brand|primary|surface|theme/i.test(name),
    ),
  )

  return {
    marhiv: {
      version: chrome.runtime.getManifest().version,
      capturedAt: new Date().toISOString(),
    },
    page: {
      href: location.href,
      userAgent: navigator.userAgent,
      htmlClass: document.documentElement.className,
      htmlData: Object.fromEntries(
        Object.entries(document.documentElement.dataset).filter(
          (entry): entry is [string, string] => entry[1] !== undefined,
        ),
      ),
      colorScheme: getComputedStyle(document.documentElement).getPropertyValue('color-scheme'),
      prefersDark: matchMedia('(prefers-color-scheme: dark)').matches,
    },
    pluginStates: states,
    plugins: BUILTIN_PLUGINS.map((plugin) => {
      const node = styleByPlugin.get(plugin.meta.id)
      return {
        id: plugin.meta.id,
        matches: plugin.meta.matches,
        defaultEnabled: plugin.meta.defaultEnabled ?? false,
        enabled: isEnabled(plugin, states),
        styleInjected: node !== undefined,
        styleChars: node?.textContent?.length ?? 0,
      }
    }),
    host: {
      rootCustomPropCount: Object.keys(rootCustomProps).length,
      accentishProps,
      rootCustomProps,
      computed: {
        html: computedColors(':root'),
        body: computedColors('body'),
        link: computedColors('a[href]'),
      },
      surfaces: collectSurfaces(),
      semanticTokens: collectSemanticTokens(),
    },
  }
}
