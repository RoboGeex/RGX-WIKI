import fs from 'fs'
import os from 'os'
import path from 'path'

export type DeveloperRole = 'superadmin' | 'admin' | 'owner' | 'editor'

export interface DeveloperAssignment {
  id: string
  email?: string
  name?: string
  role?: DeveloperRole
  wikiSlugs?: string[]
  lessonIds?: string[]
  password?: string
}

function loadJsonFile<T>(file: string, fallback: T): T {
  const tmpPath = path.join(os.tmpdir(), file)
  const repoPath = path.join(process.cwd(), 'data', file)
  for (const p of [tmpPath, repoPath]) {
    try {
      const raw = fs.readFileSync(p, 'utf-8')
      return JSON.parse(raw) as T
    } catch {
      // ignore and continue to next path
    }
  }
  return fallback
}

export function getDevelopers(): DeveloperAssignment[] {
  return loadJsonFile<DeveloperAssignment[]>('developers.json', [])
}

export function getDeveloperById(id?: string | null): DeveloperAssignment | undefined {
  if (!id) return undefined
  return getDevelopers().find((dev) => dev.id === id)
}

export function canManageWiki(dev: DeveloperAssignment | undefined, wikiSlug: string): boolean {
  if (!dev) return false
  if (dev.role === 'superadmin') return true
  // Both admin and editor only have access to wikis assigned to them
  return Boolean(dev.wikiSlugs?.includes(wikiSlug))
}

export function canEditLesson(
  dev: DeveloperAssignment | undefined,
  wikiSlug: string,
  lessonOwnerId: string | null | undefined
): boolean {
  if (!dev) return false
  if (dev.role === 'superadmin') return true
  
  if (!canManageWiki(dev, wikiSlug)) return false

  if (dev.role === 'admin') {
    return true // Admin can edit all lessons in assigned wikis
  }

  // Editor can only edit their own lessons
  if (dev.role === 'editor') {
    if (!lessonOwnerId) return true // Allow if lesson has no owner (for backwards compatibility/adoption)
    return dev.id === lessonOwnerId
  }

  return false
}

export function canDeleteLesson(dev: DeveloperAssignment | undefined): boolean {
  if (!dev) return false
  return dev.role === 'superadmin'
}

export function ensureCanManageLesson(
  dev: DeveloperAssignment | undefined,
  wikiSlug: string,
  lessonOwnerId: string | null | undefined
): void {
  if (!canEditLesson(dev, wikiSlug, lessonOwnerId)) {
    const err = new Error('Not authorized to edit this lesson')
    ;(err as any).status = 403
    throw err
  }
}
