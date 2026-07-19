// A class (EnrollmentLink) may carry an optional schedule. Rather than running
// a cron job to close classes, "is this class open right now" is computed on
// read from isActive + [startsAt, endsAt]. That keeps it reversible: extending
// endsAt immediately restores access, with no rows to repair.

export type ClassSchedule = {
  isActive: boolean
  startsAt?: Date | string | null
  endsAt?: Date | string | null
}

export type ClassStatus = 'active' | 'scheduled' | 'ended' | 'off'

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null
  const d = value instanceof Date ? value : new Date(value)
  return Number.isFinite(d.getTime()) ? d : null
}

/** Start of the given day (local) — used when saving a start date. */
export function startOfDay(value: string): Date | null {
  const d = toDate(value)
  if (!d) return null
  d.setHours(0, 0, 0, 0)
  return d
}

/** End of the given day — so a class runs *through* its end date, not up to midnight of it. */
export function endOfDay(value: string): Date | null {
  const d = toDate(value)
  if (!d) return null
  d.setHours(23, 59, 59, 999)
  return d
}

export function classStatus(link: ClassSchedule, now: Date = new Date()): ClassStatus {
  if (!link.isActive) return 'off'
  const startsAt = toDate(link.startsAt)
  const endsAt = toDate(link.endsAt)
  if (startsAt && now < startsAt) return 'scheduled'
  if (endsAt && now > endsAt) return 'ended'
  return 'active'
}

export function isClassOpen(link: ClassSchedule, now: Date = new Date()): boolean {
  return classStatus(link, now) === 'active'
}

/**
 * Prisma `where` fragment matching only classes that are open right now.
 * Use as a relation filter, e.g.
 *   prisma.enrollment.findFirst({ where: { studentId, status: 'active', link: openClassWhere() } })
 * so a student whose class has ended (or hasn't started) stops being treated
 * as enrolled, without mutating any rows.
 */
export function openClassWhere(now: Date = new Date()) {
  return {
    isActive: true,
    AND: [
      { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
      { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
    ],
  }
}

/** Human-readable reason a class isn't open, for API/UI messages. */
export function closedReason(status: ClassStatus): string {
  if (status === 'scheduled') return 'This class has not started yet.'
  if (status === 'ended') return 'This class has ended.'
  return 'This link has been closed'
}
