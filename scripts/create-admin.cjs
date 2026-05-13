#!/usr/bin/env node
// Create an admin (or teacher) user. Run once to bootstrap the first admin.
//
// Usage:
//   node scripts/create-admin.cjs <email> <password> [name] [role]
//
// role defaults to "admin". Use "teacher" or "student" to create those.
//
// The script uses DATABASE_URL from .env / .env.local — make sure the right
// one is exported before running in any other environment.

const fs = require('fs')
const path = require('path')

// Minimal .env loader so we don't pull in dotenv as a new dependency.
// Loads .env.local first (takes precedence), then .env. Existing process.env wins.
function loadEnv(file) {
  try {
    const raw = fs.readFileSync(path.join(__dirname, '..', file), 'utf8')
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i)
      if (!m) continue
      const key = m[1]
      let val = m[2]
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1)
      else if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1)
      if (process.env[key] === undefined) process.env[key] = val
    }
  } catch {
    // file not present — fine
  }
}
loadEnv('.env.local')
loadEnv('.env')

const bcrypt = require('bcryptjs')
const { PrismaClient } = require('@prisma/client')

async function main() {
  const [, , emailArg, passwordArg, nameArg, roleArg] = process.argv
  if (!emailArg || !passwordArg) {
    console.error('Usage: node scripts/create-admin.cjs <email> <password> [name] [role]')
    process.exit(1)
  }
  const email = emailArg.trim().toLowerCase()
  const password = passwordArg
  const name = nameArg && nameArg.trim() ? nameArg.trim() : null
  const role = (roleArg || 'admin').trim().toLowerCase()
  if (!['admin', 'teacher', 'student'].includes(role)) {
    console.error(`Invalid role "${role}". Must be admin | teacher | student.`)
    process.exit(1)
  }
  if (password.length < 8) {
    console.error('Password must be at least 8 characters.')
    process.exit(1)
  }

  const prisma = new PrismaClient()
  try {
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      console.error(`User ${email} already exists (role: ${existing.role}).`)
      process.exit(1)
    }
    const passwordHash = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: { email, passwordHash, name, role },
    })
    console.log(`Created ${user.role}: ${user.email} (id: ${user.id})`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
