---
name: verify
description: How to run and verify RGX-WIKI lesson/status changes end-to-end against real data.
---

# Verifying RGX-WIKI changes

## Run the app with the database

`.env.local` sets `USE_DB=false` (file mode — most API routes 503 or use JSON files).
To exercise the real DB paths, create `RGX-WIKI/.env.development.local` containing
`USE_DB=true` (it outranks `.env.local`; it is NOT gitignored — delete it afterward),
then `npm run dev:next` (or the "Next.js Dev (custom server)" launch config).

## Auth for API calls

Send `x-user-id: <developer id>`. Developer accounts live in the default DB
(`Developer` table). Id 20 is a superadmin with access to the `ziggy` sandbox wiki.
The editor UI reads `localStorage['rgx.devId']`.

## Safe playground

Wiki `ziggy` (DB `dbxlgrkia4t3ai`) is test data. Create lessons there via
`POST /api/lessons` and clean up with `DELETE /api/lessons/<id>?wiki=ziggy`
(superadmin) when done.

## Gotchas

- All per-wiki DBs are missing the `lessonKey` column → saves run the legacy
  `--draft`-suffix path (`saveLegacyLessonInDb`), not the modern lessonKey path.
  Only the default/hub DB has the modern schema.
- Lesson status truth: a lesson family = published row + `<id>--draft` row.
  "Changed" = `hasUnpublishedLessonChanges(draft, published)` — content comparison
  when bodies present, timestamp heuristic (`draft.updatedAt > publishedAt + 2s`)
  for body-less list rows. Never bump `updatedAt` on draft rows outside real
  content saves (use raw SQL for lock/order writes).
- Read-only row inspection: small Node scripts with `@prisma/client` and
  `$queryRawUnsafe` against the per-wiki URLs in `.env` (pattern in
  `scripts/fix-phantom-changed.cjs`).
