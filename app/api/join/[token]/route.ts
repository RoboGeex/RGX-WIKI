import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AuthError, requireUser } from '@/lib/auth'

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
    if (!link.isActive) return NextResponse.json({ error: 'This link has been closed' }, { status: 403 })

    // Check if already enrolled
    const existing = await prisma.enrollment.findFirst({
      where: { studentId: user.id, wikiSlug: link.wikiSlug, status: 'active' },
    })
    if (existing) {
      return NextResponse.json({ ok: true, wikiSlug: link.wikiSlug, alreadyEnrolled: true })
    }

    // Check 35-student cap across all active enrollments for this teacher
    const activeCount = await prisma.enrollment.count({
      where: { teacherId: link.teacherId, status: 'active' },
    })
    if (activeCount >= STUDENT_CAP) {
      return NextResponse.json(
        { error: 'This class is full (35 students maximum)' },
        { status: 403 }
      )
    }

    await prisma.enrollment.create({
      data: {
        studentId: user.id,
        teacherId: link.teacherId,
        linkId: link.id,
        wikiSlug: link.wikiSlug,
        status: 'active',
      },
    })

    return NextResponse.json({ ok: true, wikiSlug: link.wikiSlug })
  } catch (e: any) {
    const status = e instanceof AuthError ? e.status : 500
    return NextResponse.json({ error: e?.message || 'Failed' }, { status })
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

    const activeCount = await prisma.enrollment.count({
      where: { teacherId: link.teacherId, status: 'active' },
    })

    return NextResponse.json({
      wikiSlug: link.wikiSlug,
      teacher: link.teacher,
      isActive: link.isActive,
      spotsLeft: Math.max(0, STUDENT_CAP - activeCount),
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 })
  }
}
