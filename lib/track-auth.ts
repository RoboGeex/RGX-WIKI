import { AuthError, getCurrentUser } from '@/lib/auth'
import { requireAdminAccess } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { getVerifiedDeveloperId } from '@/lib/dev-session'
import { findDeveloperById } from '@/lib/developers'

export type TrackActor = {
  id: string
  userId: string | null
  kind: 'teacher' | 'admin' | 'developer'
  name: string | null
  email: string | null
  isAdmin: boolean
  wikiSlugs: string[]
}

export async function requireTrackActor(): Promise<TrackActor> {
  // A signed superadmin developer session takes precedence over the shared
  // User session cookie. Without this, a stale teacher login on another
  // subdomain can make a superadmin look like a teacher in the tracks API.
  const developerId = getVerifiedDeveloperId()
  if (developerId) {
    try {
      const developer = await findDeveloperById(developerId)
      if (developer?.role === 'superadmin') {
        return {
          id: `developer:${developer.id}`,
          userId: null,
          kind: 'developer',
          name: developer.name ?? null,
          email: developer.email ?? null,
          isAdmin: true,
          wikiSlugs: [],
        }
      }
    } catch {
      // Continue with the normal User/admin resolution below.
    }
  }

  const user = await getCurrentUser()
  if (user?.role === 'teacher' || user?.role === 'admin') {
    const record = await prisma.user.findUnique({ where: { id: user.id }, select: { assignedWikiSlugs: true } })
    const wikiSlugs = user.role === 'teacher' && Array.isArray(record?.assignedWikiSlugs)
      ? (record.assignedWikiSlugs as string[])
      : []
    return {
      id: user.id,
      userId: user.id,
      kind: user.role,
      name: user.name,
      email: user.email,
      isAdmin: user.role === 'admin',
      wikiSlugs,
    }
  }

  const admin = await requireAdminAccess()
  if (admin.source !== 'developer') throw new AuthError('Teacher or admin access required', 403)
  return {
    id: `developer:${admin.dev.id}`,
    userId: null,
    kind: 'developer',
    name: admin.dev.name ?? null,
    email: admin.dev.email ?? null,
    isAdmin: true,
    wikiSlugs: [],
  }
}

export async function assertTrackScope(
  actor: TrackActor,
  wikiSlugs: string[],
  studentIds: string[],
  options: { allowSharedTrack?: boolean } = {},
) {
  const uniqueWikis = [...new Set(wikiSlugs)]
  const uniqueStudents = [...new Set(studentIds)]

  const published = await prisma.wiki.count({ where: { slug: { in: uniqueWikis }, isPublished: true } })
  if (published !== uniqueWikis.length) throw new AuthError('One or more selected wikis are unavailable', 400)

  if (!actor.isAdmin) {
    if (!options.allowSharedTrack && uniqueWikis.some((slug) => !actor.wikiSlugs.includes(slug))) {
      throw new AuthError('Teachers can only add wikis assigned to them', 403)
    }
    if (uniqueStudents.length) {
      const eligible = await prisma.user.findMany({
        where: {
          id: { in: uniqueStudents },
          role: 'student',
          disabledAt: null,
          OR: [
            { studentEnrollments: { some: { teacherId: actor.userId!, status: 'active' } } },
            { trackAssignments: { some: { assignedByUserId: actor.userId! } } },
          ],
        },
        select: { id: true },
      })
      if (eligible.length !== uniqueStudents.length) {
        throw new AuthError('Teachers can only assign their active students', 403)
      }
    }
  } else if (uniqueStudents.length) {
    const students = await prisma.user.count({ where: { id: { in: uniqueStudents }, role: 'student', disabledAt: null } })
    if (students !== uniqueStudents.length) throw new AuthError('One or more selected students are unavailable', 400)
  }
}
