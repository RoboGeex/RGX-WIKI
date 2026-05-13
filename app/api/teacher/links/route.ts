import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import { AuthError, requireRole } from '@/lib/auth'

// GET  /api/teacher/links?wikiSlug=xxx  — list links for this teacher + wiki
// POST /api/teacher/links               — create (or regenerate) link for a wiki
export async function GET(request: Request) {
  try {
    const teacher = await requireRole('admin', 'teacher')
    const { searchParams } = new URL(request.url)
    const wikiSlug = searchParams.get('wikiSlug') || ''
    if (!wikiSlug) return NextResponse.json({ error: 'wikiSlug required' }, { status: 400 })

    const links = await prisma.enrollmentLink.findMany({
      where: { teacherId: teacher.id, wikiSlug },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { enrollments: { where: { status: 'active' } } } },
      },
    })
    return NextResponse.json({ links })
  } catch (e: any) {
    const status = e instanceof AuthError ? e.status : 500
    return NextResponse.json({ error: e?.message || 'Failed' }, { status })
  }
}

export async function POST(request: Request) {
  try {
    const teacher = await requireRole('admin', 'teacher')
    const body = await request.json()
    const wikiSlug = typeof body?.wikiSlug === 'string' ? body.wikiSlug.trim() : ''
    if (!wikiSlug) return NextResponse.json({ error: 'wikiSlug required' }, { status: 400 })

    // Disable any existing active link for this teacher+wiki first
    await prisma.enrollmentLink.updateMany({
      where: { teacherId: teacher.id, wikiSlug, isActive: true },
      data: { isActive: false, disabledAt: new Date() },
    })

    const token = randomBytes(24).toString('hex')
    const link = await prisma.enrollmentLink.create({
      data: { token, teacherId: teacher.id, wikiSlug },
    })

    return NextResponse.json({ link })
  } catch (e: any) {
    const status = e instanceof AuthError ? e.status : 500
    return NextResponse.json({ error: e?.message || 'Failed' }, { status })
  }
}
