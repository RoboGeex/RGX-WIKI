import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AuthError, createUser } from '@/lib/auth'
import { requireAdminAccess } from '@/lib/admin-auth'

export async function GET() {
  try {
    await requireAdminAccess()

    const teachers = await prisma.user.findMany({
      where: { role: 'teacher' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        assignedWikiSlugs: true,
        disabledAt: true,
        createdAt: true,
        createdByName: true,
        createdByEmail: true,
      },
    })

    // Enrich with student count + last login per teacher
    const enriched = await Promise.all(teachers.map(async (t) => {
      const [studentCount, lastSession] = await Promise.all([
        prisma.enrollment.count({ where: { teacherId: t.id, status: 'active' } }),
        prisma.session.findFirst({
          where: { userId: t.id },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true },
        }),
      ])
      return { ...t, studentCount, lastLoginAt: lastSession?.createdAt ?? null }
    }))

    return NextResponse.json({ teachers: enriched })
  } catch (e: any) {
    const status = e instanceof AuthError ? e.status : 500
    return NextResponse.json({ error: e?.message || 'Failed' }, { status })
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdminAccess()
    const body = await request.json()
    const email = typeof body?.email === 'string' ? body.email : ''
    const password = typeof body?.password === 'string' ? body.password : ''
    const name = typeof body?.name === 'string' ? body.name : undefined
    const assignedWikiSlugs: string[] = Array.isArray(body?.assignedWikiSlugs) ? body.assignedWikiSlugs : []

    // Identify who is creating the teacher
    const createdByName = admin.source === 'user'
      ? (admin.user.name || admin.user.email)
      : (admin.dev.name || admin.dev.email)
    const createdByEmail = admin.source === 'user' ? admin.user.email : admin.dev.email

    const teacher = await createUser({ email, password, name, role: 'teacher' })

    await prisma.user.update({
      where: { id: teacher.id },
      data: {
        ...(assignedWikiSlugs.length > 0 && { assignedWikiSlugs }),
        createdByName,
        createdByEmail,
      },
    })

    return NextResponse.json({ teacher: { id: teacher.id, email: teacher.email, name: teacher.name } })
  } catch (e: any) {
    const status = e instanceof AuthError ? e.status : 400
    return NextResponse.json({ error: e?.message || 'Failed' }, { status })
  }
}
