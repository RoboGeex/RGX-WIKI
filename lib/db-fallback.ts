const globalForDbFallback = globalThis as unknown as {
  dbBypassUntil?: Map<string, number>
}

function getBypassState() {
  if (!globalForDbFallback.dbBypassUntil) {
    globalForDbFallback.dbBypassUntil = new Map<string, number>()
  }
  return globalForDbFallback.dbBypassUntil
}

function normalizeKey(wikiSlug?: string | null) {
  const normalized = (wikiSlug || '').trim().toLowerCase()
  return normalized || '__default__'
}

function getSafeMs(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value || '', 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return parsed
}

export function getDbQueryTimeoutMs() {
  return getSafeMs(process.env.DB_QUERY_TIMEOUT_MS, 10000)
}

export function getDbBypassTtlMs() {
  return getSafeMs(process.env.DB_BYPASS_TTL_MS, 60000)
}

export function shouldBypassDb(wikiSlug?: string | null) {
  const key = normalizeKey(wikiSlug)
  const state = getBypassState()
  const until = state.get(key)
  if (!until) return false
  if (until <= Date.now()) {
    state.delete(key)
    return false
  }
  return true
}

export function markDbFailure(wikiSlug?: string | null) {
  const key = normalizeKey(wikiSlug)
  const state = getBypassState()
  state.set(key, Date.now() + getDbBypassTtlMs())
}

export function markDbSuccess(wikiSlug?: string | null) {
  const key = normalizeKey(wikiSlug)
  const state = getBypassState()
  state.delete(key)
}

export async function withDbTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs = getDbQueryTimeoutMs(),
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      operation(),
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`Database operation timed out after ${timeoutMs}ms`))
        }, timeoutMs)
      }),
    ])
  } finally {
    if (timer) {
      clearTimeout(timer)
    }
  }
}
