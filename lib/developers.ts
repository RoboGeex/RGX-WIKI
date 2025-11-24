import type { DeveloperAssignment } from '@/lib/assignments'
import { getDevelopersPrisma } from '@/lib/prisma-developers'

type DbDeveloper = {
  id: number
  email: string
  password: string
  name?: string | null
  role?: string | null
  wikiSlugs?: any
  lessonIds?: any
}

function normalizeDbDeveloper(row: DbDeveloper): DeveloperAssignment {
  const wikiSlugs = Array.isArray(row.wikiSlugs)
    ? row.wikiSlugs
    : typeof row.wikiSlugs === 'string'
      ? row.wikiSlugs.split(',').map((v) => v.trim()).filter(Boolean)
      : []
  const lessonIds = Array.isArray(row.lessonIds) ? row.lessonIds : []

  return {
    id: row.id ? String(row.id) : row.email,
    email: row.email,
    password: row.password,
    name: row.name || undefined,
    role: (row.role || undefined) as any,
    wikiSlugs,
    lessonIds,
  }
}

export async function findDeveloperByCredentials(email: string, password: string): Promise<DeveloperAssignment | undefined> {
  const normalizedEmail = (email || '').trim().toLowerCase()
  const normalizedPassword = (password || '').trim()
  if (!normalizedEmail || !normalizedPassword) return undefined

  const prisma = getDevelopersPrisma()
  const row = await prisma.developer.findUnique({
    where: { email: normalizedEmail },
  })
  if (row && row.password === normalizedPassword) {
    return normalizeDbDeveloper(row as unknown as DbDeveloper)
  }
  return undefined
}

export async function findDeveloperById(id: string): Promise<DeveloperAssignment | undefined> {
  const trimmed = (id || '').trim()
  if (!trimmed) return undefined

  const prisma = getDevelopersPrisma()
  const numericId = Number(trimmed)
  const row = Number.isFinite(numericId)
    ? await prisma.developer.findUnique({ where: { id: numericId } })
    : await prisma.developer.findUnique({ where: { email: trimmed.toLowerCase() } })
  if (row) return normalizeDbDeveloper(row as unknown as DbDeveloper)
  return undefined
}
