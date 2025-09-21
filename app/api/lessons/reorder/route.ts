
import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import { getWiki } from "@/lib/data"

export const dynamic = "force-dynamic"

type ReorderPayload = {
  wikiSlug?: string
  sequence?: string[]
}

type LessonRecord = {
  id: string
  order: number
  slug: string
  wikiSlug: string
  title_en: string
  title_ar: string
  duration_min: number
  difficulty: string
  prerequisites_en: string[]
  prerequisites_ar: string[]
  materials: any[]
  body: any
}

function lessonsFilePath(wikiSlug: string) {
  return path.join(process.cwd(), "data", `lessons.${wikiSlug}.json`)
}

async function readLessonsFromFile(wikiSlug: string): Promise<LessonRecord[]> {
  try {
    const file = lessonsFilePath(wikiSlug)
    const raw = await fs.readFile(file, "utf-8")
    return JSON.parse(raw) as LessonRecord[]
  } catch {
    return []
  }
}

export async function POST(req: Request) {
  try {
    const payload = (await req.json()) as ReorderPayload
    const wikiSlug = (payload.wikiSlug || "").trim()
    const sequence = Array.isArray(payload.sequence) ? payload.sequence.filter(Boolean) : []

    console.log('Reorder API called:', { wikiSlug, sequence })

    if (!wikiSlug) {
      return NextResponse.json({ error: "wikiSlug is required" }, { status: 400 })
    }
    if (!getWiki(wikiSlug)) {
      return NextResponse.json({ error: "Unknown wiki" }, { status: 400 })
    }
    if (!sequence.length) {
      return NextResponse.json({ error: "Nothing to reorder" }, { status: 400 })
    }

    if (process.env.USE_DB === "true") {
      const { prisma } = await import("@/lib/prisma")
      if (!prisma) {
        return NextResponse.json({ error: "Database client unavailable" }, { status: 500 })
      }
      const existing = await prisma.lesson.findMany({ where: { wikiSlug }, orderBy: { order: "asc" } })
      if (!existing.length) {
        return NextResponse.json({ error: "No lessons found for wiki" }, { status: 404 })
      }
      const seen = new Set<string>()
      const ordered: typeof existing = []
      
      // Always put getting-started first if it exists
      const gettingStarted = existing.find((item) => item.slug === 'getting-started')
      if (gettingStarted) {
        ordered.push(gettingStarted)
        seen.add('getting-started')
      }
      
      // Add other lessons in the sequence order
      for (const slug of sequence) {
        if (seen.has(slug) || slug === 'getting-started') continue
        const lesson = existing.find((item) => item.slug === slug)
        if (lesson) {
          ordered.push(lesson)
          seen.add(slug)
        }
      }
      const remainder = existing.filter((lesson) => !seen.has(lesson.slug))
      const finalOrder = [...ordered, ...remainder]
      
      console.log('Database reorder - final order:', finalOrder.map((l, i) => ({ slug: l.slug, order: i + 1 })))
      
      await prisma.$transaction(
        finalOrder.map((lesson, idx) =>
          prisma.lesson.update({ where: { slug: lesson.slug }, data: { order: idx + 1 } })
        )
      )
      return NextResponse.json({ ok: true })
    }

    const lessons = await readLessonsFromFile(wikiSlug)
    if (!lessons.length) {
      return NextResponse.json({ error: "No lessons found for wiki" }, { status: 404 })
    }

    const bySlug = new Map<string, LessonRecord>()
    lessons.forEach((lesson) => bySlug.set(lesson.slug, lesson))

    const seen = new Set<string>()
    const reordered: LessonRecord[] = []
    
    // Always put getting-started first if it exists
    const gettingStarted = bySlug.get('getting-started')
    if (gettingStarted) {
      reordered.push({ ...gettingStarted })
      seen.add('getting-started')
    }
    
    // Add other lessons in the sequence order
    for (const slug of sequence) {
      if (seen.has(slug) || slug === 'getting-started') continue
      const lesson = bySlug.get(slug)
      if (lesson) {
        reordered.push({ ...lesson })
        seen.add(slug)
      }
    }

    const remaining = lessons
      .filter((lesson) => !seen.has(lesson.slug))
      .sort((a, b) => (a.order || 0) - (b.order || 0))

    const finalList = [...reordered, ...remaining].map((lesson, idx) => ({
      ...lesson,
      order: idx + 1,
    }))

    console.log('File reorder - final order:', finalList.map((l, i) => ({ slug: l.slug, order: i + 1 })))

    const file = lessonsFilePath(wikiSlug)
    await fs.writeFile(file, JSON.stringify(finalList, null, 2), "utf-8")
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to reorder lessons" }, { status: 500 })
  }
}
