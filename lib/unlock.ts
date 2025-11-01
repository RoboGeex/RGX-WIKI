export function getUnlockKey() {
  if (typeof window === 'undefined') return ''
  return `unlocked:${location.host}`
}

export function isUnlocked() {
  if (typeof window === 'undefined') return false

  const key = getUnlockKey()
  if (!key) return false

  try {
    if (window.localStorage.getItem(key) === 'true') {
      return true
    }
  } catch (err) {
    console.warn('Failed to read unlock key from localStorage', err)
  }

  const hasCookie = typeof document !== 'undefined'
    ? /(?:^|;\s*)wiki-[^=]+-unlocked=true/.test(document.cookie)
    : false

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
