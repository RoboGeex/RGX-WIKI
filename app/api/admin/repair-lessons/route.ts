// Admin-only repair for lesson families that lost their published row to the
// legacy "--draft-N" slug-collision corruption (lesson shows as published in
// the editor, but the public wiki has no published row to serve).
//
// Safety model:
//   • GET  = dry-run only. Reads rows, returns a full per-family report of
//     what WOULD be done. Never writes.
//   • POST = apply. Requires superadmin, an explicit confirm string, and an
//     explicit list of lessonKeys taken from the dry-run report. Only INSERTS
//     new published rows copied from the latest draft — it never updates or
//     deletes existing rows. Re-running is a no-op (families become healthy).
//   • Every response includes the inserted row ids, so a repair can be
//     reverted by deleting exactly those rows.

import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getPrisma } from '@/lib/prisma-multi'
import { getActorIdFromRequest } from '@/lib/api-auth'
import { findDeveloperById } from '@/lib/developers'
import { buildRepairPlan, type RepairRow } from '@/lib/lesson-repair'
import { LESSON_STATUS } from '@/lib/lesson-versions'

export const dynamic = 'force-dynamic'

const FULL_SELECT_LEGACY = {
  id: true,
  order: true,
  slug: true,
  wikiSlug: true,
  title_en: true,
  title_ar: true,
  coverImage: true,
  ownerId: true,
  lastModifiedBy: true,
  status: true,
  publishedAt: true,
  duration_min: true,
  difficulty: true,
  prerequisites_en: true,
  prerequisites_ar: true,
  materials: true,
  body: true,
  createdAt: true,
  updatedAt: true,
} as const

function isMissingColumnError(error: any): boolean {
  const message = String(error?.message || '')
  return (
    error?.code === 'P2022' ||
    /unknown column/i.test(message) ||
    /lessonKey|version/.test(String(error?.meta?.column || ''))
  )
}

async function readAllRows(prisma: any, wikiSlug: string): Promise<{ rows: RepairRow[]; hasModernColumns: boolean }> {
  try {
    const rows = await prisma.lesson.findMany({
      where: { wikiSlug },
      select: { ...FULL_SELECT_LEGACY, lessonKey: true, version: true },
      orderBy: [{ order: 'asc' }],
    })
    return { rows, hasModernColumns: true }
  } catch (error: any) {
    if (!isMissingColumnError(error)) throw error
    const rows = await prisma.lesson.findMany({
      where: { wikiSlug },
      select: FULL_SELECT_LEGACY,
      orderBy: [{ order: 'asc' }],
    })
    return { rows, hasModernColumns: false }
  }
}

// Identity comes from the signed `rgx_dev_id` cookie, which is sent
// automatically with a same-origin fetch (getActorIdFromRequest verifies it).
function getActorId(req: Request): string | undefined {
  return getActorIdFromRequest(req)
}

async function requireSuperadmin(req: Request) {
  const actorId = getActorId(req)
  const developer = actorId ? await findDeveloperById(actorId) : undefined
  if (!developer) {
    return { error: NextResponse.json({ error: 'Unauthorized: no developer session found. Log in as a superadmin on this site first.' }, { status: 401 }) }
  }
  if (developer.role !== 'superadmin') {
    return { error: NextResponse.json({ error: `Forbidden: superadmin role required (you are "${developer.role || 'unknown'}").` }, { status: 403 }) }
  }
  return { developer }
}

export async function GET(req: Request) {
  try {
    const auth = await requireSuperadmin(req)
    if ('error' in auth) return auth.error

    const { searchParams } = new URL(req.url)
    const wikiSlug = (searchParams.get('wiki') || '').trim()
    if (!wikiSlug) {
      return NextResponse.json({ error: 'Pass ?wiki=<slug> (one wiki at a time).' }, { status: 400 })
    }
    if (process.env.USE_DB !== 'true') {
      return NextResponse.json({ error: 'USE_DB is not enabled.' }, { status: 503 })
    }

    const prisma: any = getPrisma(wikiSlug)
    const { rows } = await readAllRows(prisma, wikiSlug)
    const plan = buildRepairPlan(wikiSlug, rows as RepairRow[])

    const repairableKeys = plan.families
      .filter((f) => f.action === 'create-published' || f.action === 'merge-into-family')
      .map((f) => f.lessonKey)

    return NextResponse.json({
      dryRun: true,
      ...plan,
      howToApply:
        repairableKeys.length === 0
          ? 'Nothing to repair — every lesson family already has a published row.'
          : {
              note: 'Review the families above, then POST to this endpoint with the lessonKeys you approve. "create-published" families get a new published row inserted; "merge-into-family" families get their orphaned draft renamed to rejoin the published family. Nothing is ever deleted.',
              body: {
                wiki: wikiSlug,
                confirm: `REPAIR ${wikiSlug}`,
                lessonKeys: repairableKeys,
              },
            },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Dry-run failed.' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireSuperadmin(req)
    if ('error' in auth) return auth.error
    const developer = auth.developer

    const payload = await req.json().catch(() => null)
    const wikiSlug = String(payload?.wiki || '').trim()
    const confirm = String(payload?.confirm || '')
    const lessonKeys: string[] = Array.isArray(payload?.lessonKeys)
      ? payload.lessonKeys.map((k: unknown) => String(k).trim()).filter(Boolean)
      : []

    if (!wikiSlug) {
      return NextResponse.json({ error: 'Body must include "wiki".' }, { status: 400 })
    }
    if (confirm !== `REPAIR ${wikiSlug}`) {
      return NextResponse.json(
        { error: `Confirmation mismatch. Set "confirm" to exactly "REPAIR ${wikiSlug}".` },
        { status: 400 }
      )
    }
    if (lessonKeys.length === 0) {
      return NextResponse.json(
        { error: 'Body must include a non-empty "lessonKeys" array. Run the GET dry-run first and copy the keys you approve.' },
        { status: 400 }
      )
    }
    if (process.env.USE_DB !== 'true') {
      return NextResponse.json({ error: 'USE_DB is not enabled.' }, { status: 503 })
    }

    const prisma: any = getPrisma(wikiSlug)
    const { rows, hasModernColumns } = await readAllRows(prisma, wikiSlug)
    const plan = buildRepairPlan(wikiSlug, rows as RepairRow[])

    const requested = new Set(lessonKeys)
    const toApply = plan.families.filter(
      (f) => requested.has(f.lessonKey) && f.action === 'create-published' && f.plan
    )
    const toMerge = plan.families.filter(
      (f) => requested.has(f.lessonKey) && f.action === 'merge-into-family' && f.plan
    )
    const notApplicable = lessonKeys.filter(
      (key) => !toApply.some((f) => f.lessonKey === key) && !toMerge.some((f) => f.lessonKey === key)
    )

    const rowsById = new Map(rows.map((row: any) => [row.id, row]))
    const now = new Date()
    const created: Array<{ lessonKey: string; id: string; slug: string; copiedFromDraftId: string }> = []
    const merged: Array<{
      lessonKey: string
      targetFamilyKey: string
      before: { id: string; slug: string }
      after: { id: string; slug: string }
    }> = []

    await prisma.$transaction(async (tx: any) => {
      for (const family of toMerge) {
        const draft: any = rowsById.get(family.plan!.sourceDraftId)
        if (!draft) throw new Error(`Draft row "${family.plan!.sourceDraftId}" disappeared mid-repair; aborting (nothing committed).`)

        // Guards inside the transaction: the row must still be a draft, and
        // the target id must still be free.
        const taken = await tx.lesson.findUnique({ where: { id: family.plan!.newId }, select: { id: true } })
        if (taken) continue
        const changed = hasModernColumns
          ? await tx.$executeRawUnsafe(
              'UPDATE `Lesson` SET `id` = ?, `slug` = ?, `lessonKey` = ?, `updatedAt` = ? WHERE `id` = ? AND `wikiSlug` = ? AND `status` = ?',
              family.plan!.newId, family.plan!.newSlug, family.plan!.targetFamilyKey, now,
              draft.id, wikiSlug, LESSON_STATUS.DRAFT
            )
          : await tx.$executeRawUnsafe(
              'UPDATE `Lesson` SET `id` = ?, `slug` = ?, `updatedAt` = ? WHERE `id` = ? AND `wikiSlug` = ? AND `status` = ?',
              family.plan!.newId, family.plan!.newSlug, now,
              draft.id, wikiSlug, LESSON_STATUS.DRAFT
            )
        if (changed !== 1) {
          throw new Error(`Merge of "${draft.id}" matched ${changed} rows instead of 1; aborting (nothing committed).`)
        }
        merged.push({
          lessonKey: family.lessonKey,
          targetFamilyKey: family.plan!.targetFamilyKey!,
          before: { id: draft.id, slug: draft.slug },
          after: { id: family.plan!.newId, slug: family.plan!.newSlug },
        })
      }

      for (const family of toApply) {
        const draft: any = rowsById.get(family.plan!.sourceDraftId)
        if (!draft) throw new Error(`Draft row "${family.plan!.sourceDraftId}" disappeared mid-repair; aborting (nothing committed).`)

        // Re-verify inside the transaction that the family still has no
        // published row (guards against a concurrent publish).
        const freshPublished = await tx.lesson.findFirst({
          where: {
            wikiSlug,
            status: LESSON_STATUS.PUBLISHED,
            OR: [
              { id: family.lessonKey },
              { slug: family.plan!.newSlug },
              { id: family.plan!.newId },
            ],
          },
          select: { id: true },
        })
        if (freshPublished) continue

        const columns = [
          'id', 'order', 'slug', 'wikiSlug', 'title_en', 'title_ar', 'coverImage', 'ownerId',
          'lastModifiedBy', 'status', 'publishedAt', 'duration_min', 'difficulty',
          'prerequisites_en', 'prerequisites_ar', 'materials', 'body', 'createdAt', 'updatedAt',
          ...(hasModernColumns ? ['lessonKey', 'version'] : []),
        ]
        const values: unknown[] = [
          family.plan!.newId,
          Number(draft.order) || 0,
          family.plan!.newSlug,
          wikiSlug,
          draft.title_en || '',
          draft.title_ar || '',
          draft.coverImage ?? null,
          draft.ownerId ?? null,
          developer.id,
          LESSON_STATUS.PUBLISHED,
          now,
          Number(draft.duration_min) || 30,
          draft.difficulty || 'Beginner',
          JSON.stringify(draft.prerequisites_en ?? []),
          JSON.stringify(draft.prerequisites_ar ?? []),
          JSON.stringify(draft.materials ?? []),
          JSON.stringify(draft.body ?? []),
          now,
          now,
          ...(hasModernColumns ? [family.lessonKey, family.plan!.newVersion] : []),
        ]
        const placeholders = columns.map(() => '?').join(', ')
        await tx.$executeRawUnsafe(
          `INSERT INTO \`Lesson\` (${columns.map((c) => `\`${c}\``).join(', ')}) VALUES (${placeholders})`,
          ...values
        )
        created.push({
          lessonKey: family.lessonKey,
          id: family.plan!.newId,
          slug: family.plan!.newSlug,
          copiedFromDraftId: draft.id,
        })
      }
    }, { maxWait: 20000, timeout: 20000 })

    if (created.length > 0 || merged.length > 0) {
      revalidatePath('/', 'layout')
    }

    return NextResponse.json({
      ok: true,
      wiki: wikiSlug,
      created,
      merged,
      notApplicable,
      revertNote:
        created.length > 0 || merged.length > 0
          ? 'To undo: delete the "created" row ids, and rename the "merged" rows back to their "before" id/slug. No other rows were touched.'
          : 'Nothing was written.',
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Repair failed.' }, { status: 500 })
  }
}
