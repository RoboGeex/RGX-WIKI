export function getUnlockKey() {
  if (typeof window === 'undefined') return ''
  return `unlocked:${location.host}`
}

export function isUnlocked() {
  return true
}

export function setUnlocked(v: boolean) {
  if (typeof window === 'undefined') return
  if (v) localStorage.setItem(getUnlockKey(), 'true')
  else localStorage.removeItem(getUnlockKey())
}

export function getStoredLocale() {
  if (typeof window === 'undefined') return 'en'
  return localStorage.getItem('locale') || 'en'
}

export function setStoredLocale(locale: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem('locale', locale)
}
