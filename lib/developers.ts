import bcrypt from 'bcryptjs'
import type { DeveloperAssignment } from '@/lib/assignments'
import { getDevelopersPrisma } from '@/lib/prisma-developers'

// Developer passwords were historically stored in plaintext. This comparison
// accepts BOTH a bcrypt hash and a legacy plaintext value, so hashing the
// stored passwords (via a migration) is a drop-in upgrade that does not change
// login behaviour for rows that are still plaintext.
function looksHashed(value: string): boolean {
  return typeof value === 'string' && /^\$2[aby]\$/.test(value)
}

async function developerPasswordMatches(plain: string, stored: string): Promise<boolean> {
  if (!stored) return false
  if (looksHashed(stored)) {
    try {
      return await bcrypt.compare(plain, stored)
    } catch {
      return false
    }
  }
  return stored === plain
}

type DbDeveloper = {
  id: number
  email: string
  password: string
  name?: string | null
  avatarUrl?: string | null
  role?: string | null
  wikiSlugs?: any
  lessonIds?: any
}

const developerBaseSelect = {
  id: true,
  email: true,
  password: true,
  name: true,
  role: true,
  wikiSlugs: true,
  lessonIds: true,
} as const

function isLocalNoDbMode() {
  return process.env.NODE_ENV !== 'production' && process.env.USE_DB !== 'true'
}

function getLocalDeveloper(): DeveloperAssignment {
  return {
    id: process.env.LOCAL_DEV_ID || 'local-dev',
    email: process.env.LOCAL_DEV_EMAIL || 'info@robogeex.com',
    name: process.env.LOCAL_DEV_NAME || 'Local Developer',
    role: 'superadmin',
    wikiSlugs: [],
    lessonIds: [],
  }
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
    avatarUrl: row.avatarUrl || null,
    role: (row.role || undefined) as any,
    wikiSlugs,
    lessonIds,
  }
}

async function addAvatarIfColumnExists(prisma: ReturnType<typeof getDevelopersPrisma>, row: DbDeveloper | null): Promise<DbDeveloper | null> {
  if (!row?.id) return row
  try {
    const result = await prisma.$queryRawUnsafe<Array<{ avatarUrl: string | null }>>(
      'SELECT `avatarUrl` FROM `Developer` WHERE `id` = ? LIMIT 1',
      row.id,
    )
    return { ...row, avatarUrl: result[0]?.avatarUrl ?? null }
  } catch {
    return { ...row, avatarUrl: null }
  }
}

export async function findDeveloperByCredentials(email: string, password: string): Promise<DeveloperAssignment | undefined> {
  const normalizedEmail = (email || '').trim().toLowerCase()
  const normalizedPassword = (password || '').trim()
  if (!normalizedEmail || !normalizedPassword) return undefined

  if (isLocalNoDbMode()) {
    const localDev = getLocalDeveloper()
    const expectedPassword = process.env.LOCAL_DEV_PASSWORD?.trim()
    const passwordMatches = expectedPassword ? normalizedPassword === expectedPassword : true
    return normalizedEmail === localDev.email?.toLowerCase() && passwordMatches ? localDev : undefined
  }

  const prisma = getDevelopersPrisma()
  const baseRow = await prisma.developer.findUnique({
    where: { email: normalizedEmail },
    select: developerBaseSelect,
  })
  const row = await addAvatarIfColumnExists(prisma, baseRow as unknown as DbDeveloper | null)
  if (row && (await developerPasswordMatches(normalizedPassword, row.password))) {
    return normalizeDbDeveloper(row as unknown as DbDeveloper)
  }
  return undefined
}

export async function findDeveloperById(id: string): Promise<DeveloperAssignment | undefined> {
  const trimmed = (id || '').trim()
  if (!trimmed) return undefined

  if (isLocalNoDbMode()) {
    const localDev = getLocalDeveloper()
    return trimmed === localDev.id || trimmed.toLowerCase() === localDev.email?.toLowerCase() ? localDev : undefined
  }

  const prisma = getDevelopersPrisma()
  const numericId = Number(trimmed)
  const baseRow = Number.isFinite(numericId)
    ? await prisma.developer.findUnique({ where: { id: numericId }, select: developerBaseSelect })
    : await prisma.developer.findUnique({ where: { email: trimmed.toLowerCase() }, select: developerBaseSelect })
  const row = await addAvatarIfColumnExists(prisma, baseRow as unknown as DbDeveloper | null)
  if (row) return normalizeDbDeveloper(row as unknown as DbDeveloper)
  return undefined
}
