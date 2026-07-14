import { NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma-multi'
import { findDeveloperById } from '@/lib/developers'
import { resolveDeveloperId } from '@/lib/dev-session'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type CategoryRow = {
  id: number
  name: string
  createdBy: string | null
  createdAt: Date | string | null
}

const categoryTableEnsured = new WeakSet<object>()

async function ensureCategoryTable(): Promise<void> {
  const prisma: any = getPrisma()
  if (categoryTableEnsured.has(prisma)) return
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS Category (
      id INT NOT NULL AUTO_INCREMENT,
      name VARCHAR(191) NOT NULL,
      createdBy VARCHAR(191) NULL,
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      UNIQUE KEY Category_name_key (name)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  `)
  categoryTableEnsured.add(prisma)
}

function getActorId(req: Request): string | undefined {
  return resolveDeveloperId(req)
}

function normalizeCategoryName(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.trim().replace(/\s+/g, ' ').slice(0, 64)
}

export async function GET() {
  try {
    await ensureCategoryTable()
    const prisma: any = getPrisma()
    const rows = (await prisma.$queryRawUnsafe(
      `SELECT id, name, createdBy, createdAt FROM Category ORDER BY name ASC`,
    )) as CategoryRow[]
    const list = rows.map((row) => ({
      id: row.id,
      name: row.name,
      createdBy: row.createdBy || null,
      createdAt: row.createdAt
        ? new Date(row.createdAt as any).toISOString()
        : new Date().toISOString(),
    }))
    return NextResponse.json(list)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to load categories' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const actorId = getActorId(req)
    if (!actorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const actor = await findDeveloperById(actorId)
    if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (actor.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden: only superadmins can create categories' }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const name = normalizeCategoryName(body?.name)
    if (!name) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 })
    }

    await ensureCategoryTable()
    const prisma: any = getPrisma()

    const existing = (await prisma.$queryRawUnsafe(
      `SELECT id, name FROM Category WHERE name = ? LIMIT 1`,
      name,
    )) as CategoryRow[]
    if (existing.length > 0) {
      return NextResponse.json({ error: 'A category with this name already exists' }, { status: 409 })
    }

    await prisma.$executeRawUnsafe(
      `INSERT INTO Category (name, createdBy) VALUES (?, ?)`,
      name,
      String(actor.id),
    )

    const inserted = (await prisma.$queryRawUnsafe(
      `SELECT id, name, createdBy, createdAt FROM Category WHERE name = ? LIMIT 1`,
      name,
    )) as CategoryRow[]
    const row = inserted[0]
    return NextResponse.json({
      ok: true,
      category: row
        ? {
            id: row.id,
            name: row.name,
            createdBy: row.createdBy || null,
            createdAt: row.createdAt
              ? new Date(row.createdAt as any).toISOString()
              : new Date().toISOString(),
          }
        : { name },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to create category' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const actorId = getActorId(req)
    if (!actorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const actor = await findDeveloperById(actorId)
    if (!actor || actor.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const url = new URL(req.url)
    const name = normalizeCategoryName(url.searchParams.get('name'))
    if (!name) {
      return NextResponse.json({ error: 'name query param is required' }, { status: 400 })
    }

    await ensureCategoryTable()
    const prisma: any = getPrisma()
    await prisma.$executeRawUnsafe(`DELETE FROM Category WHERE name = ?`, name)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to delete category' }, { status: 500 })
  }
}
