// Minimal ambient types for the native URLPattern API (Chromium ≥95), which
// TypeScript's DOM lib does not yet ship. Covers only the surface Marhiv uses;
// extend as needed. Spec: https://developer.mozilla.org/en-US/docs/Web/API/URLPattern

interface URLPatternInit {
  protocol?: string
  username?: string
  password?: string
  hostname?: string
  port?: string
  pathname?: string
  search?: string
  hash?: string
  baseURL?: string
}

interface URLPatternComponentResult {
  input: string
  groups: Record<string, string | undefined>
}

interface URLPatternResult {
  inputs: [string | URLPatternInit]
  protocol: URLPatternComponentResult
  username: URLPatternComponentResult
  password: URLPatternComponentResult
  hostname: URLPatternComponentResult
  port: URLPatternComponentResult
  pathname: URLPatternComponentResult
  search: URLPatternComponentResult
  hash: URLPatternComponentResult
}

declare class URLPattern {
  constructor(init?: URLPatternInit | string, baseURL?: string)
  test(input?: URLPatternInit | string, baseURL?: string): boolean
  exec(input?: URLPatternInit | string, baseURL?: string): URLPatternResult | null
}
