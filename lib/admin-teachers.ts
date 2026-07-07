import { prisma } from '@/lib/prisma'

// Shape returned to the admin Teachers directory. Dates are real Date objects
// here; the API route serializes them via NextResponse.json and the server
// page does the same via a JSON round-trip, so both hand the client identical
// data.
export type AdminTeacher = {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
  assignedWikiSlugs: unknown
  disabledAt: Date | null
  createdAt: Date
  createdByName: string | null
  createdByEmail: string | null
  studentCount: number
  lastLoginAt: Date | null
}

// Lists all teachers, enriched with active-student count and last login.
export async function getAdminTeachersList(): Promise<AdminTeacher[]> {
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

  return Promise.all(teachers.map(async (t) => {
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
}
