const STORAGE_KEY = 'rgx.devId'

export function getDeveloperId(): string | undefined {
  if (typeof window !== 'undefined') {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored && stored.trim()) return stored.trim()
  }
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_DEVELOPER_ID) {
    const envId = process.env.NEXT_PUBLIC_DEVELOPER_ID.trim()
    if (envId) return envId
  }
  return undefined
}

export function applyDeveloperHeader(headers: HeadersInit = {}): HeadersInit {
  const devId = getDeveloperId()
  if (!devId) return headers

  const entries: Record<string, string> = {
    'x-developer-id': devId,
  }

  if (Array.isArray(headers)) {
    return [...headers, ...Object.entries(entries)]
  }

  if (headers instanceof Headers) {
    const clone = new Headers(headers)
    Object.entries(entries).forEach(([k, v]) => clone.set(k, v))
    return clone
  }

  return { ...headers, ...entries }
}

export function rememberDeveloperId(value: string) {
  if (typeof window === 'undefined') return
  if (!value || !value.trim()) return
  window.localStorage.setItem(STORAGE_KEY, value.trim())
}

export function ensureDeveloperId(promptIfMissing = true): string | undefined {
  const existing = getDeveloperId()
  if (existing) return existing
  if (!promptIfMissing || typeof window === 'undefined') return undefined
  const prompted = window.prompt('Enter your developer ID (saved locally for future edits):')
  if (prompted && prompted.trim()) {
    const normalized = prompted.trim()
    rememberDeveloperId(normalized)
    return normalized
  }
  return undefined
}
