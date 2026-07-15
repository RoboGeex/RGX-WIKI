import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AuthError, getCurrentUser } from '@/lib/auth'

// POST /api/progress  { lessonId, wikiSlug, status: "in_progress" | "completed" }
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'student') return NextResponse.json({ ok: true })

    const body = await request.json()
    const lessonId = typeof body?.lessonId === 'string' ? body.lessonId.trim() : ''
    const wikiSlug = typeof body?.wikiSlug === 'string' ? body.wikiSlug.trim() : ''
    const status = body?.status === 'completed' ? 'completed' : 'in_progress'
    if (!lessonId || !wikiSlug) {
      return NextResponse.json({ error: 'lessonId and wikiSlug required' }, { status: 400 })
    }

    // Direct enrollment and track assignment are both valid learning paths.
    const [enrollment, trackAssignment] = await Promise.all([
      prisma.enrollment.findFirst({ where: { studentId: user.id, wikiSlug, status: 'active' }, select: { id: true } }),
      prisma.trackAssignment.findFirst({
        where: { studentId: user.id, track: { wikis: { some: { wikiSlug } } } },
        select: { id: true },
      }),
    ])
    if (!enrollment && !trackAssignment) return NextResponse.json({ ok: true })

    // Reject mismatched lesson/wiki pairs so aggregate track progress is exact.
    const lesson = await prisma.lesson.findFirst({
      where: { id: lessonId, wikiSlug, status: 'published' },
      select: { id: true },
    })
    if (!lesson) return NextResponse.json({ error: 'Lesson not found in this wiki' }, { status: 400 })

    await prisma.lessonProgress.upsert({
      where: { studentId_lessonId: { studentId: user.id, lessonId } },
      create: {
        studentId: user.id,
        wikiSlug,
        lessonId,
        status,
        lastViewedAt: new Date(),
        completedAt: status === 'completed' ? new Date() : null,
      },
      update: {
        lastViewedAt: new Date(),
        ...(status === 'completed' ? { status: 'completed', completedAt: new Date() } : {}),
      },
    })

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    const status = error instanceof AuthError ? error.status : 500
    return NextResponse.json({ error: error?.message || 'Failed' }, { status })
  }
}
