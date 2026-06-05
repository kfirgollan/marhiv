// Turns a live DOM element into a serializable ElementDescriptor for a recording.
//
// The descriptor favors the stable anchors Claude's Slot resolvers already key on
// (aria-*, data-testid, data-row-key, aria-keyshortcuts) so a recorded click maps
// cleanly onto a resolver later, and tags the element with the semantic Slot it
// belongs to when one is live — the bridge between "what I clicked" and the Slots
// engine. The nth-of-type cssPath is a last-resort locator when no anchor exists.

import { matchRoutes } from '../../../../sites/claude'
import { claudeEnhancements } from '../../../../sites/claude/slots'
import { resolveSlot, type SlotKey } from '../../../../enhance/slots'
import type { ElementDescriptor } from './model'

const TEXT_CAP = 80
const PATH_CAP = 12

// Attributes worth keeping verbatim: identity/semantics, not styling. Anything
// starting with these prefixes is kept; these exact names are kept too.
const ATTR_PREFIXES = ['data-', 'aria-']
const ATTR_NAMES = ['role', 'title', 'name', 'type', 'placeholder', 'href', 'alt', 'for']

function collapse(text: string): string {
  const t = text.replace(/\s+/g, ' ').trim()
  return t.length > TEXT_CAP ? `${t.slice(0, TEXT_CAP)}…` : t
}

function collectAttrs(el: Element): Record<string, string> | undefined {
  const attrs: Record<string, string> = {}
  for (const attr of Array.from(el.attributes)) {
    const keep =
      ATTR_NAMES.includes(attr.name) || ATTR_PREFIXES.some((p) => attr.name.startsWith(p))
    if (keep && attr.name !== 'class') attrs[attr.name] = attr.value
  }
  return Object.keys(attrs).length ? attrs : undefined
}

function cssPath(el: Element): string {
  const parts: string[] = []
  let node: Element | null = el
  while (node && parts.length < PATH_CAP) {
    if (node.id) {
      parts.unshift(`#${CSS.escape(node.id)}`)
      break
    }
    const tag = node.tagName.toLowerCase()
    const parent: Element | null = node.parentElement
    if (!parent) {
      parts.unshift(tag)
      break
    }
    const twins = Array.from(parent.children).filter((c) => c.tagName === node!.tagName)
    parts.unshift(twins.length === 1 ? tag : `${tag}:nth-of-type(${twins.indexOf(node) + 1})`)
    node = parent
  }
  return parts.join(' > ')
}

// Every slot currently on the page, across the active routes, with its element.
function liveSlots(): Array<{ key: string; el: Element }> {
  const out: Array<{ key: string; el: Element }> = []
  for (const route of matchRoutes(new URL(location.href))) {
    const registry = claudeEnhancements.slotsForRoute(route)
    if (!registry) continue
    for (const key of Object.keys(registry) as SlotKey[]) {
      const el = resolveSlot(registry, key)
      if (el) out.push({ key, el })
    }
  }
  return out
}

// The innermost slot the element is, or sits within — the most specific match.
function matchSlot(el: Element, slots: Array<{ key: string; el: Element }>): string | undefined {
  const hits = slots.filter((s) => s.el === el || s.el.contains(el))
  if (!hits.length) return undefined
  const innermost = hits.reduce((best, s) =>
    best.el.contains(s.el) && best.el !== s.el ? s : best,
  )
  return innermost.key
}

export function describe(
  el: Element,
  slots: Array<{ key: string; el: Element }> = liveSlots(),
): ElementDescriptor {
  const text = collapse(el.textContent ?? '')
  const classes = el.getAttribute('class')?.split(/\s+/).filter(Boolean)
  return {
    tag: el.tagName.toLowerCase(),
    ...(el.id ? { id: el.id } : {}),
    ...(classes?.length ? { classes } : {}),
    ...(text ? { text } : {}),
    ...(collectAttrs(el) ? { attrs: collectAttrs(el) } : {}),
    cssPath: cssPath(el),
    ...(matchSlot(el, slots) ? { slot: matchSlot(el, slots) } : {}),
  }
}

// Re-export so the recorder can snapshot the live slot map once per batch rather
// than recomputing it for every node.
export { liveSlots }
