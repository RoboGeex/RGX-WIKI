/**
 * ========================================================
 *   DOCUMENT LOCK - COMPREHENSIVE AUTOMATED TEST SUITE
 * ========================================================
 * 
 * Wiki:   3d-design-using-tinkercad (ONLY)
 * Safety: Creates a temporary "__TEST__" lesson, runs all
 *         tests against it, then deletes it. No real
 *         lessons are ever read or modified.
 * 
 * Usage:  node test-locks.js
 * Prereq: Dev server running on localhost:3000
 */

const BASE = 'http://localhost:3000'
const WIKI = '3d-design-using-tinkercad'
const DEV_A_ID = '1'   // Developer A (admin)
const DEV_B_ID = '2'   // Developer B

const TEST_LESSON_ID = `__test-lock-${Date.now()}`
const TEST_LESSON_SLUG = `__test-lock-slug-${Date.now()}`

let passed = 0
let failed = 0
let skipped = 0

function assert(condition, testName, detail = '') {
  if (condition) {
    console.log(`  ✅ ${testName}`)
    passed++
  } else {
    console.log(`  ❌ ${testName}${detail ? ' — ' + detail : ''}`)
    failed++
  }
}

function skip(testName, reason) {
  console.log(`  ⏭️  ${testName} — SKIPPED: ${reason}`)
  skipped++
}

// ======= API HELPERS =======

async function createLesson(devId, overrides = {}) {
  return fetch(`${BASE}/api/lessons`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-developer-id': devId },
    body: JSON.stringify({
      id: TEST_LESSON_ID,
      wikiSlug: WIKI,
      slug: TEST_LESSON_SLUG,
      title_en: '__TEST Lock Lesson (safe to delete)',
      title_ar: '',
      order: 9999,
      coverImage: '',
      duration_min: 5,
      difficulty: 'beginner',
      prerequisites_en: [],
      prerequisites_ar: [],
      materials: [],
      body: [{ type: 'paragraph', en: 'Test content', html_en: '<p>Test content</p>' }],
      forceNew: true,
      status: 'draft',
      ownerId: devId,
      version: 1,
      ...overrides,
    })
  })
}

async function saveLesson(devId, version, extraBody = {}) {
  return fetch(`${BASE}/api/lessons`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-developer-id': devId },
    body: JSON.stringify({
      id: TEST_LESSON_ID,
      wikiSlug: WIKI,
      slug: TEST_LESSON_SLUG,
      title_en: '__TEST Lock Lesson (safe to delete)',
      title_ar: '',
      order: 9999,
      coverImage: '',
      duration_min: 5,
      difficulty: 'beginner',
      prerequisites_en: [],
      prerequisites_ar: [],
      materials: [],
      body: [{ type: 'paragraph', en: 'Updated content ' + Date.now(), html_en: '<p>Updated</p>' }],
      forceNew: false,
      status: 'draft',
      ownerId: devId,
      version,
      ...extraBody,
    })
  })
}

async function lockLesson(devId, opts = {}) {
  return fetch(`${BASE}/api/lessons/lock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-developer-id': devId },
    body: JSON.stringify({
      wikiSlug: WIKI,
      lessonId: TEST_LESSON_ID,
      ...opts,
    })
  })
}

async function unlockLesson(devId) {
  return fetch(`${BASE}/api/lessons/lock?wiki=${WIKI}&id=${TEST_LESSON_ID}`, {
    method: 'DELETE',
    headers: { 'x-developer-id': devId },
  })
}

async function getLesson() {
  return fetch(`${BASE}/api/lessons/${TEST_LESSON_ID}?wiki=${WIKI}`)
}

async function deleteLesson(devId) {
  // The DELETE endpoint requires superadmin, use DEV_A which is admin
  return fetch(`${BASE}/api/lessons/${TEST_LESSON_ID}?wiki=${WIKI}`, {
    method: 'DELETE',
    headers: { 'x-developer-id': devId },
  })
}

// ======= TEST SUITES =======

async function setupTestLesson() {
  console.log('\n📦 SETUP: Creating temporary test lesson...')
  const res = await createLesson(DEV_A_ID)
  const data = await res.json()
  if (!res.ok) {
    console.log(`   ❌ SETUP FAILED: ${data.error || JSON.stringify(data)}`)
    console.log('   Cannot proceed without a test lesson.')
    process.exit(1)
  }
  console.log(`   ✅ Created: id="${data.lesson?.id || TEST_LESSON_ID}" slug="${data.lesson?.slug || TEST_LESSON_SLUG}"`)
  return data
}

async function testSuite1_LockAcquisition() {
  console.log('\n' + '═'.repeat(50))
  console.log('SUITE 1: Lock Acquisition & Ownership')
  console.log('═'.repeat(50))

  // 1.1 Dev A acquires lock
  console.log('\n  [1.1] Developer A acquires lock')
  const r1 = await lockLesson(DEV_A_ID)
  const d1 = await r1.json()
  assert(r1.ok, 'HTTP 200')
  assert(d1.locked === false, 'locked=false (we got it)')
  assert(d1.success === true, 'success=true')
  assert(typeof d1.version === 'number', `version returned (${d1.version})`)

  // 1.2 Dev A renews lock
  console.log('\n  [1.2] Developer A renews lock')
  const r2 = await lockLesson(DEV_A_ID)
  const d2 = await r2.json()
  assert(r2.ok, 'HTTP 200 on renewal')
  assert(d2.locked === false, 'Still ours on renewal')

  // 1.3 Dev B is blocked
  console.log('\n  [1.3] Developer B tries to acquire (should be blocked)')
  const r3 = await lockLesson(DEV_B_ID)
  const d3 = await r3.json()
  assert(r3.ok, 'HTTP 200 (no server error)')
  assert(d3.locked === true, 'locked=true (blocked)')
  assert(typeof d3.lockedBy === 'string' && d3.lockedBy.length > 0, `lockedBy: "${d3.lockedBy}"`)
  assert(d3.lockedUntil !== undefined, 'lockedUntil timestamp present')

  // 1.4 Unauthorized request
  console.log('\n  [1.4] No developer ID → 401')
  const r4 = await fetch(`${BASE}/api/lessons/lock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ wikiSlug: WIKI, lessonId: TEST_LESSON_ID })
  })
  assert(r4.status === 401, 'Missing dev ID returns 401')

  // Cleanup
  await unlockLesson(DEV_A_ID)
}

async function testSuite2_LockRelease() {
  console.log('\n' + '═'.repeat(50))
  console.log('SUITE 2: Lock Release & Handoff')
  console.log('═'.repeat(50))

  // 2.1 Dev A acquires, then releases
  console.log('\n  [2.1] Developer A acquires and releases')
  await lockLesson(DEV_A_ID)
  const r1 = await unlockLesson(DEV_A_ID)
  const d1 = await r1.json()
  assert(r1.ok, 'DELETE returns 200')
  assert(d1.success === true, 'success=true on release')

  // 2.2 Dev B can now acquire
  console.log('\n  [2.2] Developer B acquires after A released')
  const r2 = await lockLesson(DEV_B_ID)
  const d2 = await r2.json()
  assert(d2.locked === false, 'B got the lock')

  // 2.3 Dev A cannot steal B's lock via DELETE
  console.log('\n  [2.3] Developer A cannot release B\'s lock')
  await unlockLesson(DEV_A_ID)  // A tries to release
  const r3 = await lockLesson(DEV_A_ID)
  const d3 = await r3.json()
  assert(d3.locked === true, 'B still holds lock after A tried to release')

  // 2.4 Dev B releases
  console.log('\n  [2.4] Developer B releases their own lock')
  await unlockLesson(DEV_B_ID)
  const r4 = await lockLesson(DEV_A_ID)
  const d4 = await r4.json()
  assert(d4.locked === false, 'Lock is free after B released')
  await unlockLesson(DEV_A_ID)
}

async function testSuite3_VersionTracking() {
  console.log('\n' + '═'.repeat(50))
  console.log('SUITE 3: Version Tracking on Save')
  console.log('═'.repeat(50))

  // 3.1 First save should work and return version
  console.log('\n  [3.1] Save with correct version succeeds')
  await unlockLesson(DEV_A_ID)
  await unlockLesson(DEV_B_ID)
  await lockLesson(DEV_A_ID)

  // Get current version from lock response
  const lockRes = await lockLesson(DEV_A_ID)
  const lockData = await lockRes.json()
  const currentVersion = lockData.version || 1

  const r1 = await saveLesson(DEV_A_ID, currentVersion)
  const d1 = await r1.json()
  assert(r1.ok, `Save with version ${currentVersion} succeeds`)
  assert(typeof d1.lesson?.version === 'number', `Response includes version (${d1.lesson?.version})`)

  const newVersion = d1.lesson?.version

  // 3.2 Save with updated version works
  console.log('\n  [3.2] Second save with incremented version succeeds')
  const r2 = await saveLesson(DEV_A_ID, newVersion)
  const d2 = await r2.json()
  assert(r2.ok, `Save with version ${newVersion} succeeds`)
  assert(d2.lesson?.version === newVersion + 1, `Version incremented to ${d2.lesson?.version}`)

  // 3.3 Save with OLD version is rejected (version conflict)
  console.log('\n  [3.3] Save with stale version is rejected')
  const r3 = await saveLesson(DEV_A_ID, 1)  // intentionally stale
  assert(r3.status === 409, `Stale version returns 409 (got ${r3.status})`)
  const d3 = await r3.json()
  assert(d3.errorCode === 'VERSION_CONFLICT', `errorCode is VERSION_CONFLICT`)

  await unlockLesson(DEV_A_ID)
}

async function testSuite4_LockBlocksSave() {
  console.log('\n' + '═'.repeat(50))
  console.log('SUITE 4: Lock Blocks Other Users from Saving')
  console.log('═'.repeat(50))

  // 4.1 Dev A locks, Dev B tries to save → should be rejected
  console.log('\n  [4.1] Dev A holds lock, Dev B tries to save → 409')
  await lockLesson(DEV_A_ID)

  // Get current version
  const getRes = await getLesson()
  const lesson = await getRes.json()
  const ver = lesson.version || 1

  const r1 = await saveLesson(DEV_B_ID, ver)
  assert(r1.status === 409, `B's save rejected with 409 (got ${r1.status})`)
  const d1 = await r1.json()
  assert(d1.errorCode === 'LOCKED_BY_OTHER', `errorCode is LOCKED_BY_OTHER (got ${d1.errorCode})`)

  // 4.2 Dev A saves successfully while holding lock
  console.log('\n  [4.2] Dev A saves successfully while holding lock')
  const r2 = await saveLesson(DEV_A_ID, ver)
  assert(r2.ok, 'Lock holder can save')

  await unlockLesson(DEV_A_ID)
}

async function testSuite5_EdgeCases() {
  console.log('\n' + '═'.repeat(50))
  console.log('SUITE 5: Edge Cases')
  console.log('═'.repeat(50))

  // 5.1 Lock on non-existent lesson
  console.log('\n  [5.1] Lock on non-existent lesson → 404')
  const r1 = await fetch(`${BASE}/api/lessons/lock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-developer-id': DEV_A_ID },
    body: JSON.stringify({ wikiSlug: WIKI, lessonId: 'non-existent-lesson-xyz' })
  })
  assert(r1.status === 404, `Non-existent lesson returns 404 (got ${r1.status})`)

  // 5.2 Lock with missing params
  console.log('\n  [5.2] Lock with missing params → 400')
  const r2 = await fetch(`${BASE}/api/lessons/lock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-developer-id': DEV_A_ID },
    body: JSON.stringify({ wikiSlug: WIKI })
  })
  assert(r2.status === 400, `Missing lessonId returns 400 (got ${r2.status})`)

  // 5.3 DELETE lock with missing params
  console.log('\n  [5.3] DELETE lock with missing params → 400')
  const r3 = await fetch(`${BASE}/api/lessons/lock?wiki=${WIKI}`, {
    method: 'DELETE',
    headers: { 'x-developer-id': DEV_A_ID },
  })
  assert(r3.status === 400, `Missing id returns 400 (got ${r3.status})`)

  // 5.4 Double release is safe (idempotent)
  console.log('\n  [5.4] Double release is safe (idempotent)')
  await lockLesson(DEV_A_ID)
  await unlockLesson(DEV_A_ID)
  const r4 = await unlockLesson(DEV_A_ID)
  const d4 = await r4.json()
  assert(r4.ok, 'Second release still returns 200')
  assert(d4.success === true, 'success=true on double release')

  // 5.5 Lesson GET still works after all lock operations
  console.log('\n  [5.5] Lesson GET still works correctly')
  const r5 = await getLesson()
  assert(r5.ok, 'GET lesson returns 200')
  const d5 = await r5.json()
  assert(d5.id === TEST_LESSON_ID || d5.id?.startsWith('__test-lock'), `Correct lesson returned (${d5.id})`)
}

async function cleanupTestLesson() {
  console.log('\n🧹 CLEANUP: Deleting temporary test lesson...')
  // Release any lingering locks first
  await unlockLesson(DEV_A_ID)
  await unlockLesson(DEV_B_ID)

  const res = await deleteLesson(DEV_A_ID)
  if (res.ok) {
    const data = await res.json()
    console.log(`   ✅ Deleted: ${data.deleted}`)
  } else {
    const data = await res.json()
    console.log(`   ⚠️  Cleanup note: ${data.error} (may need manual cleanup of "${TEST_LESSON_ID}")`)
  }
}

// ======= MAIN =======

async function run() {
  console.log('🔒 Document Lock — Comprehensive Test Suite')
  console.log('='.repeat(50))
  console.log(`Wiki:    ${WIKI}`)
  console.log(`Dev A:   ID=${DEV_A_ID}`)
  console.log(`Dev B:   ID=${DEV_B_ID}`)
  console.log(`Lesson:  ${TEST_LESSON_ID} (temporary)`)

  try {
    await setupTestLesson()
    await testSuite1_LockAcquisition()
    await testSuite2_LockRelease()
    await testSuite3_VersionTracking()
    await testSuite4_LockBlocksSave()
    await testSuite5_EdgeCases()
  } finally {
    await cleanupTestLesson()
  }

  console.log('\n' + '='.repeat(50))
  console.log(`RESULTS: ${passed} passed, ${failed} failed, ${skipped} skipped`)
  if (failed === 0) {
    console.log('🎉 ALL TESTS PASSED!')
  } else {
    console.log('⚠️  SOME TESTS FAILED — review output above.')
  }
  console.log()
  process.exit(failed > 0 ? 1 : 0)
}

run().catch(err => {
  console.error('💥 Test suite crashed:', err)
  cleanupTestLesson().catch(() => {})
  process.exit(1)
})
