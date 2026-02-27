import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma-multi';
import { getActorIdFromRequest } from '@/lib/api-auth';
import { findDeveloperById } from '@/lib/developers';

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

    const db = getPrisma(kit ?? undefined)
    const lessons = await db.lesson.findMany({
      where: {
        ...(kit && { wikiSlug: kit }),
        ...(!isAdmin && { status: 'published' }),
        OR: [
          { title_en: { contains: query } },
          { title_ar: { contains: query } },
        ],
      },
    });
    return NextResponse.json(lessons);
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
