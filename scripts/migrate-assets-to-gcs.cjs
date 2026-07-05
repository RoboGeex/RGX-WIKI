#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client')
const { Storage } = require('@google-cloud/storage')

function parseArgs(argv) {
  const args = {}
  for (const token of argv) {
    if (!token.startsWith('--')) continue
    const [rawKey, rawValue] = token.slice(2).split('=')
    const key = rawKey.trim()
    const value = rawValue === undefined ? 'true' : rawValue.trim()
    args[key] = value
  }
  return args
}

function wikiToEnvSuffix(wikiSlug) {
  return (wikiSlug || '').trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_')
}

function sanitizeWikiSlug(value) {
  const normalized = (value || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '')
  return normalized || 'default'
}

function sanitizeFilename(value, assetId) {
  const raw = (value || '').trim()
  const leaf = raw.split(/[\\/]/).filter(Boolean).pop() || `asset-${assetId}`
  const safe = leaf.replace(/[^\w.\-]/g, '_')
  return safe || `asset-${assetId}`
}

function buildObjectPath({ wikiSlug, assetId, filename, prefix }) {
  const cleanPrefix = (prefix || 'wiki-assets').trim().replace(/^\/+|\/+$/g, '')
  const wikiSegment = sanitizeWikiSlug(wikiSlug)
  const safeFilename = sanitizeFilename(filename, assetId)
  const idPrefixedName = safeFilename.startsWith(`${assetId}-`) ? safeFilename : `${assetId}-${safeFilename}`
  return `${cleanPrefix}/${wikiSegment}/${idPrefixedName}`
}

function getDatabaseUrl(args, wikiSlug) {
  if (args['db-url']) return args['db-url']
  const suffix = wikiToEnvSuffix(wikiSlug)
  const wikiKey = `DATABASE_URL_${suffix}`
  const wikiUrl = process.env[wikiKey]
  if (wikiUrl) return wikiUrl
  return process.env.DATABASE_URL_DEFAULT || process.env.DATABASE_URL
}

function toInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const bucketName = args.bucket || process.env.GCS_ASSET_BUCKET
  const prefix = args.prefix || process.env.GCS_ASSET_PREFIX || 'wiki-assets'
  const batchSize = Math.max(1, toInt(args.batch, 200))
  const limit = Math.max(0, toInt(args.limit, 0))
  const dryRun = args['dry-run'] === 'true'
  const clearDbData = args['clear-db-data'] === 'true'
  const overwrite = args.overwrite === 'true'

  if (!bucketName) {
    throw new Error('Missing bucket. Pass --bucket=<name> or set GCS_ASSET_BUCKET.')
  }

  const dbUrl = args['db-url'] || process.env.DATABASE_URL_DEFAULT || process.env.DATABASE_URL
  if (!dbUrl) {
    throw new Error('No DB URL found. Set DATABASE_URL_DEFAULT or pass --db-url=<url>.')
  }

  const prisma = new PrismaClient({
    datasources: {
      db: { url: dbUrl },
    },
  })
  const inlineJson = (process.env.GCS_SERVICE_ACCOUNT_JSON || '').trim()
  const storage = inlineJson
    ? new Storage({ credentials: JSON.parse(inlineJson) })
    : new Storage()
  const bucket = storage.bucket(bucketName)

  const stats = {
    scanned: 0,
    uploaded: 0,
    skippedExisting: 0,
    clearedDb: 0,
    failed: 0,
  }

  const totalRows = await prisma.$queryRaw`
    SELECT COUNT(*) AS count
    FROM Asset
    WHERE data IS NOT NULL
  `
  const total = Number(totalRows?.[0]?.count || 0)
  console.log(`[migrate-assets-to-gcs] single-db total_with_blob=${total} batch=${batchSize} dry_run=${dryRun}`)

  let cursor = 0
  let reachedLimit = false

  while (!reachedLimit) {
    const rows = await prisma.$queryRawUnsafe(
      `
        SELECT id, wikiSlug, filename, mimeType, size, data
        FROM Asset
        WHERE data IS NOT NULL
          AND id > ?
        ORDER BY id ASC
        LIMIT ?
      `,
      cursor,
      batchSize,
    )

    if (rows.length === 0) break

    for (const row of rows) {
      cursor = row.id
      if (limit > 0 && stats.scanned >= limit) {
        reachedLimit = true
        break
      }

      stats.scanned += 1
      const objectPath = buildObjectPath({
        wikiSlug: row.wikiSlug || 'default',
        assetId: row.id,
        filename: row.filename,
        prefix,
      })
      const file = bucket.file(objectPath)

      try {
        const [exists] = await file.exists()
        if (exists && !overwrite) {
          stats.skippedExisting += 1
          if (clearDbData && !dryRun) {
            await prisma.$executeRaw`UPDATE Asset SET data = NULL WHERE id = ${row.id}`
            stats.clearedDb += 1
          }
          continue
        }

        if (!dryRun) {
          const assetWikiSlug = row.wikiSlug || 'default'
          const buffer = Buffer.isBuffer(row.data) ? row.data : Buffer.from(row.data || [])
          await file.save(buffer, {
            resumable: false,
            contentType: row.mimeType || 'application/octet-stream',
            metadata: {
              metadata: {
                wikiSlug: assetWikiSlug,
                assetId: String(row.id),
                originalFilename: row.filename || '',
                source: 'asset-table',
              },
            },
          })

          if (clearDbData) {
            await prisma.$executeRaw`UPDATE Asset SET data = NULL WHERE id = ${row.id}`
            stats.clearedDb += 1
          }
        }

        stats.uploaded += 1
      } catch (error) {
        stats.failed += 1
        console.error(`[migrate-assets-to-gcs] failed id=${row.id} object=${objectPath}`, error?.message || error)
      }
    }
  }

  await prisma.$disconnect()

  console.log('[migrate-assets-to-gcs] done', stats)
  if (stats.failed > 0) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error('[migrate-assets-to-gcs] fatal', error)
  process.exit(1)
})
