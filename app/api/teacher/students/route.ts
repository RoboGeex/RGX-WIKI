import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AuthError, createUser, requireRole } from '@/lib/auth'
import { getPublishedLessonsByWiki } from '@/lib/wiki-lessons'
import { classStatus } from '@/lib/class-window'

// Same per-class cap the invite-link join flow enforces.
const STUDENT_CAP = 35

// GET /api/teacher/students?wikiSlug=xxx
// Returns all enrollments (active + revoked/removed, so data from disabled
// links stays findable) + per-student lesson progress summary
export async function GET(request: Request) {
  try {
    const teacher = await requireRole('admin', 'teacher')
    const { searchParams } = new URL(request.url)
    const wikiSlug = searchParams.get('wikiSlug') || ''
    if (!wikiSlug) return NextResponse.json({ error: 'wikiSlug required' }, { status: 400 })

    const allEnrollments = await prisma.enrollment.findMany({
      where: { teacherId: teacher.id, wikiSlug },
      orderBy: { joinedAt: 'desc' },
      include: {
        student: { select: { id: true, email: true, name: true, avatarUrl: true } },
        link: { select: { id: true, token: true, isActive: true, name: true } },
      },
    })

    // One row per student: prefer the active enrollment; otherwise keep the
    // most recent inactive one (a student who rejoined via a new link would
    // otherwise appear twice).
    const byStudent = new Map<string, (typeof allEnrollments)[number]>()
    for (const e of allEnrollments) {
      const current = byStudent.get(e.studentId)
      if (!current || (e.status === 'active' && current.status !== 'active')) {
        byStudent.set(e.studentId, e)
      }
    }
    const enrollments = Array.from(byStudent.values())

    const studentIds = enrollments.map((e) => e.studentId)
    // Lessons live in the wiki's own database, not the default one — progress
    // rows (default DB) are joined to them below by lesson id.
    const lessons = (await getPublishedLessonsByWiki([wikiSlug])).get(wikiSlug) ?? []

    const progress = studentIds.length
      ? await prisma.lessonProgress.findMany({
          where: { studentId: { in: studentIds }, wikiSlug },
          select: { studentId: true, lessonId: true, status: true, completedAt: true, lastViewedAt: true, timeSpentSec: true },
        })
      : []

    const progressMap: Record<string, Record<string, { status: string; completedAt: Date | null; lastViewedAt: Date; timeSpentSec: number }>> = {}
    for (const p of progress) {
      if (!progressMap[p.studentId]) progressMap[p.studentId] = {}
      progressMap[p.studentId][p.lessonId] = p
    }

    const students = enrollments.map((e) => {
      const lessonDetails = lessons.map((l) => ({
        id: l.id,
        title: l.title_en,
        order: l.order,
        duration_min: l.duration_min,
        status: progressMap[e.studentId]?.[l.id]?.status ?? 'not_started',
        completedAt: progressMap[e.studentId]?.[l.id]?.completedAt ?? null,
        lastViewedAt: progressMap[e.studentId]?.[l.id]?.lastViewedAt ?? null,
        timeSpentSec: progressMap[e.studentId]?.[l.id]?.timeSpentSec ?? 0,
      }))
      const completed = lessonDetails.filter((l) => l.status === 'completed').length
      const inProgress = lessonDetails.filter((l) => l.status === 'in_progress').length
      const totalTimeSpentSec = lessonDetails.reduce((sum, l) => sum + (l.timeSpentSec || 0), 0)
      return {
        enrollmentId: e.id,
        joinedAt: e.joinedAt,
        status: e.status,
        removedAt: e.removedAt,
        student: e.student,
        link: e.link,
        progress: { completed, in_progress: inProgress, total: lessons.length },
        totalTimeSpentSec,
        lessons: lessonDetails,
      }
    })

    return NextResponse.json({ students })
  } catch (e: any) {
    const status = e instanceof AuthError ? e.status : 500
    return NextResponse.json({ error: e?.message || 'Failed' }, { status })
  }
}

// POST /api/teacher/students — add a student to one of this teacher's classes
// by hand, instead of sharing the invite link.
//   body: { linkId, email, password, name? }
// Creates the student account when the email is new; if the email already
// belongs to a student, that account is enrolled as-is (their password is NOT
// changed — a teacher must not be able to silently take over an existing login).
export async function POST(request: Request) {
  try {
    const teacher = await requireRole('admin', 'teacher')
    const body = await request.json()

    const linkId = typeof body?.linkId === 'string' ? body.linkId.trim() : ''
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body?.password === 'string' ? body.password : ''
    const name = typeof body?.name === 'string' ? body.name.trim() : ''

    if (!linkId) return NextResponse.json({ error: 'Choose a class first' }, { status: 400 })
    if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 })

    const link = await prisma.enrollmentLink.findUnique({ where: { id: linkId } })
    if (!link) return NextResponse.json({ error: 'Class not found' }, { status: 404 })
    if (link.teacherId !== teacher.id && teacher.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const status = classStatus(link)
    if (status === 'off') {
      return NextResponse.json({ error: 'This class is turned off. Turn it back on to add students.' }, { status: 400 })
    }
    if (status === 'ended') {
      return NextResponse.json({ error: 'This class has ended. Extend its end date to add students.' }, { status: 400 })
    }

    // Per-class cap, matching the invite-link flow.
    const activeCount = await prisma.enrollment.count({
      where: { linkId: link.id, status: 'active' },
    })
    if (activeCount >= STUDENT_CAP) {
      return NextResponse.json({ error: `This class is full (${STUDENT_CAP} students maximum)` }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    let student: { id: string; email: string; name: string | null; passwordHash?: string }
    let createdAccount = false

    if (existing) {
      if (existing.role !== 'student') {
        return NextResponse.json(
          { error: 'That email already belongs to a teacher or admin account.' },
          { status: 400 },
        )
      }
      if (existing.disabledAt) {
        return NextResponse.json({ error: 'That student account is disabled.' }, { status: 400 })
      }
      student = existing
    } else {
      if (!password) return NextResponse.json({ error: 'Password is required for a new student' }, { status: 400 })
      if (password.length < 8) {
        return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
      }
      student = await createUser({ email, password, name: name || undefined, role: 'student' })
      createdAccount = true
    }

    // Never echo the account row back wholesale — it carries passwordHash.
    const safeStudent = { id: student.id, email: student.email, name: student.name }

    // A student may be in at most one class per wiki (progress is stored per
    // student+wiki, so it can't diverge between classes).
    const activeElsewhere = await prisma.enrollment.findFirst({
      where: { studentId: student.id, wikiSlug: link.wikiSlug, status: 'active' },
    })
    if (activeElsewhere) {
      if (activeElsewhere.linkId === link.id) {
        return NextResponse.json({ ok: true, alreadyInClass: true, createdAccount, student: safeStudent })
      }
      return NextResponse.json(
        { error: 'That student is already in another class of this course.' },
        { status: 400 },
      )
    }

    // Reuse a previous (removed/revoked) enrollment for this same class rather
    // than inserting a duplicate, which would break the unique constraint.
    const previous = await prisma.enrollment.findUnique({
      where: {
        studentId_wikiSlug_linkId: { studentId: student.id, wikiSlug: link.wikiSlug, linkId: link.id },
      },
    })

    try {
      if (previous) {
        await prisma.enrollment.update({
          where: { id: previous.id },
          data: { status: 'active', removedAt: null, joinedAt: new Date(), teacherId: link.teacherId },
        })
      } else {
        await prisma.enrollment.create({
          data: {
            studentId: student.id,
            teacherId: link.teacherId,
            linkId: link.id,
            wikiSlug: link.wikiSlug,
            status: 'active',
          },
        })
      }
    } catch (e: any) {
      // Double-submit can race past the checks above; the loser just means the
      // student is already enrolled.
      if (e?.code === 'P2002') {
        return NextResponse.json({ ok: true, alreadyInClass: true, createdAccount, student: safeStudent })
      }
      throw e
    }

    return NextResponse.json({ ok: true, createdAccount, student: safeStudent })
  } catch (e: any) {
    const status = e instanceof AuthError ? e.status : 400
    return NextResponse.json({ error: e?.message || 'Failed to add student' }, { status })
  }
}
