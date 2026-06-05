// Read-only API client for Claude Code's routine environments.
//
// Environments are ORG-scoped (not per-routine): a routine merely references an
// `environment_id`, while the environments themselves live under the org. The
// native UI only exposes them buried inside a routine's Edit modal — this client
// fetches the same data the page does, so Marhiv can list environments up front.
//
// Requests go to claude.ai with `credentials: 'include'` so the page's auth
// cookies ride along (the extension declares claude.ai in host_permissions, which
// makes these first-party). This module only READS — editing is done by driving
// Claude's own native editor (see drive.ts).

import {
  NET_ORG,
  NET_ORG_REQUEST,
  type NetOrgMessage,
  type NetOrgRequestMessage,
} from '../../../../content/net-protocol'

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${location.origin}${path}`, {
    credentials: 'include',
    headers: { accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`${path} → HTTP ${res.status}`)
  return res.json() as Promise<T>
}

// The org uuid claude.ai last scoped to, from its cookie. The value can be
// URL-encoded and/or quoted, so it's decoded and unquoted before use.
function orgIdFromCookie(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)lastActiveOrg=([^;]+)/)
  if (!match) return null
  return (
    decodeURIComponent(match[1])
      .replace(/^"+|"+$/g, '')
      .trim() || null
  )
}

interface Organization {
  uuid: string
}

// Ask the MAIN-world network bridge for the org uuid it sniffed from the page's
// own API calls. This is the most reliable source — it's literally the org the
// page is using — needing no cookie-name or endpoint guesses. Resolves null if
// the bridge hasn't seen an org-scoped request yet (or isn't present).
function orgIdFromBridge(timeoutMs = 2500): Promise<string | null> {
  return new Promise((resolve) => {
    const onMessage = (event: MessageEvent): void => {
      if (event.source !== window) return
      const data = event.data as Partial<NetOrgMessage> | null
      if (data?.source === NET_ORG && data.orgId) {
        cleanup()
        resolve(data.orgId)
      }
    }
    const cleanup = (): void => {
      window.removeEventListener('message', onMessage)
      clearTimeout(timer)
    }
    const timer = setTimeout(() => {
      cleanup()
      resolve(null)
    }, timeoutMs)
    window.addEventListener('message', onMessage)
    const request: NetOrgRequestMessage = { source: NET_ORG_REQUEST }
    window.postMessage(request, location.origin)
  })
}

// The active org uuid. Prefer what the bridge sniffed from the live page; fall
// back to the (de-quoted) cookie, then to the account's org list — tolerating a
// bare array or a `{ data: [...] }` envelope.
async function resolveOrgId(): Promise<string> {
  const sniffed = await orgIdFromBridge()
  if (sniffed) return sniffed

  const fromCookie = orgIdFromCookie()
  if (fromCookie) return fromCookie

  const body = await getJson<Organization[] | { data: Organization[] }>('/api/organizations')
  const orgs = Array.isArray(body) ? body : (body.data ?? [])
  const resolved = orgs[0]?.uuid
  if (!resolved) throw new Error('no organization found for this account')
  return resolved
}

// One environment, as the list endpoint returns it (the subset we need).
export interface EnvironmentSummary {
  environment_id: string
  name: string
}

interface EnvironmentsResponse {
  environments: EnvironmentSummary[]
}

// Every environment in the org. Throws on a failed request; the caller surfaces
// the message to the user.
export async function fetchEnvironments(): Promise<EnvironmentSummary[]> {
  const org = await resolveOrgId()
  const data = await getJson<EnvironmentsResponse>(
    `/v1/environment_providers/private/organizations/${org}/environments`,
  )
  return data.environments ?? []
}

// One routine trigger (the subset we need to navigate to its detail page).
export interface RoutineSummary {
  id: string
  name: string
}

interface TriggersResponse {
  data: RoutineSummary[]
}

// The first routine in the org, used purely as the "vehicle" whose Edit modal
// hosts the environment editor. Returns null when the org has no routines (then
// there's no native path to the editor at all).
export async function fetchFirstRoutine(): Promise<RoutineSummary | null> {
  const data = await getJson<TriggersResponse>('/v1/code/triggers?limit=100')
  return data.data?.[0] ?? null
}
