import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AuthError, getCurrentUser } from '@/lib/auth'

// POST /api/progress  { lessonId, wikiSlug, status: "in_progress" | "completed" }
// Silently ignored if the user isn't a student or isn't enrolled.
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'student') {
      return NextResponse.json({ ok: true }) // non-students silently ignored
    }

    const body = await request.json()
    const lessonId = typeof body?.lessonId === 'string' ? body.lessonId.trim() : ''
    const wikiSlug = typeof body?.wikiSlug === 'string' ? body.wikiSlug.trim() : ''
    const status = body?.status === 'completed' ? 'completed' : 'in_progress'
    if (!lessonId || !wikiSlug) {
      return NextResponse.json({ error: 'lessonId and wikiSlug required' }, { status: 400 })
    }

    // Verify student is actively enrolled in this wiki
    const enrollment = await prisma.enrollment.findFirst({
      where: { studentId: user.id, wikiSlug, status: 'active' },
    })
    if (!enrollment) return NextResponse.json({ ok: true }) // not enrolled — ignore

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
        // Only upgrade status, never downgrade (completed stays completed)
        ...(status === 'completed' ? { status: 'completed', completedAt: new Date() } : {}),
      },
    })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    const status = e instanceof AuthError ? e.status : 500
    return NextResponse.json({ error: e?.message || 'Failed' }, { status })
  }
}
