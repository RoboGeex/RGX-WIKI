import { Page, expect } from '@playwright/test'
import { RUN_PREFIX_EMAIL } from './db'

// Shared UI actions used by several specs.

export async function login(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  // Successful login navigates away from /login (destination depends on role).
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 20_000 })
}

export async function logout(page: Page) {
  const res = await page.request.post('/api/auth/logout')
  expect(res.ok()).toBeTruthy()
}

export function freshStudentEmail(label: string) {
  return `${RUN_PREFIX_EMAIL}student.${label}.${Date.now().toString(36)}@example.com`
}

export async function signupStudent(page: Page, email: string, password: string) {
  await page.goto('/signup')
  await page.locator('input[type="text"]').first().fill('E2E PW Student (autotest)')
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(password)
  await page.getByRole('button', { name: 'Create account' }).click()
  // Signup logs the student in and sends them to the landing page, whose
  // header now shows the dashboard link instead of Log in / Create account.
  await expect(page.getByRole('link', { name: 'My dashboard' })).toBeVisible({ timeout: 20_000 })
}
