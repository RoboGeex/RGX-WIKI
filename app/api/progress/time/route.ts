import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { openClassWhere } from '@/lib/class-window'

// POST /api/progress/time  { lessonId, wikiSlug, seconds }
//
// Adds active seconds to a student's lesson timer. The client only counts time
// while the tab is visible, focused and not idle, and flushes small increments
// (including via sendBeacon on unload), so this endpoint just accumulates.
//
// `seconds` is clamped: a single call can never add more than one flush window
// worth of time, so a tampered-with client can't inflate the number in one go.
const MAX_SECONDS_PER_CALL = 180

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    // Silently ignore non-students (teachers previewing, logged-out visitors).
    if (!user || user.role !== 'student') return NextResponse.json({ ok: true })

    const body = await request.json()
    const lessonId = typeof body?.lessonId === 'string' ? body.lessonId.trim() : ''
    const wikiSlug = typeof body?.wikiSlug === 'string' ? body.wikiSlug.trim() : ''
    const raw = Number(body?.seconds)
    if (!lessonId || !wikiSlug || !Number.isFinite(raw) || raw <= 0) {
      return NextResponse.json({ ok: true })
    }
    const seconds = Math.min(Math.round(raw), MAX_SECONDS_PER_CALL)

    // Same access rule as recording progress: an ended/not-yet-started class
    // stops counting time.
    const [enrollment, trackAssignment] = await Promise.all([
      prisma.enrollment.findFirst({
        where: { studentId: user.id, wikiSlug, status: 'active', link: openClassWhere() },
        select: { id: true },
      }),
      prisma.trackAssignment.findFirst({
        where: { studentId: user.id, track: { wikis: { some: { wikiSlug } } } },
        select: { id: true },
      }),
    ])
    if (!enrollment && !trackAssignment) return NextResponse.json({ ok: true })

    // The number means "how long it took to finish", so stop accumulating once
    // the lesson is complete — re-reading it later must not inflate the total.
    // The client banks its pending seconds *before* marking complete, so
    // nothing is lost here.
    const existing = await prisma.lessonProgress.findUnique({
      where: { studentId_lessonId: { studentId: user.id, lessonId } },
      select: { status: true },
    })
    if (existing?.status === 'completed') {
      return NextResponse.json({ ok: true, skipped: 'completed' })
    }

    await prisma.lessonProgress.upsert({
      where: { studentId_lessonId: { studentId: user.id, lessonId } },
      create: {
        studentId: user.id,
        wikiSlug,
        lessonId,
        status: 'in_progress',
        timeSpentSec: seconds,
        lastViewedAt: new Date(),
      },
      update: {
        timeSpentSec: { increment: seconds },
        lastViewedAt: new Date(),
      },
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('lesson time tracking failed:', e)
    // Never surface an error to the lesson page over a timer ping.
    return NextResponse.json({ ok: true })
  }
}
