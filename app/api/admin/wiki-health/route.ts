import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminAccess } from '@/lib/admin-auth'
import { AuthError } from '@/lib/auth'

export async function GET() {
  try {
    await requireAdminAccess()

    if (process.env.NODE_ENV !== 'production' && process.env.USE_DB !== 'true') {
      return NextResponse.json({ wikis: [], lessons: [] })
    }

    // All published wikis
    const wikis = await prisma.wiki.findMany({
      where: { isPublished: true },
      select: { slug: true, displayName: true },
      orderBy: { displayName: 'asc' },
    })
    const wikiSlugs = wikis.map(w => w.slug)

    if (wikiSlugs.length === 0) {
      return NextResponse.json({ wikis: [], lessons: [] })
    }

    const [enrollmentGroups, lessonCounts, completedGroups, flaggedLessons] = await Promise.all([
      prisma.enrollment.groupBy({
        by: ['wikiSlug'],
        where: { status: 'active', wikiSlug: { in: wikiSlugs } },
        _count: true,
      }),
      prisma.lesson.groupBy({
        by: ['wikiSlug'],
        where: { wikiSlug: { in: wikiSlugs }, status: 'published' },
        _count: true,
      }),
      prisma.lessonProgress.groupBy({
        by: ['wikiSlug'],
        where: { wikiSlug: { in: wikiSlugs }, status: 'completed' },
        _count: true,
      }),
      // Lessons needing attention: draft (changed), published, archived (unpublished)
      prisma.lesson.findMany({
        where: {
          wikiSlug: { in: wikiSlugs },
          status: { in: ['draft', 'published', 'archived'] },
        },
        select: {
          id: true, title_en: true, wikiSlug: true, status: true,
          updatedAt: true, publishedAt: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: 30,
      }),
    ])

    // Build lookup maps
    const enrolledMap: Record<string, number> = {}
    for (const g of enrollmentGroups) enrolledMap[g.wikiSlug] = g._count

    const lessonMap: Record<string, number> = {}
    for (const lc of lessonCounts) lessonMap[lc.wikiSlug] = lc._count

    const completedMap: Record<string, number> = {}
    for (const cg of completedGroups) completedMap[cg.wikiSlug] = cg._count

    // Wiki name lookup
    const wikiNameMap: Record<string, string> = {}
    for (const w of wikis) wikiNameMap[w.slug] = w.displayName

    // Per-wiki health
    const wikiHealth = wikis.map(w => {
      const enrolled = enrolledMap[w.slug] ?? 0
      const totalLessons = lessonMap[w.slug] ?? 0
      const totalCompleted = completedMap[w.slug] ?? 0
      const maxPossible = enrolled * totalLessons
      const avgCompletion = maxPossible > 0 ? Math.round((totalCompleted / maxPossible) * 100) : 0
      return { slug: w.slug, name: w.displayName, enrolled, totalLessons, avgCompletion }
    })

    // Flagged lessons with wiki name attached
    const lessons = flaggedLessons.map(l => ({
      id: l.id,
      title: l.title_en,
      wikiSlug: l.wikiSlug,
      wikiName: wikiNameMap[l.wikiSlug] ?? l.wikiSlug,
      status: l.status,
      updatedAt: l.updatedAt,
      publishedAt: l.publishedAt,
    }))

    return NextResponse.json({ wikis: wikiHealth, lessons })
  } catch (e: any) {
    const status = e instanceof AuthError ? e.status : 500
    return NextResponse.json({ error: e?.message || 'Failed' }, { status })
  }
}
