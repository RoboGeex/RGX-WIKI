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
  if (dev.role === 'admin' || dev.role === 'superadmin') return true
  return Boolean(dev.wikiSlugs?.includes(wikiSlug))
}

export function canManageLesson(
  dev: DeveloperAssignment | undefined,
  wikiSlug: string,
  lessonId: string
): boolean {
  if (!dev) return false
  if (canManageWiki(dev, wikiSlug)) return true
  const lessonKeyVariants = [lessonId, `${wikiSlug}:${lessonId}`]
  return Boolean(dev.lessonIds?.some((id) => lessonKeyVariants.includes(id)))
}

export function ensureCanManageLesson(
  dev: DeveloperAssignment | undefined,
  wikiSlug: string,
  lessonId: string
): void {
  if (!canManageLesson(dev, wikiSlug, lessonId)) {
    const err = new Error('Not authorized to manage this lesson')
    ;(err as any).status = 403
    throw err
  }
}
