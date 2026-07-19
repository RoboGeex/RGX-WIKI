import { randomBytes } from 'crypto'
import bcrypt from 'bcryptjs'
import {
  cleanupAllTestData,
  defaultDb,
  ziggyDb,
  saveState,
  RUN_PREFIX_CODE,
  RUN_PREFIX_EMAIL,
} from './helpers/db'

// Creates the fixed test identities every spec needs:
//  - a teacher (User table) assigned to the ziggy sandbox wiki
//  - an active enrollment link for that teacher
//  - a developer (Developer table, superadmin) for the editor/admin specs
//  - an access code for the ziggy wiki unlock page
// Students are created through the real signup UI inside the tests themselves.
export default async function globalSetup() {
  // Remove leftovers from any previous crashed run first.
  await cleanupAllTestData()

  const runId = Date.now().toString(36)
  const teacher = {
    email: `${RUN_PREFIX_EMAIL}teacher.${runId}@example.com`,
    password: `E2ePw!Teacher-${runId}`,
  }
  const developer = {
    email: `${RUN_PREFIX_EMAIL}dev.${runId}@example.com`,
    password: `E2ePw!Dev-${runId}`,
  }
  const linkToken = `e2epw${randomBytes(20).toString('hex')}`
  const accessCode = `${RUN_PREFIX_CODE}${runId}`

  const db = defaultDb()
  try {
    const teacherRow = await db.user.create({
      data: {
        email: teacher.email,
        name: 'E2E PW Teacher (autotest)',
        role: 'teacher',
        passwordHash: await bcrypt.hash(teacher.password, 10),
        assignedWikiSlugs: ['ziggy'],
      },
    })
    await db.enrollmentLink.create({
      data: { token: linkToken, teacherId: teacherRow.id, wikiSlug: 'ziggy' },
    })
    await db.$executeRawUnsafe(
      `INSERT INTO Developer (email, password, name, role, wikiSlugs, updatedAt)
       VALUES (?, ?, 'E2E PW Developer (autotest)', 'superadmin', JSON_ARRAY('ziggy'), NOW(3))`,
      developer.email,
      developer.password
    )
  } finally {
    await db.$disconnect()
  }

  const ziggy = ziggyDb()
  try {
    await ziggy.$executeRawUnsafe(
      `INSERT INTO AccessCode (id, code, wikiSlug, createdAt, updatedAt)
       SELECT COALESCE(MAX(id), 0) + 1, ?, 'ziggy', NOW(3), NOW(3) FROM AccessCode`,
      accessCode
    )
  } finally {
    await ziggy.$disconnect()
  }

  saveState({ runId, teacher, developer, linkToken, accessCode })
}
