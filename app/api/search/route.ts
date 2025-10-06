import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  try {
    const lessons = await prisma.lesson.findMany({
      where: {
        OR: [
          {
            title_en: {
              contains: query,
            },
          },
          {
            title_ar: {
              contains: query,
            },
          },
        ],
      },
      include: {
        kit: {
          select: {
            slug: true,
          },
        },
      },
    });

    const lessonsWithKitSlug = lessons.map(lesson => ({
      ...lesson,
      kitSlug: lesson.kit.slug,
    }));

    return NextResponse.json(lessonsWithKitSlug);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
