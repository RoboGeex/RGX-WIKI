
import { NextResponse } from 'next/server'
import path from 'path'
import { promises as fs } from 'fs'
import { getWiki } from '@/lib/data'
import { getPrisma } from '@/lib/prisma-multi'
import { canManageLesson, canManageWiki } from '@/lib/assignments'
import { findDeveloperById } from '@/lib/developers'
import { getActorIdFromRequest } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type LessonBodyItem = {
  type: 'paragraph' | 'heading' | 'step' | 'callout' | 'codeTabs' | 'image' | 'list' | 'youtube' | 'video'
  en?: string
  ar?: string
  html_en?: string
  html_ar?: string
  title_en?: string
  title_ar?: string
  caption_en?: string
  caption_ar?: string
  variant?: 'info' | 'tip' | 'warning'
  image?: string
  arduino?: string
  makecodeUrl?: string
  level?: number
  ordered?: boolean
  items_en?: string[]
  items_ar?: string[]
  url?: string
  poster?: string
  width?: number
  height?: number
  json_en?: any
  json_ar?: any
}

type NewLesson = {
  id: string
  order: number
  slug: string
  wikiSlug: string
  title_en: string
  title_ar: string
  coverImage?: string
  ownerId?: string
  lastModifiedBy?: string
  status?: string
  publishedAt?: string
  duration_min: number
  difficulty: string
  prerequisites_en: string[]
  prerequisites_ar: string[]
  materials: { qty: number; name_en: string; name_ar: string; sku?: string }[]
  body: LessonBodyItem[]
  version?: number
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

const SHOULD_ENFORCE_DEV_OWNERSHIP = process.env.ENFORCE_DEV_OWNERSHIP === 'true'

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
      coverImage: (rawLesson.coverImage || '').trim(),
      ownerId: rawLesson.ownerId?.trim() || undefined,
      lastModifiedBy: rawLesson.lastModifiedBy?.trim() || undefined,
      status: (rawLesson.status || '').trim() || 'draft',
      publishedAt: rawLesson.publishedAt || undefined,
      difficulty: (rawLesson.difficulty || 'Beginner').trim(),
      version: typeof rawLesson.version === 'number' ? rawLesson.version : undefined,
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

    const actorId = getActorIdFromRequest(req)
    let developer = actorId ? await findDeveloperById(actorId) : undefined
    
    if (!developer && process.env.NODE_ENV === 'development') {
        developer = {
            id: '1',
            email: 'admin@robogeex.com',
            name: 'Local Admin',
            role: 'admin',
            password: '',
            wikiSlugs: [],
            lessonIds: []
        }
    }
    const isAdmin = developer?.role === 'admin' || developer?.role === 'superadmin'

    if (SHOULD_ENFORCE_DEV_OWNERSHIP && !developer) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (
      SHOULD_ENFORCE_DEV_OWNERSHIP &&
      !canManageLesson(developer, lesson.wikiSlug, lesson.id || lesson.slug)
    ) {
      return NextResponse.json({ error: 'Forbidden for this wiki/lesson' }, { status: 403 })
    }

    if (!lesson.ownerId && developer?.id) {
      lesson.ownerId = developer.id
    }
    if (developer?.id) {
      lesson.lastModifiedBy = developer.id
    }

    // Enforce publish rules:
    // - If ownership enforcement is enabled, only admins can publish
    // - If ownership enforcement is disabled (default), anyone can publish
    if (SHOULD_ENFORCE_DEV_OWNERSHIP && !isAdmin) {
      lesson.status = 'draft'
      lesson.publishedAt = undefined
    } else {
      // Allow publish; set publishedAt if newly published
      if (lesson.status === 'published' && !lesson.publishedAt) {
        lesson.publishedAt = new Date().toISOString()
      }
      if (lesson.status !== 'published') {
        lesson.publishedAt = undefined
      }
    }

    if (process.env.USE_DB === 'true') {
      try {
        const prisma = getPrisma(lesson.wikiSlug)

        const existingRecord = await prisma.lesson.findUnique({
          where: { id: lesson.id },
          select: { order: true, wikiSlug: true, ownerId: true, version: true, activeEditorId: true, lockedUntil: true } as any,
        })

        const isSameWiki = existingRecord?.wikiSlug === lesson.wikiSlug
        let isUpdate = !forceNew && !!existingRecord && isSameWiki

        if (
          isUpdate &&
          SHOULD_ENFORCE_DEV_OWNERSHIP &&
          !isAdmin &&
          existingRecord?.ownerId &&
          existingRecord.ownerId !== developer?.id
        ) {
          return NextResponse.json({ error: 'Only the lesson owner or admin can edit this lesson' }, { status: 403 })
        }

        // --- Document Lock & Version Check ---
        if (isUpdate && existingRecord) {
          const clientVersion = typeof lesson.version === 'number' ? lesson.version : 1
          
          // 1. Conflict Check: Did someone else save a newer version while we were editing?
          if (existingRecord.version > clientVersion) {
            return NextResponse.json({ 
              error: 'Conflict: This lesson was modified by someone else since you opened it.',
              errorCode: 'VERSION_CONFLICT',
              currentVersion: existingRecord.version
            }, { status: 409 })
          }

          // 2. Lock Check: Is someone else currently holding the lock for this document?
          const now = new Date()
          if (
            existingRecord.activeEditorId &&
            existingRecord.activeEditorId !== developer?.id?.toString() &&
            existingRecord.lockedUntil &&
            new Date(existingRecord.lockedUntil) > now
          ) {
            return NextResponse.json({
              error: 'Conflict: This lesson is currently actively locked by another developer.',
              errorCode: 'LOCKED_BY_OTHER',
            }, { status: 409 })
          }
        }
        // -------------------------------------

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

        const ensureUnique = async (value: string, field: 'id' | 'slug'): Promise<string> => {
          const base = value && value.trim() ? value.trim() : 'lesson'
          let candidate = base
          let counter = 1
          while (true) {
            const existing = field === 'id'
              ? await prisma.lesson.findUnique({ where: { id: candidate } })
              : await prisma.lesson.findFirst({
                  where: {
                    slug: candidate,
                    wikiSlug: lesson.wikiSlug,
                  },
                })
            if (!existing) break
            candidate = `${base}-${counter++}`
          }
          return candidate
        }

        if (!isUpdate) {
          lesson.id = await ensureUnique(lesson.id, 'id')
          lesson.slug = await ensureUnique(lesson.slug, 'slug')
        } else if (existingRecord && !isSameWiki) {
          lesson.id = await ensureUnique(lesson.id, 'id')
          lesson.slug = await ensureUnique(lesson.slug, 'slug')
          isUpdate = false
        }

        const dataForDb = {
          order: lesson.order,
          slug: lesson.slug,
          title_en: lesson.title_en,
          title_ar: lesson.title_ar,
          coverImage: lesson.coverImage || null,
          ownerId: lesson.ownerId || existingRecord?.ownerId || developer?.id || null,
          lastModifiedBy: lesson.lastModifiedBy || developer?.id || null,
          status: lesson.status || 'draft',
          publishedAt: lesson.publishedAt ? new Date(lesson.publishedAt) : null,
          duration_min: lesson.duration_min,
          difficulty: lesson.difficulty,
          prerequisites_en: lesson.prerequisites_en as any,
          prerequisites_ar: lesson.prerequisites_ar as any,
          materials: lesson.materials as any,
          body: lesson.body as any,
          version: isUpdate ? (existingRecord?.version || 1) + 1 : 1,
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
          lesson: {
            id: saved.id,
            slug: saved.slug,
            order: saved.order,
            coverImage: saved.coverImage,
            ownerId: saved.ownerId || lesson.ownerId || developer?.id || null,
            status: saved.status,
            version: (saved as any).version,
          },
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

      if (
        SHOULD_ENFORCE_DEV_OWNERSHIP &&
        isUpdate &&
        !isAdmin &&
        existingLessons[existingLessonIndex]?.ownerId &&
      existingLessons[existingLessonIndex]?.ownerId !== developer?.id
      ) {
        return NextResponse.json({ error: 'Only the lesson owner or admin can edit this lesson' }, { status: 403 })
      }

      if (!isUpdate) {
        lesson.id = generateUniqueId(lesson.id, existingLessons)
        lesson.slug = generateUniqueId(lesson.slug, existingLessons)
      }

      const list = existingLessons
      if (isUpdate) {
        const existingLesson = list[existingLessonIndex]
        list[existingLessonIndex] = {
          ...existingLesson,
          ...lesson,
          status: isAdmin ? lesson.status || existingLesson.status || 'draft' : 'draft',
          publishedAt: isAdmin
            ? lesson.status === 'published'
              ? (lesson.publishedAt || existingLesson.publishedAt || new Date().toISOString())
              : undefined
            : undefined,
          lastModifiedBy: developer?.id || lesson.lastModifiedBy || existingLesson.lastModifiedBy,
          ownerId: existingLesson.ownerId || lesson.ownerId || developer?.id,
          version: (existingLesson.version || 1) + 1,
        }
      } else {
        const maxOrder = list.reduce((max, item) => Math.max(max, item.order || 0), 0)
        if (!Number.isFinite(lesson.order) || lesson.order < 1) {
          lesson.order = maxOrder + 1
        }
        list.push({
          ...lesson,
          status: isAdmin ? lesson.status || 'draft' : 'draft',
          publishedAt: isAdmin && lesson.status === 'published'
            ? lesson.publishedAt || new Date().toISOString()
            : undefined,
          ownerId: lesson.ownerId || developer?.id,
          lastModifiedBy: developer?.id || lesson.lastModifiedBy,
          version: 1,
        })
      }

      try {
        const ordered = sortLessons(list)
        const filePath = lessonsFilePath(lesson.wikiSlug)
        const dir = path.dirname(filePath)
        await fs.mkdir(dir, { recursive: true })
        await fs.writeFile(filePath, JSON.stringify(ordered, null, 2), 'utf-8')

        return NextResponse.json({
          ok: true,
          isUpdate,
          lesson: {
            id: lesson.id,
            slug: lesson.slug,
            order: lesson.order,
            ownerId: lesson.ownerId || developer?.id || null,
            status: lesson.status || 'draft',
            version: isUpdate ? list[existingLessonIndex].version : 1,
          },
        })
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

    const actorId = getActorIdFromRequest(req)
    const developer = actorId ? await findDeveloperById(actorId) : undefined
    const canSeeDrafts = !!developer && canManageWiki(developer, wikiSlug)
    const publishedOnly = !canSeeDrafts

    if (process.env.USE_DB === 'true') {
      try {
        const prisma = getPrisma(wikiSlug || undefined)
        const lessons = await prisma.lesson.findMany({
          where: {
            wikiSlug,
            ...(publishedOnly ? { status: 'published' } : {}),
          },
          orderBy: [{ order: 'asc' }],
        })
        return NextResponse.json(lessons)
      } catch (e: any) {
        return NextResponse.json({ error: e?.message || 'DB error' }, { status: 500 })
      }
    } else {
      const list = await readLessonsFromFile(wikiSlug)
      const filtered = publishedOnly ? list.filter((l) => l.status === 'published') : list
      return NextResponse.json(sortLessons(filtered))
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to load lessons' }, { status: 500 })
  }
}
