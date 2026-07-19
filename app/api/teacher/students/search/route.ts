import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AuthError, requireRole } from '@/lib/auth'

// GET /api/teacher/students/search?q=<name or email>&wikiSlug=<slug>
//
// Typeahead for the "Add student" dialog: finds students that already have an
// account so a teacher can pick them instead of re-creating one. Requires at
// least 2 characters and returns a short list, so it can't be used to page
// through the whole student directory.
const MIN_QUERY = 2
const MAX_RESULTS = 8

export async function GET(request: Request) {
  try {
    await requireRole('admin', 'teacher')
    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') || '').trim()
    const wikiSlug = (searchParams.get('wikiSlug') || '').trim()

    if (q.length < MIN_QUERY) return NextResponse.json({ students: [] })

    const students = await prisma.user.findMany({
      where: {
        role: 'student',
        disabledAt: null,
        OR: [{ name: { contains: q } }, { email: { contains: q } }],
      },
      select: { id: true, name: true, email: true, avatarUrl: true },
      orderBy: [{ name: 'asc' }, { email: 'asc' }],
      take: MAX_RESULTS,
    })

    // Flag anyone already active in this course so the dialog can explain why
    // they can't be added again (one class per wiki), instead of failing on submit.
    let enrolled = new Set<string>()
    if (wikiSlug && students.length > 0) {
      const rows = await prisma.enrollment.findMany({
        where: { wikiSlug, status: 'active', studentId: { in: students.map((s) => s.id) } },
        select: { studentId: true },
      })
      enrolled = new Set(rows.map((r) => r.studentId))
    }

    return NextResponse.json({
      students: students.map((s) => ({ ...s, alreadyInCourse: enrolled.has(s.id) })),
    })
  } catch (e: any) {
    const status = e instanceof AuthError ? e.status : 500
    return NextResponse.json({ error: e?.message || 'Search failed' }, { status })
  }
}
