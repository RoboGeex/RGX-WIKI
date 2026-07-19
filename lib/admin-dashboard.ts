import { prisma } from '@/lib/prisma'
import { getDevelopersPrisma } from '@/lib/prisma-developers'
import { getPrisma } from '@/lib/prisma-multi'
import { getPublishedLessonsByWiki } from '@/lib/wiki-lessons'

// Real-path (database) data loaders for the admin Dashboard home. These are
// shared by the API routes (which keep their dev-mode stubs) and the server
// page (which pre-renders with this data). Dates are real Date objects; the
// API serializes them via NextResponse.json and the page via a JSON round-trip.

export type AdminStats = {
  teachers: number
  students: number
  wikis: number
  activeSessions: number
  admins: number
  developerCount: number
}

export async function getAdminStats(): Promise<AdminStats> {
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

  return { teachers, students, wikis, activeSessions, admins, developerCount }
}

export type AdminPerson = {
  source: 'user' | 'developer'
  id: string
  email: string
  name: string | null
  disabledAt: Date | null
  createdAt: Date | string
  lastLoginAt: Date | null
  activeSessions: number | null
  avatarUrl?: string | null
  role?: string
}

const developerPeopleSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  createdAt: true,
} as const

async function getDeveloperAvatarMap(devPrisma: ReturnType<typeof getDevelopersPrisma>, ids: string[]) {
  if (ids.length === 0) return new Map<string, string | null>()
  try {
    const placeholders = ids.map(() => '?').join(',')
    const rows = await devPrisma.$queryRawUnsafe<Array<{ id: number; avatarUrl: string | null }>>(
      `SELECT \`id\`, \`avatarUrl\` FROM \`Developer\` WHERE \`id\` IN (${placeholders})`,
      ...ids.map((id) => Number(id)),
    )
    return new Map(rows.map((row) => [String(row.id), row.avatarUrl]))
  } catch {
    return new Map<string, string | null>()
  }
}

export async function getAdminPeople(): Promise<{ admins: AdminPerson[]; developers: AdminPerson[] }> {
  // ── New-system admins (User table, role=admin) ─────────────────────────
  const adminUsers = await prisma.user.findMany({
    where: { role: 'admin' },
    orderBy: { createdAt: 'asc' },
    select: { id: true, email: true, name: true, avatarUrl: true, disabledAt: true, createdAt: true },
  })

  const enrichedAdmins: AdminPerson[] = await Promise.all(adminUsers.map(async (a) => {
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
      avatarUrl: a.avatarUrl,
      disabledAt: a.disabledAt,
      createdAt: a.createdAt,
      lastLoginAt: lastSession?.createdAt ?? null,
      activeSessions: sessionCount,
    }
  }))

  // ── Legacy developers (Developer table) ───────────────────────────────
  let devAdmins: AdminPerson[] = []
  try {
    const devPrisma = getDevelopersPrisma()
    const devs = await devPrisma.developer.findMany({
      orderBy: { id: 'asc' },
      select: developerPeopleSelect,
    })
    const avatarMap = await getDeveloperAvatarMap(devPrisma, devs.map((d) => String(d.id)))
    devAdmins = (devs as any[]).map((d) => ({
      source: 'developer' as const,
      id: String(d.id),
      email: d.email,
      name: d.name ?? null,
      avatarUrl: avatarMap.get(String(d.id)) ?? null,
      disabledAt: null,
      createdAt: d.createdAt,
      lastLoginAt: null,   // Developer table has no session tracking
      activeSessions: null,
      role: d.role ?? 'editor',
    }))
  } catch {
    // developer DB unavailable — skip
  }

  return { admins: enrichedAdmins, developers: devAdmins }
}

export type WikiHealth = {
  slug: string
  name: string
  enrolled: number
  totalLessons: number
  avgCompletion: number
  totalInProgress: number
}

export type FlaggedLesson = {
  id: string
  title: string
  wikiSlug: string
  wikiName: string
  status: string
  updatedAt: Date
  publishedAt: Date | null
}

export async function getWikiHealth(): Promise<{ wikis: WikiHealth[]; lessons: FlaggedLesson[] }> {
  const wikis = await prisma.wiki.findMany({
    where: { isPublished: true },
    select: { slug: true, displayName: true },
    orderBy: { displayName: 'asc' },
  })
  const wikiSlugs = wikis.map(w => w.slug)

  if (wikiSlugs.length === 0) {
    return { wikis: [], lessons: [] }
  }

  // Lessons live in each wiki's own database; enrollments and lessonProgress
  // live in the default DB. Load lessons per wiki, then join progress rows to
  // them by lesson id.
  const lessonsByWiki = await getPublishedLessonsByWiki(wikiSlugs)
  const publishedLessonIds = wikiSlugs.flatMap((slug) =>
    (lessonsByWiki.get(slug) ?? []).map((lesson) => lesson.id)
  )

  const [enrollmentGroups, progressGroups, flaggedPerWiki] = await Promise.all([
    prisma.enrollment.groupBy({
      by: ['wikiSlug'],
      where: { status: 'active', wikiSlug: { in: wikiSlugs } },
      _count: true,
    }),
    publishedLessonIds.length
      ? prisma.lessonProgress.groupBy({
          by: ['wikiSlug', 'studentId', 'status'],
          where: {
            wikiSlug: { in: wikiSlugs },
            lessonId: { in: publishedLessonIds },
            status: { in: ['completed', 'in_progress'] },
          },
          _count: true,
        })
      : Promise.resolve([] as { wikiSlug: string; studentId: string; status: string; _count: number }[]),
    // Lessons needing attention: draft (changed), published, archived
    // (unpublished) — queried per wiki DB with a legacy-safe column set.
    Promise.all(
      wikiSlugs.map(async (slug) => {
        try {
          return await getPrisma(slug).lesson.findMany({
            where: { wikiSlug: slug, status: { in: ['draft', 'published', 'archived'] } },
            select: {
              id: true, title_en: true, wikiSlug: true, status: true,
              updatedAt: true, publishedAt: true,
            },
            orderBy: { updatedAt: 'desc' },
            take: 30,
          })
        } catch (error) {
          console.warn(`[admin-dashboard] Failed to load flagged lessons for wiki "${slug}".`, error)
          return []
        }
      })
    ),
  ])

  const flaggedLessons = flaggedPerWiki
    .flat()
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 30)

  const enrolledMap: Record<string, number> = {}
  for (const g of enrollmentGroups) enrolledMap[g.wikiSlug] = g._count

  const lessonMap: Record<string, number> = {}
  for (const slug of wikiSlugs) lessonMap[slug] = (lessonsByWiki.get(slug) ?? []).length

  // completed = total completed (student, lesson) pairs per wiki;
  // in progress = distinct students with at least one in-progress lesson.
  const completedMap: Record<string, number> = {}
  const inProgressMap: Record<string, number> = {}
  for (const pg of progressGroups) {
    if (pg.status === 'completed') {
      completedMap[pg.wikiSlug] = (completedMap[pg.wikiSlug] ?? 0) + pg._count
    } else if (pg.status === 'in_progress') {
      inProgressMap[pg.wikiSlug] = (inProgressMap[pg.wikiSlug] ?? 0) + 1
    }
  }

  const wikiNameMap: Record<string, string> = {}
  for (const w of wikis) wikiNameMap[w.slug] = w.displayName

  const wikiHealth: WikiHealth[] = wikis.map(w => {
    const enrolled = enrolledMap[w.slug] ?? 0
    const totalLessons = lessonMap[w.slug] ?? 0
    const totalCompleted = completedMap[w.slug] ?? 0
    const totalInProgress = inProgressMap[w.slug] ?? 0
    const maxPossible = enrolled * totalLessons
    const avgCompletion = maxPossible > 0 ? Math.round((totalCompleted / maxPossible) * 100) : 0
    return { slug: w.slug, name: w.displayName, enrolled, totalLessons, avgCompletion, totalInProgress }
  })

  const lessons: FlaggedLesson[] = flaggedLessons.map(l => ({
    id: l.id,
    title: l.title_en,
    wikiSlug: l.wikiSlug,
    wikiName: wikiNameMap[l.wikiSlug] ?? l.wikiSlug,
    status: l.status,
    updatedAt: l.updatedAt,
    publishedAt: l.publishedAt,
  }))

  return { wikis: wikiHealth, lessons }
}
