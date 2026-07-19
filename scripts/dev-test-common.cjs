// Shared helpers for the local dev test harness (seed:dev / reset:dev).
//
// SAFETY: every row this harness touches is namespaced to the test email
// domain below. The purge deletes ONLY rows owned by users whose email ends in
// that domain, so it can never affect real teachers/students/data. Do not point
// these test emails at a real domain.
const fs = require('fs')
const path = require('path')

const TEST_DOMAIN = 'rgxtest.local'
const PASSWORD = 'RgxTest12345!'
const WIKI = 'ziggy' // a real wiki (read-only here) so lessons/progress render

const TEACHER_EMAIL = `teacher@${TEST_DOMAIN}`
const STUDENT_EMAILS = [
  `student1@${TEST_DOMAIN}`,
  `student2@${TEST_DOMAIN}`,
  `student3@${TEST_DOMAIN}`,
]

// Load env the way the scripts need it. `node` does not auto-load .env like the
// Next.js CLI does, so parse the files ourselves, applying Next.js precedence:
// .env.local overrides .env.
//
// IMPORTANT: we assign unconditionally rather than only filling in undefined
// vars. `require('@prisma/client')` auto-loads `.env` as a side effect, so by
// the time this runs DATABASE_URL is often already set from the BASE .env —
// a "don't overwrite" loader would then silently ignore .env.local and point
// these scripts at the wrong database.
function loadEnv() {
  const root = path.join(__dirname, '..')
  const merged = {}
  for (const file of ['.env', '.env.local']) { // later file wins
    const p = path.join(root, file)
    if (!fs.existsSync(p)) continue
    const txt = fs.readFileSync(p, 'utf8')
    for (const line of txt.split(/\r?\n/)) {
      if (/^\s*#/.test(line)) continue
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/)
      if (m) merged[m[1]] = m[2]
    }
  }
  Object.assign(process.env, merged)
}

function requireDbSafety() {
  // Belt-and-braces: refuse to run if the test domain looks like a real one.
  if (!TEST_DOMAIN.endsWith('.local')) {
    throw new Error('TEST_DOMAIN must end in .local — refusing to run for safety')
  }
}

// Delete every row owned by the test namespace, in dependency-friendly order.
// relationMode="prisma" means there are no DB-level cascades, so we delete
// child rows explicitly. Returns a summary of counts.
async function purgeTestData(prisma) {
  requireDbSafety()
  const users = await prisma.user.findMany({
    where: { email: { endsWith: `@${TEST_DOMAIN}` } },
    select: { id: true },
  })
  const ids = users.map((u) => u.id)
  if (ids.length === 0) {
    return { users: 0, sessions: 0, enrollments: 0, links: 0, progress: 0, trackAssignments: 0 }
  }

  const progress = await prisma.lessonProgress.deleteMany({ where: { studentId: { in: ids } } })
  const trackAssignments = await prisma.trackAssignment.deleteMany({ where: { studentId: { in: ids } } })
  const enrollments = await prisma.enrollment.deleteMany({
    where: { OR: [{ studentId: { in: ids } }, { teacherId: { in: ids } }] },
  })
  const links = await prisma.enrollmentLink.deleteMany({ where: { teacherId: { in: ids } } })
  const sessions = await prisma.session.deleteMany({ where: { userId: { in: ids } } })
  const usersDeleted = await prisma.user.deleteMany({ where: { id: { in: ids } } })

  return {
    users: usersDeleted.count,
    sessions: sessions.count,
    enrollments: enrollments.count,
    links: links.count,
    progress: progress.count,
    trackAssignments: trackAssignments.count,
  }
}

module.exports = {
  TEST_DOMAIN,
  PASSWORD,
  WIKI,
  TEACHER_EMAIL,
  STUDENT_EMAILS,
  loadEnv,
  purgeTestData,
}
