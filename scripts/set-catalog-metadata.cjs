// Assign catalog Category tags + Level to each wiki, so the /wikis and hub-root
// catalog facets have something to filter on.
//
//   node scripts/set-catalog-metadata.cjs            # DRY RUN — prints a diff
//   node scripts/set-catalog-metadata.cjs --apply    # writes to the database
//   node scripts/set-catalog-metadata.cjs --apply --force   # also overwrite existing tags
//
// Only wikis listed in MAPPING are touched; anything else is left alone.
// By default a wiki that already has tags is skipped (use --force to replace).
const common = require('./dev-test-common.cjs')
common.loadEnv()
const { PrismaClient } = require('@prisma/client')

const APPLY = process.argv.includes('--apply')
const FORCE = process.argv.includes('--force')

// Editorial mapping, inferred from each wiki's subject matter.
// `tags` drive the Category facet; `grade` drives the Level facet.
const MAPPING = {
  'ziggy':                        { tags: ['Robotics'],            grade: 'Beginner' },
  'clicky':                       { tags: ['Robotics'],            grade: 'Beginner' },
  'arduino-lvl1':                 { tags: ['Robotics'],            grade: 'Beginner' },
  'smart-systems-using-arduino':  { tags: ['Robotics'],            grade: 'Intermediate' },
  'smart-systems-using-rgx':      { tags: ['Robotics'],            grade: 'Intermediate' },
  'smart-systems-using-microbit': { tags: ['Robotics', 'Coding'],  grade: 'Intermediate' },
  'i-project-kit-projects':       { tags: ['Robotics'],            grade: 'Intermediate' },

  'scratch-jr':                   { tags: ['Coding'],              grade: 'Beginner' },
  'scratch':                      { tags: ['Coding'],              grade: 'Beginner' },
  'coding-using-microbit':        { tags: ['Coding'],              grade: 'Beginner' },
  'video-games-using-microbit':   { tags: ['Coding'],              grade: 'Beginner' },
  'mobile-apps':                  { tags: ['Coding'],              grade: 'Intermediate' },

  '3d-design-using-tinkercad':    { tags: ['3D Design'],           grade: 'Beginner' },
  '3d-design-using-pictoblox':    { tags: ['3D Design'],           grade: 'Beginner' },
  'fusion-360':                   { tags: ['3D Design'],           grade: 'Advanced' },

  'resources-ai-challenge':       { tags: ['AI'],                  grade: 'Advanced' },
}

const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } })

function sameTags(a, b) {
  const x = Array.isArray(a) ? a : []
  return x.length === b.length && x.every((v, i) => v === b[i])
}

;(async () => {
  console.log(APPLY ? '=== APPLYING ===' : '=== DRY RUN (pass --apply to write) ===')
  const wikis = await prisma.wiki.findMany({ select: { slug: true, displayName: true, grade: true, tags: true } })

  let changed = 0
  let skipped = 0
  for (const wiki of wikis) {
    const target = MAPPING[wiki.slug]
    if (!target) { console.log(`  -  ${wiki.slug.padEnd(30)} not in mapping — untouched`); continue }

    const currentTags = Array.isArray(wiki.tags) ? wiki.tags : []
    if (currentTags.length > 0 && !FORCE && !sameTags(currentTags, target.tags)) {
      console.log(`  !  ${wiki.slug.padEnd(30)} has tags ${JSON.stringify(currentTags)} — skipped (use --force)`)
      skipped++
      continue
    }

    const tagsSame = sameTags(currentTags, target.tags)
    const gradeSame = (wiki.grade || '') === target.grade
    if (tagsSame && gradeSame) { console.log(`  =  ${wiki.slug.padEnd(30)} already correct`); continue }

    console.log(`  ${APPLY ? '>' : '~'}  ${wiki.slug.padEnd(30)} tags ${JSON.stringify(currentTags)} -> ${JSON.stringify(target.tags)} | grade ${JSON.stringify(wiki.grade)} -> ${JSON.stringify(target.grade)}`)
    if (APPLY) {
      await prisma.wiki.update({
        where: { slug: wiki.slug },
        data: { tags: target.tags, grade: target.grade },
      })
    }
    changed++
  }

  console.log(`\n${APPLY ? 'updated' : 'would update'}: ${changed} | skipped: ${skipped} | total wikis: ${wikis.length}`)

  if (APPLY) {
    const after = await prisma.wiki.findMany({ select: { grade: true, tags: true } })
    const cats = new Set(); const levels = new Set()
    for (const w of after) {
      ;(Array.isArray(w.tags) ? w.tags : []).forEach((t) => cats.add(t))
      if (w.grade) levels.add(w.grade)
    }
    console.log('facets now available:')
    console.log('  Category:', [...cats].sort().join(', ') || '(none)')
    console.log('  Level   :', [...levels].sort().join(', ') || '(none)')
  }
  await prisma.$disconnect()
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1) })
