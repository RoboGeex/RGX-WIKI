import { cleanupAllTestData, deleteStateFile } from './helpers/db'

// Deletes every row the test run created (all rows use the e2e prefixes).
export default async function globalTeardown() {
  await cleanupAllTestData()
  deleteStateFile()
}
