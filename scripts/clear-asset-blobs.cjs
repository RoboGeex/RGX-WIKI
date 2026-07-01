#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client')

function parseArgs(argv) {
  const args = {}
  for (const token of argv) {
    if (!token.startsWith('--')) continue
    const [rawKey, rawValue] = token.slice(2).split('=')
    args[rawKey.trim()] = rawValue === undefined ? 'true' : rawValue.trim()
  }
  return args
}

function resolveDatabaseUrl(args) {
  return (
    args['db-url'] ||
    process.env.DATABASE_URL_DEFAULT_DIRECT ||
    process.env.DIRECT_URL ||
    process.env.DATABASE_URL_DEFAULT ||
    process.env.DATABASE_URL
  )
}

function assertDirectDatabaseUrl(url) {
  if (!url) {
    throw new Error('No database URL found. Set DATABASE_URL or pass --db-url=<mysql-url>.')
  }
  if (url.trim().toLowerCase().startsWith('prisma://')) {
    throw new Error('Use a direct mysql:// URL, not a prisma:// proxy URL.')
  }
}

async function hasAssetDataColumn(prisma) {
  const rows = await prisma.$queryRaw`
    SELECT COUNT(*) AS count
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'Asset'
      AND COLUMN_NAME = 'data'
  `
  return Number(rows?.[0]?.count || 0) > 0
}

async function getBlobStats(prisma) {
  const rows = await prisma.$queryRaw`
    SELECT
      COUNT(*) AS count,
      COALESCE(SUM(OCTET_LENGTH(data)), 0) AS bytes
    FROM Asset
    WHERE data IS NOT NULL
  `
  const row = rows?.[0] || {}
  const count = Number(row.count || 0)
  const bytes = Number(row.bytes || 0)
  return {
    count,
    bytes,
    mb: Math.round((bytes / 1024 / 1024) * 100) / 100,
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const dbUrl = resolveDatabaseUrl(args)
  assertDirectDatabaseUrl(dbUrl)

  const confirm = args.confirm === 'true'
  const dropColumn = args['drop-column'] === 'true'
  const prisma = new PrismaClient({
    datasources: {
      db: { url: dbUrl },
    },
  })

  try {
    const hasData = await hasAssetDataColumn(prisma)
    if (!hasData) {
      console.log('[clear-asset-blobs] Asset.data column does not exist. Nothing to clear.')
      return
    }

    const before = await getBlobStats(prisma)
    console.log(
      `[clear-asset-blobs] found ${before.count} asset blobs using ${before.mb} MB in Asset.data`,
    )

    if (!confirm) {
      console.log('[clear-asset-blobs] dry run only. Re-run with --confirm=true to set Asset.data = NULL.')
      return
    }

    await prisma.$executeRaw`UPDATE Asset SET data = NULL WHERE data IS NOT NULL`
    const after = await getBlobStats(prisma)
    console.log(
      `[clear-asset-blobs] cleared blobs. Remaining: ${after.count} asset blobs using ${after.mb} MB`,
    )

    if (dropColumn) {
      await prisma.$executeRawUnsafe('ALTER TABLE `Asset` DROP COLUMN `data`')
      console.log('[clear-asset-blobs] dropped Asset.data column.')
    }
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error('[clear-asset-blobs] fatal:', error?.message || error)
  process.exit(1)
})
