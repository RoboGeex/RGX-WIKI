import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AuthError, requireUser } from '@/lib/auth'
import { classStatus, closedReason } from '@/lib/class-window'

const STUDENT_CAP = 35

// POST /api/join/:token — enroll the current user in the wiki linked to this token
export async function POST(_: Request, { params }: { params: { token: string } }) {
  try {
    const user = await requireUser()

    if (user.role !== 'student') {
      return NextResponse.json({ error: 'Only student accounts can join via a link' }, { status: 403 })
    }

    const link = await prisma.enrollmentLink.findUnique({ where: { token: params.token } })
    if (!link) return NextResponse.json({ error: 'Invalid link' }, { status: 404 })
    const status = classStatus(link)
    if (status !== 'active') {
      return NextResponse.json({ error: closedReason(status) }, { status: 403 })
    }

    // A student can be in at most one class per wiki. If they already have an
    // active enrollment in this wiki (through any class), keep them there.
    const existing = await prisma.enrollment.findFirst({
      where: { studentId: user.id, wikiSlug: link.wikiSlug, status: 'active' },
    })
    if (existing) {
      return NextResponse.json({ ok: true, wikiSlug: link.wikiSlug, alreadyEnrolled: true })
    }

    // Cap is per class: up to 35 active students in this specific class (link).
    const activeCount = await prisma.enrollment.count({
      where: { linkId: link.id, status: 'active' },
    })
    if (activeCount >= STUDENT_CAP) {
      return NextResponse.json(
        { error: 'This class is full (35 students maximum)' },
        { status: 403 }
      )
    }

    // A revoked/removed enrollment for this same link may still exist (rows are
    // kept so teachers/admins can see past students) — reactivate it instead of
    // creating a duplicate, which would violate the unique constraint.
    const previous = await prisma.enrollment.findUnique({
      where: {
        studentId_wikiSlug_linkId: {
          studentId: user.id,
          wikiSlug: link.wikiSlug,
          linkId: link.id,
        },
      },
    })

    try {
      if (previous) {
        await prisma.enrollment.update({
          where: { id: previous.id },
          data: { status: 'active', removedAt: null, joinedAt: new Date() },
        })
      } else {
        await prisma.enrollment.create({
          data: {
            studentId: user.id,
            teacherId: link.teacherId,
            linkId: link.id,
            wikiSlug: link.wikiSlug,
            status: 'active',
          },
        })
      }
    } catch (e: any) {
      // Concurrent requests (double-click, effect re-run, retry) can both pass
      // the findFirst check above; the loser hits the unique constraint. That
      // just means the student is enrolled — treat it as success.
      if (e?.code === 'P2002') {
        return NextResponse.json({ ok: true, wikiSlug: link.wikiSlug, alreadyEnrolled: true })
      }
      throw e
    }

    return NextResponse.json({ ok: true, wikiSlug: link.wikiSlug })
  } catch (e: any) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    console.error('join failed:', e)
    return NextResponse.json({ error: 'Failed to join' }, { status: 500 })
  }
}

// GET /api/join/:token — return link info so the join page can show wiki name
export async function GET(_: Request, { params }: { params: { token: string } }) {
  try {
    const link = await prisma.enrollmentLink.findUnique({
      where: { token: params.token },
      include: { teacher: { select: { name: true, email: true } } },
    })
    if (!link) return NextResponse.json({ error: 'Invalid link' }, { status: 404 })

    // A scheduled/ended class behaves like a closed one for students.
    const status = classStatus(link)
    const open = status === 'active'

    const enrollments = await prisma.enrollment.findMany({
      where: { linkId: link.id, status: 'active' },
      select: { studentId: true },
    })
    const activeCount = enrollments.length

    // Roster for the "pick your name" shortcut, for students a teacher already
    // added to this class. Deliberately NAMES ONLY — this page is public to
    // anyone holding the link, so no emails are exposed. Signing in uses the
    // opaque student id via /api/join/[token]/login.
    const studentIds = open ? enrollments.map((e) => e.studentId) : []
    const students = studentIds.length
      ? await prisma.user.findMany({
          where: { id: { in: studentIds }, disabledAt: null, role: 'student' },
          select: { id: true, name: true, avatarUrl: true },
        })
      : []
    students.sort((a, b) => (a.name || '').localeCompare(b.name || ''))

    return NextResponse.json({
      wikiSlug: link.wikiSlug,
      className: link.name || null,
      teacher: link.teacher,
      isActive: open,
      status,
      closedMessage: open ? null : closedReason(status),
      startsAt: link.startsAt,
      endsAt: link.endsAt,
      spotsLeft: Math.max(0, STUDENT_CAP - activeCount),
      students,
    })
  } catch (e: any) {
    console.error('join link lookup failed:', e)
    return NextResponse.json({ error: 'Failed to load link info' }, { status: 500 })
  }
}
