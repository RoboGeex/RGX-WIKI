import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { getWiki } from "@/lib/data"
import { getWikisFromDb } from "@/lib/server-data"
import { loadLessonsForKit } from "@/lib/lesson-loader"
import { findDeveloperById } from '@/lib/developers'
import { canManageWiki } from '@/lib/assignments'
import { getPrisma } from "@/lib/prisma-multi"
import { resolveDeveloperId } from "@/lib/dev-session"

export const dynamic = "force-dynamic"

type ReorderPayload = {
  wikiSlug?: string
  kitSlug?: string
  sequence?: string[]
}

function getActorIdFromRequest(req: Request): string | undefined {
  return resolveDeveloperId(req)
}

export async function POST(req: Request) {
  try {
    const payload = (await req.json()) as ReorderPayload
    const wikiSlug = (payload.wikiSlug || "").trim()
    const kitSlug = (payload.kitSlug || "").trim()
    const sequence = Array.isArray(payload.sequence) ? payload.sequence.filter(Boolean) : []

    if (!wikiSlug || !kitSlug) {
      return NextResponse.json({ error: "wikiSlug and kitSlug are required" }, { status: 400 })
    }

    const wikiInFile = getWiki(wikiSlug)
    if (!wikiInFile) {
      let wikiInDb = false
      try {
        const dbWikis = await getWikisFromDb()
        wikiInDb = dbWikis.some((w) => w.slug === wikiSlug)
      } catch {
        // ignore — file is the fallback
      }
      if (!wikiInDb) {
        return NextResponse.json({ error: "Unknown wiki" }, { status: 400 })
      }
    }

    const actorId = getActorIdFromRequest(req)
    const developer = actorId ? await findDeveloperById(actorId) : undefined
    const isAdmin = developer?.role === 'admin' || developer?.role === 'superadmin'
    const isEnforcementOn = process.env.ENFORCE_DEV_OWNERSHIP === 'true'

    if (isEnforcementOn && !isAdmin && !canManageWiki(developer, wikiSlug)) {
      return NextResponse.json({ error: "Forbidden: You are not assigned to this wiki" }, { status: 403 })
    }

    if (!sequence.length) {
      return NextResponse.json({ error: "Nothing to reorder" }, { status: 400 })
    }

    if (process.env.USE_DB !== "true") {
      return NextResponse.json({ error: "Reordering is only supported when USE_DB is true" }, { status: 400 })
    }

    const prisma = getPrisma(wikiSlug)
    const allLessons = await loadLessonsForKit(kitSlug, wikiSlug)
    if (!allLessons.length) {
      return NextResponse.json({ error: "No lessons found for this kit" }, { status: 404 })
    }

    const LEGACY_DRAFT_SUFFIX = '--draft'
    const getRootSlug = (s: string) => s.replace(/--draft(-\d+)?$/, '')

    // Build map for quick lookup
    const lessonsBySlug = new Map(allLessons.map(lesson => [lesson.slug, lesson]))
    
    // Map sequence to lesson objects
    const ordered = sequence
      .map(slug => lessonsBySlug.get(slug) || lessonsBySlug.get(getRootSlug(slug)) || lessonsBySlug.get(`${slug}${LEGACY_DRAFT_SUFFIX}`))
      .filter((lesson): lesson is typeof allLessons[0] => !!lesson)
    
    const seenRootSlugs = new Set(ordered.map((lesson) => getRootSlug(lesson.slug)))
    const remaining = allLessons.filter(lesson => !seenRootSlugs.has(getRootSlug(lesson.slug)))
    const finalOrder = [...ordered, ...remaining]
    
    // Update every row of each lesson's family, not just the exact
    // slug/slug--draft pair: legacy drafts can carry bumped suffixes
    // ("--draft-1") or a renamed slug, and a missed row keeps a stale `order`
    // — which diverges the editor and wiki ordering and shows a phantom
    // "Changed" badge (order participates in the content comparison).
    type LessonRowMeta = { id: string; slug: string | null; lessonKey?: string | null }
    let allRows: LessonRowMeta[]
    try {
      allRows = (await prisma.$queryRawUnsafe(
        'SELECT `id`, `slug`, `lessonKey` FROM `Lesson` WHERE `wikiSlug` = ?',
        wikiSlug
      )) as LessonRowMeta[]
    } catch {
      // lessonKey column doesn't exist on legacy wiki DBs
      allRows = (await prisma.$queryRawUnsafe(
        'SELECT `id`, `slug` FROM `Lesson` WHERE `wikiSlug` = ?',
        wikiSlug
      )) as LessonRowMeta[]
    }

    const claimed = new Set<string>()
    const updates: { ids: string[]; order: number }[] = []
    finalOrder.forEach((lesson, idx) => {
      const candidates = new Set(
        [
          getRootSlug(lesson.slug || ''),
          getRootSlug((lesson as any).id || ''),
          ((lesson as any).lessonKey || '').trim(),
        ].filter(Boolean)
      )
      const ids = allRows
        .filter((row) => !claimed.has(row.id))
        .filter((row) => {
          const rowKey = typeof row.lessonKey === 'string' ? row.lessonKey.trim() : ''
          return (
            (rowKey !== '' && candidates.has(rowKey)) ||
            candidates.has(getRootSlug(row.slug || '')) ||
            candidates.has(getRootSlug(row.id || ''))
          )
        })
        .map((row) => row.id)
      ids.forEach((id) => claimed.add(id))
      if (ids.length > 0) updates.push({ ids, order: idx + 1 })
    })

    // Raw SQL on purpose: an ORM update would bump @updatedAt on draft rows,
    // which the unpublished-changes heuristic reads as an edit.
    await prisma.$transaction(
      updates.map(({ ids, order }) =>
        prisma.$executeRawUnsafe(
          `UPDATE \`Lesson\` SET \`order\` = ? WHERE \`wikiSlug\` = ? AND \`id\` IN (${ids.map(() => '?').join(', ')})`,
          order,
          wikiSlug,
          ...ids
        )
      )
    )

    revalidatePath('/', 'layout')
    return NextResponse.json({ ok: true })

  } catch (error: any) {
    console.error("Failed to reorder lessons:", error)
    return NextResponse.json({ error: error?.message || "Failed to reorder lessons" }, { status: 500 })
  }
}
