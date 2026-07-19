/*
 * One-time migration: hash any plaintext Developer passwords with bcrypt.
 *
 * Developer passwords were historically stored in plaintext and compared with
 * `===`. `lib/developers.ts` now accepts BOTH a bcrypt hash and a legacy
 * plaintext value, so hashing the stored rows is a safe, behaviour-preserving
 * upgrade: after this runs, logins keep working but the database no longer
 * holds plaintext credentials.
 *
 * Usage (from the RGX-WIKI directory):
 *   node scripts/hash-developer-passwords.cjs            # dry run (no writes)
 *   node scripts/hash-developer-passwords.cjs --apply    # actually hash + save
 *
 * Uses DATABASE_URL_DEVELOPERS (falls back to DATABASE_URL). Idempotent —
 * already-hashed rows are skipped, so it is safe to re-run.
 */
const fs = require('fs')
const path = require('path')
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

// Plain Node doesn't auto-load .env like Next.js does. Pull the DB URL from
// .env (the production connection string lives there) if it isn't already in
// the environment. Values already set in the shell take precedence.
function loadEnvFile(file) {
  const full = path.join(process.cwd(), file)
  if (!fs.existsSync(full)) return
  for (const line of fs.readFileSync(full, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
    if (!m) continue
    const key = m[1]
    let val = m[2].replace(/^["']|["']$/g, '')
    if (process.env[key] === undefined) process.env[key] = val
  }
}
loadEnvFile('.env')

const APPLY = process.argv.includes('--apply')
const url = process.env.DATABASE_URL_DEVELOPERS || process.env.DATABASE_URL

function looksHashed(v) {
  return typeof v === 'string' && /^\$2[aby]\$/.test(v)
}

async function main() {
  if (!url) {
    console.error('No DATABASE_URL_DEVELOPERS / DATABASE_URL set. Aborting.')
    process.exit(1)
  }

  const prisma = new PrismaClient({ datasources: { db: { url } } })
  try {
    const devs = await prisma.developer.findMany({ select: { id: true, email: true, password: true } })
    let toHash = 0
    let hashed = 0

    for (const d of devs) {
      if (looksHashed(d.password)) continue
      toHash++
      if (!d.password) {
        console.warn(`SKIP  ${d.email} (id ${d.id}) — empty password`)
        continue
      }
      if (APPLY) {
        const hash = await bcrypt.hash(d.password, 10)
        // updateMany returns a count and does not read the row back, so it
        // avoids selecting columns (e.g. avatarUrl) that may not exist in the
        // developers database.
        await prisma.developer.updateMany({ where: { id: d.id }, data: { password: hash } })
        hashed++
        console.log(`HASHED ${d.email} (id ${d.id})`)
      } else {
        console.log(`WOULD HASH ${d.email} (id ${d.id})`)
      }
    }

    console.log('')
    console.log(`Developers: ${devs.length} | plaintext found: ${toHash} | hashed this run: ${hashed}`)
    if (!APPLY && toHash > 0) {
      console.log('Dry run only. Re-run with --apply to write the hashes.')
    }
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
