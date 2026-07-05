import { NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma-multi'
import { getActorIdFromRequest } from '@/lib/api-auth'
import { findDeveloperById } from '@/lib/developers'
import { canManageWiki, canEditLesson } from '@/lib/assignments'
import { pickEditableVersion } from '@/lib/lesson-versions'

export const dynamic = 'force-dynamic'

function isLessonKeyUnsupportedError(error: any): boolean {
  const message = typeof error?.message === 'string' ? error.message : ''
  const lowerMessage = message.toLowerCase()
  const missingColumn =
    lowerMessage.includes('lessonkey') &&
    (lowerMessage.includes('does not exist') || lowerMessage.includes('unknown field') || lowerMessage.includes('unknown argument'))
  const metaColumn = typeof error?.meta?.column === 'string' ? error.meta.column.toLowerCase() : ''
  const prismaMetaColumn = metaColumn.endsWith('.lesson.lessonkey') || metaColumn === 'lessonkey'
  return (
    message.includes('Unknown argument `lessonKey`') ||
    message.includes('Unknown field `lessonKey`') ||
    missingColumn ||
    prismaMetaColumn
  )
}

const LEGACY_DRAFT_SUFFIX = '--draft'
const LEGACY_DRAFT_SUFFIX_RE = /--draft(-\d+)?$/

const legacyLessonSelect = {
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
  version: true,
  activeEditorId: true,
  lockedUntil: true,
} as const

function stripLegacyDraftSuffix(value: string | undefined | null): string {
  const normalized = (value || '').trim()
  return normalized.replace(LEGACY_DRAFT_SUFFIX_RE, '')
}

function toLegacyDraftValue(value: string | undefined | null): string {
  const normalized = stripLegacyDraftSuffix(value) || 'lesson'
  return `${normalized}${LEGACY_DRAFT_SUFFIX}`
}

function mapLegacyLessonRow(row: any) {
  return {
    ...row,
    lessonKey: row.lessonKey || row.id,
  }
}

export async function POST(req: Request) {
  try {
    const actorId = getActorIdFromRequest(req)
    if (!actorId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { wikiSlug, lessonId } = body

    if (!wikiSlug || !lessonId) {
      return NextResponse.json({ error: 'Missing wikiSlug or lessonId' }, { status: 400 })
    }

    const developer = await findDeveloperById(actorId)

    const prisma: any = getPrisma(wikiSlug)

    let matched: any
    try {
      const exact = await prisma.lesson.findUnique({ where: { id: lessonId } })
      if (exact && exact.wikiSlug === wikiSlug) {
        matched = exact
      } else {
        matched = await prisma.lesson.findFirst({
          where: {
            wikiSlug,
            OR: [{ slug: lessonId }, { lessonKey: lessonId }],
          },
          orderBy: [{ version: 'desc' }, { updatedAt: 'desc' }],
          select: { id: true, lessonKey: true },
        })
      }
    } catch (error: any) {
      if (!isLessonKeyUnsupportedError(error)) throw error
      const row = await prisma.lesson.findFirst({
        where: {
          wikiSlug,
          OR: [{ id: lessonId }, { slug: lessonId }],
        },
        orderBy: [{ version: 'desc' }, { updatedAt: 'desc' }],
        select: legacyLessonSelect,
      })
      matched = row ? mapLegacyLessonRow(row) : row
    }

    if (!matched) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
    }

    let familyRows: any[] = []
    try {
      familyRows = await prisma.lesson.findMany({
        where: { wikiSlug, lessonKey: matched.lessonKey || matched.id },
        orderBy: [{ version: 'desc' }, { updatedAt: 'desc' }],
      })
    } catch (error: any) {
      if (!isLessonKeyUnsupportedError(error)) throw error
      const baseId = stripLegacyDraftSuffix((matched as any)?.id)
      const baseSlug = stripLegacyDraftSuffix((matched as any)?.slug)
      const legacyRows = await prisma.lesson.findMany({
        where: {
          wikiSlug,
          OR: [
            ...(baseId ? [{ id: baseId }, { id: toLegacyDraftValue(baseId) }] : []),
            ...(baseSlug ? [{ slug: baseSlug }, { slug: toLegacyDraftValue(baseSlug) }] : []),
          ],
        },
        orderBy: [{ version: 'desc' }, { updatedAt: 'desc' }],
        select: legacyLessonSelect,
      })
      familyRows = legacyRows.map(mapLegacyLessonRow)
    }
    if (!Array.isArray(familyRows) || familyRows.length === 0) {
      familyRows = [matched]
    }
    const lesson = pickEditableVersion(familyRows)

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
    }

    const now = new Date()
    const lockDuration = 2 * 60 * 1000 // 2 minutes

    // Determine if we can acquire or renew the lock
    const isLockedBySomeoneElse =
      lesson.activeEditorId &&
      lesson.activeEditorId !== actorId &&
      lesson.lockedUntil &&
      lesson.lockedUntil > now

    if (isLockedBySomeoneElse) {
      const editor = await findDeveloperById(lesson.activeEditorId || '')

      return NextResponse.json({
        locked: true,
        lockedBy: editor?.name || editor?.email || 'Another developer',
        lockedUntil: lesson.lockedUntil,
        version: lesson.version
      })
    }

    // Now that we know it's not locked by someone else, check if the user is ALLOWED to lock it
    if (!canEditLesson(developer, wikiSlug, lesson.ownerId)) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to edit (or lock) this lesson' }, { status: 403 })
    }

    // Acquire or renew lock
    const newLockTime = new Date(now.getTime() + lockDuration)
    await prisma.lesson.update({
      where: { id: lesson.id },
      data: {
        activeEditorId: actorId,
        lockedUntil: newLockTime
      },
      select: { id: true }
    })

    return NextResponse.json({
      locked: false,
      success: true,
      lessonId: lesson.id,
      lockedUntil: newLockTime,
      version: lesson.version
    })

  } catch (error: any) {
    console.error('Lock error:', error)
    return NextResponse.json({ error: error.message || 'Failed to acquire lock' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const actorId = getActorIdFromRequest(req)
    if (!actorId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const wikiSlug = searchParams.get('wiki')
    const lessonId = searchParams.get('id')

    if (!wikiSlug || !lessonId) {
      return NextResponse.json({ error: 'Missing wikiSlug or id' }, { status: 400 })
    }

    const prisma: any = getPrisma(wikiSlug)

    const developer = await findDeveloperById(actorId)

    if (!canManageWiki(developer, wikiSlug)) {
      return NextResponse.json({ error: 'Access denied: You are not assigned to this wiki' }, { status: 403 })
    }

    let matched: any
    try {
      const exact = await prisma.lesson.findUnique({ where: { id: lessonId } })
      if (exact && exact.wikiSlug === wikiSlug) {
        matched = exact
      } else {
        matched = await prisma.lesson.findFirst({
          where: {
            wikiSlug,
            OR: [{ slug: lessonId }, { lessonKey: lessonId }],
          },
          orderBy: [{ version: 'desc' }, { updatedAt: 'desc' }],
          select: { id: true, lessonKey: true },
        })
      }
    } catch (error: any) {
      if (!isLessonKeyUnsupportedError(error)) throw error
      const row = await prisma.lesson.findFirst({
        where: {
          wikiSlug,
          OR: [{ id: lessonId }, { slug: lessonId }],
        },
        orderBy: [{ version: 'desc' }, { updatedAt: 'desc' }],
        select: { id: true },
      })
      matched = row ? mapLegacyLessonRow(row) : row
    }

    if (!matched) {
      return NextResponse.json({ success: true })
    }

    let familyRows: any[] = []
    try {
      familyRows = await prisma.lesson.findMany({
        where: { wikiSlug, lessonKey: matched.lessonKey || matched.id },
        orderBy: [{ version: 'desc' }, { updatedAt: 'desc' }],
      })
    } catch (error: any) {
      if (!isLessonKeyUnsupportedError(error)) throw error
        const single = await prisma.lesson.findUnique({
          where: { id: matched.id },
          select: legacyLessonSelect,
        })
        if (!single) {
          familyRows = []
        } else {
          const baseId = stripLegacyDraftSuffix((single as any)?.id)
          const baseSlug = stripLegacyDraftSuffix((single as any)?.slug)
          const legacyRows = await prisma.lesson.findMany({
            where: {
              wikiSlug,
              OR: [
                ...(baseId ? [{ id: baseId }, { id: toLegacyDraftValue(baseId) }] : []),
                ...(baseSlug ? [{ slug: baseSlug }, { slug: toLegacyDraftValue(baseSlug) }] : []),
              ],
            },
            orderBy: [{ version: 'desc' }, { updatedAt: 'desc' }],
            select: legacyLessonSelect,
          })
          familyRows = legacyRows.map(mapLegacyLessonRow)
        }
    }
    const lesson = pickEditableVersion(familyRows)

    if (lesson?.activeEditorId === actorId) {
      await prisma.lesson.update({
        where: { id: lesson.id },
        data: {
          activeEditorId: null,
          lockedUntil: null
        },
        select: { id: true }
      })
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Release lock error:', error)
    return NextResponse.json({ error: error.message || 'Failed to release lock' }, { status: 500 })
  }
}
