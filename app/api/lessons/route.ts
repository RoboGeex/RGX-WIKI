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
    const incoming = (await req.json()) as NewLesson
    const lesson: NewLesson = {
      ...incoming,
      order: Number(incoming.order) || 0,
      id: (incoming.id || incoming.slug || '').trim(),
      slug: (incoming.slug || '').trim(),
      wikiSlug: (incoming.wikiSlug || 'student-kit').trim(),
      title_en: (incoming.title_en || incoming.title_ar || '').trim(),
      title_ar: (incoming.title_ar || incoming.title_en || '').trim(),
      difficulty: (incoming.difficulty || 'Beginner').trim(),
    }

    if (!lesson.slug) {
      const basis = lesson.id || lesson.title_en
      if (basis) lesson.slug = slugify(basis)
    }

    if (!lesson.id) {
      const basis = incoming.slug || incoming.title_en || incoming.title_ar
      if (basis) lesson.id = slugify(basis)
    }

    // Final validation - ensure we have valid non-empty values
    if (!lesson.id || lesson.id.trim() === '') {
      lesson.id = slugify(lesson.title_en || lesson.title_ar || 'untitled')
    }
    if (!lesson.slug || lesson.slug.trim() === '') {
      lesson.slug = slugify(lesson.id || lesson.title_en || lesson.title_ar || 'untitled')
    }
    
    // Load existing lessons to check for existing lesson
    const existingLessons = await readLessonsFromFile(lesson.wikiSlug)
    const existingLessonIndex = existingLessons.findIndex(l => l.id === lesson.id)
    const isUpdate = existingLessonIndex !== -1

    // Only generate new ID/slug for new lessons
    if (!isUpdate) {
      // Generate unique ID and slug if they conflict
      const originalId = lesson.id
      const originalSlug = lesson.slug
      lesson.id = generateUniqueId(lesson.id, existingLessons)
      lesson.slug = generateUniqueId(lesson.slug, existingLessons)
      
      console.log('Creating new lesson with ID/Slug:', {
        original: { id: originalId, slug: originalSlug },
        generated: { id: lesson.id, slug: lesson.slug },
        existingCount: existingLessons.length
      })
    } else {
      console.log('Updating existing lesson:', { id: lesson.id, slug: lesson.slug })
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
        
        if (!isUpdate) {
          // For new lessons, check for conflicts
          const existing = await prisma.lesson.findFirst({ 
            where: { 
              OR: [
                { id: lesson.id },
                { slug: lesson.slug }
              ]
            } 
          })
          if (existing) return NextResponse.json({ error: 'ID or slug already exists' }, { status: 409 })
        }

        const agg = await prisma.lesson.aggregate({ 
          where: { wikiSlug: lesson.wikiSlug }, 
          _max: { order: true } 
        })
        const maxOrder = agg._max?.order || 0
        
        if (!Number.isFinite(lesson.order) || lesson.order < 1) {
          lesson.order = isUpdate ? existingLessons[existingLessonIndex].order : maxOrder + 1
        } else {
          lesson.order = Math.floor(lesson.order)
        }

        if (isUpdate) {
          // Update existing lesson
          await prisma.lesson.update({
            where: { id: lesson.id },
            data: {
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
              updatedAt: new Date()
            },
          })
        } else {
          // Create new lesson
          await prisma.lesson.create({
            data: {
              id: lesson.id,
              order: lesson.order,
              slug: lesson.slug,
              wikiSlug: lesson.wikiSlug,
              title_en: lesson.title_en,
              title_ar: lesson.title_ar,
              duration_min: lesson.duration_min,
              difficulty: lesson.difficulty,
              prerequisites_en: lesson.prerequisites_en as any,
              prerequisites_ar: lesson.prerequisites_ar as any,
              materials: lesson.materials as any,
              body: lesson.body as any,
            },
          })
        }
        return NextResponse.json({ ok: true, isUpdate })
      } catch (e: any) {
        return NextResponse.json({ error: e?.message || 'DB error' }, { status: 500 })
      }
    } else {
      const list = existingLessons // We already loaded this above
      
      if (isUpdate) {
        // Update existing lesson in the array
        const existingLesson = list[existingLessonIndex];
        list[existingLessonIndex] = {
          ...existingLesson, // Keep all existing fields
          // Only update the fields that should change
          title_en: lesson.title_en || existingLesson.title_en,
          title_ar: lesson.title_ar || existingLesson.title_ar,
          duration_min: lesson.duration_min || existingLesson.duration_min,
          difficulty: lesson.difficulty || existingLesson.difficulty,
          prerequisites_en: lesson.prerequisites_en || existingLesson.prerequisites_en,
          prerequisites_ar: lesson.prerequisites_ar || existingLesson.prerequisites_ar,
          materials: lesson.materials || existingLesson.materials,
          body: lesson.body || existingLesson.body,
          // Ensure these never change
          id: existingLesson.id,
          wikiSlug: existingLesson.wikiSlug,
          // Update the slug if it was explicitly changed
          slug: lesson.slug || existingLesson.slug,
          // Preserve the original order unless explicitly changed
          order: Number.isFinite(lesson.order) ? lesson.order : existingLesson.order
        }
      } else {
        // Add new lesson
        const maxOrder = list.reduce((max, item) => Math.max(max, item.order || 0), 0)
        if (!Number.isFinite(lesson.order) || lesson.order < 1) {
          lesson.order = maxOrder + 1
        } else {
          lesson.order = Math.floor(lesson.order)
        }
        list.push(lesson)
      }
      
      try {
        const ordered = sortLessons(list)
        const filePath = lessonsFilePath(lesson.wikiSlug)
        
        // Ensure the directory exists
        const dir = path.dirname(filePath)
        await fs.mkdir(dir, { recursive: true })
        
        // Write the file with pretty-printed JSON
        await fs.writeFile(filePath, JSON.stringify(ordered, null, 2), 'utf-8')
        
        // Verify the file was written
        const fileExists = await fs.access(filePath).then(() => true).catch(() => false)
        if (!fileExists) {
          throw new Error('Failed to write lesson file')
        }
        
        // Verify the content was saved correctly
        const savedContent = await fs.readFile(filePath, 'utf-8')
        const parsedContent = JSON.parse(savedContent)
        if (!Array.isArray(parsedContent)) {
          throw new Error('Invalid content format after save')
        }
        
        return NextResponse.json({ 
          ok: true, 
          isUpdate,
          count: parsedContent.length,
          savedIds: parsedContent.map((l: NewLesson) => l.id)
        })
      } catch (error) {
        console.error('Error saving lessons:', error)
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
