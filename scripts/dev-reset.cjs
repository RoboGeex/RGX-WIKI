// Local dev test harness — RESET.
//   npm run reset:dev
//
// Deletes ONLY the test namespace (@rgxtest.local users and everything they
// own: sessions, classes/links, enrollments, progress). Real accounts and data
// are never matched. Safe to run anytime.
const { PrismaClient } = require('@prisma/client')
const { TEST_DOMAIN, loadEnv, purgeTestData } = require('./dev-test-common.cjs')

loadEnv()
const prisma = new PrismaClient()

async function main() {
  const r = await purgeTestData(prisma)
  console.log(`✅ Reset complete (namespace: @${TEST_DOMAIN})`)
  console.log(`   users=${r.users}, sessions=${r.sessions}, links=${r.links}, enrollments=${r.enrollments}, progress=${r.progress}, trackAssignments=${r.trackAssignments}`)
  if (r.users === 0) console.log('   (nothing to clean — no test data present)')
}

main()
  .catch((e) => { console.error('reset failed:', e); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
