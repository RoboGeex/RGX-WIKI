import { NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma-multi'
import { writeAssetToGcs } from '@/lib/gcs-assets'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function toInt(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value || '', 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

function isEnabled(value?: string) {
  return ['1', 'true', 'yes', 'on'].includes((value || '').trim().toLowerCase())
}

function authorize(req: Request) {
  const secret = process.env.MIGRATE_ASSETS_SECRET
  if (!secret) return false

  const url = new URL(req.url)
  const provided =
    req.headers.get('x-migrate-assets-secret') ||
    url.searchParams.get('secret')

  return provided === secret
}

export async function GET(req: Request) {
  if (!authorize(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(req.url)
  const dryRun = url.searchParams.get('dryRun') !== 'false'
  const clearDbData = isEnabled(url.searchParams.get('clearDbData') || undefined)
  const batch = Math.min(Math.max(toInt(url.searchParams.get('batch'), 25), 1), 100)
  const afterId = Math.max(toInt(url.searchParams.get('afterId'), 0), 0)
  const wikiSlug = url.searchParams.get('wiki') || undefined
  const prisma = getPrisma(wikiSlug)

  const rows = await prisma.$queryRawUnsafe<any[]>(
    `
      SELECT id, wikiSlug, filename, mimeType, size, data
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
    dryRun,
    clearDbData,
    batch,
    afterId,
    scanned: rows.length,
    uploaded: 0,
    clearedDb: 0,
    failed: 0,
    nextAfterId: rows.length > 0 ? Number(rows[rows.length - 1].id) : null,
    done: rows.length === 0,
    failures: [] as Array<{ id: number; message: string }>,
  }

  for (const row of rows) {
    try {
      const data = row.data
      const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data || [])

      if (!dryRun) {
        await writeAssetToGcs({
          wikiSlug: row.wikiSlug || wikiSlug || 'default',
          assetId: Number(row.id),
          filename: row.filename,
          mimeType: row.mimeType,
          buffer,
        })

        stats.uploaded += 1

        if (clearDbData) {
          await prisma.$executeRaw`UPDATE Asset SET data = NULL WHERE id = ${Number(row.id)}`
          stats.clearedDb += 1
        }
      }
    } catch (error: any) {
      stats.failed += 1
      stats.failures.push({
        id: Number(row.id),
        message: error?.message || 'Unknown error',
      })
    }
  }

  return NextResponse.json(stats)
}
