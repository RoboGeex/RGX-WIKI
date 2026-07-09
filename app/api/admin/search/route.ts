import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/auth'
import { requireAdminAccess } from '@/lib/admin-auth'
import { getAdminStudentsList } from '@/lib/admin-students'
import { getAdminTeachersList } from '@/lib/admin-teachers'
import { getWikis } from '@/lib/data'
import { getWikisFromDb } from '@/lib/server-data'

export type AdminSearchResult = {
  id: string
  category: 'student' | 'teacher' | 'wiki'
  title: string
  subtitle: string
  href: string
}

const MAX_PER_CATEGORY = 5

function matches(query: string, ...fields: (string | null | undefined)[]) {
  return fields.some((field) => field?.toLowerCase().includes(query))
}

// Global admin quick-search: students, teachers, and wikis by name/email/slug.
// Backs the search box in the shared admin top bar (AdminNavbar), so it works
// the same across every dashboard (overview, students, teachers, wikis).
export async function GET(request: Request) {
  try {
    await requireAdminAccess()

    const { searchParams } = new URL(request.url)
    const query = (searchParams.get('q') || '').trim().toLowerCase()
    if (!query) {
      return NextResponse.json({ results: [] })
    }

    const [students, teachers, fileWikis, dbWikis] = await Promise.all([
      getAdminStudentsList(false),
      getAdminTeachersList(),
      Promise.resolve(getWikis()),
      getWikisFromDb(),
    ])

    const bySlug = new Map<string, any>(fileWikis.map((wiki) => [wiki.slug, wiki]))
    dbWikis.forEach((wiki) => {
      bySlug.set(wiki.slug, { ...(bySlug.get(wiki.slug) || {}), ...wiki })
    })
    const wikis = Array.from(bySlug.values())

    const results: AdminSearchResult[] = []

    for (const s of students) {
      if (results.filter((r) => r.category === 'student').length >= MAX_PER_CATEGORY) break
      if (!matches(query, s.student.name, s.student.email)) continue
      results.push({
        id: s.student.id,
        category: 'student',
        title: s.student.name || s.student.email,
        subtitle: s.student.email,
        href: `/dashboard/students/${s.student.id}`,
      })
    }

    for (const t of teachers) {
      if (results.filter((r) => r.category === 'teacher').length >= MAX_PER_CATEGORY) break
      if (!matches(query, t.name, t.email)) continue
      results.push({
        id: t.id,
        category: 'teacher',
        title: t.name || t.email,
        subtitle: t.email,
        href: `/dashboard/teachers/${t.id}`,
      })
    }

    for (const w of wikis) {
      if (results.filter((r) => r.category === 'wiki').length >= MAX_PER_CATEGORY) break
      if (!matches(query, w.displayName, w.slug)) continue
      results.push({
        id: w.slug,
        category: 'wiki',
        title: w.displayName || w.slug,
        subtitle: `/editor/${w.slug}`,
        href: `/editor/${w.slug}`,
      })
    }

    return NextResponse.json({ results })
  } catch (e: any) {
    const status = e instanceof AuthError ? e.status : 500
    return NextResponse.json({ error: e?.message || 'Failed' }, { status })
  }
}
