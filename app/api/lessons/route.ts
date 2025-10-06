
import { NextResponse } from 'next/server'
import path from 'path'
import { promises as fs } from 'fs'
import { getWiki } from '@/lib/data'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type LessonBodyItem = {
  type: 'paragraph' | 'heading' | 'step' | 'callout' | 'codeTabs' | 'image'
  en?: string
  ar?: string
  title_en?: string
  title_ar?: string
  caption_en?: string
  caption_ar?: string
  variant?: 'info' | 'tip' | 'warning'
  image?: string
  arduino?: string
  makecodeUrl?: string
  level?: number
}

type NewLesson = {
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
  materials: { qty: number; name_en: string; name_ar: string; sku?: string }[]
  body: LessonBodyItem[]
}

type LessonPayload = NewLesson & { forceNew?: boolean }

function lessonsFilePath(wikiSlug: string) {
  return path.join(process.cwd(), 'data', 'lessons.' + wikiSlug + '.json')
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
}

async function readLessonsFromFile(wikiSlug: string): Promise<NewLesson[]> {
  try {
    const filePath = lessonsFilePath(wikiSlug)
    const raw = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(raw) as NewLesson[]
  } catch {
    return []
  }
}

function sortLessons(list: NewLesson[]): NewLesson[] {
  return list.slice().sort((a, b) => (a.order || 0) - (b.order || 0))
}

function generateUniqueId(baseId: string, existingLessons: NewLesson[]): string {
  let candidate = baseId
  let counter = 1
  
  while (existingLessons.some(l => l.id === candidate || l.slug === candidate)) {
    candidate = `${baseId}-${counter}`
    counter++
  }
  
  return candidate
}

export async function POST(req: Request) {
  try {
    const incoming = (await req.json()) as LessonPayload
    const { forceNew = false, ...rawLesson } = incoming
    const lesson: NewLesson = {
      ...rawLesson,
      order: Number(rawLesson.order) || 0,
      id: (rawLesson.id || rawLesson.slug || '').trim(),
      slug: (rawLesson.slug || '').trim(),
      wikiSlug: (rawLesson.wikiSlug || 'student-kit').trim(),
      title_en: (rawLesson.title_en || rawLesson.title_ar || '').trim(),
      title_ar: (rawLesson.title_ar || rawLesson.title_en || '').trim(),
      difficulty: (rawLesson.difficulty || 'Beginner').trim(),
    }

    if (!lesson.slug) {
      const basis = lesson.id || lesson.title_en
      if (basis) lesson.slug = slugify(basis)
    }

    if (!lesson.id) {
      const basis = rawLesson.slug || rawLesson.title_en || rawLesson.title_ar
      if (basis) lesson.id = slugify(basis)
    }

    if (!lesson.id || lesson.id.trim() === '') {
      lesson.id = slugify(lesson.title_en || lesson.title_ar || 'untitled')
    }
    if (!lesson.slug || lesson.slug.trim() === '') {
      lesson.slug = slugify(lesson.id || lesson.title_en || lesson.title_ar || 'untitled')
    }

    const missing: string[] = []
    if (!lesson.id || lesson.id.trim() === '') missing.push('id')
    if (!lesson.slug || lesson.slug.trim() === '') missing.push('slug')
    if (!lesson.title_en || lesson.title_en.trim() === '') missing.push('title_en')
    if (!lesson.wikiSlug || lesson.wikiSlug.trim() === '') missing.push('wikiSlug')

    if (missing.length > 0) {
      return NextResponse.json({ error: 'Missing required fields', missing }, { status: 400 })
    }

    if (!getWiki(lesson.wikiSlug)) {
      return NextResponse.json({ error: 'Unknown wiki' }, { status: 400 })
    }

    if (process.env.USE_DB === 'true') {
      try {
        const { prisma } = await import('@/lib/prisma')

        const existingRecord = await prisma.lesson.findUnique({
          where: { id: lesson.id },
          select: { order: true },
        })

        let isUpdate = !forceNew && !!existingRecord

        if (!Number.isFinite(lesson.order) || lesson.order < 1) {
          if (isUpdate && existingRecord) {
            lesson.order = existingRecord.order
          } else {
            const agg = await prisma.lesson.aggregate({
              where: { wikiSlug: lesson.wikiSlug },
              _max: { order: true },
            })
            lesson.order = (agg._max?.order || 0) + 1
          }
        }

        if (!isUpdate) {
          const ensureUnique = async (value: string, field: 'id' | 'slug'): Promise<string> => {
            const base = value && value.trim() ? value.trim() : 'lesson'
            let candidate = base
            let counter = 1
            while (true) {
              const existing = field === 'id'
                ? await prisma.lesson.findUnique({ where: { id: candidate } })
                : await prisma.lesson.findUnique({ where: { slug: candidate } })
              if (!existing) break
              candidate = `${base}-${counter++}`
            }
            return candidate
          }

          lesson.id = await ensureUnique(lesson.id, 'id')
          lesson.slug = await ensureUnique(lesson.slug, 'slug')
        }

        const dataForDb = {
          order: lesson.order,
          slug: lesson.slug,
          title_en: lesson.title_en,
          title_ar: lesson.title_ar,
          duration_min: lesson.duration_min,
          difficulty: lesson.difficulty,
          prerequisites_en: lesson.prerequisites_en as any,
          prerequisites_ar: lesson.prerequisites_ar as any,
          materials: lesson.materials as any,
          body: lesson.body as any,
        }

        const saved = isUpdate
          ? await prisma.lesson.update({
              where: { id: lesson.id },
              data: { ...dataForDb, updatedAt: new Date() },
            })
          : await prisma.lesson.create({
              data: {
                id: lesson.id,
                wikiSlug: lesson.wikiSlug,
                ...dataForDb,
              },
            })

        return NextResponse.json({
          ok: true,
          isUpdate,
          lesson: { id: saved.id, slug: saved.slug, order: saved.order },
        })
      } catch (e: any) {
        if (e?.code === 'P2002') {
          const target = e.meta?.target || []
          const fields = Array.isArray(target) ? target.join(', ') : 'unknown field'
          return NextResponse.json({ error: `A lesson with this ${fields} already exists.` }, { status: 409 })
        }
        return NextResponse.json({ error: e?.message || 'DB error' }, { status: 500 })
      }
    } else {
      const existingLessons = await readLessonsFromFile(lesson.wikiSlug)
      const existingLessonIndex = existingLessons.findIndex(l => l.id === lesson.id)
      const isUpdate = !forceNew && existingLessonIndex !== -1

      if (!isUpdate) {
        lesson.id = generateUniqueId(lesson.id, existingLessons)
        lesson.slug = generateUniqueId(lesson.slug, existingLessons)
      } else {
        console.log('Updating existing lesson in file:', { id: lesson.id, slug: lesson.slug })
      }

      const list = existingLessons
      if (isUpdate) {
        const existingLesson = list[existingLessonIndex]
        list[existingLessonIndex] = { ...existingLesson, ...lesson }
      } else {
        const maxOrder = list.reduce((max, item) => Math.max(max, item.order || 0), 0)
        if (!Number.isFinite(lesson.order) || lesson.order < 1) {
          lesson.order = maxOrder + 1
        }
        list.push(lesson)
      }

      try {
        const ordered = sortLessons(list)
        const filePath = lessonsFilePath(lesson.wikiSlug)
        const dir = path.dirname(filePath)
        await fs.mkdir(dir, { recursive: true })
        await fs.writeFile(filePath, JSON.stringify(ordered, null, 2), 'utf-8')

        return NextResponse.json({ ok: true, isUpdate, lesson: { id: lesson.id, slug: lesson.slug, order: lesson.order } })
      } catch (error) {
        console.error('Error saving lessons to file:', error)
        return NextResponse.json({ 
          error: 'Failed to save lessons',
          details: error instanceof Error ? error.message : String(error)
        }, { status: 500 })
      }
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unknown error' }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const wikiSlug = searchParams.get('wiki') || searchParams.get('kit') || 'student-kit'
    if (process.env.USE_DB === 'true') {
      try {
        const { prisma } = await import('@/lib/prisma')
        const lessons = await prisma.lesson.findMany({
          where: { wikiSlug },
          orderBy: [{ order: 'asc' }],
        })
        return NextResponse.json(lessons)
      } catch (e: any) {
        return NextResponse.json({ error: e?.message || 'DB error' }, { status: 500 })
      }
    } else {
      const list = await readLessonsFromFile(wikiSlug)
      return NextResponse.json(sortLessons(list))
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to load lessons' }, { status: 500 })
  }
}
