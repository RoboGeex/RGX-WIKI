import { NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma-multi'
import { findDeveloperById } from '@/lib/developers'
import { canDeleteLesson, canManageWiki } from '@/lib/assignments'
import { POST as saveLesson } from '@/app/api/lessons/route'
import { hasLessonContentChanges, pickEditableVersion, pickLatestDraft, pickLatestPublished, sortVersionRowsDesc } from '@/lib/lesson-versions'

function getActorIdFromRequest(req: Request): string | undefined {
  const headers = (req as any)?.headers as Headers | undefined
  if (!headers) return undefined
  const raw =
    headers.get('x-user-id') ||
    headers.get('x-actor-id') ||
    headers.get('x-developer-id') ||
    headers.get('x-dev-id')
  return raw ? raw.trim() || undefined : undefined
}

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

const LEGACY_LESSON_OPTIONAL_COLUMNS = ['lessonkey', 'version', 'activeeditorid', 'lockeduntil'] as const

function isLegacyLessonReadSchemaError(error: any): boolean {
  if (isLessonKeyUnsupportedError(error)) return true

  const message = typeof error?.message === 'string' ? error.message : ''
  const lowerMessage = message.toLowerCase()
  const missingColumnHint =
    lowerMessage.includes('unknown column') ||
    lowerMessage.includes('does not exist') ||
    lowerMessage.includes('unknown field') ||
    lowerMessage.includes('unknown argument') ||
    lowerMessage.includes('field does not exist')
  const mentionsLegacyColumn = LEGACY_LESSON_OPTIONAL_COLUMNS.some((column) => lowerMessage.includes(column))
  const metaColumn = typeof error?.meta?.column === 'string' ? error.meta.column.toLowerCase() : ''
  const prismaMetaColumn = LEGACY_LESSON_OPTIONAL_COLUMNS.some(
    (column) => metaColumn.endsWith(`.lesson.${column}`) || metaColumn === column
  )
  const unknownPrismaField = ['version', 'activeEditorId', 'lockedUntil'].some(
    (column) => message.includes(`Unknown argument \`${column}\``) || message.includes(`Unknown field \`${column}\``)
  )
  return (missingColumnHint && mentionsLegacyColumn) || prismaMetaColumn || unknownPrismaField
}

const LEGACY_DRAFT_SUFFIX = '--draft'

const legacyLessonReadSelect = {
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

function stripLegacyDraftSuffix(value: string | undefined | null): string {
  const normalized = (value || '').trim()
  if (normalized.endsWith(LEGACY_DRAFT_SUFFIX)) {
    return normalized.slice(0, normalized.length - LEGACY_DRAFT_SUFFIX.length)
  }
  return normalized
}

function toLegacyDraftValue(value: string | undefined | null): string {
  const normalized = stripLegacyDraftSuffix(value) || 'lesson'
  return `${normalized}${LEGACY_DRAFT_SUFFIX}`
}

function mapLegacyLessonRow(row: any) {
  const normalizedLessonKey =
    row.lessonKey ||
    stripLegacyDraftSuffix(row.id || '') ||
    stripLegacyDraftSuffix(row.slug || '') ||
    row.id
  return {
    ...row,
    lessonKey: normalizedLessonKey,
    version: Number.isFinite(row?.version) ? Number(row.version) : 0,
    activeEditorId: row?.activeEditorId || null,
    lockedUntil: row?.lockedUntil || null,
  }
}

async function findLessonMatch(prisma: any, wikiSlug: string | undefined, identifier: string) {
  try {
    return await prisma.lesson.findFirst({
      where: {
        ...(wikiSlug ? { wikiSlug } : {}),
        OR: [{ id: identifier }, { slug: identifier }, { lessonKey: identifier }],
      },
      orderBy: [{ version: 'desc' }, { updatedAt: 'desc' }],
    })
  } catch (error: any) {
    if (!isLegacyLessonReadSchemaError(error)) throw error
    const row = await prisma.lesson.findFirst({
      where: {
        ...(wikiSlug ? { wikiSlug } : {}),
        OR: [{ id: identifier }, { slug: identifier }],
      },
      orderBy: [{ updatedAt: 'desc' }],
      select: legacyLessonReadSelect,
    })
    return row ? mapLegacyLessonRow(row) : row
  }
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const { searchParams } = new URL(req.url)
    const wikiSlug = searchParams.get('kit') || searchParams.get('wiki') || undefined
    const prisma: any = getPrisma(wikiSlug)

    const matched = await findLessonMatch(prisma, wikiSlug, id)
    if (!matched) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const actorId = getActorIdFromRequest(req)
    const developer = actorId ? await findDeveloperById(actorId) : undefined
    const canManage = !!developer && canManageWiki(developer, matched.wikiSlug)
    const isEnforcementOn = process.env.ENFORCE_DEV_OWNERSHIP === 'true'

    if (isEnforcementOn && developer && !canManage) {
      return NextResponse.json({ error: 'Access denied: You are not assigned to this wiki' }, { status: 403 })
    }

    const lessonKey = (matched as any).lessonKey || matched.id
    let familyRows: any[] = []
    try {
      familyRows = await prisma.lesson.findMany({
        where: { wikiSlug: matched.wikiSlug, lessonKey },
        orderBy: [{ version: 'desc' }, { updatedAt: 'desc' }],
      })
    } catch (error: any) {
      if (!isLegacyLessonReadSchemaError(error)) throw error
      const baseId = stripLegacyDraftSuffix((matched as any)?.id)
      const baseSlug = stripLegacyDraftSuffix((matched as any)?.slug)
      const legacyRows = await prisma.lesson.findMany({
        where: {
          wikiSlug: matched.wikiSlug,
          OR: [
            ...(baseId ? [{ id: baseId }, { id: toLegacyDraftValue(baseId) }] : []),
            ...(baseSlug ? [{ slug: baseSlug }, { slug: toLegacyDraftValue(baseSlug) }] : []),
          ],
        },
        orderBy: [{ updatedAt: 'desc' }],
        select: legacyLessonReadSelect,
      })
      familyRows = legacyRows.map(mapLegacyLessonRow)
    }
    if (!Array.isArray(familyRows) || familyRows.length === 0) {
      familyRows = [matched]
    }

    const selected = canManage
      ? pickEditableVersion(familyRows)
      : pickLatestPublished(familyRows)

    if (!selected) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const latestPublished = pickLatestPublished(familyRows)
    const latestDraft = pickLatestDraft(familyRows)
    const hasPublishedSnapshot = Boolean(latestPublished)
    const hasUnpublishedChanges =
      canManage &&
      hasPublishedSnapshot &&
      Boolean(latestDraft) &&
      String((selected as any)?.status || '').toLowerCase() === 'draft' &&
      hasLessonContentChanges(latestDraft, latestPublished)
    return NextResponse.json({
      ...selected,
      status: hasPublishedSnapshot ? 'published' : (selected as any)?.status,
      hasUnpublishedChanges,
      lastPublishedAt: latestPublished?.publishedAt || (selected as any)?.publishedAt || null,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to load lesson' }, { status: 500 })
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const payload = await req.json()
    const mergedPayload = {
      ...payload,
      id: payload?.id || id,
    }

    const forwardedHeaders = new Headers(req.headers)
    if (!forwardedHeaders.get('content-type')) {
      forwardedHeaders.set('content-type', 'application/json')
    }

    const saveUrl = new URL(req.url)
    saveUrl.pathname = '/api/lessons'
    saveUrl.search = ''

    const saveRequest = new Request(saveUrl.toString(), {
      method: 'POST',
      headers: forwardedHeaders,
      body: JSON.stringify(mergedPayload),
    })

    return saveLesson(saveRequest)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to update lesson' }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const actorId = getActorIdFromRequest(req)
    const developer = actorId ? await findDeveloperById(actorId) : undefined

    if (!canDeleteLesson(developer)) {
      return NextResponse.json({ error: 'Only Super Admins can delete lessons' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const wikiSlug = searchParams.get('wiki') || searchParams.get('kit') || undefined
    const prisma: any = getPrisma(wikiSlug)

    const existing = await findLessonMatch(prisma, wikiSlug, id)
    if (!existing) return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })

    const lessonKey = (existing as any).lessonKey || existing.id
    let familyRows: any[] = []
    try {
      familyRows = await prisma.lesson.findMany({
        where: { wikiSlug: existing.wikiSlug, lessonKey },
        orderBy: [{ version: 'desc' }, { updatedAt: 'desc' }],
      })
    } catch (error: any) {
      if (!isLegacyLessonReadSchemaError(error)) throw error
      const baseId = stripLegacyDraftSuffix((existing as any)?.id)
      const baseSlug = stripLegacyDraftSuffix((existing as any)?.slug)
      const legacyRows = await prisma.lesson.findMany({
        where: {
          wikiSlug: existing.wikiSlug,
          OR: [
            ...(baseId ? [{ id: baseId }, { id: toLegacyDraftValue(baseId) }] : []),
            ...(baseSlug ? [{ slug: baseSlug }, { slug: toLegacyDraftValue(baseSlug) }] : []),
          ],
        },
        orderBy: [{ updatedAt: 'desc' }],
        select: legacyLessonReadSelect,
      })
      familyRows = legacyRows.map(mapLegacyLessonRow)
    }
    if (!Array.isArray(familyRows) || familyRows.length === 0) {
      familyRows = [existing]
    }

    const latest = sortVersionRowsDesc(familyRows)[0]
    const slug = latest?.slug || existing.slug
    if (slug === 'getting-started' || slug === 'resources') {
      return NextResponse.json(
        { error: 'The "Getting Started" and "Resources" lessons cannot be deleted as they are required system lessons.' },
        { status: 400 }
      )
    }

    try {
      await prisma.lesson.deleteMany({
        where: { wikiSlug: existing.wikiSlug, lessonKey },
      })
    } catch (error: any) {
      if (!isLessonKeyUnsupportedError(error)) throw error
      const baseId = stripLegacyDraftSuffix((existing as any)?.id)
      const baseSlug = stripLegacyDraftSuffix((existing as any)?.slug)
      await prisma.lesson.deleteMany({
        where: {
          wikiSlug: existing.wikiSlug,
          OR: [
            ...(baseId ? [{ id: baseId }, { id: toLegacyDraftValue(baseId) }] : []),
            ...(baseSlug ? [{ slug: baseSlug }, { slug: toLegacyDraftValue(baseSlug) }] : []),
          ],
        },
      })
    }

    return NextResponse.json({
      ok: true,
      deleted: lessonKey,
      title: latest?.title_en || existing.title_en,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to delete lesson' }, { status: 500 })
  }
}
