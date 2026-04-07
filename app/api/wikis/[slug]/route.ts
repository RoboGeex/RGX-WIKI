import { NextResponse } from 'next/server'
import path from 'path'
import { promises as fs } from 'fs'
import { getPrisma } from '@/lib/prisma-multi'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function isReadOnlyFsError(error: any): boolean {
  const code = typeof error?.code === 'string' ? error.code : ''
  const message = typeof error?.message === 'string' ? error.message.toLowerCase() : ''
  return code === 'EROFS' || message.includes('read-only file system')
}

function getWikiPrisma(slug: string): any {
  try {
    return getPrisma(slug)
  } catch {
    // Fallback to default DB if a per-wiki DB is not configured.
    return getPrisma()
  }
}

async function ensureWikiTable(slug: string): Promise<void> {
  const prisma: any = getWikiPrisma(slug)
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
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE Wiki
      ADD COLUMN IF NOT EXISTS isPublished BOOLEAN NOT NULL DEFAULT TRUE;
    `)
  } catch {
    // Column might already exist or server may not support IF NOT EXISTS.
  }
}

async function updateFileWikiPublishState(slug: string, isPublished: boolean): Promise<void> {
  const filePath = path.join(process.cwd(), 'data', 'wikis.json')
  let wikis: any[] = []
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    wikis = JSON.parse(raw)
  } catch {
    return
  }

  const updated = wikis.map((wiki) =>
    wiki.slug === slug ? { ...wiki, isPublished } : wiki
  )
  try {
    await fs.writeFile(filePath, JSON.stringify(updated, null, 2), 'utf-8')
  } catch (error: any) {
    if (isReadOnlyFsError(error)) {
      // Serverless deployments (for example Vercel) can have read-only filesystems.
      // DB is source of truth, so treat file sync as best effort.
      return
    }
    throw error
  }
}

async function readWikiFromFile(slug: string): Promise<any | null> {
  const filePath = path.join(process.cwd(), 'data', 'wikis.json')
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    const wikis = JSON.parse(raw)
    if (!Array.isArray(wikis)) return null
    return wikis.find((wiki) => wiki?.slug === slug) || null
  } catch {
    return null
  }
}

async function upsertWikiPublishState(slug: string, isPublished: boolean): Promise<number> {
  const prisma: any = getWikiPrisma(slug)
  const updated = await prisma.$executeRaw`
    UPDATE Wiki
    SET isPublished = ${isPublished}
    WHERE slug = ${slug}
  `
  if (Number(updated) > 0) return Number(updated)

  const fileWiki = await readWikiFromFile(slug)
  if (!fileWiki) return 0

  await prisma.$executeRaw`
    INSERT INTO Wiki (
      slug, displayName, grade, picture, isPublished, domains, defaultLocale, defaultLessonSlug, resourcesUrl, createdAt
    ) VALUES (
      ${fileWiki.slug},
      ${fileWiki.displayName || fileWiki.slug},
      ${fileWiki.grade || null},
      ${fileWiki.picture || null},
      ${isPublished},
      ${JSON.stringify(fileWiki.domains || [])},
      ${fileWiki.defaultLocale || 'en'},
      ${fileWiki.defaultLessonSlug || 'getting-started'},
      ${fileWiki.resourcesUrl || '/resources'},
      ${new Date(fileWiki.createdAt || new Date().toISOString())}
    )
    ON DUPLICATE KEY UPDATE
      displayName = VALUES(displayName),
      grade = VALUES(grade),
      picture = VALUES(picture),
      isPublished = VALUES(isPublished),
      domains = VALUES(domains),
      defaultLocale = VALUES(defaultLocale),
      defaultLessonSlug = VALUES(defaultLessonSlug),
      resourcesUrl = VALUES(resourcesUrl)
  `

  return 1
}

export async function PATCH(
  req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = (params.slug || '').trim()
    if (!slug) {
      return NextResponse.json({ error: 'Wiki slug is required' }, { status: 400 })
    }

    const body = await req.json().catch(() => ({}))
    const isPublished = Boolean(body?.isPublished)

    await ensureWikiTable(slug)
    const result = await upsertWikiPublishState(slug, isPublished)

    if (!result || Number(result) === 0) {
      return NextResponse.json({ error: 'Wiki not found' }, { status: 404 })
    }

    await updateFileWikiPublishState(slug, isPublished)
    return NextResponse.json({ ok: true, slug, isPublished })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to update wiki' }, { status: 500 })
  }
}
