function readBooleanEnv(keys: string[], fallback = false): boolean {
  for (const key of keys) {
    const value = (process.env[key] || '').trim().toLowerCase()
    if (!value) continue
    if (value === '1' || value === 'true' || value === 'yes' || value === 'on') return true
    if (value === '0' || value === 'false' || value === 'no' || value === 'off') return false
  }
  return fallback
}

export function isDbOnlyMode(): boolean {
  return readBooleanEnv(['STRICT_DB_ONLY', 'GCP_DB_ONLY', 'DB_ONLY_MODE'], false)
}

export function isRemoteLessonFallbackEnabled(): boolean {
  if (isDbOnlyMode()) return false
  return readBooleanEnv(['ENABLE_REMOTE_LESSON_FALLBACK', 'LESSONS_REMOTE_FALLBACK_ENABLED'], false)
}

