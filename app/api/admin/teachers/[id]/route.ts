import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AuthError } from '@/lib/auth'
import { requireAdminAccess } from '@/lib/admin-auth'

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdminAccess()
    const body = await request.json()

    const teacher = await prisma.user.findUnique({ where: { id: params.id } })
    if (!teacher || teacher.role !== 'teacher') {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })
    }

    const data: Record<string, any> = {}
    const action = typeof body?.action === 'string' ? body.action : 'updateTeacher'

    if (typeof body?.disabled === 'boolean') {
      data.disabledAt = body.disabled ? new Date() : null
      if (body.disabled) {
        await prisma.session.deleteMany({ where: { userId: teacher.id } })
      }
    }

    if (typeof body?.name === 'string') {
      data.name = body.name.trim() || null
    }

    if (typeof body?.email === 'string') {
      const email = body.email.trim().toLowerCase()
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
      }
      data.email = email
    }

    if (Array.isArray(body?.assignedWikiSlugs)) {
      data.assignedWikiSlugs = [...new Set(body.assignedWikiSlugs.filter((slug: unknown) => typeof slug === 'string' && slug.trim()).map((slug: string) => slug.trim()))]
    }

    if (action === 'revokeWiki') {
      const wikiSlug = typeof body?.wikiSlug === 'string' ? body.wikiSlug.trim() : ''
      if (!wikiSlug) return NextResponse.json({ error: 'Choose a wiki.' }, { status: 400 })
      const assigned = Array.isArray(teacher.assignedWikiSlugs) ? teacher.assignedWikiSlugs.filter((slug): slug is string => typeof slug === 'string') : []
      data.assignedWikiSlugs = assigned.filter(slug => slug !== wikiSlug)
      const now = new Date()
      await prisma.enrollmentLink.updateMany({ where: { teacherId: teacher.id, wikiSlug, isActive: true }, data: { isActive: false, disabledAt: now } })
      await prisma.enrollment.updateMany({ where: { teacherId: teacher.id, wikiSlug, status: 'active' }, data: { status: 'revoked', removedAt: now } })
    }

    if (action === 'revokeAllWikis') {
      data.assignedWikiSlugs = []
      const now = new Date()
      await prisma.enrollmentLink.updateMany({ where: { teacherId: teacher.id, isActive: true }, data: { isActive: false, disabledAt: now } })
      await prisma.enrollment.updateMany({ where: { teacherId: teacher.id, status: 'active' }, data: { status: 'revoked', removedAt: now } })
    }

    if (action === 'resetProgress') {
      const wikiSlug = typeof body?.wikiSlug === 'string' ? body.wikiSlug.trim() : ''
      const enrollments = await prisma.enrollment.findMany({
        where: { teacherId: teacher.id, ...(wikiSlug && { wikiSlug }) },
        select: { studentId: true },
      })
      const studentIds = [...new Set(enrollments.map(e => e.studentId))]
      if (studentIds.length) {
        await prisma.lessonProgress.deleteMany({
          where: {
            studentId: { in: studentIds },
            ...(wikiSlug && { wikiSlug }),
          },
        })
      }
      return NextResponse.json({ ok: true })
    }

    const updated = await prisma.user.update({
      where: { id: teacher.id },
      data,
      select: { id: true, email: true, name: true, assignedWikiSlugs: true, disabledAt: true, createdAt: true },
    })

    return NextResponse.json({ teacher: updated })
  } catch (e: any) {
    const status = e instanceof AuthError ? e.status : e?.code === 'P2002' ? 409 : 400
    const message = e?.code === 'P2002' ? 'That email is already in use.' : e?.message || 'Failed'
    return NextResponse.json({ error: message }, { status })
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdminAccess()

    const teacher = await prisma.user.findUnique({ where: { id: params.id }, select: { id: true, role: true } })
    if (!teacher || teacher.role !== 'teacher') {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })
    }

    await prisma.$transaction([
      prisma.session.deleteMany({ where: { userId: teacher.id } }),
      prisma.enrollment.deleteMany({ where: { teacherId: teacher.id } }),
      prisma.enrollmentLink.deleteMany({ where: { teacherId: teacher.id } }),
      prisma.user.delete({ where: { id: teacher.id } }),
    ])

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    const status = e instanceof AuthError ? e.status : 500
    return NextResponse.json({ error: e?.message || 'Failed' }, { status })
  }
}
