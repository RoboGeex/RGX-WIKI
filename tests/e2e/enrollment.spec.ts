import { test, expect } from '@playwright/test'
import { readState } from './helpers/db'
import { freshStudentEmail, login, logout, signupStudent } from './helpers/ui'

// Flow 3: signup / join / enrollment — a new student joins a class through the
// teacher's invite link and shows up in the teacher's dashboard.

test('student joins via invite link and appears in the teacher dashboard', async ({ page }) => {
  const { teacher, linkToken } = readState()
  const studentEmail = freshStudentEmail('join')

  await signupStudent(page, studentEmail, 'E2ePw!Student1')

  await page.goto(`/join/${linkToken}`)
  // The join page enrolls and then forwards the student into the wiki.
  await page.waitForURL((url) => !url.pathname.startsWith('/join'), { timeout: 30_000 })

  // The teacher should now see this student in their class list.
  await logout(page)
  await login(page, teacher.email, teacher.password)
  await page.goto('/teacher')
  await expect(page.getByText(studentEmail)).toBeVisible({ timeout: 20_000 })
})

// KNOWN BUG (found 2026-07-16): /home crashes for every student because the
// default database is missing the Track* tables that prisma.trackAssignment
// queries (app/home/page.tsx). Un-skip once the tables exist.
test.fixme('student dashboard /home renders after signup', async ({ page }) => {
  const studentEmail = freshStudentEmail('home')
  await signupStudent(page, studentEmail, 'E2ePw!Student1')
  await page.goto('/home')
  await expect(page.getByText('Something went wrong')).not.toBeVisible()
})
