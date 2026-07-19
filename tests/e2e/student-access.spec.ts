import { test, expect } from '@playwright/test'
import { readState } from './helpers/db'

// Flow 2: student wiki access — the unlock gate on a wiki, wrong/right access
// code, and unlock persistence (the old "unlock loop" regression).

test('visiting a locked wiki redirects to the unlock page', async ({ page }) => {
  await page.goto('/ziggy')
  await page.waitForURL('**/unlock**')
  await expect(page.getByText('Enter the access code you received to continue.')).toBeVisible()
})

test('a wrong access code is rejected', async ({ page }) => {
  await page.goto('/ziggy')
  await page.waitForURL('**/unlock**')
  await page.locator('input[type="password"]').fill('WRONG-CODE-0000')
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByText('Invalid access code for this wiki')).toBeVisible()
})

test('the correct access code unlocks the wiki and the unlock persists', async ({ page }) => {
  const { accessCode } = readState()
  await page.goto('/ziggy')
  await page.waitForURL('**/unlock**')
  await page.locator('input[type="password"]').fill(accessCode)
  await page.getByRole('button', { name: 'Continue' }).click()
  // Unlock redirects into the wiki (to the first lesson).
  await page.waitForURL((url) => !url.pathname.includes('/unlock'), { timeout: 20_000 })

  // Regression check for the old unlock loop: going back to the wiki root must
  // NOT bounce to the unlock page again.
  await page.goto('/ziggy')
  await page.waitForTimeout(2000)
  expect(page.url()).not.toContain('/unlock')
})

// Regression guard: lesson pages used to crash on wikis whose database still
// has the legacy schema (missing Lesson.lessonKey column) because the
// fallback in lib/server-data.ts getLessonBySlug re-queried with findUnique
// without a select, which still selected the missing column.
test('an unlocked student sees the lesson content', async ({ page }) => {
  const { accessCode } = readState()
  await page.goto('/ziggy')
  await page.waitForURL('**/unlock**')
  await page.locator('input[type="password"]').fill(accessCode)
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.waitForURL((url) => !url.pathname.includes('/unlock'))
  await expect(page.getByText('Something went wrong')).not.toBeVisible()
  await expect(page.getByRole('heading').first()).toBeVisible()
})
