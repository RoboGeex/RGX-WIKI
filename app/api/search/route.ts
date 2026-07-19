import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma-multi';
import { getActorIdFromRequest } from '@/lib/api-auth';
import { findDeveloperById } from '@/lib/developers';
import { LESSON_STATUS, collapseLessonsForEditor, collapseLessonsForPublic, getLessonKey } from '@/lib/lesson-versions';

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

// Every Lesson column except lessonKey, which legacy per-wiki DBs don't have.
// findMany without a select would SELECT lessonKey too and crash there.
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');
  const kit = searchParams.get('kit');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  try {
    const actorId = getActorIdFromRequest(request);
    let isAdmin = false;

    if (actorId) {
      const dev = await findDeveloperById(actorId);
      if (dev && (dev.role === 'admin' || dev.role === 'superadmin')) {
        isAdmin = true;
      }
    }

    const db: any = getPrisma(kit ?? undefined)
    const where = {
      ...(kit && { wikiSlug: kit }),
      ...(!isAdmin && { status: LESSON_STATUS.PUBLISHED }),
      OR: [
        { title_en: { contains: query } },
        { title_ar: { contains: query } },
      ],
    }
    let rows: any[]
    try {
      rows = await db.lesson.findMany({
        where,
        orderBy: [{ order: 'asc' }, { version: 'desc' }],
      })
    } catch (error: any) {
      if (!isLessonKeyUnsupportedError(error)) throw error
      const legacyRows = await db.lesson.findMany({
        where,
        orderBy: [{ order: 'asc' }, { version: 'desc' }],
        select: legacyLessonSelect,
      })
      rows = legacyRows.map((row: any) => ({ ...row, lessonKey: getLessonKey(row) }))
    }
    const lessons = isAdmin
      ? collapseLessonsForEditor(rows)
      : collapseLessonsForPublic(rows)
    return NextResponse.json(lessons);
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
