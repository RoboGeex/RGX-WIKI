import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import { AuthError, requireRole } from '@/lib/auth'
import { endOfDay, startOfDay } from '@/lib/class-window'

// GET  /api/teacher/links?wikiSlug=xxx  — list classes (links) for this teacher + wiki
// POST /api/teacher/links               — create a new class (link) for a wiki
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

    const rawName = typeof body?.name === 'string' ? body.name.trim() : ''
    const name = rawName ? rawName.slice(0, 120) : null

    // Optional schedule (YYYY-MM-DD). endsAt covers the whole end date.
    const startsAt = typeof body?.startsAt === 'string' && body.startsAt ? startOfDay(body.startsAt) : null
    const endsAt = typeof body?.endsAt === 'string' && body.endsAt ? endOfDay(body.endsAt) : null
    if (startsAt && endsAt && endsAt < startsAt) {
      return NextResponse.json({ error: 'The end date must be after the start date' }, { status: 400 })
    }

    // A teacher can run multiple classes per wiki — each POST creates a new
    // class (link). Existing classes are left untouched.
    const token = randomBytes(24).toString('hex')
    const link = await prisma.enrollmentLink.create({
      data: { token, teacherId: teacher.id, wikiSlug, name, startsAt, endsAt },
    })

    return NextResponse.json({ link })
  } catch (e: any) {
    const status = e instanceof AuthError ? e.status : 500
    return NextResponse.json({ error: e?.message || 'Failed' }, { status })
  }
}
