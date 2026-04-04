"use client"

export function readSessionStorageJson<T>(key: string): T | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.sessionStorage.getItem(key)
    if (!raw) return null

    const trimmed = raw.trim()
    if (!trimmed) {
      window.sessionStorage.removeItem(key)
      return null
    }

    return JSON.parse(trimmed) as T
  } catch (error) {
    try {
      window.sessionStorage.removeItem(key)
    } catch {}
    console.warn(`Failed to parse sessionStorage key "${key}"`, error)
    return null
  }
}
