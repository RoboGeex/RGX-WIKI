import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma-multi';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');
  const kit = searchParams.get('kit');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  try {
    const db = getPrisma(kit ?? undefined)
    const lessons = await db.lesson.findMany({
      where: {
        ...(kit && { wikiSlug: kit }),
        OR: [
          { title_en: { contains: query } },
          { title_ar: { contains: query } },
        ],
      },
    });
    return NextResponse.json(lessons);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
