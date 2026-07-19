// Local dev test harness — SEED.
//   npm run seed:dev
//
// Creates a self-contained set of TEST accounts (all @rgxtest.local) so you can
// exercise the teacher/class/student flows locally without inventing data or
// touching real users. Re-running first wipes the old test data, so it is
// idempotent. Wipe everything later with `npm run reset:dev`.
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const {
  PASSWORD, WIKI, TEACHER_EMAIL, STUDENT_EMAILS, loadEnv, purgeTestData,
} = require('./dev-test-common.cjs')

loadEnv()
const prisma = new PrismaClient()

// Best-effort: pull a few real lesson ids from the wiki's own database so the
// dashboard shows non-zero progress. Skipped silently if unavailable.
async function fetchWikiLessonIds() {
  // In shared-DB mode every wiki (lessons included) lives in the default
  // database, so ignore the per-wiki DATABASE_URL_<WIKI> entries — they may
  // point at a different/legacy server.
  const shared = /^(1|true|yes|on)$/i.test(process.env.USE_SHARED_DB || '')
  const url = shared
    ? process.env.DATABASE_URL
    : (process.env[`DATABASE_URL_${WIKI.toUpperCase()}`] || process.env.DATABASE_URL)
  if (!url) return []
  const wikiPrisma = new PrismaClient({ datasources: { db: { url } } })
  try {
    const rows = await wikiPrisma.$queryRawUnsafe(
      "SELECT id FROM Lesson WHERE wikiSlug = ? AND status = 'published' ORDER BY `order` ASC LIMIT 5",
      WIKI,
    )
    return rows.map((r) => r.id)
  } catch {
    return []
  } finally {
    await wikiPrisma.$disconnect()
  }
}

async function main() {
  const purged = await purgeTestData(prisma)
  if (purged.users > 0) console.log(`cleared previous test data (${purged.users} users)`)

  const passwordHash = await bcrypt.hash(PASSWORD, 10)

  const teacher = await prisma.user.create({
    data: {
      email: TEACHER_EMAIL, passwordHash, role: 'teacher',
      name: '[TEST] Teacher', assignedWikiSlugs: [WIKI],
    },
  })

  const students = []
  for (let i = 0; i < STUDENT_EMAILS.length; i++) {
    students.push(await prisma.user.create({
      data: { email: STUDENT_EMAILS[i], passwordHash, role: 'student', name: `[TEST] Student ${i + 1}` },
    }))
  }

  // Two classes on the same wiki (exercises the multiple-classes-per-wiki work).
  const rnd = () => require('crypto').randomBytes(24).toString('hex')
  const classA = await prisma.enrollmentLink.create({
    data: { token: rnd(), teacherId: teacher.id, wikiSlug: WIKI, name: 'TEST — Class A' },
  })
  const classB = await prisma.enrollmentLink.create({
    data: { token: rnd(), teacherId: teacher.id, wikiSlug: WIKI, name: 'TEST — Class B' },
  })

  // student1 + student2 -> Class A, student3 -> Class B
  const plan = [
    { student: students[0], link: classA },
    { student: students[1], link: classA },
    { student: students[2], link: classB },
  ]
  for (const { student, link } of plan) {
    await prisma.enrollment.create({
      data: { studentId: student.id, teacherId: teacher.id, linkId: link.id, wikiSlug: WIKI, status: 'active' },
    })
  }

  // Best-effort progress for student1 so the dashboard isn't all zeros.
  const lessonIds = await fetchWikiLessonIds()
  let progressCount = 0
  for (let i = 0; i < lessonIds.length && i < 3; i++) {
    const completed = i < 2
    await prisma.lessonProgress.create({
      data: {
        studentId: students[0].id, wikiSlug: WIKI, lessonId: lessonIds[i],
        status: completed ? 'completed' : 'in_progress',
        completedAt: completed ? new Date() : null,
      },
    })
    progressCount++
  }

  console.log('\n✅ Test data seeded (namespace: @' + require('./dev-test-common.cjs').TEST_DOMAIN + ')')
  console.log('   • 1 teacher, 3 students')
  console.log('   • 2 classes on "' + WIKI + '": "TEST — Class A" (2 students), "TEST — Class B" (1 student)')
  console.log('   • ' + progressCount + ' progress rows for Student 1')
  console.log('\n   Log in at http://localhost:3000/login')
  console.log('   Teacher : ' + TEACHER_EMAIL)
  console.log('   Students: ' + STUDENT_EMAILS.join(', '))
  console.log('   Password (all): ' + PASSWORD)
  console.log('\n   Wipe it all later with:  npm run reset:dev\n')
}

main()
  .catch((e) => { console.error('seed failed:', e); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
