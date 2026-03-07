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
    const stored = window.localStorage.getItem(key)
    if (stored && stored !== 'false') {
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
    ? document.cookie.match(/(?:^|;\s*)(wiki-[^=]+-access)=([^;]+)/)
    : null
  
  if (cookieMatch && cookieMatch[2]) {
    const code = cookieMatch[2]
    try {
      window.localStorage.setItem(key, code)
    } catch (err) {
      console.warn('Failed to persist unlock state in localStorage', err)
    }
    return true
  }

  return false
}

export function setUnlocked(v: boolean | string) {
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
    if (v === true) {
      window.localStorage.setItem(key, 'true')
    } else if (typeof v === 'string') {
      window.localStorage.setItem(key, v)
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
