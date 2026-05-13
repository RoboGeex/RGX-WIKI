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
        assignedWikiSlugs: true,
        disabledAt: true,
        createdAt: true,
      },
    })
    return NextResponse.json({ teachers })
  } catch (e: any) {
    const status = e instanceof AuthError ? e.status : 500
    return NextResponse.json({ error: e?.message || 'Failed' }, { status })
  }
}

export async function POST(request: Request) {
  try {
    await requireAdminAccess()
    const body = await request.json()
    const email = typeof body?.email === 'string' ? body.email : ''
    const password = typeof body?.password === 'string' ? body.password : ''
    const name = typeof body?.name === 'string' ? body.name : undefined
    const assignedWikiSlugs: string[] = Array.isArray(body?.assignedWikiSlugs) ? body.assignedWikiSlugs : []

    const teacher = await createUser({ email, password, name, role: 'teacher' })

    if (assignedWikiSlugs.length > 0) {
      await prisma.user.update({
        where: { id: teacher.id },
        data: { assignedWikiSlugs },
      })
    }

    return NextResponse.json({
      teacher: {
        id: teacher.id,
        email: teacher.email,
        name: teacher.name,
        assignedWikiSlugs,
        createdAt: teacher.createdAt,
      },
    })
  } catch (e: any) {
    const status = e instanceof AuthError ? e.status : 400
    return NextResponse.json({ error: e?.message || 'Failed' }, { status })
  }
}
