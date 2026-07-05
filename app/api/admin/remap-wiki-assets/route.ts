import { PrismaClient } from '@prisma/client'
import { NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma-multi'
import { writeAssetToGcs } from '@/lib/gcs-assets'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function toInt(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value || '', 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

function authorize(req: Request) {
  const secret = process.env.MIGRATE_ASSETS_SECRET
  if (!secret) return false
  const url = new URL(req.url)
  return (req.headers.get('x-migrate-assets-secret') || url.searchParams.get('secret')) === secret
}

function sourceDbUrl() {
  return (
    process.env.MIGRATE_SOURCE_DATABASE_URL ||
    process.env.DATABASE_URL_FUSION_360_DIRECT ||
    process.env.DATABASE_URL_FUSION_360
  )
}

async function ensureMapTable(prisma: PrismaClient) {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS AssetMigrationMap (
      wikiSlug VARCHAR(191) NOT NULL,
      oldAssetId INT NOT NULL,
      newAssetId INT NOT NULL,
      filename VARCHAR(191) NOT NULL,
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (wikiSlug, oldAssetId),
      UNIQUE KEY AssetMigrationMap_newAssetId_key (newAssetId)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `)
}

function replaceUploadRefs(value: unknown, wikiSlug: string, mappings: Array<{ oldAssetId: number; newAssetId: number }>) {
  if (value == null) return value
  let text = typeof value === 'string' ? value : JSON.stringify(value)
  for (const mapping of mappings) {
    const from = `/api/upload/${mapping.oldAssetId}?wiki=${wikiSlug}`
    const to = `/api/upload/${mapping.newAssetId}?wiki=${wikiSlug}`
    text = text.split(from).join(to)
  }
  return typeof value === 'string' ? text : JSON.parse(text)
}

async function migrateBatch(req: Request) {
  const url = new URL(req.url)
  const wikiSlug = url.searchParams.get('wiki') || 'fusion-360'
  const dryRun = url.searchParams.get('dryRun') !== 'false'
  const batch = Math.min(Math.max(toInt(url.searchParams.get('batch'), 25), 1), 50)
  const afterId = Math.max(toInt(url.searchParams.get('afterId'), 0), 0)
  const sourceUrl = sourceDbUrl()

  if (!sourceUrl) {
    return NextResponse.json(
      { error: 'Set MIGRATE_SOURCE_DATABASE_URL to the imported DB that contains the original Asset.data blobs.' },
      { status: 400 },
    )
  }

  const target = getPrisma()
  const source = new PrismaClient({ datasources: { db: { url: sourceUrl } } })

  try {
    await ensureMapTable(target)
    const sourceRows = await source.$queryRawUnsafe<any[]>(
      `
        SELECT id, filename, mimeType, size, data, createdAt
        FROM Asset
        WHERE data IS NOT NULL
          AND id > ?
        ORDER BY id ASC
        LIMIT ?
      `,
      afterId,
      batch,
    )

    const stats = {
      mode: 'migrate',
      dryRun,
      wikiSlug,
      batch,
      afterId,
      scanned: sourceRows.length,
      created: 0,
      reused: 0,
      uploaded: 0,
      failed: 0,
      nextAfterId: sourceRows.length > 0 ? Number(sourceRows[sourceRows.length - 1].id) : null,
      done: sourceRows.length === 0,
      failures: [] as Array<{ oldAssetId: number; message: string }>,
    }

    for (const row of sourceRows) {
      try {
        const existing = await target.$queryRaw<any[]>`
          SELECT newAssetId
          FROM AssetMigrationMap
          WHERE wikiSlug = ${wikiSlug}
            AND oldAssetId = ${Number(row.id)}
          LIMIT 1
        `

        let newAssetId = Number(existing?.[0]?.newAssetId || 0)
        if (newAssetId) {
          stats.reused += 1
        } else if (!dryRun) {
          const inserted: any = await target.asset.create({
            data: {
              wikiSlug,
              filename: row.filename,
              mimeType: row.mimeType,
              size: Number(row.size || 0),
              createdAt: row.createdAt ? new Date(row.createdAt) : undefined,
            },
            select: { id: true },
          })
          newAssetId = Number(inserted.id)
          await target.$executeRaw`
            INSERT INTO AssetMigrationMap (wikiSlug, oldAssetId, newAssetId, filename)
            VALUES (${wikiSlug}, ${Number(row.id)}, ${newAssetId}, ${row.filename})
          `
          stats.created += 1
        }

        if (!dryRun && newAssetId) {
          const data = row.data
          const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data || [])
          await writeAssetToGcs({
            wikiSlug,
            assetId: newAssetId,
            filename: row.filename,
            mimeType: row.mimeType,
            buffer,
          })
          stats.uploaded += 1
        }
      } catch (error: any) {
        stats.failed += 1
        stats.failures.push({ oldAssetId: Number(row.id), message: error?.message || 'Unknown error' })
      }
    }

    return NextResponse.json(stats)
  } finally {
    await source.$disconnect()
  }
}

async function copySourceToBucket(req: Request) {
  const url = new URL(req.url)
  const wikiSlug = url.searchParams.get('wiki') || 'fusion-360'
  const dryRun = url.searchParams.get('dryRun') !== 'false'
  const batch = Math.min(Math.max(toInt(url.searchParams.get('batch'), 25), 1), 50)
  const afterId = Math.max(toInt(url.searchParams.get('afterId'), 0), 0)
  const sourceUrl = sourceDbUrl()

  if (!sourceUrl) {
    return NextResponse.json(
      { error: 'Set MIGRATE_SOURCE_DATABASE_URL to the imported DB that contains the original Asset.data blobs.' },
      { status: 400 },
    )
  }

  const source = new PrismaClient({ datasources: { db: { url: sourceUrl } } })

  try {
    const rows = await source.$queryRawUnsafe<any[]>(
      `
        SELECT id, filename, mimeType, size, data
        FROM Asset
        WHERE data IS NOT NULL
          AND id > ?
        ORDER BY id ASC
        LIMIT ?
      `,
      afterId,
      batch,
    )

    const stats = {
      mode: 'copy-to-bucket',
      dryRun,
      wikiSlug,
      batch,
      afterId,
      scanned: rows.length,
      uploaded: 0,
      failed: 0,
      nextAfterId: rows.length > 0 ? Number(rows[rows.length - 1].id) : null,
      done: rows.length === 0,
      failures: [] as Array<{ assetId: number; message: string }>,
    }

    for (const row of rows) {
      try {
        if (!dryRun) {
          const data = row.data
          const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data || [])
          await writeAssetToGcs({
            wikiSlug,
            assetId: Number(row.id),
            filename: row.filename,
            mimeType: row.mimeType,
            buffer,
          })
          stats.uploaded += 1
        }
      } catch (error: any) {
        stats.failed += 1
        stats.failures.push({ assetId: Number(row.id), message: error?.message || 'Unknown error' })
      }
    }

    return NextResponse.json(stats)
  } finally {
    await source.$disconnect()
  }
}

async function rewriteLessons(req: Request) {
  const url = new URL(req.url)
  const wikiSlug = url.searchParams.get('wiki') || 'fusion-360'
  const dryRun = url.searchParams.get('dryRun') !== 'false'
  const prisma = getPrisma()
  await ensureMapTable(prisma)

  const mappings = await prisma.$queryRaw<Array<{ oldAssetId: number; newAssetId: number }>>`
    SELECT oldAssetId, newAssetId
    FROM AssetMigrationMap
    WHERE wikiSlug = ${wikiSlug}
    ORDER BY oldAssetId ASC
  `

  const lessons = await prisma.lesson.findMany({
    where: { wikiSlug },
    select: { id: true, coverImage: true, body: true },
  })

  const stats = {
    mode: 'rewrite',
    dryRun,
    wikiSlug,
    mappings: mappings.length,
    scannedLessons: lessons.length,
    updatedLessons: 0,
  }

  for (const lesson of lessons) {
    const coverImage = replaceUploadRefs(lesson.coverImage, wikiSlug, mappings) as string | null
    const body = replaceUploadRefs(lesson.body, wikiSlug, mappings)
    const changed =
      coverImage !== lesson.coverImage ||
      JSON.stringify(body) !== JSON.stringify(lesson.body)

    if (changed) {
      stats.updatedLessons += 1
      if (!dryRun) {
        await prisma.lesson.update({
          where: { id: lesson.id },
          data: { coverImage, body: body as any },
        })
      }
    }
  }

  return NextResponse.json(stats)
}

export async function GET(req: Request) {
  if (!authorize(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(req.url)
  const mode = url.searchParams.get('mode') || 'migrate'
  if (mode === 'copy-to-bucket') return copySourceToBucket(req)
  if (mode === 'rewrite') return rewriteLessons(req)
  return migrateBatch(req)
}
