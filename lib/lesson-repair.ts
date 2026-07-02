// Planning logic for repairing lesson families whose published row went
// missing after the legacy "--draft-N" slug-collision corruption split them.
//
// This module is intentionally pure (no DB access) so the repair plan can be
// unit-tested offline and reviewed as a dry-run report before anything is
// written. The only write action it ever proposes is INSERTING a new
// published row copied from the family's latest draft — it never proposes
// updating or deleting existing rows.

import { LESSON_STATUS, normalizeLessonStatus } from '@/lib/lesson-versions'

const DRAFT_SUFFIX_RE = /--draft(-\d+)?$/

export type RepairRow = {
  id: string
  lessonKey?: string | null
  slug: string
  wikiSlug: string
  status?: string | null
  order?: number | null
  version?: number | null
  publishedAt?: Date | string | null
  updatedAt?: Date | string | null
  createdAt?: Date | string | null
  title_en?: string | null
  title_ar?: string | null
  coverImage?: string | null
  ownerId?: string | null
  lastModifiedBy?: string | null
  duration_min?: number | null
  difficulty?: string | null
  prerequisites_en?: unknown
  prerequisites_ar?: unknown
  materials?: unknown
  body?: unknown
}

export function lessonFamilyKey(row: Pick<RepairRow, 'id' | 'slug' | 'lessonKey'>): string {
  const key = typeof row.lessonKey === 'string' ? row.lessonKey.trim() : ''
  if (key) return key.replace(DRAFT_SUFFIX_RE, '') || key
  const fromId = (row.id || '').replace(DRAFT_SUFFIX_RE, '')
  if (fromId) return fromId
  const fromSlug = (row.slug || '').replace(DRAFT_SUFFIX_RE, '')
  return fromSlug || row.id
}

export function rowHasRenderableBody(row: Pick<RepairRow, 'body'>): boolean {
  if (!Array.isArray(row.body) || row.body.length === 0) return false
  return row.body.some((block: any) => {
    if (!block || typeof block !== 'object') return false
    return Object.values(block).some((value) => {
      if (typeof value === 'string' && value.trim()) return true
      if (Array.isArray(value) && value.some((item) => typeof item === 'string' && item.trim())) return true
      return false
    })
  })
}

function toTime(value: Date | string | null | undefined): number {
  if (!value) return 0
  const t = value instanceof Date ? value.getTime() : new Date(value).getTime()
  return Number.isFinite(t) ? t : 0
}

function pickNewestDraft(rows: RepairRow[]): RepairRow | undefined {
  return rows
    .filter((row) => normalizeLessonStatus(row.status) === LESSON_STATUS.DRAFT)
    .sort((a, b) => {
      const versionDiff = (Number(b.version) || 0) - (Number(a.version) || 0)
      if (versionDiff !== 0) return versionDiff
      return toTime(b.updatedAt) - toTime(a.updatedAt)
    })[0]
}

export type FamilyRowSummary = {
  id: string
  slug: string
  status: string
  order: number
  version: number
  publishedAt: string | null
  updatedAt: string | null
  hasBody: boolean
}

export type FamilyAction = 'healthy' | 'create-published' | 'skip-empty-draft' | 'skip-no-rows'

export type FamilyReport = {
  lessonKey: string
  title: string
  action: FamilyAction
  note?: string
  rows: FamilyRowSummary[]
  plan?: {
    sourceDraftId: string
    newId: string
    newSlug: string
    newVersion: number
    idNote?: string
    slugNote?: string
  }
}

export type RepairPlan = {
  wikiSlug: string
  totalRows: number
  families: FamilyReport[]
  summary: {
    healthy: number
    needsPublishedRow: number
    skipped: number
  }
}

function summarizeRow(row: RepairRow): FamilyRowSummary {
  return {
    id: row.id,
    slug: row.slug,
    status: normalizeLessonStatus(row.status),
    order: Number(row.order) || 0,
    version: Number(row.version) || 0,
    publishedAt: row.publishedAt ? new Date(row.publishedAt as any).toISOString() : null,
    updatedAt: row.updatedAt ? new Date(row.updatedAt as any).toISOString() : null,
    hasBody: rowHasRenderableBody(row),
  }
}

export function buildRepairPlan(wikiSlug: string, rows: RepairRow[]): RepairPlan {
  const families = new Map<string, RepairRow[]>()
  rows.forEach((row) => {
    const key = lessonFamilyKey(row)
    const list = families.get(key) || []
    list.push(row)
    families.set(key, list)
  })

  const allIds = new Set(rows.map((row) => row.id))
  const slugOwners = new Map<string, string>() // slug -> family key of a row using it
  rows.forEach((row) => {
    if (!slugOwners.has(row.slug)) slugOwners.set(row.slug, lessonFamilyKey(row))
  })

  const reports: FamilyReport[] = []

  families.forEach((familyRows, key) => {
    const hasPublished = familyRows.some(
      (row) => normalizeLessonStatus(row.status) === LESSON_STATUS.PUBLISHED
    )
    const newestDraft = pickNewestDraft(familyRows)
    const title =
      (newestDraft?.title_en || familyRows[0]?.title_en || familyRows[0]?.title_ar || key) as string

    const base: Omit<FamilyReport, 'action'> = {
      lessonKey: key,
      title,
      rows: familyRows.map(summarizeRow),
    }

    if (hasPublished) {
      reports.push({ ...base, action: 'healthy' })
      return
    }
    if (!newestDraft) {
      reports.push({ ...base, action: 'skip-no-rows', note: 'No draft or published row found.' })
      return
    }
    if (!rowHasRenderableBody(newestDraft)) {
      reports.push({
        ...base,
        action: 'skip-empty-draft',
        note: 'Draft has no content — publishing it would create an empty public lesson. Review manually.',
      })
      return
    }

    // Choose id for the new published row: prefer the clean family key so any
    // existing LessonProgress records keyed to it line back up.
    let newId = key
    let idNote: string | undefined
    if (allIds.has(newId)) {
      let counter = 1
      while (allIds.has(`${key}-r${counter}`)) counter += 1
      newId = `${key}-r${counter}`
      idNote = `Preferred id "${key}" is taken by an existing row; using "${newId}".`
    }

    // Choose slug: prefer the clean family key. Only reuse it if no row from a
    // DIFFERENT family already owns that slug (drafts in the same family are fine
    // — public lookups collapse to the published row).
    let newSlug = key
    let slugNote: string | undefined
    const slugOwner = slugOwners.get(newSlug)
    if (slugOwner && slugOwner !== key) {
      let counter = 2
      while (slugOwners.has(`${key}-${counter}`)) counter += 1
      newSlug = `${key}-${counter}`
      slugNote = `Preferred slug "${key}" belongs to another lesson ("${slugOwner}"); using "${newSlug}".`
    }

    const newVersion =
      familyRows.reduce((max, row) => Math.max(max, Number(row.version) || 0), 0) + 1

    reports.push({
      ...base,
      action: 'create-published',
      plan: {
        sourceDraftId: newestDraft.id,
        newId,
        newSlug,
        newVersion,
        ...(idNote ? { idNote } : {}),
        ...(slugNote ? { slugNote } : {}),
      },
    })
  })

  reports.sort((a, b) => (a.rows[0]?.order || 0) - (b.rows[0]?.order || 0))

  return {
    wikiSlug,
    totalRows: rows.length,
    families: reports,
    summary: {
      healthy: reports.filter((r) => r.action === 'healthy').length,
      needsPublishedRow: reports.filter((r) => r.action === 'create-published').length,
      skipped: reports.filter((r) => r.action.startsWith('skip')).length,
    },
  }
}
