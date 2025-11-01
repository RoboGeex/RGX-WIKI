const STORAGE_PREFIX = 'unlocked-v2'
const LEGACY_STORAGE_PREFIX = 'unlocked'

function buildStorageKey(prefix: string) {
  if (typeof window === 'undefined') return ''
  return `${prefix}:${location.host}`
}

export function getUnlockKey() {
  if (typeof window === 'undefined') return ''
  return buildStorageKey(STORAGE_PREFIX)
}

export function isUnlocked() {
  if (typeof window === 'undefined') return false

  const key = getUnlockKey()
  if (!key) return false

  const legacyKey = buildStorageKey(LEGACY_STORAGE_PREFIX)

  try {
    if (legacyKey && window.localStorage.getItem(legacyKey) !== null) {
      window.localStorage.removeItem(legacyKey)
    }
    if (window.localStorage.getItem(key) === 'true') {
      return true
    }
  } catch (err) {
    console.warn('Failed to read unlock key from localStorage', err)
  }

  if (typeof document !== 'undefined') {
    const legacyCookieMatch = document.cookie.match(/(?:^|;\s*)(wiki-[^=]+-unlocked)=true/)
    if (legacyCookieMatch && legacyCookieMatch[1]) {
      document.cookie = `${legacyCookieMatch[1]}=; Max-Age=0; path=/`
    }
  }

  const cookieMatch = typeof document !== 'undefined'
    ? document.cookie.match(/(?:^|;\s*)(wiki-[^=]+-access)=true/)
    : null
  const hasCookie = Boolean(cookieMatch)

  if (hasCookie) {
    try {
      window.localStorage.setItem(key, 'true')
    } catch (err) {
      console.warn('Failed to persist unlock state in localStorage', err)
    }
    return true
  }

  return false
}

export function setUnlocked(v: boolean) {
  if (typeof window === 'undefined') return

  const key = getUnlockKey()
  if (!key) return

  const legacyKey = buildStorageKey(LEGACY_STORAGE_PREFIX)
  if (legacyKey) {
    try {
      window.localStorage.removeItem(legacyKey)
    } catch (err) {
      console.warn('Failed to remove legacy unlock key from localStorage', err)
    }
  }

  try {
    if (v) {
      window.localStorage.setItem(key, 'true')
    } else {
      window.localStorage.removeItem(key)
    }
  } catch (err) {
    console.warn('Failed to update unlock state in localStorage', err)
  }
}

export function getStoredLocale() {
  if (typeof window === 'undefined') return 'en'
  return localStorage.getItem('locale') || 'en'
}

export function setStoredLocale(locale: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem('locale', locale)
}
