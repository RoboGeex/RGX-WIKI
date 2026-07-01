import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AuthError } from '@/lib/auth'
import { requireAdminAccess } from '@/lib/admin-auth'
import { getDevelopersPrisma } from '@/lib/prisma-developers'

export async function GET() {
  try {
    await requireAdminAccess()

    if (process.env.NODE_ENV !== 'production' && process.env.USE_DB !== 'true') {
      return NextResponse.json({
        teachers: 0,
        students: 0,
        wikis: 0,
        activeSessions: 0,
        admins: 0,
        developerCount: 1,
      })
    }

    const [teachers, students, wikis, activeSessions, admins] = await Promise.all([
      prisma.user.count({ where: { role: 'teacher', disabledAt: null } }),
      prisma.user.count({ where: { role: 'student' } }),
      prisma.wiki.count({ where: { isPublished: true } }),
      prisma.session.count({ where: { userId: { in: await prisma.user.findMany({ where: { role: 'admin' }, select: { id: true } }).then(u => u.map(x => x.id)) }, expiresAt: { gt: new Date() } } }),
      prisma.user.count({ where: { role: 'admin' } }),
    ])

    let developerCount = 0
    try {
      const devPrisma = getDevelopersPrisma()
      developerCount = await (devPrisma as any).developer.count()
    } catch { /* ignore */ }

    return NextResponse.json({ teachers, students, wikis, activeSessions, admins, developerCount })
  } catch (e: any) {
    const status = e instanceof AuthError ? e.status : 500
    return NextResponse.json({ error: e?.message || 'Failed' }, { status })
  }
}
