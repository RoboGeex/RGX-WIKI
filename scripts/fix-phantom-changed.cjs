// One-off repair for lessons stuck showing "Changed" although draft and
// published content are identical. Historic lock heartbeats and post-publish
// autosaves bumped draft.updatedAt past publishedAt, and the list views (which
// can't load bodies) read that as unpublished changes. The code paths that
// caused new drift are fixed; this aligns the already-poisoned rows.
//
// For every lesson family where the draft row's body hash and metadata are
// byte-identical to the published row, set draft.updatedAt = published
// publishedAt so the timestamp heuristic reads "Synced" again.
//
// Usage (from RGX-WIKI/):
//   node scripts/fix-phantom-changed.cjs           # dry-run, prints the plan
//   node scripts/fix-phantom-changed.cjs --apply   # writes the fix
//
// Reads DATABASE_URL / DATABASE_URL_<WIKI> entries from .env. Prints the
// previous updatedAt of every row it touches so a repair can be reverted.

const fs = require('fs')
const path = require('path')
const { PrismaClient } = require('@prisma/client')

const APPLY = process.argv.includes('--apply')

const envRaw = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8')
const urls = {}
for (const line of envRaw.split(/\r?\n/)) {
  const m = line.match(/^DATABASE_URL_([A-Z0-9_]+)="?([^"\s]+)"?/)
  if (m && m[1] !== 'DEVELOPERS') urls[m[1]] = m[2]
}
const def = envRaw.match(/^DATABASE_URL="?([^"\s]+)"?/m)
if (def) urls['__DEFAULT__'] = def[1]

const LEGACY_RE = /--draft(-\d+)?$/
const familyKey = (r) =>
  (r.lessonKey && String(r.lessonKey).trim()) || String(r.id).replace(LEGACY_RE, '') || r.id

async function repairDb(name, url) {
  const prisma = new PrismaClient({ datasources: { db: { url } } })
  const planned = []
  try {
    let rows
    try {
      rows = await prisma.$queryRawUnsafe(
        'SELECT id, lessonKey, wikiSlug, status, `order`, updatedAt, publishedAt, MD5(CAST(body AS CHAR)) AS bodyHash, title_en, title_ar, coverImage, duration_min, difficulty FROM Lesson'
      )
    } catch (e) {
      rows = await prisma.$queryRawUnsafe(
        'SELECT id, NULL as lessonKey, wikiSlug, status, `order`, updatedAt, publishedAt, MD5(CAST(body AS CHAR)) AS bodyHash, title_en, title_ar, coverImage, duration_min, difficulty FROM Lesson'
      )
    }

    const fams = new Map()
    for (const r of rows) {
      const k = familyKey(r) + '::' + r.wikiSlug
      if (!fams.has(k)) fams.set(k, [])
      fams.get(k).push(r)
    }

    for (const [, list] of fams) {
      const draft = list.find((r) => (r.status || '').toLowerCase() === 'draft')
      const pub = list.find((r) => (r.status || '').toLowerCase() === 'published')
      if (!draft || !pub) continue

      const contentSame =
        draft.bodyHash === pub.bodyHash &&
        (draft.title_en || '') === (pub.title_en || '') &&
        (draft.title_ar || '') === (pub.title_ar || '') &&
        (draft.coverImage || '') === (pub.coverImage || '') &&
        (Number(draft.duration_min) || 0) === (Number(pub.duration_min) || 0) &&
        (draft.difficulty || '') === (pub.difficulty || '') &&
        (Number(draft.order) || 0) === (Number(pub.order) || 0)
      if (!contentSame) continue

      const draftUpdated = draft.updatedAt ? new Date(draft.updatedAt).getTime() : 0
      const publishedAt =
        (pub.publishedAt ? new Date(pub.publishedAt).getTime() : 0) ||
        (pub.updatedAt ? new Date(pub.updatedAt).getTime() : 0)
      if (!draftUpdated || !publishedAt || draftUpdated - publishedAt <= 2000) continue

      planned.push({
        draftId: draft.id,
        previousUpdatedAt: new Date(draftUpdated).toISOString(),
        newUpdatedAt: new Date(publishedAt).toISOString(),
        target: new Date(publishedAt),
      })
    }

    for (const p of planned) {
      console.log(
        `  ${APPLY ? 'FIX' : 'would fix'} ${p.draftId}: updatedAt ${p.previousUpdatedAt} -> ${p.newUpdatedAt}`
      )
      if (APPLY) {
        await prisma.$executeRawUnsafe(
          'UPDATE `Lesson` SET `updatedAt` = ? WHERE `id` = ? AND `status` = ?',
          p.target,
          p.draftId,
          'draft'
        )
      }
    }
    if (!planned.length) console.log('  nothing to fix')
  } catch (e) {
    console.log(`  ERROR: ${String(e.message || e).slice(0, 300)}`)
  } finally {
    await prisma.$disconnect().catch(() => {})
  }
  return planned.length
}

;(async () => {
  console.log(APPLY ? 'APPLY mode — writing fixes' : 'DRY-RUN — pass --apply to write')
  let total = 0
  for (const [name, url] of Object.entries(urls)) {
    console.log(`\n=== ${name} (${url.split('/').pop()}) ===`)
    total += await repairDb(name, url)
  }
  console.log(`\n${APPLY ? 'Fixed' : 'Would fix'} ${total} draft row(s).`)
})()
