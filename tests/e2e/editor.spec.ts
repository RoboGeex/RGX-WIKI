import { test, expect } from '@playwright/test'
import { readState, RUN_PREFIX_LESSON } from './helpers/db'
import { login } from './helpers/ui'

// Flow 4: admin/editor — developer login, admin dashboard, and the full
// lesson lifecycle (create → save draft → publish → delete) in the ziggy
// sandbox wiki. Runs in order; later tests reuse the logged-in developer.

test.describe.serial('editor lifecycle', () => {
  test('developer login lands on the admin dashboard and it renders', async ({ page }) => {
    const { developer } = readState()
    await login(page, developer.email, developer.password)
    await page.waitForURL('**/dashboard')
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
    await expect(page.getByText('Team access')).toBeVisible()
  })

  test('create, save, publish, and delete a lesson in the ziggy sandbox', async ({ page }) => {
    const { developer, runId } = readState()
    await login(page, developer.email, developer.password)

    // New-lesson properties page (same link the "Add Lesson" button uses).
    await page.goto('/editor/properties?kit=ziggy&wiki=ziggy&new=true')
    const title = `E2E pw lesson ${runId} autotest`
    await page.locator('input[type="text"]').first().fill(title)
    // The generated id must match the cleanup prefix, e.g. e2e-pw-lesson-...
    const lessonId = `${RUN_PREFIX_LESSON}-${runId}-autotest`
    await expect(page.getByText(lessonId).first()).toBeVisible()
    await page.getByRole('button', { name: 'Open Editor' }).click()
    await page.waitForURL('**/editor/lesson**')

    // Type into the rich-text editor and save a draft.
    const editorSurface = page.locator('[contenteditable="true"]').first()
    await editorSurface.click()
    await page.keyboard.type('Automated E2E test lesson. It is deleted at the end of the test run.')
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.getByText('Not published yet')).toBeVisible({ timeout: 20_000 })

    // Publish (with its confirmation dialog).
    await page.getByRole('button', { name: 'Publish', exact: true }).click()
    await page.getByRole('button', { name: 'Confirm & Publish Now' }).click()
    await expect(page.getByText('No changes since last publish')).toBeVisible({ timeout: 20_000 })

    // The published lesson appears in the wiki's lesson list.
    await page.goto('/editor/ziggy')
    await expect(page.getByText(title).first()).toBeVisible({ timeout: 20_000 })

    // Delete through the superadmin API (cookie auth from the logged-in page);
    // global teardown would also catch it if this step ever fails.
    const res = await page.request.delete(`/api/lessons/${lessonId}?wiki=ziggy`)
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body.deletedIds).toContain(`${lessonId}--draft`)
  })
})
