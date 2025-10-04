
import { NextResponse } from "next/server"
import { getWiki } from "@/lib/data"
import { loadLessonsForKit } from "@/lib/lesson-loader"

export const dynamic = "force-dynamic"

type ReorderPayload = {
  wikiSlug?: string
  kitSlug?: string
  sequence?: string[]
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
    if (!sequence.length) {
      return NextResponse.json({ error: "Nothing to reorder" }, { status: 400 })
    }

    if (process.env.USE_DB !== "true") {
      return NextResponse.json({ error: "Reordering is only supported when USE_DB is true" }, { status: 400 });
    }

    const { prisma } = await import("@/lib/prisma")
    if (!prisma) {
      return NextResponse.json({ error: "Database client unavailable" }, { status: 500 })
    }
    
    const allLessons = await loadLessonsForKit(kitSlug, wikiSlug)
    if (!allLessons.length) {
      return NextResponse.json({ error: "No lessons found for this kit" }, { status: 404 })
    }

    const lessonsBySlug = new Map(allLessons.map(lesson => [lesson.slug, lesson]))
    const seen = new Set<string>()
    const reordered: typeof allLessons = []

    const gettingStarted = allLessons.find(lesson => lesson.isGettingStarted)
    if (gettingStarted) {
      reordered.push(gettingStarted)
      seen.add(gettingStarted.slug)
    }

    for (const slug of sequence) {
      if (seen.has(slug)) continue
      const lesson = lessonsBySlug.get(slug)
      if (lesson) {
        reordered.push(lesson)
        seen.add(slug)
      }
    }

    const remaining = allLessons.filter(lesson => !seen.has(lesson.slug))
    const finalOrder = [...reordered, ...remaining]

    console.log('Database reorder - final order:', finalOrder.map((l, i) => ({ slug: l.slug, order: i + 1 })))
    
    await prisma.$transaction(
      finalOrder.map((lesson, idx) =>
        prisma.lesson.update({ where: { slug: lesson.slug, wikiSlug }, data: { order: idx + 1 } })
      )
    )

    return NextResponse.json({ ok: true })

  } catch (error: any) {
    console.error("Failed to reorder lessons:", error)
    return NextResponse.json({ error: error?.message || "Failed to reorder lessons" }, { status: 500 })
  }
}
