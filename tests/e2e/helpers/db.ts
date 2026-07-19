import fs from 'fs'
import path from 'path'
import { PrismaClient } from '@prisma/client'

// The tests talk to the same databases as the app. All rows they create are
// prefixed with "e2e.pw." / "e2e-pw-" so cleanup can never touch real data.
export const RUN_PREFIX_EMAIL = 'e2e.pw.'
export const RUN_PREFIX_CODE = 'e2e-pw-code-'
export const RUN_PREFIX_LESSON = 'e2e-pw-lesson'

const REPO_ROOT = path.join(__dirname, '..', '..', '..')
const STATE_FILE = path.join(__dirname, '..', '.e2e-state.json')

export type E2EState = {
  runId: string
  teacher: { email: string; password: string }
  developer: { email: string; password: string }
  linkToken: string
  accessCode: string
}

// Next.js loads .env for the app; tests run outside Next, so load it here.
export function loadEnv() {
  const envPath = path.join(REPO_ROOT, '.env')
  if (!fs.existsSync(envPath)) return
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (!m) continue
    const [, key, rawValue] = m
    if (process.env[key] !== undefined) continue
    process.env[key] = rawValue.replace(/^["']|["']$/g, '')
  }
}

export function defaultDb() {
  loadEnv()
  return new PrismaClient()
}

export function ziggyDb() {
  loadEnv()
  const url = process.env.DATABASE_URL_ZIGGY
  if (!url) throw new Error('DATABASE_URL_ZIGGY missing — is RGX-WIKI/.env present?')
  return new PrismaClient({ datasources: { db: { url } } })
}

export function saveState(state: E2EState) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2))
}

export function readState(): E2EState {
  if (!fs.existsSync(STATE_FILE)) {
    throw new Error('.e2e-state.json missing — global setup did not run')
  }
  return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'))
}

export function deleteStateFile() {
  if (fs.existsSync(STATE_FILE)) fs.unlinkSync(STATE_FILE)
}

// Raw SQL everywhere: prisma.user.delete() crashes while the DB is missing the
// Track* tables (schema drift), and raw statements also keep the cleanup
// honest — they only ever match the e2e prefixes.
export async function cleanupAllTestData() {
  const db = defaultDb()
  try {
    await db.$executeRawUnsafe(
      `DELETE FROM Enrollment WHERE studentId IN (SELECT id FROM (SELECT id FROM User WHERE email LIKE '${RUN_PREFIX_EMAIL}%') u)
         OR teacherId IN (SELECT id FROM (SELECT id FROM User WHERE email LIKE '${RUN_PREFIX_EMAIL}%') u2)`
    )
    await db.$executeRawUnsafe(
      `DELETE FROM EnrollmentLink WHERE teacherId IN (SELECT id FROM (SELECT id FROM User WHERE email LIKE '${RUN_PREFIX_EMAIL}%') u)`
    )
    await db.$executeRawUnsafe(
      `DELETE FROM LessonProgress WHERE studentId IN (SELECT id FROM (SELECT id FROM User WHERE email LIKE '${RUN_PREFIX_EMAIL}%') u)`
    )
    await db.$executeRawUnsafe(
      `DELETE FROM Session WHERE userId IN (SELECT id FROM (SELECT id FROM User WHERE email LIKE '${RUN_PREFIX_EMAIL}%') u)`
    )
    await db.$executeRawUnsafe(`DELETE FROM User WHERE email LIKE '${RUN_PREFIX_EMAIL}%'`)
    await db.$executeRawUnsafe(`DELETE FROM Developer WHERE email LIKE '${RUN_PREFIX_EMAIL}%'`)
  } finally {
    await db.$disconnect()
  }

  const ziggy = ziggyDb()
  try {
    await ziggy.$executeRawUnsafe(`DELETE FROM AccessCode WHERE code LIKE '${RUN_PREFIX_CODE}%'`)
    await ziggy.$executeRawUnsafe(`DELETE FROM Lesson WHERE id LIKE '${RUN_PREFIX_LESSON}%'`)
  } finally {
    await ziggy.$disconnect()
  }
}
