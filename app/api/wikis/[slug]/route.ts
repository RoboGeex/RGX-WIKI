import { NextResponse } from 'next/server'
import path from 'path'
import { promises as fs } from 'fs'
import { getPrisma } from '@/lib/prisma-multi'
import { findDeveloperById } from '@/lib/developers'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// ── Auth ──────────────────────────────────────────────────────────────────────

function getActorId(req: Request): string | undefined {
  const h = (req as any)?.headers as Headers | undefined
  if (!h) return undefined
  const raw =
    h.get('x-user-id') ||
    h.get('x-actor-id') ||
    h.get('x-developer-id') ||
    h.get('x-dev-id')
  return raw ? raw.trim() || undefined : undefined
}

// ── DB helpers ────────────────────────────────────────────────────────────────

function isReadOnlyFsError(err: any): boolean {
  const code = typeof err?.code === 'string' ? err.code : ''
  const msg = typeof err?.message === 'string' ? err.message.toLowerCase() : ''
  return code === 'EROFS' || msg.includes('read-only file system')
}

const wikiColumnsEnsured = new WeakSet<object>()

async function ensureWikiColumns(): Promise<void> {
  const prisma: any = getPrisma()
  if (wikiColumnsEnsured.has(prisma)) return
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS Wiki (
      slug VARCHAR(191) NOT NULL,
      displayName VARCHAR(255) NOT NULL,
      grade VARCHAR(191) NULL,
      picture TEXT NULL,
      isPublished BOOLEAN NOT NULL DEFAULT TRUE,
      domains JSON NULL,
      defaultLocale VARCHAR(16) NULL,
      defaultLessonSlug VARCHAR(191) NULL,
      resourcesUrl VARCHAR(255) NULL,
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (slug)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  `)
  for (const ddl of [
    'ALTER TABLE Wiki ADD COLUMN IF NOT EXISTS isPublished BOOLEAN NOT NULL DEFAULT TRUE;',
    'ALTER TABLE Wiki ADD COLUMN IF NOT EXISTS scheduledDeletionAt DATETIME(3) NULL;',
  ]) {
    try { await prisma.$executeRawUnsafe(ddl) } catch { /* already exists */ }
  }
  wikiColumnsEnsured.add(prisma)
}

async function readWikiFromFile(slug: string): Promise<any | null> {
  const filePath = path.join(process.cwd(), 'data', 'wikis.json')
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    const wikis = JSON.parse(raw)
    return Array.isArray(wikis) ? (wikis.find((w: any) => w?.slug === slug) ?? null) : null
  } catch {
    return null
  }
}

async function patchFileWiki(slug: string, fields: Record<string, unknown>): Promise<void> {
  const filePath = path.join(process.cwd(), 'data', 'wikis.json')
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    const wikis: any[] = JSON.parse(raw)
    await fs.writeFile(
      filePath,
      JSON.stringify(wikis.map((w) => (w.slug === slug ? { ...w, ...fields } : w)), null, 2),
      'utf-8',
    )
  } catch (err: any) {
    if (isReadOnlyFsError(err)) return
    console.warn('[wiki route] file sync skipped:', err?.message)
  }
}

type WikiUpdates = {
  isPublished?: boolean
  displayName?: string
  picture?: string
  scheduledDeletionAt?: Date | null
}

/**
 * Apply updates to an existing Wiki row.
 * If the row doesn't exist yet, seeds it from wikis.json then applies the updates.
 * Returns the number of rows affected (> 0 means success).
 */
async function applyWikiUpdates(slug: string, updates: WikiUpdates): Promise<number> {
  const prisma: any = getPrisma()
  let affected = 0

  if (updates.isPublished !== undefined) {
    affected = Math.max(
      affected,
      Number(await prisma.$executeRaw`UPDATE Wiki SET isPublished = ${updates.isPublished} WHERE slug = ${slug}`),
    )
  }
  if (updates.displayName !== undefined) {
    affected = Math.max(
      affected,
      Number(await prisma.$executeRaw`UPDATE Wiki SET displayName = ${updates.displayName} WHERE slug = ${slug}`),
    )
  }
  if (updates.picture !== undefined) {
    affected = Math.max(
      affected,
      Number(await prisma.$executeRaw`UPDATE Wiki SET picture = ${updates.picture} WHERE slug = ${slug}`),
    )
  }
  if ('scheduledDeletionAt' in updates) {
    affected = Math.max(
      affected,
      updates.scheduledDeletionAt === null
        ? Number(await prisma.$executeRawUnsafe('UPDATE Wiki SET scheduledDeletionAt = NULL WHERE slug = ?', slug))
        : Number(await prisma.$executeRaw`UPDATE Wiki SET scheduledDeletionAt = ${updates.scheduledDeletionAt} WHERE slug = ${slug}`),
    )
  }

  if (affected > 0) return affected

  // Row doesn't exist — insert from file then update
  const fileWiki = await readWikiFromFile(slug)
  if (!fileWiki) return 0

  await prisma.$executeRaw`
    INSERT INTO Wiki (
      slug, displayName, grade, picture, isPublished,
      domains, defaultLocale, defaultLessonSlug, resourcesUrl, createdAt
    ) VALUES (
      ${fileWiki.slug},
      ${updates.displayName ?? fileWiki.displayName ?? fileWiki.slug},
      ${fileWiki.grade ?? null},
      ${updates.picture ?? fileWiki.picture ?? null},
      ${updates.isPublished ?? fileWiki.isPublished ?? true},
      ${JSON.stringify(fileWiki.domains || [])},
      ${fileWiki.defaultLocale ?? 'en'},
      ${fileWiki.defaultLessonSlug ?? 'getting-started'},
      ${fileWiki.resourcesUrl ?? '/resources'},
      ${new Date(fileWiki.createdAt || new Date().toISOString())}
    )
    ON DUPLICATE KEY UPDATE
      displayName = VALUES(displayName),
      grade       = VALUES(grade),
      picture     = VALUES(picture),
      isPublished = VALUES(isPublished),
      domains     = VALUES(domains),
      defaultLocale      = VALUES(defaultLocale),
      defaultLessonSlug  = VALUES(defaultLessonSlug),
      resourcesUrl       = VALUES(resourcesUrl)
  `
  return 1
}

/** Upload a wiki cover picture to GCS and persist it as an asset row. */
async function savePictureForWiki(picture: File, wikiSlug: string): Promise<string> {
  const bytes = await picture.arrayBuffer()
  const buf = Buffer.from(bytes)
  const safeName = (picture.name || 'wiki-picture').replace(/[^a-zA-Z0-9._-]/g, '_')
  const filename = `${Date.now()}-${safeName}`
  const prisma: any = getPrisma(wikiSlug)

  const saved = await prisma.asset.create({
    data: {
      wikiSlug,
      filename,
      mimeType: picture.type || 'application/octet-stream',
      size: buf.length,
    },
  })

  try {
    const { writeAssetToGcs } = await import('@/lib/gcs-assets')
    await writeAssetToGcs({
      wikiSlug,
      assetId: saved.id,
      filename,
      mimeType: picture.type || 'application/octet-stream',
      buffer: buf,
    })
  } catch (gcsErr) {
    await prisma.asset.delete({ where: { id: saved.id } }).catch(() => {})
    throw gcsErr
  }

  return `/api/upload/${saved.id}`
}

// ── PATCH /api/wikis/[slug] ───────────────────────────────────────────────────
//
//  Accepts two content-types:
//    • multipart/form-data  { picture: File }          → replace cover picture
//    • application/json     { isPublished?, displayName? } → update meta fields

export async function PATCH(
  req: Request,
  { params }: { params: { slug: string } },
) {
  try {
    const slug = (params.slug || '').trim()
    if (!slug) return NextResponse.json({ error: 'Wiki slug is required' }, { status: 400 })

    await ensureWikiColumns()

    const contentType = req.headers.get('content-type') || ''

    // ── Picture upload ──────────────────────────────────────────────────────
    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData()
      const picture = form.get('picture') as File | null
      if (!picture || picture.size === 0) {
        return NextResponse.json({ error: 'No picture provided' }, { status: 400 })
      }
      const pictureUrl = await savePictureForWiki(picture, slug)
      await applyWikiUpdates(slug, { picture: pictureUrl })
      await patchFileWiki(slug, { picture: pictureUrl })
      return NextResponse.json({ ok: true, slug, picture: pictureUrl })
    }

    // ── JSON update ─────────────────────────────────────────────────────────
    const body = await req.json().catch(() => ({}))
    const updates: WikiUpdates = {}
    const fileUpdates: Record<string, unknown> = {}

    if ('isPublished' in body) {
      updates.isPublished = Boolean(body.isPublished)
      fileUpdates.isPublished = updates.isPublished
    }
    if (typeof body.displayName === 'string' && body.displayName.trim()) {
      updates.displayName = body.displayName.trim()
      fileUpdates.displayName = updates.displayName
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const result = await applyWikiUpdates(slug, updates)
    if (!result) return NextResponse.json({ error: 'Wiki not found' }, { status: 404 })

    await patchFileWiki(slug, fileUpdates)
    return NextResponse.json({ ok: true, slug, ...updates })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to update wiki' }, { status: 500 })
  }
}

// ── DELETE /api/wikis/[slug] ──────────────────────────────────────────────────
//
//  Superadmin only.
//    • No body / {}           → schedule deletion 7 days out, unpublish immediately
//    • { undo: true }         → cancel scheduled deletion, restore published state

export async function DELETE(
  req: Request,
  { params }: { params: { slug: string } },
) {
  try {
    const slug = (params.slug || '').trim()
    if (!slug) return NextResponse.json({ error: 'Wiki slug is required' }, { status: 400 })

    const actorId = getActorId(req)
    if (!actorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const actor = await findDeveloperById(actorId)
    if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (actor.role !== 'superadmin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    await ensureWikiColumns()

    const body = await req.json().catch(() => ({}))

    // ── Undo deletion ───────────────────────────────────────────────────────
    if (body?.undo === true) {
      await applyWikiUpdates(slug, { scheduledDeletionAt: null, isPublished: true })
      await patchFileWiki(slug, { isPublished: true })
      return NextResponse.json({ ok: true, slug, undone: true })
    }

    // ── Schedule deletion ───────────────────────────────────────────────────
    const scheduledDeletionAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    await applyWikiUpdates(slug, { scheduledDeletionAt, isPublished: false })
    await patchFileWiki(slug, { isPublished: false })

    return NextResponse.json({
      ok: true,
      slug,
      scheduledDeletionAt: scheduledDeletionAt.toISOString(),
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to process deletion' }, { status: 500 })
  }
}
