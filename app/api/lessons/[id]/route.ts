import { NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma-multi'
import { findDeveloperById } from '@/lib/developers'
import { canManageLesson } from '@/lib/assignments'
import { getActorIdFromRequest } from '../route'

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    const prisma = getPrisma()
    const lesson = await prisma.lesson.findUnique({ where: { id } })
    if (!lesson) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(lesson)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to load lesson' }, { status: 500 })
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    const prisma = getPrisma()
    const payload = await req.json()
    const actorId = getActorIdFromRequest(req)
    const developer = actorId ? await findDeveloperById(actorId) : undefined
    const isAdmin = developer?.role === 'admin'

    const existing = await prisma.lesson.findUnique({
      where: { id },
      select: { ownerId: true, wikiSlug: true },
    })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (!isAdmin && (!existing.ownerId || existing.ownerId !== developer?.id)) {
      return NextResponse.json({ error: 'Only owner or admin can edit this lesson' }, { status: 403 })
    }

    const updateData = {
      ...payload,
      status: isAdmin ? payload.status || existing['status'] || 'draft' : 'draft',
      publishedAt:
        isAdmin && payload.status === 'published'
          ? payload.publishedAt || new Date().toISOString()
          : null,
      lastModifiedBy: developer?.id || payload.lastModifiedBy,
    }

    const saved = await prisma.lesson.update({ where: { id }, data: updateData })
    return NextResponse.json({ ok: true, lesson: saved })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to update lesson' }, { status: 500 })
  }
}
