// One-off repair: the hub database (DATABASE_URL) is missing the four Track
// tables that prisma/schema.prisma defines. The migrations
// 20260715150000_add_learning_tracks and 20260716110000_add_track_invite_links
// were written but never applied there, so prisma.trackAssignment.* crashes
// /home for every student and prisma.user.delete() fails collecting relations.
//
// This creates exactly the tables those migration files define (linkId folded
// into the fresh TrackAssignment CREATE). No foreign keys on purpose: the
// datasource uses relationMode = "prisma", so relations are emulated by the
// client and no other table in this DB carries FK constraints.
//
// `prisma db push` must NOT be used on this project — it would drop/alter
// unrelated columns (see enrollment drift history, 2026-07-07).
//
// Usage (from RGX-WIKI/):
//   node scripts/create-track-tables.cjs           # dry-run, prints the plan
//   node scripts/create-track-tables.cjs --apply   # creates missing tables
//
// Targets only the default DATABASE_URL (hub DB) — Track/User data lives
// there, not in the per-wiki lesson DBs. Idempotent: existing tables are
// skipped, never altered.

const fs = require('fs')
const path = require('path')
const { PrismaClient } = require('@prisma/client')

const APPLY = process.argv.includes('--apply')

const envRaw = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8')
const def = envRaw.match(/^DATABASE_URL="?([^"\s]+)"?/m)
if (!def) {
  console.error('DATABASE_URL not found in .env')
  process.exit(1)
}
const url = def[1]

const TABLES = {
  Track: `CREATE TABLE \`Track\` (
  \`id\` VARCHAR(191) NOT NULL,
  \`name\` VARCHAR(191) NOT NULL,
  \`description\` TEXT NULL,
  \`createdByUserId\` VARCHAR(191) NULL,
  \`createdByType\` VARCHAR(191) NOT NULL,
  \`createdByName\` VARCHAR(191) NULL,
  \`createdByEmail\` VARCHAR(191) NULL,
  \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (\`id\`),
  INDEX \`Track_createdByUserId_idx\` (\`createdByUserId\`),
  INDEX \`Track_createdByType_idx\` (\`createdByType\`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  TrackWiki: `CREATE TABLE \`TrackWiki\` (
  \`id\` VARCHAR(191) NOT NULL,
  \`trackId\` VARCHAR(191) NOT NULL,
  \`wikiSlug\` VARCHAR(191) NOT NULL,
  \`position\` INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (\`id\`),
  UNIQUE INDEX \`TrackWiki_trackId_wikiSlug_key\` (\`trackId\`, \`wikiSlug\`),
  INDEX \`TrackWiki_trackId_position_idx\` (\`trackId\`, \`position\`),
  INDEX \`TrackWiki_wikiSlug_idx\` (\`wikiSlug\`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  TrackInviteLink: `CREATE TABLE \`TrackInviteLink\` (
  \`id\` VARCHAR(191) NOT NULL,
  \`token\` VARCHAR(191) NOT NULL,
  \`trackId\` VARCHAR(191) NOT NULL,
  \`createdByActorId\` VARCHAR(191) NOT NULL,
  \`createdByUserId\` VARCHAR(191) NULL,
  \`createdByName\` VARCHAR(191) NULL,
  \`createdByEmail\` VARCHAR(191) NULL,
  \`isActive\` BOOLEAN NOT NULL DEFAULT TRUE,
  \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`disabledAt\` DATETIME(3) NULL,
  PRIMARY KEY (\`id\`),
  UNIQUE INDEX \`TrackInviteLink_token_key\` (\`token\`),
  INDEX \`TrackInviteLink_trackId_createdByActorId_idx\` (\`trackId\`, \`createdByActorId\`),
  INDEX \`TrackInviteLink_token_idx\` (\`token\`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  TrackAssignment: `CREATE TABLE \`TrackAssignment\` (
  \`id\` VARCHAR(191) NOT NULL,
  \`trackId\` VARCHAR(191) NOT NULL,
  \`studentId\` VARCHAR(191) NOT NULL,
  \`assignedByUserId\` VARCHAR(191) NULL,
  \`linkId\` VARCHAR(191) NULL,
  \`assignedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (\`id\`),
  UNIQUE INDEX \`TrackAssignment_trackId_studentId_key\` (\`trackId\`, \`studentId\`),
  INDEX \`TrackAssignment_studentId_idx\` (\`studentId\`),
  INDEX \`TrackAssignment_linkId_idx\` (\`linkId\`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
}

;(async () => {
  console.log(APPLY ? 'APPLY mode — creating missing tables' : 'DRY-RUN — pass --apply to create')
  const prisma = new PrismaClient({ datasources: { db: { url } } })
  try {
    const rows = await prisma.$queryRawUnsafe(
      'SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()'
    )
    const existing = new Set(rows.map((r) => r.name))
    console.log(`DB has ${existing.size} tables: ${[...existing].sort().join(', ')}\n`)

    let created = 0
    for (const [table, ddl] of Object.entries(TABLES)) {
      if (existing.has(table)) {
        console.log(`  skip ${table} (already exists)`)
        continue
      }
      console.log(`  ${APPLY ? 'CREATE' : 'would create'} ${table}`)
      if (APPLY) {
        await prisma.$executeRawUnsafe(ddl)
        created++
      }
    }

    if (APPLY) {
      const after = await prisma.$queryRawUnsafe(
        'SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()'
      )
      const names = new Set(after.map((r) => r.name))
      const missing = Object.keys(TABLES).filter((t) => !names.has(t))
      console.log(`\nCreated ${created} table(s). DB now has ${names.size} tables.`)
      if (missing.length) {
        console.error(`STILL MISSING: ${missing.join(', ')}`)
        process.exit(1)
      }
      console.log('All four Track tables present.')
    }
  } catch (e) {
    console.error(`ERROR: ${String(e.message || e).slice(0, 500)}`)
    process.exit(1)
  } finally {
    await prisma.$disconnect().catch(() => {})
  }
})()
