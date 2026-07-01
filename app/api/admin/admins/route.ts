import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AuthError } from '@/lib/auth'
import { requireAdminAccess } from '@/lib/admin-auth'
import { findDeveloperById } from '@/lib/developers'
import { getDevelopersPrisma } from '@/lib/prisma-developers'

export async function GET() {
  try {
    await requireAdminAccess()

    if (process.env.NODE_ENV !== 'production' && process.env.USE_DB !== 'true') {
      const now = new Date().toISOString()
      return NextResponse.json({
        admins: [],
        developers: [{
          source: 'developer',
          id: process.env.LOCAL_DEV_ID || 'local-dev',
          email: process.env.LOCAL_DEV_EMAIL || 'info@robogeex.com',
          name: process.env.LOCAL_DEV_NAME || 'Local Developer',
          disabledAt: null,
          createdAt: now,
          lastLoginAt: null,
          activeSessions: null,
          role: 'superadmin',
        }],
      })
    }

    // ── New-system admins (User table, role=admin) ─────────────────────────
    const adminUsers = await prisma.user.findMany({
      where: { role: 'admin' },
      orderBy: { createdAt: 'asc' },
      select: { id: true, email: true, name: true, disabledAt: true, createdAt: true },
    })

    const enrichedAdmins = await Promise.all(adminUsers.map(async (a) => {
      const lastSession = await prisma.session.findFirst({
        where: { userId: a.id, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      })
      const sessionCount = await prisma.session.count({
        where: { userId: a.id, expiresAt: { gt: new Date() } },
      })
      return {
        source: 'user' as const,
        id: String(a.id),
        email: a.email,
        name: a.name,
        disabledAt: a.disabledAt,
        createdAt: a.createdAt,
        lastLoginAt: lastSession?.createdAt ?? null,
        activeSessions: sessionCount,
      }
    }))

    // ── Legacy developers (Developer table) ───────────────────────────────
    let devAdmins: any[] = []
    try {
      const devPrisma = getDevelopersPrisma()
      const devs = await devPrisma.developer.findMany({ orderBy: { id: 'asc' } })
      devAdmins = (devs as any[]).map((d) => ({
        source: 'developer' as const,
        id: String(d.id),
        email: d.email,
        name: d.name ?? null,
        disabledAt: null,
        createdAt: d.createdAt,
        lastLoginAt: null,   // Developer table has no session tracking
        activeSessions: null,
        role: d.role ?? 'editor',
      }))
    } catch {
      // developer DB unavailable — skip
    }

    return NextResponse.json({ admins: enrichedAdmins, developers: devAdmins })
  } catch (e: any) {
    const status = e instanceof AuthError ? e.status : 500
    return NextResponse.json({ error: e?.message || 'Failed' }, { status })
  }
}
