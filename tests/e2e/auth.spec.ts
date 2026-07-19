import { test, expect } from '@playwright/test'
import { readState } from './helpers/db'
import { freshStudentEmail, login, logout, signupStudent } from './helpers/ui'

// Flow 1: login & auth — login form, wrong password, signup, session, logout,
// and role-based redirect after login.

test('login page renders its form', async ({ page }) => {
  await page.goto('/login')
  await expect(page.locator('input[type="email"]')).toBeVisible()
  await expect(page.locator('input[type="password"]')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
})

test('wrong password is rejected with an error', async ({ page }) => {
  await page.goto('/login')
  await page.locator('input[type="email"]').fill('nobody@example.com')
  await page.locator('input[type="password"]').fill('definitely-wrong-password')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByText('Invalid email or password')).toBeVisible()
  expect(new URL(page.url()).pathname).toBe('/login')
})

test('student can sign up, stays logged in, and can log out', async ({ page }) => {
  const email = freshStudentEmail('auth')
  await signupStudent(page, email, 'E2ePw!Student1')

  // Session survives a reload.
  await page.reload()
  await expect(page.getByRole('link', { name: 'My dashboard' })).toBeVisible()

  // After logout the public header comes back.
  await logout(page)
  await page.goto('/')
  await expect(page.getByRole('link', { name: 'Log in' }).first()).toBeVisible()
})

test('teacher login redirects to the teacher dashboard', async ({ page }) => {
  const { teacher } = readState()
  await login(page, teacher.email, teacher.password)
  await page.waitForURL('**/teacher')
  await expect(page.getByRole('heading', { name: 'My classes' })).toBeVisible()
})
