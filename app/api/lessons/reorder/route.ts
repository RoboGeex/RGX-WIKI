import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { getWiki } from "@/lib/data"
import { loadLessonsForKit } from "@/lib/lesson-loader"
import { findDeveloperById } from '@/lib/developers'
import { canManageWiki } from '@/lib/assignments'
import { getPrisma } from "@/lib/prisma-multi"

export const dynamic = "force-dynamic"

type ReorderPayload = {
  wikiSlug?: string
  kitSlug?: string
  sequence?: string[]
}

function getActorIdFromRequest(req: Request): string | undefined {
  const h = req.headers
  const raw =
    h.get('x-user-id') ||
    h.get('x-actor-id') ||
    h.get('x-developer-id') ||
    h.get('x-dev-id')
  return raw ? raw.trim() || undefined : undefined
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

    if (!getWiki(wikiSlug)) {
      return NextResponse.json({ error: "Unknown wiki" }, { status: 400 })
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
    const getRootSlug = (s: string) => s.endsWith(LEGACY_DRAFT_SUFFIX) ? s.slice(0, -LEGACY_DRAFT_SUFFIX.length) : s

    // Build map for quick lookup
    const lessonsBySlug = new Map(allLessons.map(lesson => [lesson.slug, lesson]))
    
    // Map sequence to lesson objects
    const ordered = sequence
      .map(slug => lessonsBySlug.get(slug) || lessonsBySlug.get(getRootSlug(slug)) || lessonsBySlug.get(`${slug}${LEGACY_DRAFT_SUFFIX}`))
      .filter((lesson): lesson is typeof allLessons[0] => !!lesson)
    
    const seenRootSlugs = new Set(ordered.map((lesson) => getRootSlug(lesson.slug)))
    const remaining = allLessons.filter(lesson => !seenRootSlugs.has(getRootSlug(lesson.slug)))
    const finalOrder = [...ordered, ...remaining]
    
    // Perform reorder in a single transaction
    await prisma.$transaction(
      finalOrder.map((lesson, idx) => {
        const baseSlug = getRootSlug(lesson.slug)
        return prisma.$executeRawUnsafe(
          "UPDATE Lesson SET `order` = ? WHERE (slug = ? OR slug = ?) AND wikiSlug = ?",
          idx + 1,
          baseSlug,
          `${baseSlug}${LEGACY_DRAFT_SUFFIX}`,
          wikiSlug
        )
      })
    )

    revalidatePath('/', 'layout')
    return NextResponse.json({ ok: true })

  } catch (error: any) {
    console.error("Failed to reorder lessons:", error)
    return NextResponse.json({ error: error?.message || "Failed to reorder lessons" }, { status: 500 })
  }
}
